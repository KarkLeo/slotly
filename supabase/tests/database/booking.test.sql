begin;

select plan(44);

create function pg_temp.slot(hours integer)
returns timestamptz
language sql
stable
as $$
  select date_trunc('hour', now()) + interval '1 day' + make_interval(hours => hours);
$$;

grant execute on function pg_temp.slot(integer) to anon, authenticated;

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000000a', 'olena@example.com', now()),
  ('00000000-0000-0000-0000-00000000000b', 'daryna@example.com', now()),
  ('00000000-0000-0000-0000-00000000000c', 'client@example.com', now()),
  ('00000000-0000-0000-0000-00000000000d', 'draft@example.com', now());

insert into public.masters (id, slug, name, published_at, auto_confirm, max_active_bookings) values
  ('00000000-0000-0000-0000-00000000000a', 'olena', 'Olena', now(), true, 2),
  ('00000000-0000-0000-0000-00000000000b', 'daryna', 'Daryna', now(), false, 3),
  ('00000000-0000-0000-0000-00000000000d', 'draft', 'Draft', null, true, 3);

insert into public.services (id, master_id, name, duration_minutes, buffer_minutes, price_kind, format, archived_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', '{"uk": "Манікюр"}', 60, 15, 'none', 'on_site', null),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000a', '{"uk": "Виїзд"}', 60, 0, 'none', 'at_client', null),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-00000000000a', '{"uk": "Старе"}', 60, 0, 'none', 'on_site', now()),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', '{"uk": "Стрижка"}', 60, 0, 'none', 'on_site', null),
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000000d', '{"uk": "Чернетка"}', 60, 0, 'none', 'on_site', null);

insert into public.work_template (master_id, weekday, hours)
select m, d, '{[0,1440)}'
from unnest(array[
  '00000000-0000-0000-0000-00000000000a',
  '00000000-0000-0000-0000-00000000000b',
  '00000000-0000-0000-0000-00000000000d'
]::uuid[]) as m
cross join generate_series(1, 7) as d;

insert into public.client_cards (id, master_id, user_id, name) values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c', 'Ірина з манікюру');

-- An earlier confirmed booking of the same client, and a pending one whose hold has run out.
insert into public.appointments (id, master_id, service_id, during, status, hold_until, source, locale) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   tstzrange(pg_temp.slot(10), pg_temp.slot(11)), 'confirmed', null, 'client', 'uk'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   tstzrange(pg_temp.slot(6), pg_temp.slot(7)), 'pending', now() - interval '1 minute', 'client', 'uk');

insert into public.appointment_clients (appointment_id, master_id, client_card_id, unconfirmed_email, name) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000ca', null, 'Iryna'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000000a', null, 'someone@example.com', 'Someone');

-- Booking as a visitor

set local role anon;

select ok(
  pg_temp.slot(6) in (
    select public.get_available_slots('00000000-0000-0000-0000-0000000000a1', (pg_temp.slot(6) at time zone 'Europe/Kyiv')::date, (pg_temp.slot(6) at time zone 'Europe/Kyiv')::date)
  ),
  'a pending appointment whose hold has run out does not take its slot'
);

create temporary table booked on commit drop as
select * from public.book_appointment(
  '00000000-0000-0000-0000-0000000000b1', pg_temp.slot(2), '  Mark  ', ' Mark@Example.com ', 'en'
);

reset role;

select results_eq(
  $$ select hold_until from booked $$,
  $$ values (now() + interval '15 minutes') $$,
  'a new booking holds its time for 15 minutes'
);

select results_eq(
  $$ select a.master_id, a.service_id, a.during, a.buffer_minutes, a.status::text, a.hold_until, a.source::text, a.locale::text, a.contact_confirmed_at
     from public.appointments a join booked b on b.appointment_id = a.id $$,
  $$ values ('00000000-0000-0000-0000-00000000000b'::uuid, '00000000-0000-0000-0000-0000000000b1'::uuid,
             tstzrange(pg_temp.slot(2), pg_temp.slot(3)), 0, 'pending', now() + interval '15 minutes', 'client', 'en', null::timestamptz) $$,
  'the appointment is pending, from the client, in the client''s language'
);

