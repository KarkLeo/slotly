begin;

select plan(56);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'olena@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'daryna@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'client@example.com');

insert into public.masters (id, slug, name, published_at) values
  ('00000000-0000-0000-0000-00000000000a', 'olena', 'Olena', now()),
  ('00000000-0000-0000-0000-00000000000b', 'daryna', 'Daryna', now());

insert into public.services (id, master_id, name, duration_minutes, buffer_minutes, price_kind) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', '{"uk": "Манікюр"}', 60, 15, 'none'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', '{"uk": "Стрижка"}', 60, 0, 'none');

insert into public.appointments (id, master_id, service_id, during, buffer_minutes, status, source, locale) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   '[2030-01-14 10:00+00,2030-01-14 11:00+00)', 15, 'confirmed', 'client', 'uk');

insert into public.appointment_clients (appointment_id, user_id, name) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000c', 'Iryna');

-- Busy time

select results_eq(
  $$ select during from private.busy_times where appointment_id = '00000000-0000-0000-0000-0000000000f1' $$,
  $$ values ('[2030-01-14 10:00+00,2030-01-14 11:15+00)'::tstzrange) $$,
  'an active appointment holds its time plus the buffer'
);

select throws_ok(
  $$ insert into public.appointments (master_id, service_id, during, status, source, locale) values
       ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', '[2030-01-14 10:30+00,2030-01-14 11:30+00)', 'confirmed', 'manual', 'uk') $$,
  '23P01', null,
  'appointments of a master do not overlap'
);

select throws_ok(
  $$ insert into public.appointments (master_id, service_id, during, status, source, locale) values
       ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', '[2030-01-14 11:10+00,2030-01-14 12:10+00)', 'confirmed', 'manual', 'uk') $$,
  '23P01', null,
  'an appointment cannot start inside the buffer of another'
);

select lives_ok(
  $$ insert into public.appointments (master_id, service_id, during, status, source, locale) values
       ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', '[2030-01-14 11:15+00,2030-01-14 12:15+00)', 'confirmed', 'manual', 'uk') $$,
  'an appointment may start right after the buffer'
);

select throws_ok(
  $$ insert into public.blocks (master_id, during) values ('00000000-0000-0000-0000-00000000000a', '[2030-01-14 10:30+00,2030-01-14 10:45+00)') $$,
  '23P01', null,
  'a block cannot cover an appointment'
);

insert into public.blocks (master_id, during) values
  ('00000000-0000-0000-0000-00000000000a', '[2030-01-14 14:00+00,2030-01-14 15:00+00)');

select throws_ok(
  $$ insert into public.appointments (master_id, service_id, during, status, source, locale) values
       ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', '[2030-01-14 13:30+00,2030-01-14 14:30+00)', 'confirmed', 'manual', 'uk') $$,
  '23P01', null,
  'an appointment cannot cover a block'
);

select throws_ok(
  $$ insert into public.blocks (master_id, during) values ('00000000-0000-0000-0000-00000000000a', '[2030-01-14 14:30+00,2030-01-14 16:00+00)') $$,
  '23P01', null,
  'blocks of a master still do not overlap'
);

select lives_ok(
  $$ insert into public.appointments (master_id, service_id, during, status, source, locale) values
       ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', '[2030-01-14 10:00+00,2030-01-14 11:00+00)', 'confirmed', 'manual', 'uk') $$,
  'different masters may be busy at the same time'
);

select lives_ok(
  $$ insert into public.appointments (master_id, service_id, during, status, source, locale, cancelled_by) values
       ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', '[2030-01-14 10:00+00,2030-01-14 11:00+00)', 'cancelled', 'manual', 'uk', 'master') $$,
  'a cancelled appointment holds no time'
);

-- Constraints

select throws_ok(
  $$ insert into public.appointments (master_id, service_id, during, status, source, locale) values
       ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000b1', '[2030-01-15 10:00+00,2030-01-15 11:00+00)', 'confirmed', 'manual', 'uk') $$,
  '23503', null,
  'an appointment uses a service of its master'
);

select throws_ok(
  $$ insert into public.appointments (master_id, service_id, during, status, source, locale) values
       ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', '[2030-01-15 10:02+00,2030-01-15 11:00+00)', 'confirmed', 'manual', 'uk') $$,
  '23514', null,
  'an appointment starts and ends on 5-minute marks'
);

