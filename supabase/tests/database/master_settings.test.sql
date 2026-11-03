begin;

select plan(45);

create function pg_temp.act_as(user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

grant execute on function pg_temp.act_as(uuid) to authenticated;

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com', now()),
  ('00000000-0000-0000-0000-00000000000b', 'maria@example.com', now()),
  ('00000000-0000-0000-0000-00000000000c', 'iryna@example.com', now());

insert into public.masters (id, slug, name, published_at) values
  ('00000000-0000-0000-0000-00000000000a', 'anna', 'Anna', now()),
  ('00000000-0000-0000-0000-00000000000b', 'maria', 'Maria', null);

-- Before the first publication

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');

select lives_ok(
  $$ update public.masters set slug = 'maria-hair' where id = '00000000-0000-0000-0000-00000000000b' $$,
  'a never-published master changes the slug'
);

select lives_ok(
  $$ update public.masters set slug = 'maria-nails' where id = '00000000-0000-0000-0000-00000000000b' $$,
  'a never-published master changes the slug again at once'
);

reset role;

select is(
  (select count(*)::integer from public.retired_slugs where slug like 'maria%'),
  0,
  'changes before the first publication retire no slug'
);

select is(
  (select count(*)::integer from private.slug_changes where master_id = '00000000-0000-0000-0000-00000000000b'),
  0,
  'changes before the first publication are not logged'
);

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');

select ok(public.is_slug_available('maria'), 'a slug left before the first publication is free again');

-- First publication

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
update public.masters set published_at = '2026-10-01 10:00+00' where id = '00000000-0000-0000-0000-00000000000b';

select is(
  (select first_published_at from public.masters where id = '00000000-0000-0000-0000-00000000000b'),
  '2026-10-01 10:00+00'::timestamptz,
  'publishing sets the first publication'
);

update public.masters set published_at = null, first_published_at = null where id = '00000000-0000-0000-0000-00000000000b';

select is(
  (select first_published_at from public.masters where id = '00000000-0000-0000-0000-00000000000b'),
  '2026-10-01 10:00+00'::timestamptz,
  'unpublishing keeps the first publication, whatever the writer supplies'
);

-- A published master changes the slug

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');

select lives_ok(
  $$ update public.masters set slug = 'anna-nails' where id = '00000000-0000-0000-0000-00000000000a' $$,
  'a published master changes the slug'
);

select results_eq(
  $$ select slug, master_id from public.retired_slugs $$,
  $$ values ('anna', '00000000-0000-0000-0000-00000000000a'::uuid) $$,
  'the old slug is retired for the master'
);

reset role;

select is(
  (select count(*)::integer from private.slug_changes where master_id = '00000000-0000-0000-0000-00000000000a'),
  1,
  'the change is logged'
);

set local role anon;

select is(public.resolve_landing_slug('anna'), 'anna-nails', 'a retired slug resolves to the current one');

-- Limits

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');

select throws_ok(
  $$ update public.masters set slug = 'anna-studio' where id = '00000000-0000-0000-0000-00000000000a' $$,
  'P0001', 'slug_change_locked',
  'a second change at once is locked'
);

reset role;
update private.slug_changes set changed_at = now() - interval '30 days'
where master_id = '00000000-0000-0000-0000-00000000000a';
set local role authenticated;

select lives_ok(
  $$ update public.masters set slug = 'anna-studio' where id = '00000000-0000-0000-0000-00000000000a' $$,
  'a change 30 days after the last one is allowed'
);

select is(public.resolve_landing_slug('anna'), 'anna-studio', 'after two renames the first slug resolves to the current one');

reset role;
delete from private.slug_changes where master_id = '00000000-0000-0000-0000-00000000000a';
insert into private.slug_changes (master_id, changed_at) values
  ('00000000-0000-0000-0000-00000000000a', now() - interval '300 days'),
  ('00000000-0000-0000-0000-00000000000a', now() - interval '200 days'),
  ('00000000-0000-0000-0000-00000000000a', now() - interval '100 days');
set local role authenticated;

select throws_ok(
  $$ update public.masters set slug = 'anna-kyiv' where id = '00000000-0000-0000-0000-00000000000a' $$,
  'P0001', 'slug_change_locked',
  'a fourth change within 365 days is locked'
);

select results_eq(
  $$ select limited, next_change_at, changes_left from public.get_slug_policy() $$,
  $$ values (true, now() - interval '300 days' + interval '365 days', 0) $$,
  'the policy shows the date a year after the oldest of the three changes and no changes left'
);

reset role;
update private.slug_changes set changed_at = now() - interval '366 days'
where master_id = '00000000-0000-0000-0000-00000000000a' and changed_at = now() - interval '300 days';
set local role authenticated;

select results_eq(
  $$ select limited, next_change_at, changes_left from public.get_slug_policy() $$,
  $$ values (true, null::timestamptz, 1) $$,
  'with the oldest change over a year ago a change is open and one is left'
);

select lives_ok(
  $$ update public.masters set slug = 'anna-kyiv' where id = '00000000-0000-0000-0000-00000000000a' $$,
  'a change is allowed once the oldest of three is over a year ago'
);

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');

select results_eq(
  $$ select limited, next_change_at, changes_left from public.get_slug_policy() $$,
  $$ values (true, null::timestamptz, 3) $$,
  'a published master with no changes has three left'
);

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');

select is_empty($$ select * from public.get_slug_policy() $$, 'a non-master has no slug policy');

-- Taken slugs

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');

select throws_ok(
  $$ update public.masters set slug = 'anna' where id = '00000000-0000-0000-0000-00000000000b' $$,
  'P0001', 'slug_taken',
  'another master cannot take a retired slug'
);

select throws_ok(
  $$ update public.masters set slug = 'anna-kyiv' where id = '00000000-0000-0000-0000-00000000000b' $$,
  '23505', null,
  'another master cannot take a current slug'
);

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');

select throws_ok(
  $$ insert into public.masters (id, slug, name) values ('00000000-0000-0000-0000-00000000000c', 'anna-nails', 'Iryna') $$,
  'P0001', 'slug_taken',
  'a new master cannot start on a retired slug'
);

-- Returning to an old slug

reset role;
delete from private.slug_changes where master_id = '00000000-0000-0000-0000-00000000000a';
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');

select lives_ok(
  $$ update public.masters set slug = 'anna' where id = '00000000-0000-0000-0000-00000000000a' $$,
  'a master returns to an own retired slug'
);

select results_eq(
  $$ select slug from public.retired_slugs order by slug $$,
  $$ values ('anna-kyiv'), ('anna-nails'), ('anna-studio') $$,
  'the returned slug is current again and the previous one is retired'
);

reset role;

select is(
  (select count(*)::integer from private.slug_changes where master_id = '00000000-0000-0000-0000-00000000000a'),
  1,
  'returning counts as a change'
);

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');

select is(public.resolve_landing_slug('anna-nails'), 'anna', 'every retired slug resolves to the current one');

-- Availability

select ok(public.is_slug_available('anna'), 'the own current slug is available');
select ok(public.is_slug_available('anna-nails'), 'an own retired slug is available');
select ok(not public.is_slug_available('maria-nails'), 'another master''s current slug is not available');
select ok(not public.is_slug_available('admin'), 'a reserved slug is not available');
select ok(not public.is_slug_available('Anna'), 'an invalid slug is not available');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');

select ok(not public.is_slug_available('anna-nails'), 'another master''s retired slug is not available');

-- Privileges

select is(
  (select count(*)::integer from public.retired_slugs),
  0,
  'a master does not see another master''s retired slugs'
);

select throws_ok(
  $$ insert into public.retired_slugs (slug, master_id) values ('maria', '00000000-0000-0000-0000-00000000000b') $$,
  '42501', null,
  'a master cannot add a retired slug'
);

select throws_ok(
  $$ update public.retired_slugs set master_id = '00000000-0000-0000-0000-00000000000b' $$,
  '42501', null,
  'a master cannot change retired slugs'
);

select throws_ok(
  $$ delete from public.retired_slugs $$,
  '42501', null,
  'a master cannot delete retired slugs'
);

reset role;

select ok(has_function_privilege('anon', 'public.resolve_landing_slug(text)', 'execute'), 'anon resolves landing slugs');
select ok(not has_function_privilege('anon', 'public.is_slug_available(text)', 'execute'), 'anon cannot check availability');
select ok(not has_function_privilege('anon', 'public.get_slug_policy()', 'execute'), 'anon has no slug policy');

-- Account deletion

delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';

select results_eq(
  $$ select slug, master_id from public.retired_slugs order by slug $$,
  $$ values
       ('anna', null::uuid),
       ('anna-kyiv', null::uuid),
       ('anna-nails', null::uuid),
       ('anna-studio', null::uuid) $$,
  'a deleted master''s current and retired slugs stay taken with no owner'
);

set local role anon;

select is(public.resolve_landing_slug('anna'), null, 'a slug of a deleted master resolves to nothing');
select is(public.resolve_landing_slug('anna-nails'), null, 'a retired slug of a deleted master resolves to nothing');

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');

select ok(not public.is_slug_available('anna'), 'a deleted master''s slug is not available');

select throws_ok(
  $$ update public.masters set slug = 'anna' where id = '00000000-0000-0000-0000-00000000000b' $$,
  'P0001', 'slug_taken',
  'another master cannot take a deleted master''s slug'
);

reset role;

select * from finish();

rollback;
