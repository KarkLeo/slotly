begin;

select plan(14);

-- A date some days ahead in Bogota (UTC-5); the master works 09:00–18:00 in Tokyo (UTC+9), 14 hours ahead.
create function pg_temp.day(days integer)
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Bogota')::date + days;
$$;

create function pg_temp.act_as(user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

grant execute on function pg_temp.day(integer), pg_temp.act_as(uuid) to service_role, authenticated, anon;

-- Deliveries are requested only once Vault knows where to send them.
delete from vault.secrets where name in ('notifications_url', 'notifications_secret');
delete from private.notifications;

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000000a', 'aiko@example.com', now()),
  ('00000000-0000-0000-0000-0000000000c1', 'mark@example.com', now());

insert into public.masters (id, slug, name, timezone, slot_step_minutes, published_at, auto_confirm) values
  ('00000000-0000-0000-0000-00000000000a', 'aiko', 'Aiko', 'Asia/Tokyo', 60, now(), false);

insert into public.services (id, master_id, name, duration_minutes, buffer_minutes, price_kind, format) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', '{"uk": "Консультація"}', 60, 0, 'none', 'online'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000a', '{"uk": "Масаж"}', 60, 0, 'none', 'on_site');

insert into public.work_template (master_id, weekday, hours)
select '00000000-0000-0000-0000-00000000000a', d, '{[540,1080)}'
from generate_series(1, 7) as d;

-- Slots

set local role anon;

select results_eq(
  $$ select (s at time zone 'America/Bogota')::time
     from public.get_available_slots('00000000-0000-0000-0000-0000000000a1', pg_temp.day(5), pg_temp.day(5),
       time_zone => 'America/Bogota') as s $$,
  $$ values ('00:00'::time), ('01:00'), ('02:00'), ('03:00'), ('19:00'), ('20:00'), ('21:00'), ('22:00'), ('23:00') $$,
  'a day in the client''s zone gathers the slots of the two master days it overlaps'
);

select results_eq(
  $$ select (s at time zone 'Asia/Tokyo')::time
     from public.get_available_slots('00000000-0000-0000-0000-0000000000a1', pg_temp.day(5), pg_temp.day(5)) as s $$,
  $$ select make_time(h, 0, 0) from generate_series(9, 17) as h $$,
  'without a zone the day is the master''s'
);

select results_eq(
  $$ select (s at time zone 'Asia/Tokyo')::time
     from public.get_available_slots('00000000-0000-0000-0000-0000000000a1', pg_temp.day(5), pg_temp.day(5),
       time_zone => 'Asia/Tokyo') as s $$,
  $$ select make_time(h, 0, 0) from generate_series(9, 17) as h $$,
  'the master''s own zone gives the master''s day'
);

select throws_ok(
  $$ select public.get_available_slots('00000000-0000-0000-0000-0000000000a1', pg_temp.day(5), pg_temp.day(5),
       time_zone => 'Mars/Olympus') $$,
  'invalid_time_zone',
  'an unknown zone is refused'
);

reset role;

-- The master is off on the two days whose slots fall on the client's day 6.
insert into public.schedule_exceptions (master_id, day, hours) values
  ('00000000-0000-0000-0000-00000000000a', pg_temp.day(6), '{}'),
  ('00000000-0000-0000-0000-00000000000a', pg_temp.day(7), '{}');

set local role anon;

select results_eq(
  $$ select * from public.get_available_days('00000000-0000-0000-0000-0000000000a1', pg_temp.day(5), pg_temp.day(7),
       time_zone => 'America/Bogota') $$,
  $$ values (pg_temp.day(5)), (pg_temp.day(7)) $$,
  'free days are dates in the client''s zone'
);

select results_eq(
  $$ select * from public.get_available_days('00000000-0000-0000-0000-0000000000a1', pg_temp.day(5), pg_temp.day(7)) $$,
  $$ values (pg_temp.day(5)) $$,
  'without a zone free days are the master''s dates'
);

reset role;

-- Booking

create temporary table booked (name text primary key, appointment_id uuid) on commit drop;
grant all on booked to service_role, authenticated;

set local role service_role;

insert into booked
select v.name, b.appointment_id
from (values
  ('online', '00000000-0000-0000-0000-0000000000a1'::uuid, 0, 'America/Bogota'),
  ('online_master_zone', '00000000-0000-0000-0000-0000000000a1'::uuid, 1, 'Asia/Tokyo'),
  ('on_site', '00000000-0000-0000-0000-0000000000a2'::uuid, 2, 'America/Bogota')
) as v (name, service, hour, zone)
cross join lateral public.book_appointment(
  v.service, (pg_temp.day(5) + make_time(v.hour, 0, 0)) at time zone 'America/Bogota',
  'Mark', 'mark@example.com', 'uk', time_zone => v.zone
) b;

select results_eq(
  $$ select b.name, a.time_zone from public.appointments a join booked b on b.appointment_id = a.id order by b.name $$,
  $$ values ('on_site', null::text), ('online', 'America/Bogota'), ('online_master_zone', null) $$,
  'only an online booking in another zone keeps the client''s zone'
);

select throws_ok(
  $$ select public.book_appointment('00000000-0000-0000-0000-0000000000a1',
       (pg_temp.day(5) + time '03:00') at time zone 'America/Bogota',
       'Mark', 'mark@example.com', 'uk', time_zone => 'Mars/Olympus') $$,
  'invalid_time_zone',
  'booking in an unknown zone is refused'
);

select is(
  (select time_zone from public.booking_email_details((select appointment_id from booked where name = 'online'), 'mark@example.com')),
  'America/Bogota',
  'the code email shows the time in the client''s zone'
);

select is(
  (select time_zone from public.booking_email_details((select appointment_id from booked where name = 'on_site'), 'mark@example.com')),
  'Asia/Tokyo',
  'the code email of a booking without a zone shows the master''s'
);

reset role;

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select * from public.claim_bookings(array(select appointment_id from booked));

select results_eq(
  $$ select b.name, m.time_zone, m.booking_time_zone
     from public.get_my_bookings() m join booked b using (appointment_id) order by b.name $$,
  $$ values ('on_site', 'Asia/Tokyo', 'Asia/Tokyo'),
            ('online', 'Asia/Tokyo', 'America/Bogota'),
            ('online_master_zone', 'Asia/Tokyo', 'Asia/Tokyo') $$,
  'my bookings carry the master''s zone for slots and the booking''s zone for its time'
);

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select public.confirm_appointment((select appointment_id from booked where name = 'online'));
reset role;

-- Notifications

set local role service_role;

create temporary table claimed on commit drop as
select * from public.claim_due_notifications(10);

select results_eq(
  $$ select c.audience, c.time_zone from claimed c
     where c.appointment_id = (select appointment_id from booked where name = 'online')
     order by c.audience $$,
  $$ values ('client', 'America/Bogota'), ('master', 'Asia/Tokyo') $$,
  'a client is notified in the booking''s zone, the master in their own'
);

reset role;

select is(
  (select time_zone from public.appointments where id = (select appointment_id from booked where name = 'online')),
  'America/Bogota',
  'confirming keeps the client''s zone'
);

select throws_ok(
  $$ update public.appointments set time_zone = 'Mars/Olympus'
     where id = (select appointment_id from booked where name = 'online') $$,
  '23514',
  null,
  'an appointment keeps only a known zone'
);

select * from finish();
rollback;