select throws_ok(
  $$ insert into public.appointments (master_id, service_id, during, status, source, locale) values
       ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', '[2030-01-15 10:00+00,2030-01-15 11:00+00)', 'pending', 'client', 'uk') $$,
  '23514', null,
  'a pending appointment says how long it holds the time'
);

select throws_ok(
  $$ insert into public.appointments (master_id, service_id, during, status, source, locale) values
       ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', '[2030-01-15 10:00+00,2030-01-15 11:00+00)', 'cancelled', 'client', 'uk') $$,
  '23514', null,
  'a cancelled appointment says who cancelled it'
);

-- Who sees what

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}', true);

select is_empty(
  $$ select id from public.appointments where master_id = '00000000-0000-0000-0000-00000000000a'
     union all select appointment_id from public.appointment_clients where appointment_id = '00000000-0000-0000-0000-0000000000f1' $$,
  'a master does not see appointments of another master'
);

select throws_ok(
  $$ insert into public.appointments (master_id, service_id, during, status, source, locale) values
       ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', '[2030-01-16 10:00+00,2030-01-16 11:00+00)', 'confirmed', 'manual', 'uk') $$,
  '42501', null,
  'appointments are written only through functions'
);

select throws_ok(
  $$ select public.cancel_appointment('00000000-0000-0000-0000-0000000000f1', null) $$,
  'P0001', 'appointment_not_found',
  'a master cannot cancel an appointment of another master'
);

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}', true);

select results_eq(
  $$ select a.id from public.appointments a join public.appointment_clients c on c.appointment_id = a.id $$,
  $$ values ('00000000-0000-0000-0000-0000000000f1'::uuid) $$,
  'a client sees own bookings and nothing else'
);

select throws_ok(
  $$ select public.reschedule_appointment('00000000-0000-0000-0000-0000000000f1', '2030-01-14 16:00+00') $$,
  'P0001', 'appointment_not_found',
  'a client cannot move an appointment through the master''s reschedule'
);

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select is(
  (select count(*)::int from public.appointments),
  3,
  'a master sees all own appointments'
);

reset role;
set local role anon;

select throws_ok(
  $$ select 1 from public.appointments union all select 1 from public.appointment_clients $$,
  '42501', null,
  'visitors cannot read appointments'
);

reset role;

-- Reschedule by the master

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select lives_ok(
  $$ select public.reschedule_appointment('00000000-0000-0000-0000-0000000000f1', '2030-01-14 16:05+00') $$,
  'a master moves an appointment to free time, off the grid'
);

select throws_ok(
  $$ select public.reschedule_appointment('00000000-0000-0000-0000-0000000000f1', '2030-01-14 14:30+00') $$,
  '23P01', null,
  'a master cannot move an appointment onto a block'
);

reset role;

select results_eq(
  $$ select a.during, b.during from public.appointments a join private.busy_times b on b.appointment_id = a.id
     where a.id = '00000000-0000-0000-0000-0000000000f1' $$,
  $$ values ('[2030-01-14 16:05+00,2030-01-14 17:05+00)'::tstzrange, '[2030-01-14 16:05+00,2030-01-14 17:20+00)'::tstzrange) $$,
  'the appointment and its busy time move together and keep the duration'
);

select lives_ok(
  $$ insert into public.appointments (master_id, service_id, during, status, source, locale) values
       ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', '[2030-01-14 10:00+00,2030-01-14 11:00+00)', 'confirmed', 'manual', 'uk') $$,
  'the old time is free after a reschedule'
);

-- Confirm by the master

insert into public.appointments (id, master_id, service_id, during, status, hold_until, contact_confirmed_at, source, locale) values
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   '[2030-01-17 10:00+00,2030-01-17 11:00+00)', 'pending', now() + interval '24 hours', now(), 'client', 'uk'),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   '[2030-01-17 12:00+00,2030-01-17 13:00+00)', 'pending', now() + interval '15 minutes', null, 'client', 'uk');

set local role authenticated;

select lives_ok(
  $$ select public.confirm_appointment('00000000-0000-0000-0000-0000000000f2') $$,
  'a master confirms an appointment that waits for them'
);

