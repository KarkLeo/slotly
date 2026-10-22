begin;

select plan(39);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'olena@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'daryna@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'client@example.com');

insert into public.masters (id, slug, name, published_at, slot_step_minutes) values
  ('00000000-0000-0000-0000-00000000000a', 'olena', 'Olena', now(), 60),
  ('00000000-0000-0000-0000-00000000000b', 'daryna', 'Daryna', null, 60);

insert into public.services (id, master_id, name, duration_minutes, buffer_minutes, price_kind, archived_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', '{"uk": "Манікюр"}', 60, 15, 'none', null),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000a', '{"uk": "Старе"}', 60, 0, 'none', now()),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', '{"uk": "Стрижка"}', 60, 0, 'none', null);

-- Olena works in Kyiv: Mon 9–13 and 14–18, Tue 9:30–12, Wed–Sat 9–13, Sun 22–24.
insert into public.work_template (master_id, weekday, hours) values
  ('00000000-0000-0000-0000-00000000000a', 1, '{[540,780),[840,1080)}'),
  ('00000000-0000-0000-0000-00000000000a', 2, '{[570,720)}'),
  ('00000000-0000-0000-0000-00000000000a', 3, '{[540,780)}'),
  ('00000000-0000-0000-0000-00000000000a', 4, '{[540,780)}'),
  ('00000000-0000-0000-0000-00000000000a', 5, '{[540,780)}'),
  ('00000000-0000-0000-0000-00000000000a', 6, '{[540,780)}'),
  ('00000000-0000-0000-0000-00000000000a', 7, '{[1320,1440)}');

insert into public.schedule_exceptions (master_id, day, hours) values
  ('00000000-0000-0000-0000-00000000000a', '2030-01-17', '{}'),
  ('00000000-0000-0000-0000-00000000000a', '2030-01-18', '{[900,1020)}'),
  ('00000000-0000-0000-0000-00000000000a', '2030-03-31', '{[120,360)}'),
  ('00000000-0000-0000-0000-00000000000a', '2030-10-27', '{[120,360)}');

insert into public.appointments (id, master_id, service_id, during, buffer_minutes, status, source, locale, cancelled_by) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   '[2030-01-16 08:00+00,2030-01-16 09:00+00)', 15, 'confirmed', 'client', 'uk', null),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   '[2030-01-16 10:00+00,2030-01-16 11:00+00)', 15, 'cancelled', 'client', 'uk', 'master');

insert into public.client_cards (id, master_id, user_id, name) values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c', 'Iryna');

insert into public.appointment_clients (appointment_id, master_id, client_card_id, name) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000ca', 'Iryna');

insert into public.blocks (master_id, during) values
  ('00000000-0000-0000-0000-00000000000a', '[2030-01-19 08:00+00,2030-01-19 09:00+00)');

-- private.available_slots(service, day_from, day_to, at, duration_minutes, ignore_appointment_id, ignore_booking_rules)

select results_eq(
  $$ select private.available_slots('00000000-0000-0000-0000-0000000000a1', '2030-01-14', '2030-01-14', '2030-01-01 00:00+00', null, null, false) $$,
  $$ values ('2030-01-14 07:00+00'::timestamptz), ('2030-01-14 08:00+00'), ('2030-01-14 09:00+00'), ('2030-01-14 10:00+00'),
            ('2030-01-14 12:00+00'), ('2030-01-14 13:00+00'), ('2030-01-14 14:00+00'), ('2030-01-14 15:00+00') $$,
  'slots fill each working interval in Kyiv time and end with it'
);

select results_eq(
  $$ select private.available_slots('00000000-0000-0000-0000-0000000000a1', '2030-01-15', '2030-01-15', '2030-01-01 00:00+00', null, null, false) $$,
  $$ values ('2030-01-15 07:30+00'::timestamptz), ('2030-01-15 08:30+00') $$,
  'the grid starts at the start of the working interval'
);

select results_eq(
  $$ select private.available_slots('00000000-0000-0000-0000-0000000000a1', '2030-01-16', '2030-01-16', '2030-01-01 00:00+00', null, null, false) $$,
  $$ values ('2030-01-16 10:00+00'::timestamptz) $$,
  'appointments block their time and buffer, and a slot keeps room for its own buffer; cancelled ones block nothing'
);

select is_empty(
  $$ select private.available_slots('00000000-0000-0000-0000-0000000000a1', '2030-01-17', '2030-01-17', '2030-01-01 00:00+00', null, null, false) $$,
  'a day off has no slots'
);

