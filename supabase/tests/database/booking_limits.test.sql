begin;

select plan(20);

create function pg_temp.slot(hours integer)
returns timestamptz
language sql
stable
as $$
  select date_trunc('hour', now()) + interval '1 day' + make_interval(hours => hours);
$$;

create function pg_temp.book(service uuid, hours integer, email text, ip inet)
returns uuid
language sql
as $$
  select appointment_id from public.book_appointment(service, pg_temp.slot(hours), 'Visitor', email, 'uk', null, ip);
$$;

grant execute on function pg_temp.slot(integer), pg_temp.book(uuid, integer, text, inet) to service_role, authenticated;

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000000a', 'olena@example.com', now()),
  ('00000000-0000-0000-0000-00000000000b', 'daryna@example.com', now()),
  ('00000000-0000-0000-0000-00000000000c', 'v6@example.com', now());

insert into public.masters (id, slug, name, published_at, auto_confirm, max_active_bookings) values
  ('00000000-0000-0000-0000-00000000000a', 'olena', 'Olena', now(), false, 3),
  ('00000000-0000-0000-0000-00000000000b', 'daryna', 'Daryna', now(), false, 3);

insert into public.services (id, master_id, name, duration_minutes, buffer_minutes, price_kind, format) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', '{"uk": "Манікюр"}', 60, 0, 'none', 'on_site'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', '{"uk": "Стрижка"}', 60, 0, 'none', 'on_site');

insert into public.work_template (master_id, weekday, hours)
select m, d, '{[0,1440)}'
from unnest(array['00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b']::uuid[]) as m
cross join generate_series(1, 7) as d;

create temporary table booked (name text primary key, appointment_id uuid) on commit drop;
grant all on booked to service_role, authenticated;

set local role service_role;

-- Unconfirmed holds per IP

insert into booked values
  ('v1', pg_temp.book('00000000-0000-0000-0000-0000000000a1', 2, 'v1@example.com', '203.0.113.1')),
  ('v2', pg_temp.book('00000000-0000-0000-0000-0000000000a1', 3, 'v2@example.com', '203.0.113.1'));

select throws_ok(
  $$ select pg_temp.book('00000000-0000-0000-0000-0000000000b1', 2, 'v3@example.com', '203.0.113.1') $$,
  'P0001', 'too_many_pending',
  'a third unconfirmed hold from one IP is refused, even at another master'
);

select results_eq(
  $$ select ac.client_ip from public.appointment_clients ac join booked b using (appointment_id) where b.name = 'v1' $$,
  $$ values ('203.0.113.1'::inet) $$,
  'an unconfirmed booking keeps the IP it came from'
);

-- Unconfirmed holds per master

insert into booked values
  ('v3', pg_temp.book('00000000-0000-0000-0000-0000000000a1', 4, 'v3@example.com', '203.0.113.3')),
  ('v4', pg_temp.book('00000000-0000-0000-0000-0000000000a1', 5, 'v4@example.com', '203.0.113.4')),
  ('v5', pg_temp.book('00000000-0000-0000-0000-0000000000a1', 6, 'v5@example.com', '203.0.113.5'));

select throws_ok(
  $$ select pg_temp.book('00000000-0000-0000-0000-0000000000a1', 7, 'v6@example.com', '203.0.113.6') $$,
  'P0001', 'too_many_pending',
  'a sixth unconfirmed hold at one master is refused while every hold is recent'
);

select lives_ok(
  $$ select pg_temp.book('00000000-0000-0000-0000-0000000000b1', 7, 'v6@example.com', '203.0.113.6') $$,
  'another master is not affected'
);

reset role;
update public.appointments set created_at = now() - interval '6 minutes'
where id = (select appointment_id from booked where name = 'v1');
update public.appointments set created_at = now() - interval '5 minutes 30 seconds'
where id = (select appointment_id from booked where name = 'v2');
set local role service_role;

insert into booked values
  ('v7', pg_temp.book('00000000-0000-0000-0000-0000000000a1', 7, 'v7@example.com', '203.0.113.7'));

reset role;

select results_eq(
  $$ select b.name, a.status::text, a.cancelled_by::text, a.hold_until, ac.client_ip
     from booked b join public.appointments a on a.id = b.appointment_id join public.appointment_clients ac using (appointment_id)
     where b.name in ('v1', 'v2') order by b.name $$,
  $$ values ('v1', 'cancelled', 'system', null::timestamptz, null::inet),
            ('v2', 'pending', null, now() + interval '15 minutes', '203.0.113.1'::inet) $$,
  'a new hold at a full master pushes out only the oldest hold older than five minutes'
);

