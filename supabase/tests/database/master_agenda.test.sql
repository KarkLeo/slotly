begin;

select plan(15);

create function pg_temp.act_as(user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

grant execute on function pg_temp.act_as(uuid) to service_role, authenticated;

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000000a', 'olena@example.com', now()),
  ('00000000-0000-0000-0000-00000000000b', 'daryna@example.com', now()),
  ('00000000-0000-0000-0000-0000000000c1', 'mark@example.com', now());

insert into public.masters (id, slug, name, published_at, timezone) values
  ('00000000-0000-0000-0000-00000000000a', 'olena', 'Olena', now(), 'Europe/Kyiv'),
  ('00000000-0000-0000-0000-00000000000b', 'daryna', 'Daryna', now(), 'America/New_York');

insert into public.services (id, master_id, name, duration_minutes, buffer_minutes, price_kind, price, format) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', '{"uk": "Манікюр"}', 60, 0, 'fixed', 900, 'on_site'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', '{"uk": "Стрижка"}', 60, 0, 'none', null, 'on_site');

insert into public.client_cards (id, master_id, user_id, name) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c1', 'Mark Card'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-00000000000b', null, 'Walk-in');

set local role service_role;

insert into public.blocks (master_id, during, note) values
  ('00000000-0000-0000-0000-00000000000a',
   tstzrange('2026-10-24 22:00 Europe/Kyiv', '2026-10-26 02:00 Europe/Kyiv'), 'Trip');

-- Ids 1-5 are master A's: late, cancelled, unconfirmed, expired, awaiting; id 6 is master B's.
insert into public.appointments (id, master_id, service_id, during, status, hold_until, contact_confirmed_at, cancelled_by, source, locale)
values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   tstzrange('2026-10-17 23:30 Europe/Kyiv', '2026-10-18 00:30 Europe/Kyiv'), 'confirmed', null, now(), null, 'client', 'uk'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   tstzrange('2026-10-18 10:00 Europe/Kyiv', '2026-10-18 11:00 Europe/Kyiv'), 'cancelled', null, now(), 'master', 'client', 'uk'),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   tstzrange(date_trunc('hour', now()) + interval '3 days', date_trunc('hour', now()) + interval '3 days 1 hour'),
   'pending', now() + interval '2 days', null, null, 'client', 'uk'),
  ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   tstzrange(date_trunc('hour', now()) + interval '4 days', date_trunc('hour', now()) + interval '4 days 1 hour'),
   'pending', now() - interval '1 minute', now() - interval '1 hour', null, 'client', 'uk'),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   tstzrange(date_trunc('hour', now()) + interval '5 days', date_trunc('hour', now()) + interval '5 days 1 hour'),
   'pending', now() + interval '2 hours', now(), null, 'client', 'uk'),
  ('00000000-0000-0000-0000-0000000000e6', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1',
   tstzrange('2026-10-25 01:00Z', '2026-10-25 02:00Z'), 'confirmed', null, now(), null, 'client', 'uk');

insert into public.appointment_clients (appointment_id, master_id, client_card_id, name)
select a.id, a.master_id,
  case a.master_id when '00000000-0000-0000-0000-00000000000a' then '00000000-0000-0000-0000-0000000000d1'::uuid
    else '00000000-0000-0000-0000-0000000000d2'::uuid end,
  'Booked as'
from public.appointments a
where a.id::text like '00000000-%';

reset role;

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');

select results_eq(
  $$ select day, starts_at, ends_at, all_day from public.get_master_agenda('2026-10-24', '2026-10-26') where kind = 'block' order by day $$,
  $$ values
    (date '2026-10-24', timestamptz '2026-10-24 22:00 Europe/Kyiv', timestamptz '2026-10-25 00:00 Europe/Kyiv', false),
    (date '2026-10-25', timestamptz '2026-10-25 00:00 Europe/Kyiv', timestamptz '2026-10-26 00:00 Europe/Kyiv', true),
    (date '2026-10-26', timestamptz '2026-10-26 00:00 Europe/Kyiv', timestamptz '2026-10-26 02:00 Europe/Kyiv', false) $$,
  'a block across midnight splits by local days and the 25-hour day is whole'
);

select is(
  (select extract(epoch from ends_at - starts_at)::integer / 3600
   from public.get_master_agenda('2026-10-25', '2026-10-25') where kind = 'block'),
  25,
  'the block day on the end of daylight saving time lasts 25 hours'
);

select results_eq(
  $$ select id, day, all_day, note from public.get_master_agenda('2026-10-17', '2026-10-18') where kind = 'appointment' $$,
  $$ values ('00000000-0000-0000-0000-0000000000e1'::uuid, date '2026-10-17', false, null::text) $$,
  'an appointment crossing midnight is one row on the day it starts, and a cancelled one is absent'
);

select results_eq(
  $$ select id from public.get_master_agenda(current_date - 30, current_date + 30) where kind = 'appointment' and status = 'pending' $$,
  $$ values ('00000000-0000-0000-0000-0000000000e5'::uuid) $$,
  'of the pending appointments only the awaiting one is in the agenda'
);

select results_eq(
  $$ select client_name, hold_until > now(), service_name ->> 'uk' from public.get_master_agenda(current_date - 30, current_date + 30) where id = '00000000-0000-0000-0000-0000000000e5' $$,
  $$ values ('Mark Card', true, 'Манікюр') $$,
  'the client name is the client card name, not the booked name'
);

select results_eq(
  $$ select appointment_id, client_name, service_name ->> 'uk' from public.get_awaiting_decisions() $$,
  $$ values ('00000000-0000-0000-0000-0000000000e5'::uuid, 'Mark Card', 'Манікюр') $$,
  'only a pending appointment with a confirmed contact and a live hold awaits a decision'
);

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');

select is(
  (select count(*)::integer from public.get_master_agenda(current_date - 30, current_date + 30) where id <> '00000000-0000-0000-0000-0000000000e6'),
  0,
  'a master does not see the rows of another master'
);

select is(
  (select day from public.get_master_agenda('2026-10-24', '2026-10-26') where id = '00000000-0000-0000-0000-0000000000e6'),
  date '2026-10-24',
  'the day of an appointment is in the master''s zone, not UTC''s'
);

select is(
  (select count(*)::integer from public.get_awaiting_decisions()),
  0,
  'a master does not see the awaiting decisions of another master'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');

select is(
  (select count(*)::integer from public.get_master_agenda(current_date - 30, current_date + 30)),
  0,
  'a client who is not a master gets an empty agenda'
);

select is(
  (select count(*)::integer from public.get_awaiting_decisions()),
  0,
  'a client who is not a master gets no awaiting decisions'
);

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');

select throws_ok(
  $$ select * from public.get_master_agenda('2026-10-26', '2026-10-25') $$,
  'invalid_range',
  'a range that ends before it starts is invalid'
);

select throws_ok(
  $$ select * from public.get_master_agenda('2026-10-01', '2026-12-03') $$,
  'invalid_range',
  'a range of 63 days is invalid'
);

reset role;
set local role anon;

select throws_ok(
  $$ select * from public.get_master_agenda('2026-10-24', '2026-10-26') $$,
  '42501',
  null,
  'anon cannot read an agenda'
);

select throws_ok(
  $$ select * from public.get_awaiting_decisions() $$,
  '42501',
  null,
  'anon cannot read awaiting decisions'
);

reset role;

select * from finish();

rollback;