select results_eq(
  $$ select private.available_slots('00000000-0000-0000-0000-0000000000a1', '2030-01-18', '2030-01-18', '2030-01-01 00:00+00', null, null, false) $$,
  $$ values ('2030-01-18 13:00+00'::timestamptz), ('2030-01-18 14:00+00') $$,
  'special hours replace the template for that date'
);

select results_eq(
  $$ select private.available_slots('00000000-0000-0000-0000-0000000000a1', '2030-01-19', '2030-01-19', '2030-01-01 00:00+00', null, null, false) $$,
  $$ values ('2030-01-19 09:00+00'::timestamptz), ('2030-01-19 10:00+00') $$,
  'blocks take time away from slots'
);

select results_eq(
  $$ select private.available_slots('00000000-0000-0000-0000-0000000000a1', '2030-01-20', '2030-01-20', '2030-01-01 00:00+00', null, null, false) $$,
  $$ values ('2030-01-20 20:00+00'::timestamptz), ('2030-01-20 21:00+00') $$,
  'working hours may run until midnight'
);

select results_eq(
  $$ select private.available_slots('00000000-0000-0000-0000-0000000000a1', '2030-01-14', '2030-01-20', '2030-01-01 00:00+00', null, null, false) $$,
  $$ select private.available_slots('00000000-0000-0000-0000-0000000000a1', d::date, d::date, '2030-01-01 00:00+00', null, null, false)
     from generate_series('2030-01-14'::date, '2030-01-20'::date, '1 day') as d $$,
  'a range of days returns the slots of every day in order'
);

select results_eq(
  $$ select private.available_slots('00000000-0000-0000-0000-0000000000a1', '2030-01-14', '2030-01-14', '2030-01-14 06:30+00', null, null, false) $$,
  $$ values ('2030-01-14 09:00+00'::timestamptz), ('2030-01-14 10:00+00'),
            ('2030-01-14 12:00+00'), ('2030-01-14 13:00+00'), ('2030-01-14 14:00+00'), ('2030-01-14 15:00+00') $$,
  'clients book no sooner than the minimum notice'
);

select is_empty(
  $$ select private.available_slots('00000000-0000-0000-0000-0000000000a1', '2030-02-04', '2030-02-04', '2030-01-01 00:00+00', null, null, false) $$,
  'clients book no further ahead than the horizon'
);

select is(
  (select count(*)::int from private.available_slots('00000000-0000-0000-0000-0000000000a1', '2030-02-04', '2030-02-04', '2030-01-01 00:00+00', null, null, true)),
  8,
  'a master ignores the horizon'
);

select results_eq(
  $$ select private.available_slots('00000000-0000-0000-0000-0000000000a1', '2030-01-14', '2030-01-14', '2030-01-14 06:30+00', null, null, true) $$,
  $$ values ('2030-01-14 07:00+00'::timestamptz), ('2030-01-14 08:00+00'), ('2030-01-14 09:00+00'), ('2030-01-14 10:00+00'),
            ('2030-01-14 12:00+00'), ('2030-01-14 13:00+00'), ('2030-01-14 14:00+00'), ('2030-01-14 15:00+00') $$,
  'a master ignores the minimum notice but not the past'
);

select is_empty(
  $$ select private.available_slots('00000000-0000-0000-0000-0000000000a1', '2030-01-14', '2030-01-14', '2030-01-14 16:00+00', null, null, true) $$,
  'past slots are never offered'
);

select results_eq(
  $$ select private.available_slots('00000000-0000-0000-0000-0000000000a1', '2030-01-15', '2030-01-15', '2030-01-01 00:00+00', 30, null, true) $$,
  $$ values ('2030-01-15 07:30+00'::timestamptz), ('2030-01-15 08:30+00'), ('2030-01-15 09:30+00') $$,
  'a custom duration changes what fits'
);

select results_eq(
  $$ select private.available_slots('00000000-0000-0000-0000-0000000000a1', '2030-01-16', '2030-01-16', '2030-01-01 00:00+00', null, '00000000-0000-0000-0000-0000000000f1', false) $$,
  $$ values ('2030-01-16 07:00+00'::timestamptz), ('2030-01-16 08:00+00'), ('2030-01-16 09:00+00'), ('2030-01-16 10:00+00') $$,
  'the appointment being moved does not block its own time'
);