select ok(
  pg_temp.slot(2) in (
    select public.get_available_slots('00000000-0000-0000-0000-0000000000a1', (pg_temp.slot(2) at time zone 'Europe/Kyiv')::date, (pg_temp.slot(2) at time zone 'Europe/Kyiv')::date)
  ),
  'the pushed-out hold frees its slot'
);

update public.appointments set hold_until = now() - interval '1 minute'
where id = (select appointment_id from booked where name = 'v3');
update public.appointments set contact_confirmed_at = now()
where id = (select appointment_id from booked where name = 'v4');

set local role service_role;

select lives_ok(
  $$ select pg_temp.book('00000000-0000-0000-0000-0000000000a1', 8, 'v8@example.com', '203.0.113.8') $$,
  'holds that ran out or wait for the master do not count'
);

select lives_ok(
  $$ select pg_temp.book('00000000-0000-0000-0000-0000000000a1', 9, 'v9@example.com', null) $$,
  'a booking without an IP is not limited per IP'
);

-- Clearing the IP

select public.release_booking((select appointment_id from booked where name = 'v5'));

reset role;

select results_eq(
  $$ select ac.client_ip from public.appointment_clients ac join booked b using (appointment_id) where b.name = 'v5' $$,
  $$ values (null::inet) $$,
  'releasing a booking forgets its IP'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}', true);

select results_eq(
  $$ select count(*)::integer from public.claim_bookings(array(select appointment_id from public.appointment_clients where false)) $$,
  $$ values (0) $$,
  'claiming nothing claims nothing'
);

reset role;

create temporary table v6_bookings on commit drop as
select ac.appointment_id from public.appointment_clients ac where ac.unconfirmed_email = 'v6@example.com';
grant select on v6_bookings to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}', true);

select results_eq(
  $$ select count(*)::integer from public.claim_bookings(array(select appointment_id from v6_bookings)) $$,
  $$ values (1) $$,
  'the user claims the booking made with their email'
);

reset role;

select results_eq(
  $$ select ac.client_ip from public.appointment_clients ac join v6_bookings v using (appointment_id) $$,
  $$ values (null::inet) $$,
  'a confirmed contact forgets the IP of the booking'
);

select throws_ok(
  $$ update public.appointment_clients set client_ip = '203.0.113.9' where appointment_id = (select appointment_id from v6_bookings) $$,
  '23514', null,
  'only an unconfirmed booking may keep an IP'
);

-- Rate limits

set local role service_role;

select results_eq(
  $$ select array[public.take_rate_limit('test', 2, 3600), public.take_rate_limit('test', 2, 3600), public.take_rate_limit('test', 2, 3600)] $$,
  $$ values (array[true, true, false]) $$,
  'a rate limit allows the given number of hits per window'
);

select ok(public.take_rate_limit('other', 2, 3600), 'each bucket counts separately');

select has_index('private', 'rate_limits', 'rate_limits_window_start_idx', 'old rate limit windows are found without a full scan');

reset role;

-- Privileges

select ok(
  not has_function_privilege('anon', 'public.book_appointment(uuid, timestamptz, text, text, public.locale, text, inet)', 'execute')
  and not has_function_privilege('authenticated', 'public.book_appointment(uuid, timestamptz, text, text, public.locale, text, inet)', 'execute')
  and has_function_privilege('service_role', 'public.book_appointment(uuid, timestamptz, text, text, public.locale, text, inet)', 'execute'),
  'only the server may book'
);

select ok(
  not has_function_privilege('anon', 'public.release_booking(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.release_booking(uuid)', 'execute')
  and has_function_privilege('service_role', 'public.release_booking(uuid)', 'execute'),
  'only the server may release a booking'
);

select ok(
  not has_function_privilege('anon', 'public.take_rate_limit(text, integer, integer)', 'execute')
  and not has_function_privilege('authenticated', 'public.take_rate_limit(text, integer, integer)', 'execute')
  and has_function_privilege('service_role', 'public.take_rate_limit(text, integer, integer)', 'execute'),
  'only the server may count rate limits'
);

select ok(
  not exists (select 1 from information_schema.column_privileges
              where table_name = 'appointment_clients' and column_name = 'client_ip' and grantee in ('anon', 'authenticated')),
  'users cannot read the IP of a booking'
);

select * from finish();

rollback;
