begin;

select plan(19);

create function pg_temp.slot(hours integer)
returns timestamptz
language sql
stable
as $$
  select date_trunc('hour', now()) + interval '1 day' + make_interval(hours => hours);
$$;

create function pg_temp.act_as(user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

grant execute on function pg_temp.slot(integer), pg_temp.act_as(uuid) to service_role, authenticated;

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000000a', 'olena@example.com', now()),
  ('00000000-0000-0000-0000-00000000000b', 'daryna@example.com', now()),
  ('00000000-0000-0000-0000-0000000000c1', 'mark@example.com', now()),
  ('00000000-0000-0000-0000-0000000000c2', 'ira@example.com', now());

insert into public.masters (id, slug, name, published_at, auto_confirm) values
  ('00000000-0000-0000-0000-00000000000a', 'olena', 'Olena', now(), true),
  ('00000000-0000-0000-0000-00000000000b', 'daryna', 'Daryna', now(), false);

insert into public.services (id, master_id, name, duration_minutes, buffer_minutes, price_kind, price, format) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', '{"uk": "Манікюр"}', 60, 0, 'fixed', 900, 'on_site'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', '{"uk": "Стрижка"}', 60, 0, 'none', null, 'on_site');

insert into public.work_template (master_id, weekday, hours)
select m, d, '{[0,1440)}'
from unnest(array['00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b']::uuid[]) as m
cross join generate_series(1, 7) as d;

create temporary table booked (name text primary key, appointment_id uuid) on commit drop;
grant all on booked to service_role, authenticated;

set local role service_role;

insert into booked
select v.name, b.appointment_id
from (values
  ('olena', '00000000-0000-0000-0000-0000000000a1'::uuid, 2, 'mark@example.com'),
  ('daryna', '00000000-0000-0000-0000-0000000000b1'::uuid, 3, 'mark@example.com'),
  ('hold', '00000000-0000-0000-0000-0000000000a1'::uuid, 6, 'mark@example.com'),
  ('ira', '00000000-0000-0000-0000-0000000000a1'::uuid, 4, 'ira@example.com')
) as v (name, service, hours, email)
cross join lateral public.book_appointment(v.service, pg_temp.slot(v.hours), 'Mark', v.email, 'uk') b;

reset role;

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select * from public.claim_bookings(array(select appointment_id from booked where name in ('olena', 'daryna')));
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c2');
select * from public.claim_bookings(array(select appointment_id from booked where name = 'ira'));
reset role;

-- Like a manual booking: confirmed without the client confirming a contact.
update public.appointments set status = 'confirmed', hold_until = null, contact_confirmed_at = null
where id = (select appointment_id from booked where name = 'daryna');

-- A past appointment the master marked as a no-show.
with a as (
  insert into public.appointments (master_id, service_id, during, status, source, locale, contact_confirmed_at)
  values (
    '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
    tstzrange(date_trunc('hour', now()) - interval '2 days', date_trunc('hour', now()) - interval '2 days' + interval '1 hour'),
    'no_show', 'client', 'uk', now() - interval '3 days'
  )
  returning id
)
insert into booked select 'past', id from a;

insert into public.appointment_clients (appointment_id, master_id, client_card_id, name)
select b.appointment_id, '00000000-0000-0000-0000-00000000000a', cc.id, 'Mark'
from booked b
cross join public.client_cards cc
where b.name = 'past' and cc.master_id = '00000000-0000-0000-0000-00000000000a'
  and cc.user_id = '00000000-0000-0000-0000-0000000000c1';

-- Listing

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');

select results_eq(
  $$ select b.name, m.status::text, m.master_slug, m.can_reschedule
     from public.get_my_bookings() m join booked b using (appointment_id) order by m.starts_at $$,
  $$ values ('past', 'completed', 'olena', true), ('olena', 'confirmed', 'olena', true), ('daryna', 'confirmed', 'daryna', true) $$,
  'a client sees own bookings with every master, a no-show as completed, and not an unconfirmed hold'
);