select results_eq(
  $$ select ac.master_id, ac.client_card_id, ac.unconfirmed_email, ac.name, ac.address
     from public.appointment_clients ac join booked b on b.appointment_id = ac.appointment_id $$,
  $$ values ('00000000-0000-0000-0000-00000000000b'::uuid, null::uuid, 'mark@example.com', 'Mark', null::text) $$,
  'the booking keeps the typed name and the email until the contact is confirmed'
);

set local role anon;

select throws_ok(
  $$ select public.book_appointment('00000000-0000-0000-0000-0000000000b1', pg_temp.slot(2), 'Anna', 'anna@example.com', 'uk') $$,
  'P0001', 'slot_unavailable',
  'a taken slot is refused'
);

select throws_ok(
  $$ select public.book_appointment('00000000-0000-0000-0000-0000000000b1', pg_temp.slot(2) + interval '30 minutes', 'Anna', 'anna@example.com', 'uk') $$,
  'P0001', 'slot_unavailable',
  'an overlapping time is refused'
);

select throws_ok(
  $$ select public.book_appointment('00000000-0000-0000-0000-0000000000b1', pg_temp.slot(4) + interval '5 minutes', 'Anna', 'anna@example.com', 'uk') $$,
  'P0001', 'slot_unavailable',
  'a time off the slot grid is refused'
);

select throws_ok(
  $$ select public.book_appointment('00000000-0000-0000-0000-0000000000b1', date_trunc('hour', now()) + interval '1 hour', 'Anna', 'anna@example.com', 'uk') $$,
  'P0001', 'slot_unavailable',
  'a time inside the minimum notice is refused'
);

select throws_ok(
  $$ select public.book_appointment('00000000-0000-0000-0000-0000000000b1', date_trunc('hour', now()) + interval '40 days', 'Anna', 'anna@example.com', 'uk') $$,
  'P0001', 'slot_unavailable',
  'a time past the horizon is refused'
);

select throws_ok(
  $$ select public.book_appointment('00000000-0000-0000-0000-0000000000a3', pg_temp.slot(4), 'Anna', 'anna@example.com', 'uk') $$,
  'P0001', 'service_not_found',
  'an archived service cannot be booked'
);

select throws_ok(
  $$ select public.book_appointment('00000000-0000-0000-0000-0000000000d1', pg_temp.slot(4), 'Anna', 'anna@example.com', 'uk') $$,
  'P0001', 'service_not_found',
  'an unpublished master cannot be booked'
);

select throws_ok(
  $$ select public.book_appointment('00000000-0000-0000-0000-0000000000b1', pg_temp.slot(4), '   ', 'anna@example.com', 'uk') $$,
  'P0001', 'invalid_name',
  'a name is required'
);

select throws_ok(
  $$ select public.book_appointment('00000000-0000-0000-0000-0000000000b1', pg_temp.slot(4), 'Anna', 'anna@', 'uk') $$,
  'P0001', 'invalid_email',
  'the email must look like an email'
);

select throws_ok(
  $$ select public.book_appointment('00000000-0000-0000-0000-0000000000a2', pg_temp.slot(4), 'Anna', 'anna@example.com', 'uk') $$,
  'P0001', 'address_required',
  'a home visit needs an address'
);

select lives_ok(
  $$ select public.book_appointment('00000000-0000-0000-0000-0000000000a2', pg_temp.slot(4), 'Anna', 'anna@example.com', 'uk', ' Khreshchatyk 1 ') $$,
  'a home visit with an address can be booked'
);

select lives_ok(
  $$ select public.book_appointment('00000000-0000-0000-0000-0000000000b1', pg_temp.slot(5), 'Anna', 'anna@example.com', 'uk', 'Ignored street') $$,
  'an address for a service at the master''s place is ignored'
);

reset role;

select results_eq(
  $$ select s.format::text, ac.address
     from public.appointment_clients ac
     join public.appointments a on a.id = ac.appointment_id
     join public.services s on s.id = a.service_id
     where ac.unconfirmed_email = 'anna@example.com'
     order by lower(a.during) $$,
  $$ values ('at_client', 'Khreshchatyk 1'), ('on_site', null::text) $$,
  'only a home visit keeps the address'
);

-- A run-out hold

set local role anon;

