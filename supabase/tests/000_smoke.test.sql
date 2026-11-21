begin;
select plan(1);
select has_extension('pgcrypto');
select * from finish();
rollback;