select throws_ok(
  $$ select public.confirm_appointment('00000000-0000-0000-0000-0000000000f3') $$,
  'P0001', 'appointment_not_awaiting_master',
  'a master cannot confirm before the client confirmed the contact'
);

select throws_ok(
  $$ select public.confirm_appointment('00000000-0000-0000-0000-0000000000f2') $$,
  'P0001', 'appointment_not_awaiting_master',
  'a confirmed appointment cannot be confirmed again'
);

reset role;

select is(
  (select row(status, hold_until)::text from public.appointments where id = '00000000-0000-0000-0000-0000000000f2'),
  '(confirmed,)',
  'confirming releases the hold'
);

-- Cancel

set local role authenticated;

select lives_ok(
  $$ select public.cancel_appointment('00000000-0000-0000-0000-0000000000f2', 'Захворіла') $$,
  'a master cancels with a comment'
);

reset role;

select is(
  (select row(status, cancelled_by, cancel_comment)::text from public.appointments where id = '00000000-0000-0000-0000-0000000000f2'),
  '(cancelled,master,Захворіла)',
  'the cancellation records who cancelled and why'
);

insert into public.appointments (id, master_id, service_id, during, status, source, locale) values
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   tstzrange(date_trunc('hour', now()) + interval '3 hours', date_trunc('hour', now()) + interval '4 hours'), 'confirmed', 'client', 'uk');
insert into public.appointment_clients (appointment_id, user_id, name) values
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-00000000000c', 'Iryna');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}', true);

select throws_ok(
  $$ select public.cancel_appointment('00000000-0000-0000-0000-0000000000f4', null) $$,
  'P0001', 'cancel_deadline_passed',
  'a client cannot cancel after the master''s deadline'
);

select lives_ok(
  $$ select public.cancel_appointment('00000000-0000-0000-0000-0000000000f1', 'Не встигаю') $$,
  'a client cancels before the deadline'
);

select throws_ok(
  $$ select public.cancel_appointment('00000000-0000-0000-0000-0000000000f1', null) $$,
  'P0001', 'appointment_not_active',
  'a cancelled appointment cannot be cancelled again'
);

reset role;

select is(
  (select row(status, cancelled_by)::text from public.appointments where id = '00000000-0000-0000-0000-0000000000f1'),
  '(cancelled,client)',
  'the client''s cancellation is recorded as theirs'
);

-- No-show

insert into public.appointments (id, master_id, service_id, during, status, source, locale) values
  ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   tstzrange(date_trunc('hour', now()) - interval '1 day', date_trunc('hour', now()) - interval '23 hours'), 'completed', 'client', 'uk'),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   tstzrange(date_trunc('hour', now()) - interval '5 days', date_trunc('hour', now()) - interval '119 hours'), 'completed', 'client', 'uk');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select lives_ok(
  $$ select public.set_no_show('00000000-0000-0000-0000-0000000000f5', true) $$,
  'a master marks a no-show after the appointment'
);

select lives_ok(
  $$ select public.set_no_show('00000000-0000-0000-0000-0000000000f5', false) $$,
  'a master takes the no-show back'
);

select throws_ok(
  $$ select public.set_no_show('00000000-0000-0000-0000-0000000000f6', true) $$,
  'P0001', 'no_show_window_closed',
  'a no-show is marked within 3 days after the appointment'
);

reset role;

select is(
  (select status::text from public.appointments where id = '00000000-0000-0000-0000-0000000000f5'),
  'completed',
  'taking the no-show back returns the appointment to completed'
);

-- Review follow-ups

select throws_ok(
  $$ insert into public.appointments (master_id, service_id, during, status, source, locale) values
       ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', '(2030-01-20 10:00+00,2030-01-20 11:00+00]', 'confirmed', 'manual', 'uk') $$,
  '23514', null,
  'an appointment includes its start and excludes its end'
);

select throws_ok(
  $$ insert into public.blocks (master_id, during) values ('00000000-0000-0000-0000-00000000000a', '[2030-01-20 10:00+00,2030-01-20 11:00+00]') $$,
  '23514', null,
  'a block includes its start and excludes its end'
);

select throws_ok(
  $$ insert into public.appointments (master_id, service_id, during, status, hold_until, source, locale) values
       ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', '[2030-01-20 10:00+00,2030-01-20 11:00+00)', 'pending', '2030-01-20 12:00+00', 'client', 'uk') $$,
  '23514', null,
  'a hold ends no later than the appointment starts'
);