select is(
  (select change_until from public.get_my_bookings() where appointment_id = (select appointment_id from booked where name = 'olena')),
  pg_temp.slot(2) - interval '12 hours',
  'the change deadline is the master''s cancel deadline before the start'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c2');
select results_eq(
  $$ select b.name from public.get_my_bookings() m join booked b using (appointment_id) $$,
  $$ values ('ira') $$,
  'another client sees only their own'
);
reset role;

-- Slots for moving use the appointment's own length

update public.appointments
set during = tstzrange(lower(during), lower(during) + interval '2 hours')
where id = (select appointment_id from booked where name = 'olena');

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');

select is(
  (select max(s) from public.get_available_slots(
    '00000000-0000-0000-0000-0000000000a1',
    (now() at time zone 'Europe/Kyiv')::date + 5,
    (now() at time zone 'Europe/Kyiv')::date + 5,
    null,
    (select appointment_id from booked where name = 'olena')
  ) as s),
  (((now() at time zone 'Europe/Kyiv')::date + 5) + time '22:00') at time zone 'Europe/Kyiv',
  'a two-hour appointment can move no later than two hours before the end of the day'
);

select throws_ok(
  $$ select public.get_available_slots('00000000-0000-0000-0000-0000000000a1', current_date, current_date, null,
       (select appointment_id from booked where name = 'daryna')) $$,
  'appointment_not_found',
  'an appointment of another service does not free time'
);

-- Rescheduling

select throws_ok(
  $$ select public.reschedule_booking((select appointment_id from booked where name = 'olena'), pg_temp.slot(4)) $$,
  'slot_unavailable',
  'the time of another booking is not free'
);

select throws_ok(
  $$ select public.reschedule_booking((select appointment_id from booked where name = 'olena'), pg_temp.slot(9) + interval '7 minutes') $$,
  'slot_unavailable',
  'a time off the grid is not a slot'
);

select throws_ok(
  $$ select public.reschedule_booking((select appointment_id from booked where name = 'olena'), pg_temp.slot(2)) $$,
  'slot_unavailable',
  'the current time is not a new time'
);

select is(
  public.reschedule_booking((select appointment_id from booked where name = 'olena'), pg_temp.slot(9)),
  'confirmed'::public.appointment_status,
  'with auto-confirm the moved booking stays confirmed'
);

select is(
  public.reschedule_booking((select appointment_id from booked where name = 'daryna'), pg_temp.slot(10)),
  'pending'::public.appointment_status,
  'without auto-confirm the moved booking waits for the master'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c2');
select throws_ok(
  $$ select public.reschedule_booking((select appointment_id from booked where name = 'olena'), pg_temp.slot(12)) $$,
  'appointment_not_found',
  'another client cannot move it'
);
reset role;

select results_eq(
  $$ select lower(a.during), upper(a.during) - lower(a.during), a.status::text from public.appointments a
     where a.id = (select appointment_id from booked where name = 'olena') $$,
  $$ values (pg_temp.slot(9), interval '2 hours', 'confirmed') $$,
  'the booking moved with its own length'
);

select results_eq(
  $$ select a.hold_until from public.appointments a where a.id = (select appointment_id from booked where name = 'daryna') $$,
  $$ values (now() + interval '24 hours') $$,
  'waiting for the master holds the new time for 24 hours'
);

select results_eq(
  $$ select n.recipient_id, n.data from private.notifications n
     join booked b using (appointment_id) where n.kind = 'rescheduled_by_client' order by b.name $$,
  $$ values ('00000000-0000-0000-0000-00000000000b'::uuid, jsonb_build_object('previousStartsAt', pg_temp.slot(3))),
            ('00000000-0000-0000-0000-00000000000a'::uuid, jsonb_build_object('previousStartsAt', pg_temp.slot(2))) $$,
  'the master learns about the move and the previous time'
);

select is_empty(
  $$ select 1 from private.busy_times
     where appointment_id = (select appointment_id from booked where name = 'daryna') and lower(during) = pg_temp.slot(3) $$,
  'the previous time is free again'
);

-- Rules

update public.masters set cancel_deadline_minutes = 10080 where id = '00000000-0000-0000-0000-00000000000a';
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select throws_ok(
  $$ select public.reschedule_booking((select appointment_id from booked where name = 'olena'), pg_temp.slot(14)) $$,
  'cancel_deadline_passed',
  'after the cancel deadline the client cannot move it'
);
reset role;

update public.services set archived_at = now() where id = '00000000-0000-0000-0000-0000000000b1';
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select throws_ok(
  $$ select public.reschedule_booking((select appointment_id from booked where name = 'daryna'), pg_temp.slot(14)) $$,
  'service_not_found',
  'a booking of an archived service can only be cancelled'
);
select is(
  (select can_reschedule from public.get_my_bookings() where appointment_id = (select appointment_id from booked where name = 'daryna')),
  false,
  'the list says so'
);
reset role;

select ok(
  not has_function_privilege('anon', 'public.reschedule_booking(uuid, timestamptz)', 'execute')
    and not has_function_privilege('anon', 'public.get_my_bookings()', 'execute'),
  'visitors cannot call the client functions'
);

select * from finish();
rollback;
