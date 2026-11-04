begin;

select plan(32);

create function pg_temp.act_as(user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

grant execute on function pg_temp.act_as(uuid) to authenticated;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'olena@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'daryna@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'pago@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'kiritimati@example.com');

insert into public.masters (id, slug, name, published_at, timezone) values
  ('00000000-0000-0000-0000-00000000000a', 'olena', 'Olena', now(), 'Europe/Kyiv'),
  ('00000000-0000-0000-0000-00000000000b', 'daryna', 'Daryna', now(), 'Europe/Kyiv'),
  ('00000000-0000-0000-0000-00000000000c', 'pago', 'Pago', now(), 'Pacific/Pago_Pago'),
  ('00000000-0000-0000-0000-00000000000d', 'kiritimati', 'Kiritimati', now(), 'Pacific/Kiritimati');

insert into public.services (id, master_id, name, duration_minutes, buffer_minutes, price_kind) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', '{"uk": "Манікюр"}', 60, 0, 'none'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', '{"uk": "Стрижка"}', 60, 0, 'none');

insert into public.work_template (master_id, weekday, hours) values
  ('00000000-0000-0000-0000-00000000000b', 1, '{[540,780)}'),
  ('00000000-0000-0000-0000-00000000000b', 5, '{[540,780)}');

insert into public.schedule_exceptions (master_id, day, hours) values
  ('00000000-0000-0000-0000-00000000000b', (now() at time zone 'Europe/Kyiv')::date + 10, '{}');

insert into public.client_cards (id, master_id, name) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a', 'Mark'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-00000000000a', 'Ira');

-- Appointments of master A at distinct hours of tomorrow (and the past), one per case.
create temporary table fixture (name text primary key, id uuid not null, hours integer not null) on commit drop;
insert into fixture values
  ('confirmed', '00000000-0000-0000-0000-0000000000e1', 10),
  ('pending', '00000000-0000-0000-0000-0000000000e2', 12),
  ('no_card', '00000000-0000-0000-0000-0000000000e3', 14),
  ('cancelled', '00000000-0000-0000-0000-0000000000e4', 16),
  ('no_contact', '00000000-0000-0000-0000-0000000000e5', 18),
  ('expired', '00000000-0000-0000-0000-0000000000e6', 20),
  ('ended', '00000000-0000-0000-0000-0000000000e7', -30),
  ('other', '00000000-0000-0000-0000-0000000000e8', 10);

insert into public.appointments (id, master_id, service_id, during, status, hold_until, contact_confirmed_at, source, locale, cancelled_by)
select f.id,
  case when f.name = 'other' then '00000000-0000-0000-0000-00000000000b'::uuid else '00000000-0000-0000-0000-00000000000a'::uuid end,
  case when f.name = 'other' then '00000000-0000-0000-0000-0000000000b1'::uuid else '00000000-0000-0000-0000-0000000000a1'::uuid end,
  tstzrange(date_trunc('day', now()) + interval '1 day' + make_interval(hours => f.hours),
    date_trunc('day', now()) + interval '1 day' + make_interval(hours => f.hours + 1)),
  case f.name
    when 'pending' then 'pending' when 'no_contact' then 'pending' when 'expired' then 'pending'
    when 'cancelled' then 'cancelled' else 'confirmed'
  end::public.appointment_status,
  case f.name
    when 'pending' then now() + interval '1 hour' when 'no_contact' then now() + interval '1 hour'
    when 'expired' then now() - interval '1 hour'
  end,
  case when f.name in ('confirmed', 'pending', 'expired', 'ended', 'other') then now() - interval '1 day' end,
  'client', 'uk',
  case when f.name = 'cancelled' then 'master'::public.canceller end
from fixture f;

insert into public.appointment_clients (appointment_id, master_id, client_card_id, name)
values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c1', 'Mark'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c2', 'Ira');

-- Work template

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');

select public.set_work_template_days('{1,2,3}', '{[600,1140)}');

select results_eq(
  $$ select weekday, hours::text from public.work_template order by weekday $$,
  $$ values (1::smallint, '{[600,1140)}'), (2::smallint, '{[600,1140)}'), (3::smallint, '{[600,1140)}') $$,
  'the template is written for each given weekday'
);

select public.set_work_template_days('{2}', '{}');

select results_eq(
  $$ select weekday from public.work_template order by weekday $$,
  $$ values (1::smallint), (3::smallint) $$,
  'empty hours remove only the given weekdays'
);

select public.set_work_template_days('{1}', '{[540,780),[840,1080)}');

select is(
  (select hours::text from public.work_template where weekday = 1),
  '{[540,780),[840,1080)}',
  'a second call overwrites the weekday'
);

