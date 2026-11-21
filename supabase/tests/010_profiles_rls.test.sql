-- Task 1.1: profiles table, role helpers, guard trigger and RLS (SPEC section 4, 6, 7).
begin;
select plan(44);

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

-- profiles_select_*: PA sees only own row on the table, the rest through staff_directory()
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select is((select count(*)::int from public.profiles), 1, 'PA reads only their own row from the table');
select is(
  (select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000a3'),
  0,
  'PA cannot read another user phone via the table'
);
select is(
  (select count(*)::int from public.profiles where staff_id = 'T004'),
  0,
  'PA cannot read another user staff_id via the table'
);
select is((select count(*)::int from public.staff_directory()), 4, 'staff_directory() lists the four active staff');
select is(
  (select role::text from public.staff_directory() where id = '00000000-0000-0000-0000-0000000000a4'),
  'kj',
  'PA sees another active staff member role via staff_directory()'
);
select is(
  (select count(*)::int from public.staff_directory() where id = '00000000-0000-0000-0000-0000000000a5'),
  0,
  'inactive profiles are absent from staff_directory()'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is(
  (select count(*)::int from public.profiles),
  5,
  'PHEP reads all rows including inactive'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}';
select is(
  (select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000a5'),
  1,
  'inactive user can still read their own row'
);
select is(
  (select count(*)::int from public.staff_directory()),
  0,
  'staff_directory() is empty for an inactive caller'
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
select throws_ok($$select * from public.staff_directory()$$, '42501', null, 'anon cannot execute staff_directory()');

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
  '42501', 'only PHEP may change profile fields other than phone', 'PA cannot promote themselves to phep'
);
select throws_ok(
  $$update public.profiles set is_active = false where id = '00000000-0000-0000-0000-0000000000a2'$$,
  '42501', 'only PHEP may change profile fields other than phone', 'PA cannot change their own is_active'
);
select throws_ok(
  $$update public.profiles set is_demo = true where id = '00000000-0000-0000-0000-0000000000a2'$$,
  '42501', 'only PHEP may change profile fields other than phone', 'PA cannot change their own is_demo'
);
select throws_ok(
  $$update public.profiles set id = '00000000-0000-0000-0000-0000000000b2' where id = '00000000-0000-0000-0000-0000000000a2'$$,
  '42501', 'profiles.id is immutable', 'PA cannot change profile id'
);
select throws_ok(
  $$update public.profiles set staff_id = 'T999' where id = '00000000-0000-0000-0000-0000000000a2'$$,
  '42501', 'only PHEP may change profile fields other than phone', 'PA cannot change their own staff_id'
);
select throws_ok(
  $$update public.profiles set full_name = 'Renamed' where id = '00000000-0000-0000-0000-0000000000a2'$$,
  '42501', 'only PHEP may change profile fields other than phone', 'PA cannot change their own full_name'
);
select throws_ok(
  $$update public.profiles set last_login_at = now() where id = '00000000-0000-0000-0000-0000000000a2'$$,
  '42501', 'only PHEP may change profile fields other than phone', 'PA cannot change their own last_login_at'
);
select throws_ok(
  $$insert into public.profiles (id, full_name, staff_id, role) values ('00000000-0000-0000-0000-0000000000a2', 'Test Pa', 'T002', 'phep') on conflict (id) do update set role = 'phep'$$,
  '42501', null, 'PA cannot escalate through INSERT ... ON CONFLICT DO UPDATE'
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
  '42501', 'profiles.id is immutable', 'PHEP cannot change profile id'
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
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
update public.profiles set is_active = false where id = '00000000-0000-0000-0000-0000000000a3';
reset role;
select is(
  (select is_active from public.profiles where id = '00000000-0000-0000-0000-0000000000a3'),
  false,
  'PHEP can deactivate another user'
);

-- KJ
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}';
select throws_ok(
  $$update public.profiles set role = 'phep' where id = '00000000-0000-0000-0000-0000000000a4'$$,
  '42501', 'only PHEP may change profile fields other than phone', 'KJ cannot promote themselves'
);
select throws_ok(
  $$update public.profiles set is_active = false where id = '00000000-0000-0000-0000-0000000000a4'$$,
  '42501', 'only PHEP may change profile fields other than phone', 'KJ cannot change their own is_active'
);
update public.profiles set phone = '0155555555' where id = '00000000-0000-0000-0000-0000000000a4';
update public.profiles set phone = '0177777777' where id = '00000000-0000-0000-0000-0000000000a2';
reset role;
select is(
  (select phone from public.profiles where id = '00000000-0000-0000-0000-0000000000a4'),
  '0155555555',
  'KJ can update own phone'
);
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

-- Privileged sessions without a JWT identity may administer profiles
reset role;
set local request.jwt.claims = '';
set local role service_role;
select lives_ok(
  $$update public.profiles set role = 'pa' where id = '00000000-0000-0000-0000-0000000000a3'$$,
  'service_role (no JWT identity) can change role'
);
reset role;
select lives_ok(
  $$update public.profiles set role = 'kj' where id = '00000000-0000-0000-0000-0000000000a3'$$,
  'postgres (no JWT identity) can change role'
);

select * from finish();
rollback;