select lives_ok(
  $$ select public.book_appointment('00000000-0000-0000-0000-0000000000a1', pg_temp.slot(6), 'Anna', 'anna2@example.com', 'uk') $$,
  'a slot whose pending hold has run out can be booked'
);

reset role;

select is_empty(
  $$ select 1 from private.busy_times where appointment_id = '00000000-0000-0000-0000-0000000000f2' $$,
  'the run-out pending appointment no longer takes its time'
);

-- Active bookings limit (Olena allows 2)

set local role anon;

select lives_ok(
  $$ select public.book_appointment('00000000-0000-0000-0000-0000000000a1', pg_temp.slot(12), 'Iryna', 'CLIENT@example.com', 'uk') $$,
  'a client with one confirmed booking may hold one more'
);

select throws_ok(
  $$ select public.book_appointment('00000000-0000-0000-0000-0000000000a1', pg_temp.slot(14), 'Iryna', 'client@example.com', 'uk') $$,
  'P0001', 'booking_limit_reached',
  'confirmed and pending bookings of the same contact count toward the limit'
);

select lives_ok(
  $$ select public.book_appointment('00000000-0000-0000-0000-0000000000b1', pg_temp.slot(14), 'Iryna', 'client@example.com', 'uk') $$,
  'the limit is per master'
);

-- Releasing a booking

create temporary table released on commit drop as
select * from public.book_appointment(
  '00000000-0000-0000-0000-0000000000b1', pg_temp.slot(16), 'Oksana', 'oksana@example.com', 'uk'
);

select lives_ok(
  $$ select public.release_booking((select appointment_id from released)) $$,
  'a visitor can release the booking they just made'
);

select lives_ok(
  $$ select public.book_appointment('00000000-0000-0000-0000-0000000000b1', pg_temp.slot(16), 'Oksana', 'oksana.k@example.com', 'uk') $$,
  'a released slot can be booked again'
);

select lives_ok(
  $$ select public.release_booking('00000000-0000-0000-0000-0000000000f1') $$,
  'releasing a booking that is not waiting for its contact does nothing'
);

reset role;

select results_eq(
  $$ select a.status::text, a.cancelled_by::text from public.appointments a join released r on r.appointment_id = a.id $$,
  $$ values ('cancelled', 'client') $$,
  'a released booking is cancelled by the client'
);

select results_eq(
  $$ select status::text from public.appointments where id = '00000000-0000-0000-0000-0000000000f1' $$,
  $$ values ('confirmed') $$,
  'a confirmed booking cannot be released'
);

-- Claiming bookings after contact confirmation

create temporary table client_bookings on commit drop as
select ac.master_id, ac.appointment_id, ac.unconfirmed_email
from public.appointment_clients ac
where ac.unconfirmed_email in ('client@example.com', 'mark@example.com', 'anna@example.com');

grant select on client_bookings to anon, authenticated;

set local role anon;

select throws_ok(
  $$ select public.claim_bookings('{}') $$,
  '42501', null,
  'visitors cannot claim bookings'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}', true);

select throws_ok(
  $$ select unconfirmed_email from public.appointment_clients $$,
  '42501', null,
  'the unconfirmed email is hidden from users'
);

create temporary table claimed on commit drop as
select * from public.claim_bookings(array(
  select appointment_id from client_bookings
  where master_id = '00000000-0000-0000-0000-00000000000b'
));

select results_eq(
  $$ select count(*)::integer from claimed $$,
  $$ values (1) $$,
  'only the listed bookings made with the user''s own email are claimed'
);

insert into claimed
select * from public.claim_bookings(array(
  select appointment_id from client_bookings
  where master_id = '00000000-0000-0000-0000-00000000000a' or unconfirmed_email = 'mark@example.com'
));

reset role;

select results_eq(
  $$ select a.master_id, c.status::text, c.hold_until, a.status::text, a.hold_until, a.contact_confirmed_at
     from claimed c join public.appointments a on a.id = c.appointment_id
     order by a.master_id $$,
  $$ values
     ('00000000-0000-0000-0000-00000000000a'::uuid, 'confirmed', null::timestamptz, 'confirmed', null::timestamptz, now()),
     ('00000000-0000-0000-0000-00000000000b'::uuid, 'pending', now() + interval '24 hours', 'pending', now() + interval '24 hours', now()) $$,
  'claimed bookings are confirmed, or wait 24 hours for a master without auto-confirm'
);