select throws_ok(
  $$ select public.set_work_template_days('{4}', '{[600,1500)}') $$,
  '23514', null,
  'hours outside the day are rejected'
);

select is(
  (select count(*) from public.work_template)::integer,
  2,
  'a rejected call leaves the rows unchanged'
);

select throws_ok(
  $$ select public.set_work_template_days('{}', '{[600,700)}') $$,
  'P0001', 'invalid_weekdays',
  'no weekdays is an error'
);

select is(
  (select count(*) from public.work_template)::integer,
  2,
  'a call with no weekdays leaves the rows unchanged'
);

select public.set_work_template_days('{1,5}', '{}');

reset role;

select results_eq(
  $$ select weekday, hours::text from public.work_template where master_id = '00000000-0000-0000-0000-00000000000b' order by weekday $$,
  $$ values (1::smallint, '{[540,780)}'), (5::smallint, '{[540,780)}') $$,
  'another master''s template is never touched'
);

-- Exceptions

create function pg_temp.today() returns date language sql stable as $$ select (now() at time zone 'Europe/Kyiv')::date $$;
grant execute on function pg_temp.today() to authenticated;

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');

select public.set_schedule_exceptions(pg_temp.today() + 1, pg_temp.today() + 5, '{}');

select results_eq(
  $$ select day - pg_temp.today(), hours::text from public.schedule_exceptions order by day $$,
  $$ values (1, '{}'), (2, '{}'), (3, '{}'), (4, '{}'), (5, '{}') $$,
  'a day off is written for every day of the period'
);

select public.set_schedule_exceptions(pg_temp.today() + 20, pg_temp.today() + 24, '{[600,900)}');

select is(
  (select count(*) from public.schedule_exceptions where day >= pg_temp.today() + 20 and hours = '{[600,900)}')::integer,
  5,
  'special hours are written for every day of the period'
);

select public.set_schedule_exceptions(pg_temp.today() + 22, pg_temp.today() + 23, '{[720,780)}');

select results_eq(
  $$ select day - pg_temp.today(), hours::text from public.schedule_exceptions where day >= pg_temp.today() + 20 order by day $$,
  $$ values (20, '{[600,900)}'), (21, '{[600,900)}'), (22, '{[720,780)}'), (23, '{[720,780)}'), (24, '{[600,900)}') $$,
  'days inside the period are overwritten and the others stay'
);

reset role;

insert into public.schedule_exceptions (master_id, day, hours)
select '00000000-0000-0000-0000-00000000000a', pg_temp.today() + d, '{[600,900)}'
from generate_series(-2, 3) as d
on conflict (master_id, day) do update set hours = excluded.hours;

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');

select public.set_schedule_exceptions(
  pg_temp.today() + 1, pg_temp.today() + 2, '{[0,60)}',
  pg_temp.today() - 2, pg_temp.today() + 3
);

select results_eq(
  $$ select day - pg_temp.today(), hours::text from public.schedule_exceptions
     where day between pg_temp.today() - 2 and pg_temp.today() + 5 order by day $$,
  $$ values (-2, '{[600,900)}'), (-1, '{[600,900)}'), (1, '{[0,60)}'), (2, '{[0,60)}'), (4, '{}'), (5, '{}') $$,
  'a replaced period loses the days outside the new one but keeps the past'
);

select throws_ok(
  $$ select public.set_schedule_exceptions(pg_temp.today() + 5, pg_temp.today() + 4, '{}') $$,
  'P0001', 'invalid_range',
  'reversed dates are rejected'
);

select throws_ok(
  $$ select public.set_schedule_exceptions(pg_temp.today() + 1, pg_temp.today() + 366, '{}') $$,
  'P0001', 'invalid_range',
  'a period of 366 days is rejected'
);

select throws_ok(
  $$ select public.set_schedule_exceptions(pg_temp.today() - 1, pg_temp.today() + 3, '{}') $$,
  'P0001', 'invalid_range',
  'a period that starts before today is rejected'
);

select throws_ok(
  $$ select public.set_schedule_exceptions(pg_temp.today() + 1, pg_temp.today() + 2, '{[0,1500)}') $$,
  '23514', null,
  'hours outside the day are rejected for exceptions'
);

select is(
  (select count(*) from public.schedule_exceptions where day = pg_temp.today() + 1 and hours = '{[0,60)}')::integer,
  1,
  'a rejected period leaves the rows unchanged'
);

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select lives_ok(
  $$ select public.set_schedule_exceptions((now() at time zone 'Pacific/Pago_Pago')::date, (now() at time zone 'Pacific/Pago_Pago')::date, '{}') $$,
  'today follows the master''s zone, west of the server'
);

