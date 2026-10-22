begin;

select plan(25);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'olena@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'daryna@example.com');

insert into public.masters (id, slug, name, published_at) values
  ('00000000-0000-0000-0000-00000000000a', 'olena', 'Olena', now()),
  ('00000000-0000-0000-0000-00000000000b', 'daryna', 'Daryna', null);

insert into public.service_categories (id, master_id, name) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a', '{"uk": "Нігті"}'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-00000000000b', '{"uk": "Волосся"}');

insert into public.services (id, master_id, category_id, name, duration_minutes, price_kind, price, archived_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c1', '{"uk": "Манікюр"}', 90, 'fixed', 900, null),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000a', null, '{"uk": "Старий дизайн"}', 30, 'none', null, now()),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000c2', '{"uk": "Стрижка"}', 60, 'from', 650, null);

select ok(private.is_localized_text('{"uk": "Манікюр", "en": "Manicure"}'), 'texts keyed by supported locales are valid');
select ok(private.is_localized_text('{}'), 'an empty localized text is valid');
select ok(not private.is_localized_text('{"de": "Maniküre"}'), 'unsupported locales are rejected');
select ok(not private.is_localized_text('{"uk": "  "}'), 'blank translations are rejected');
select ok(not private.is_localized_text('{"uk": 1}'), 'translations are strings');
select ok(not private.is_localized_text('["uk"]'), 'a localized text is an object');

select throws_ok(
  $$ insert into public.services (master_id, name, duration_minutes) values ('00000000-0000-0000-0000-00000000000a', '{}', 60) $$,
  '23514', null,
  'a service has a name in at least one locale'
);

select throws_ok(
  $$ insert into public.services (master_id, name, duration_minutes) values ('00000000-0000-0000-0000-00000000000a', '{"uk": "Манікюр"}', 62) $$,
  '23514', null,
  'durations are whole 5-minute steps'
);

select throws_ok(
  $$ insert into public.services (master_id, name, duration_minutes, price_kind, price) values ('00000000-0000-0000-0000-00000000000a', '{"uk": "Манікюр"}', 60, 'none', 500) $$,
  '23514', null,
  'a service without a price stores no amount'
);

select throws_ok(
  $$ insert into public.services (master_id, name, duration_minutes, price_kind) values ('00000000-0000-0000-0000-00000000000a', '{"uk": "Манікюр"}', 60, 'fixed') $$,
  '23514', null,
  'a fixed price needs an amount'
);

select throws_ok(
  $$ insert into public.services (master_id, category_id, name, duration_minutes, price_kind)
     values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c2', '{"uk": "Манікюр"}', 60, 'none') $$,
  '23503', null,
  'a service cannot use another master''s category'
);

set local role anon;

select results_eq(
  $$ select id from public.services $$,
  $$ values ('00000000-0000-0000-0000-0000000000a1'::uuid) $$,
  'visitors see active services of published masters only'
);

select results_eq(
  $$ select id from public.service_categories $$,
  $$ values ('00000000-0000-0000-0000-0000000000c1'::uuid) $$,
  'visitors see categories of published masters only'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}', true);

select results_eq(
  $$ select id from public.services order by id $$,
  $$ values ('00000000-0000-0000-0000-0000000000a1'::uuid), ('00000000-0000-0000-0000-0000000000b1'::uuid) $$,
  'a master sees all own services and the public ones of others'
);

select results_eq(
  $$ select id from public.service_categories where master_id = '00000000-0000-0000-0000-00000000000b' $$,
  $$ values ('00000000-0000-0000-0000-0000000000c2'::uuid) $$,
  'a master sees own categories before publishing'
);

select throws_ok(
  $$ update public.services set master_id = '00000000-0000-0000-0000-00000000000a', category_id = null
     where id = '00000000-0000-0000-0000-0000000000b1' $$,
  '42501', null,
  'a master cannot move own service to another master'
);

select throws_ok(
  $$ insert into public.service_categories (master_id, name) values ('00000000-0000-0000-0000-00000000000a', '{"uk": "Чуже"}') $$,
  '42501', null,
  'a master cannot add categories to another master'
);

select is_empty(
  $$ update public.services set price = 1 where id = '00000000-0000-0000-0000-0000000000a1' returning id $$,
  'a master cannot change another master''s service'
);

select is_empty(
  $$ delete from public.service_categories where id = '00000000-0000-0000-0000-0000000000c1' returning id $$,
  'a master cannot delete another master''s category'
);

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select results_eq(
  $$ select id from public.services where master_id = '00000000-0000-0000-0000-00000000000a' order by id $$,
  $$ values ('00000000-0000-0000-0000-0000000000a1'::uuid), ('00000000-0000-0000-0000-0000000000a2'::uuid) $$,
  'a master sees own archived services'
);

select lives_ok(
  $$ update public.services set archived_at = now() where id = '00000000-0000-0000-0000-0000000000a1' $$,
  'a master archives own service'
);

select throws_ok(
  $$ delete from public.services where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '42501', null,
  'services are archived, never deleted'
);

select lives_ok(
  $$ delete from public.service_categories where id = '00000000-0000-0000-0000-0000000000c1' $$,
  'a master deletes own category'
);

reset role;

select is(
  (select category_id from public.services where id = '00000000-0000-0000-0000-0000000000a1'),
  null,
  'services of a deleted category stay without a category'
);

update public.services set archived_at = null where id = '00000000-0000-0000-0000-0000000000a1';
update public.masters set published_at = null where id = '00000000-0000-0000-0000-00000000000a';
set local role anon;

select is_empty(
  $$ select id from public.services $$,
  'unpublishing hides the master''s services again'
);

reset role;

select * from finish();
rollback;
