-- Task 1.2: login rate limiting (SPEC section 8.2: 5 attempts / 15 min per key).
-- Window = last 15 minutes. Failures count since the most recent success in that window.
begin;
select plan(27);

-- Schema and privileges
select has_table('public', 'login_attempts', 'login_attempts table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.login_attempts'::regclass),
  'RLS is enabled on login_attempts'
);
select is(
  (select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'login_attempts'),
  0,
  'login_attempts has no policies (service role only)'
);
select has_index('public', 'login_attempts', 'login_attempts_key_hash_created_at_idx', 'index on (key_hash, created_at desc)');
select ok(not has_table_privilege('anon', 'public.login_attempts', 'select'), 'anon has no table privileges');
select ok(not has_table_privilege('authenticated', 'public.login_attempts', 'select'), 'authenticated has no table privileges');
select ok(
  has_function_privilege('service_role', 'public.check_login_allowed(text)', 'execute'),
  'service_role can execute check_login_allowed'
);
select ok(
  has_function_privilege('service_role', 'public.record_login_attempt(text, boolean)', 'execute'),
  'service_role can execute record_login_attempt'
);
select ok(
  not has_function_privilege('anon', 'public.check_login_allowed(text)', 'execute')
  and not has_function_privilege('authenticated', 'public.check_login_allowed(text)', 'execute'),
  'anon and authenticated cannot execute check_login_allowed'
);
select ok(
  not has_function_privilege('anon', 'public.record_login_attempt(text, boolean)', 'execute')
  and not has_function_privilege('authenticated', 'public.record_login_attempt(text, boolean)', 'execute'),
  'anon and authenticated cannot execute record_login_attempt'
);

-- Fixtures (postgres, explicit timestamps; ids ascend in insertion order)
insert into public.login_attempts (key_hash, success, created_at)
select 'k-four', false, now() - interval '1 minute' from generate_series(1, 4);
insert into public.login_attempts (key_hash, success, created_at)
select 'k-five', false, now() - interval '1 minute' from generate_series(1, 5);
insert into public.login_attempts (key_hash, success, created_at)
select 'k-old', false, now() - interval '16 minutes' from generate_series(1, 5);
insert into public.login_attempts (key_hash, success, created_at)
select 'k-mixed', false, now() - interval '16 minutes' from generate_series(1, 5);
insert into public.login_attempts (key_hash, success, created_at)
select 'k-mixed', false, now() - interval '1 minute' from generate_series(1, 2);
insert into public.login_attempts (key_hash, success, created_at)
select 'k-succ', true, now() - interval '1 minute' from generate_series(1, 6);
insert into public.login_attempts (key_hash, success, created_at)
select 'k-reset', false, now() - interval '5 minutes' from generate_series(1, 5);
insert into public.login_attempts (key_hash, success, created_at) values ('k-reset', true, now() - interval '4 minutes');
insert into public.login_attempts (key_hash, success, created_at)
select 'k-reset', false, now() - interval '3 minutes' from generate_series(1, 4);
insert into public.login_attempts (key_hash, success, created_at)
select 'k-oldsucc', false, now() - interval '10 minutes' from generate_series(1, 5);
insert into public.login_attempts (key_hash, success, created_at) values ('k-oldsucc', true, now() - interval '20 minutes');

set local role service_role;
select is(public.check_login_allowed('k-none'), true, 'unknown key is allowed');
select is(public.check_login_allowed('k-four'), true, '4 failures: still allowed');
select is(public.check_login_allowed('k-five'), false, '5 failures: not allowed');
select is(public.check_login_allowed('k-old'), true, '5 failures older than 15 minutes are ignored');
select is(public.check_login_allowed('k-mixed'), true, '5 old + 2 recent failures: allowed');
select is(public.check_login_allowed('k-succ'), true, 'successes do not count as failures');
select is(public.check_login_allowed('k-reset'), true, '5 failures, success, 4 failures: allowed');
select is(public.check_login_allowed('k-oldsucc'), false, 'a success older than the window does not reset the count');

-- record_login_attempt: the 5th failure in the same transaction blocks, a success resets
select lives_ok($$select public.record_login_attempt('k-reset', false)$$, 'record_login_attempt records a failure');
select is(public.check_login_allowed('k-reset'), false, '4 failures after success + 1 recorded: blocked');
select lives_ok($$select public.record_login_attempt('k-reset', true)$$, 'record_login_attempt records a success');
select is(public.check_login_allowed('k-reset'), true, 'a recorded success resets the count');
select lives_ok($$select public.record_login_attempt('k-new', false)$$, 'record_login_attempt records for a new key');
select is(public.check_login_allowed('k-five'), false, 'blocking one key does not affect another');

-- Other roles are denied
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select throws_ok($$select public.check_login_allowed('k-four')$$, '42501', null, 'authenticated cannot call check_login_allowed');
select throws_ok($$select public.record_login_attempt('k-four', false)$$, '42501', null, 'authenticated cannot call record_login_attempt');
select throws_ok($$select count(*) from public.login_attempts$$, '42501', null, 'authenticated cannot select login_attempts');
reset role;

select * from finish();
rollback;