select results_eq(
  $$ select private.available_slots('00000000-0000-0000-0000-0000000000a1', '2030-01-19', '2030-01-19', '2030-01-01 00:00+00', null, '00000000-0000-0000-0000-0000000000f1', false) $$,
  $$ values ('2030-01-19 09:00+00'::timestamptz), ('2030-01-19 10:00+00') $$,
  'blocks still count while an appointment is being moved'
);

select results_eq(
  $$ select private.available_slots('00000000-0000-0000-0000-0000000000a1', '2030-03-31', '2030-03-31', '2030-01-01 00:00+00', null, null, true) $$,
  $$ values ('2030-03-31 00:00+00'::timestamptz), ('2030-03-31 01:00+00'), ('2030-03-31 02:00+00') $$,
  'on the spring switch the hour from 3:00 to 4:00 does not exist'
);

select results_eq(
  $$ select private.available_slots('00000000-0000-0000-0000-0000000000a1', '2030-10-27', '2030-10-27', '2030-01-01 00:00+00', null, null, true) $$,
  $$ values ('2030-10-26 23:00+00'::timestamptz), ('2030-10-27 00:00+00'), ('2030-10-27 01:00+00'), ('2030-10-27 02:00+00'), ('2030-10-27 03:00+00') $$,
  'on the autumn switch the hour from 3:00 to 4:00 happens twice'
);

select is(
  (select min(s) from private.available_slots('00000000-0000-0000-0000-0000000000a1', '2030-04-01', '2030-04-01', '2030-01-01 00:00+00', null, null, true) as s),
  '2030-04-01 06:00+00'::timestamptz,
  'after the spring switch 9:00 in Kyiv is 6:00 UTC'
);

select results_eq(
  $$ select private.available_slots('00000000-0000-0000-0000-0000000000a1', '2030-01-14', '2030-01-14', '2030-01-14 05:00+00', null, null, false) $$,
  $$ values ('2030-01-14 07:00+00'::timestamptz), ('2030-01-14 08:00+00'), ('2030-01-14 09:00+00'), ('2030-01-14 10:00+00'),
            ('2030-01-14 12:00+00'), ('2030-01-14 13:00+00'), ('2030-01-14 14:00+00'), ('2030-01-14 15:00+00') $$,
  'a slot exactly at the minimum notice is offered'
);

select is_empty(
  $$ select private.available_slots('00000000-0000-0000-0000-0000000000a1', '2030-01-15', '2030-01-15', '2030-01-01 00:00+00', 180, null, true) $$,
  'a service longer than the working interval does not fit'
);

select is_empty(
  $$ select private.available_slots('00000000-0000-0000-0000-0000000000b1', '2030-01-14', '2030-01-20', '2030-01-01 00:00+00', null, null, true) $$,
  'weekdays missing from the template are days off'
);

update public.schedule_exceptions set hours = '{[60,210),[240,300)}' where day = '2030-03-31';

select results_eq(
  $$ select private.available_slots('00000000-0000-0000-0000-0000000000a1', '2030-03-31', '2030-03-31', '2030-01-01 00:00+00', 30, null, true) $$,
  $$ values ('2030-03-30 23:00+00'::timestamptz), ('2030-03-31 00:00+00'), ('2030-03-31 01:00+00') $$,
  'intervals touching the skipped hour give each slot once'
);

update public.schedule_exceptions set hours = '{[210,240)}' where day = '2030-03-31';

select lives_ok(
  $$ select private.available_slots('00000000-0000-0000-0000-0000000000a1', '2030-03-31', '2030-03-31', '2030-01-01 00:00+00', null, null, true) $$,
  'an interval inside the skipped hour does not break the day'
);

insert into public.appointments (master_id, service_id, during, status, source, locale)
select '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
  tstzrange(t, t + interval '5 minutes'), 'confirmed', 'manual', 'uk'
from generate_series('2031-01-01 00:00+00'::timestamptz, '2031-01-31 00:00+00', interval '10 minutes') as t;
update public.work_template set hours = '{[0,1440)}' where master_id = '00000000-0000-0000-0000-00000000000a';
update public.masters set slot_step_minutes = 5 where id = '00000000-0000-0000-0000-00000000000a';
analyze private.busy_times;

select ok(
  (select clock_timestamp() - t < interval '1 second'
   from (select clock_timestamp() as t,
           (select count(*) from private.available_slots('00000000-0000-0000-0000-0000000000a1', '2031-01-01', '2031-03-03', '2030-01-01 00:00+00', 5, null, true))) as run),
  'two months of 5-minute slots against thousands of appointments take under a second'
);

