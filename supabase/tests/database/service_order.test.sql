begin;

select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'olena@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'daryna@example.com');

insert into public.masters (id, slug, name, published_at) values
  ('00000000-0000-0000-0000-00000000000a', 'olena', 'Olena', now()),
  ('00000000-0000-0000-0000-00000000000b', 'daryna', 'Daryna', now());

insert into public.service_categories (id, master_id, name, position) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a', '{"uk": "Нігті"}', 0),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-00000000000a', '{"uk": "Брови"}', 1),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-00000000000b', '{"uk": "Волосся"}', 0);

insert into public.services (id, master_id, name, duration_minutes, price_kind, position) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', '{"uk": "Манікюр"}', 60, 'none', 0),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000a', '{"uk": "Педикюр"}', 60, 'none', 0),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-00000000000a', '{"uk": "Френч"}', 60, 'none', 7),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', '{"uk": "Стрижка"}', 60, 'none', 5);

select throws_ok(
  format($$ insert into public.services (master_id, name, duration_minutes, price_kind)
     values ('00000000-0000-0000-0000-00000000000a', %L, 60, 'none') $$, jsonb_build_object('uk', repeat('я', 101))),
  '23514', null,
  'a service name is at most 100 characters in every locale'
);

select throws_ok(
  format($$ insert into public.services (master_id, name, description, duration_minutes, price_kind)
     values ('00000000-0000-0000-0000-00000000000a', '{"uk": "Манікюр"}', %L, 60, 'none') $$, jsonb_build_object('en', repeat('a', 1001))),
  '23514', null,
  'a service description is at most 1000 characters in every locale'
);

select throws_ok(
  format($$ insert into public.service_categories (master_id, name)
     values ('00000000-0000-0000-0000-00000000000a', %L) $$, jsonb_build_object('uk', repeat('я', 101))),
  '23514', null,
  'a category name is at most 100 characters in every locale'
);

select lives_ok(
  format($$ insert into public.services (master_id, name, description, duration_minutes, price_kind)
     values ('00000000-0000-0000-0000-00000000000b', %L, %L, 60, 'none') $$,
     jsonb_build_object('uk', repeat('я', 100)), jsonb_build_object('uk', repeat('я', 1000))),
  'texts of exactly the maximum length fit'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select public.reorder_services(array[
  '00000000-0000-0000-0000-0000000000a3',
  '00000000-0000-0000-0000-0000000000a1'
]::uuid[]);

select results_eq(
  $$ select id, position from public.services where id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a3') order by position $$,
  $$ values ('00000000-0000-0000-0000-0000000000a3'::uuid, 0), ('00000000-0000-0000-0000-0000000000a1'::uuid, 1) $$,
  'services take positions from the order of the list'
);

select is(
  (select position from public.services where id = '00000000-0000-0000-0000-0000000000a2'),
  0,
  'services outside the list keep their position'
);

select public.reorder_service_categories(array[
  '00000000-0000-0000-0000-0000000000c2',
  '00000000-0000-0000-0000-0000000000c1'
]::uuid[]);

select results_eq(
  $$ select id from public.service_categories where master_id = '00000000-0000-0000-0000-00000000000a' order by position $$,
  $$ values ('00000000-0000-0000-0000-0000000000c2'::uuid), ('00000000-0000-0000-0000-0000000000c1'::uuid) $$,
  'categories take positions from the order of the list'
);

select public.reorder_services(array['00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1']::uuid[]);
select public.reorder_service_categories(array['00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c3']::uuid[]);

reset role;

select is(
  (select position from public.services where id = '00000000-0000-0000-0000-0000000000b1'),
  5,
  'a master cannot reorder another master''s services'
);

select is(
  (select position from public.service_categories where id = '00000000-0000-0000-0000-0000000000c3'),
  0,
  'a master cannot reorder another master''s categories'
);

select is(
  (select position from public.services where id = '00000000-0000-0000-0000-0000000000a1'),
  0,
  'own services in the same list still move'
);

set local role anon;

select throws_ok(
  $$ select public.reorder_services(array['00000000-0000-0000-0000-0000000000a1']::uuid[]) $$,
  '42501', null,
  'visitors cannot reorder services'
);

select throws_ok(
  $$ select public.reorder_service_categories(array['00000000-0000-0000-0000-0000000000c1']::uuid[]) $$,
  '42501', null,
  'visitors cannot reorder categories'
);

reset role;

select * from finish();
rollback;