select lives_ok(
  $$ select public.set_schedule_exceptions(
       (now() at time zone 'Pacific/Pago_Pago')::date + 1, (now() at time zone 'Pacific/Pago_Pago')::date + 365, '{}') $$,
  'a period of 365 days counting both ends is accepted'
);

select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select throws_ok(
  $$ select public.set_schedule_exceptions((now() at time zone 'Pacific/Kiritimati')::date - 1, (now() at time zone 'Pacific/Kiritimati')::date, '{}') $$,
  'P0001', 'invalid_range',
  'yesterday in the master''s zone is the past, east of the server'
);

reset role;

select is(
  (select count(*) from public.schedule_exceptions where master_id = '00000000-0000-0000-0000-00000000000b')::integer,
  1,
  'another master''s exceptions are never touched'
);

-- Privileges

set local role anon;

select throws_ok(
  $$ select public.set_work_template_days('{1}', '{}') $$,
  '42501', null,
  'visitors cannot write the template'
);

select throws_ok(
  $$ select public.set_schedule_exceptions(current_date, current_date, '{}') $$,
  '42501', null,
  'visitors cannot write exceptions'
);

select throws_ok(
  $$ select * from public.get_upcoming_appointments() $$,
  '42501', null,
  'visitors cannot list upcoming appointments'
);

reset role;

-- The agent role cannot run the pgTAP helpers, so its denials are recorded and asserted afterwards.
create function pg_temp.denied(statement text)
returns boolean
language plpgsql
as $$
begin
  execute statement;
  return false;
exception when insufficient_privilege then
  return true;
end;
$$;

grant execute on function pg_temp.denied(text) to agent;
create temporary table agent_denied (name text primary key, denied boolean not null) on commit drop;
grant all on agent_denied to agent;

set local role agent;

insert into agent_denied values
  ('template', pg_temp.denied($$ select public.set_work_template_days('{1}', '{}') $$)),
  ('exceptions', pg_temp.denied($$ select public.set_schedule_exceptions(current_date, current_date, '{}') $$)),
  ('upcoming', pg_temp.denied($$ select * from public.get_upcoming_appointments() $$));

reset role;

select is(denied, true, 'agents cannot ' || case name when 'template' then 'write the template' when 'exceptions' then 'write exceptions' else 'list upcoming appointments' end)
from agent_denied order by name;

-- Upcoming appointments

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');

select results_eq(
  $$ select id, client_name from public.get_upcoming_appointments() $$,
  $$ values
    ('00000000-0000-0000-0000-0000000000e1'::uuid, 'Mark'),
    ('00000000-0000-0000-0000-0000000000e2'::uuid, 'Ira'),
    ('00000000-0000-0000-0000-0000000000e3'::uuid, null) $$,
  'upcoming are confirmed and live-held confirmed-contact ones, in time order, and not ended, cancelled, unconfirmed, expired or another master''s'
);

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');

select results_eq(
  $$ select id from public.get_upcoming_appointments() $$,
  $$ values ('00000000-0000-0000-0000-0000000000e8'::uuid) $$,
  'a master sees only own upcoming appointments'
);

-- Slots follow the written schedule

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');

create function pg_temp.thursday() returns date language sql stable as $$
  select pg_temp.today() + ((4 - extract(isodow from pg_temp.today())::integer + 7) % 7) + 7
$$;
grant execute on function pg_temp.thursday() to authenticated;

select public.set_work_template_days('{4}', '{[600,720)}');

select is(
  (select array[min(s), max(s)] from public.get_available_slots('00000000-0000-0000-0000-0000000000a1', pg_temp.thursday(), pg_temp.thursday()) as s),
  array[((pg_temp.thursday() + time '10:00') at time zone 'Europe/Kyiv'), ((pg_temp.thursday() + time '11:00') at time zone 'Europe/Kyiv')],
  'slots follow the template written through the function'
);

select public.set_schedule_exceptions(pg_temp.thursday(), pg_temp.thursday(), '{[840,900)}');

select is(
  (select array[min(s), max(s)] from public.get_available_slots('00000000-0000-0000-0000-0000000000a1', pg_temp.thursday(), pg_temp.thursday()) as s),
  array[((pg_temp.thursday() + time '14:00') at time zone 'Europe/Kyiv'), ((pg_temp.thursday() + time '14:00') at time zone 'Europe/Kyiv')],
  'slots follow special hours written through the function'
);

select public.set_schedule_exceptions(pg_temp.thursday(), pg_temp.thursday(), '{}');

select is(
  (select count(*) from public.get_available_slots('00000000-0000-0000-0000-0000000000a1', pg_temp.thursday(), pg_temp.thursday()))::integer,
  0,
  'a day off written through the function leaves no slots'
);

reset role;

select * from finish();
rollback;