update public.masters set slot_step_minutes = 60 where id = '00000000-0000-0000-0000-00000000000a';
delete from public.appointments where during && '[2031-01-01,2031-02-01)';

-- Public functions

set local role anon;

select lives_ok(
  $$ select public.get_available_slots('00000000-0000-0000-0000-0000000000a1', current_date, current_date + 6) $$,
  'visitors get slots of a published master'
);

select throws_ok(
  $$ select public.get_available_slots('00000000-0000-0000-0000-0000000000a2', current_date, current_date) $$,
  'P0001', 'service_not_found',
  'archived services have no slots for visitors'
);

select throws_ok(
  $$ select public.get_available_slots('00000000-0000-0000-0000-0000000000b1', current_date, current_date) $$,
  'P0001', 'service_not_found',
  'unpublished masters have no slots for visitors'
);

select throws_ok(
  $$ select public.get_available_slots('00000000-0000-0000-0000-0000000000a1', current_date, current_date, 30) $$,
  'P0001', 'duration_not_allowed',
  'only the master picks a custom duration'
);

select throws_ok(
  $$ select public.get_available_slots('00000000-0000-0000-0000-0000000000a1', current_date, current_date + 100) $$,
  'P0001', 'invalid_day_range',
  'a request covers at most 62 days'
);

select throws_ok(
  $$ select public.get_available_slots('00000000-0000-0000-0000-0000000000a1', current_date, null) $$,
  'P0001', 'invalid_day_range',
  'a request names both days'
);

select throws_ok(
  $$ select public.get_available_slots('00000000-0000-0000-0000-0000000000a1', current_date, current_date, null, '00000000-0000-0000-0000-0000000000f1') $$,
  'P0001', 'appointment_not_found',
  'visitors cannot free someone else''s appointment'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}', true);

select lives_ok(
  $$ select public.get_available_slots('00000000-0000-0000-0000-0000000000a1', current_date, current_date, null, '00000000-0000-0000-0000-0000000000f1') $$,
  'a client frees their own appointment while choosing a new time'
);

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}', true);

select lives_ok(
  $$ select public.get_available_slots('00000000-0000-0000-0000-0000000000b1', current_date, current_date, 45) $$,
  'a master gets slots of own unpublished service with a custom duration'
);

reset role;

-- Days: Olena works around the clock for the next days, except a day off.
delete from public.schedule_exceptions where master_id = '00000000-0000-0000-0000-00000000000a';
update public.work_template set hours = '{[0,1440)}' where master_id = '00000000-0000-0000-0000-00000000000a';
insert into public.schedule_exceptions (master_id, day, hours) values
  ('00000000-0000-0000-0000-00000000000a', (now() at time zone 'Europe/Kyiv')::date + 2, '{}');

set local role anon;

select results_eq(
  $$ select public.get_available_days('00000000-0000-0000-0000-0000000000a1',
       (now() at time zone 'Europe/Kyiv')::date + 1, (now() at time zone 'Europe/Kyiv')::date + 3) $$,
  $$ values ((now() at time zone 'Europe/Kyiv')::date + 1), ((now() at time zone 'Europe/Kyiv')::date + 3) $$,
  'days with free slots are listed in the master''s time zone'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select ok(
  (select count(*) > 0 from public.get_available_slots('00000000-0000-0000-0000-0000000000a2',
     (now() at time zone 'Europe/Kyiv')::date + 1, (now() at time zone 'Europe/Kyiv')::date + 1, 45)),
  'a master gets slots of own archived service with a custom duration'
);

select throws_ok(
  $$ select public.get_available_slots('00000000-0000-0000-0000-0000000000a1', current_date, current_date, 33) $$,
  'P0001', 'invalid_duration',
  'a custom duration is a whole 5-minute step'
);

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}', true);

select throws_ok(
  $$ select public.get_available_slots('00000000-0000-0000-0000-0000000000a1', current_date, current_date, null, '00000000-0000-0000-0000-0000000000f1') $$,
  'P0001', 'appointment_not_found',
  'another master cannot free someone else''s appointment'
);

reset role;

select is_empty(
  $$ select p.oid::regprocedure::text from pg_proc p
     where p.proname in ('available_slots')
       and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) $$,
  'the internal slot function is not callable directly'
);

select * from finish();
rollback;