select results_eq(
  $$ select ac.master_id, cc.user_id, cc.name, ac.name, ac.unconfirmed_email
     from claimed c
     join public.appointment_clients ac on ac.appointment_id = c.appointment_id
     join public.client_cards cc on cc.id = ac.client_card_id
     order by ac.master_id $$,
  $$ values
     ('00000000-0000-0000-0000-00000000000a'::uuid, '00000000-0000-0000-0000-00000000000c'::uuid, 'Ірина з манікюру', 'Iryna', null::text),
     ('00000000-0000-0000-0000-00000000000b'::uuid, '00000000-0000-0000-0000-00000000000c'::uuid, 'Iryna', 'Iryna', null::text) $$,
  'the booking joins the existing card, or a new card named as the client typed'
);

select is(
  (select count(*) from public.client_cards where user_id = '00000000-0000-0000-0000-00000000000c')::integer,
  2,
  'no duplicate card is created'
);

select results_eq(
  $$ select count(*)::integer from public.appointment_clients where unconfirmed_email = 'mark@example.com' $$,
  $$ values (1) $$,
  'a listed booking of another email stays unclaimed'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}', true);

select is_empty(
  $$ select * from public.claim_bookings(array(select appointment_id from client_bookings)) $$,
  'claiming twice claims nothing'
);

select ok(
  exists (select 1 from public.appointment_clients ac join claimed c on c.appointment_id = ac.appointment_id),
  'the client now sees the claimed bookings'
);

reset role;

-- A run-out hold

update public.appointments a
set hold_until = now() - interval '1 second'
from client_bookings b
where b.appointment_id = a.id and b.unconfirmed_email = 'anna@example.com';

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000e1', 'anna@example.com', now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated"}', true);

select is_empty(
  $$ select * from public.claim_bookings(array(select appointment_id from client_bookings)) $$,
  'a booking whose hold has run out is not claimed'
);

reset role;

-- Other writes over run-out holds

insert into public.appointments (id, master_id, service_id, during, status, hold_until, source, locale) values
  ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   tstzrange(pg_temp.slot(18), pg_temp.slot(19)), 'pending', now() - interval '1 minute', 'client', 'uk'),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   tstzrange(pg_temp.slot(20), pg_temp.slot(21)), 'pending', now() - interval '1 minute', 'client', 'uk');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.blocks (master_id, during) values ('00000000-0000-0000-0000-00000000000a', tstzrange(pg_temp.slot(18), pg_temp.slot(19))) $$,
  'a master can block time held by a run-out pending appointment'
);

select lives_ok(
  $$ select public.reschedule_appointment('00000000-0000-0000-0000-0000000000f1', pg_temp.slot(20)) $$,
  'a master can move an appointment onto time held by a run-out pending appointment'
);

reset role;

select is_empty(
  $$ select 1 from private.busy_times
     where appointment_id in ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000f6') $$,
  'the run-out holds no longer take their time'
);

-- A master booking on own landing

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}', true);

select lives_ok(
  $$ select public.book_appointment(
       '00000000-0000-0000-0000-0000000000b1',
       (select min(s) from public.get_available_slots('00000000-0000-0000-0000-0000000000b1',
          (now() at time zone 'Europe/Kyiv')::date, (now() at time zone 'Europe/Kyiv')::date + 1) as s),
       'Daryna', 'daryna@example.com', 'uk') $$,
  'a master books the nearest slot shown on own landing'
);

reset role;

-- Privileges

select ok(
  has_function_privilege('anon', 'public.book_appointment(uuid, timestamptz, text, text, public.locale, text)', 'execute')
  and has_function_privilege('anon', 'public.release_booking(uuid)', 'execute'),
  'visitors may book and release'
);

select ok(
  not has_function_privilege('anon', 'public.claim_bookings(uuid[])', 'execute')
  and has_function_privilege('authenticated', 'public.claim_bookings(uuid[])', 'execute'),
  'only signed-in users may claim'
);

select ok(
  not has_function_privilege('anon', 'private.free_run_out_holds()', 'execute')
  and not has_function_privilege('authenticated', 'private.free_run_out_holds()', 'execute'),
  'freeing run-out holds is internal'
);

select * from finish();

rollback;