select throws_ok(
  $$ insert into public.appointment_clients (appointment_id, name) values ('00000000-0000-0000-0000-0000000000f1', 'Second client') $$,
  '23505', null,
  'an appointment has one client'
);

insert into public.appointments (id, master_id, service_id, during, status, hold_until, contact_confirmed_at, source, locale) values
  ('00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   '[2030-01-22 10:00+00,2030-01-22 11:00+00)', 'pending', now() - interval '1 minute', now() - interval '1 day', 'client', 'uk'),
  ('00000000-0000-0000-0000-0000000000f8', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   '[2030-01-21 12:00+00,2030-01-21 13:00+00)', 'pending', '2030-01-21 11:00+00', now(), 'client', 'uk');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select throws_ok(
  $$ select public.confirm_appointment('00000000-0000-0000-0000-0000000000f7') $$,
  'P0001', 'appointment_expired',
  'a master cannot confirm an expired hold'
);

select lives_ok(
  $$ select public.reschedule_appointment('00000000-0000-0000-0000-0000000000f8', '2030-01-21 10:30+00') $$,
  'a master moves a pending appointment earlier'
);

select throws_ok(
  $$ select public.reschedule_appointment('00000000-0000-0000-0000-0000000000f8', '2030-01-14 11:30+00') $$,
  '23P01', null,
  'a master cannot move an appointment onto another appointment'
);

select throws_ok(
  $$ select public.reschedule_appointment('00000000-0000-0000-0000-0000000000f8', date_trunc('hour', now()) - interval '1 hour') $$,
  'P0001', 'starts_in_past',
  'a master cannot move an appointment into the past'
);

select throws_ok(
  $$ select public.reschedule_appointment('00000000-0000-0000-0000-0000000000f5', '2030-01-22 10:00+00') $$,
  'P0001', 'appointment_not_active',
  'a finished appointment cannot be moved'
);

select lives_ok(
  $$ update public.blocks set during = '[2030-01-14 18:00+00,2030-01-14 19:00+00)' where during = '[2030-01-14 14:00+00,2030-01-14 15:00+00)' $$,
  'a master moves own block'
);

select throws_ok(
  $$ select 1 from private.busy_times $$,
  '42501', null,
  'busy time is not readable directly'
);

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}', true);

select throws_ok(
  $$ select public.set_no_show('00000000-0000-0000-0000-0000000000f5', true) $$,
  'P0001', 'appointment_not_found',
  'a master cannot mark a no-show for another master'
);

select throws_ok(
  $$ select public.confirm_appointment('00000000-0000-0000-0000-0000000000f8') $$,
  'P0001', 'appointment_not_found',
  'a master cannot confirm an appointment of another master'
);

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role": "service_role"}', true);

select throws_ok(
  $$ select public.cancel_appointment('00000000-0000-0000-0000-0000000000f8', null) $$,
  'P0001', 'appointment_not_found',
  'a call without a user acts for nobody'
);

reset role;

select is(
  (select row(lower(a.during), a.hold_until)::text from public.appointments a where a.id = '00000000-0000-0000-0000-0000000000f8'),
  row('2030-01-21 10:30+00'::timestamptz, '2030-01-21 10:30+00'::timestamptz)::text,
  'moving a pending appointment earlier shortens its hold to the new start'
);

select results_eq(
  $$ select b.during from private.busy_times b join public.blocks k on k.id = b.block_id where k.master_id = '00000000-0000-0000-0000-00000000000a' $$,
  $$ values ('[2030-01-14 18:00+00,2030-01-14 19:00+00)'::tstzrange) $$,
  'a moved block moves its busy time'
);

delete from public.blocks where master_id = '00000000-0000-0000-0000-00000000000a';

select is_empty(
  $$ select 1 from private.busy_times where block_id is not null and master_id = '00000000-0000-0000-0000-00000000000a' $$,
  'a deleted block frees its time'
);

select is_empty(
  $$ select p.oid::regprocedure::text from pg_proc p
     where p.proname in ('confirm_appointment', 'cancel_appointment', 'reschedule_appointment', 'set_no_show')
       and has_function_privilege('anon', p.oid, 'execute') $$,
  'visitors cannot call appointment functions'
);

select * from finish();
rollback;
