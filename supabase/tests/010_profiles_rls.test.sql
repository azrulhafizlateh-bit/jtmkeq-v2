-- Task 1.1: profiles table, role helpers, guard trigger and RLS (SPEC section 4, 6, 7).
begin;
select plan(29);

-- Fixtures (inserted as the postgres superuser: RLS bypassed, no JWT => guard allows).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'phep@example.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'pa@example.test'),
  ('00000000-0000-0000-0000-0000000000a3', 'pa2@example.test'),
  ('00000000-0000-0000-0000-0000000000a4', 'kj@example.test'),
  ('00000000-0000-0000-0000-0000000000a5', 'inactive@example.test'),
  ('00000000-0000-0000-0000-0000000000a6', 'newbie@example.test');

insert into public.profiles (id, full_name, staff_id, role, phone, is_active, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'Test Phep', 'T001', 'phep', '0100000001', true,  '2020-01-01', '2020-01-01'),
  ('00000000-0000-0000-0000-0000000000a2', 'Test Pa',   'T002', 'pa',   '0100000002', true,  '2020-01-01', '2020-01-01'),
  ('00000000-0000-0000-0000-0000000000a3', 'Test Pa2',  'T003', 'pa',   '0100000003', true,  '2020-01-01', '2020-01-01'),
  ('00000000-0000-0000-0000-0000000000a4', 'Test Kj',   'T004', 'kj',   '0100000004', true,  '2020-01-01', '2020-01-01'),
  ('00000000-0000-0000-0000-0000000000a5', 'Test Gone', 'T005', 'pa',   '0100000005', false, '2020-01-01', '2020-01-01');

-- Schema
select has_table('public', 'profiles', 'profiles table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on profiles'
);
select enum_has_labels('public', 'user_role', array['phep', 'pa', 'kj'], 'user_role enum has phep, pa, kj');

-- profiles_select_authenticated
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select is((select count(*)::int from public.profiles), 4, 'PA reads the four active profiles only');
select is(
  (select role::text from public.profiles where id = '00000000-0000-0000-0000-0000000000a4'),
  'kj',
  'PA can read another active profile role'
);
select is(
  (select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000a5'),
  0,
  'PA cannot read an inactive profile'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is(
  (select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000a5'),
  1,
  'PHEP can read an inactive profile'
);

-- anon: nothing at all
reset role;
set local role anon;
select throws_ok($$select * from public.profiles$$, '42501', null, 'anon cannot select profiles');
select throws_ok(
  $$insert into public.profiles (id, full_name, staff_id, role) values ('00000000-0000-0000-0000-0000000000a6', 'X', 'X1', 'pa')$$,
  '42501', null, 'anon cannot insert profiles'
);
select throws_ok($$select public.auth_role()$$, '42501', null, 'anon cannot execute auth_role()');

-- profiles_insert_phep
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select throws_ok(
  $$insert into public.profiles (id, full_name, staff_id, role) values ('00000000-0000-0000-0000-0000000000a6', 'New', 'T006', 'pa')$$,
  '42501', null, 'PA cannot insert a profile'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$insert into public.profiles (id, full_name, staff_id, role) values ('00000000-0000-0000-0000-0000000000a6', 'New', 'T006', 'pa')$$,
  'PHEP can insert a profile'
);

-- profiles_update_self_or_phep + profiles_guard: PA acting on own row
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
update public.profiles set phone = '0199999999' where id = '00000000-0000-0000-0000-0000000000a2';
select throws_ok(
  $$update public.profiles set role = 'phep' where id = '00000000-0000-0000-0000-0000000000a2'$$,
  '42501', null, 'PA cannot promote themselves to phep'
);
select throws_ok(
  $$update public.profiles set is_active = false where id = '00000000-0000-0000-0000-0000000000a2'$$,
  '42501', null, 'PA cannot change their own is_active'
);
select throws_ok(
  $$update public.profiles set is_demo = true where id = '00000000-0000-0000-0000-0000000000a2'$$,
  '42501', null, 'PA cannot change their own is_demo'
);
select throws_ok(
  $$update public.profiles set id = '00000000-0000-0000-0000-0000000000b2' where id = '00000000-0000-0000-0000-0000000000a2'$$,
  '42501', null, 'PA cannot change profile id'
);
update public.profiles set phone = '0188888888' where id = '00000000-0000-0000-0000-0000000000a3';
reset role;
select is(
  (select phone from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'),
  '0199999999',
  'PA can update own phone'
);
select is(
  (select phone from public.profiles where id = '00000000-0000-0000-0000-0000000000a3'),
  '0100000003',
  'PA updating another user phone affects 0 rows'
);
select ok(
  (select updated_at > '2020-01-01'::timestamptz from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'),
  'updated_at is bumped on update'
);

-- PHEP
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
update public.profiles set role = 'kj' where id = '00000000-0000-0000-0000-0000000000a3';
select throws_ok(
  $$update public.profiles set id = '00000000-0000-0000-0000-0000000000b3' where id = '00000000-0000-0000-0000-0000000000a3'$$,
  '42501', null, 'PHEP cannot change profile id'
);
select throws_ok(
  $$delete from public.profiles where id = '00000000-0000-0000-0000-0000000000a3'$$,
  '42501', null, 'PHEP cannot hard-delete profiles'
);
reset role;
select is(
  (select role::text from public.profiles where id = '00000000-0000-0000-0000-0000000000a3'),
  'kj',
  'PHEP can update another user role'
);

-- KJ cannot update others
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}';
update public.profiles set phone = '0177777777' where id = '00000000-0000-0000-0000-0000000000a2';
reset role;
select is(
  (select phone from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'),
  '0199999999',
  'KJ cannot update another user profile (0 rows)'
);

-- Inactive user: cannot update even own row; helpers return null / false
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}';
update public.profiles set phone = '0166666666' where id = '00000000-0000-0000-0000-0000000000a5';
select is((select public.auth_role()::text), null, 'auth_role() is null for an inactive user');
select is((select public.is_active_user()), false, 'is_active_user() is false for an inactive user');
reset role;
select is(
  (select phone from public.profiles where id = '00000000-0000-0000-0000-0000000000a5'),
  '0100000005',
  'inactive user cannot update own phone'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select is((select public.auth_role()::text), 'pa', 'auth_role() returns the role of an active user');
select is((select public.is_active_user()), true, 'is_active_user() is true for an active user');

-- Service role / SQL editor (no JWT, not authenticated) may administer profiles
reset role;
set local request.jwt.claims = '';
select lives_ok(
  $$update public.profiles set role = 'pa' where id = '00000000-0000-0000-0000-0000000000a3'$$,
  'privileged non-JWT session (service role) can change role'
);

select * from finish();
rollback;
