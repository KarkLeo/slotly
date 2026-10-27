begin;

select plan(17);

-- Deliveries are requested only once Vault knows where to send them.
delete from vault.secrets where name in ('notifications_url', 'notifications_secret');
-- A database used by the dev server already has queued notifications.
delete from private.notifications;

insert into auth.users (id, email, email_confirmed_at, created_at) values
  ('00000000-0000-0000-0000-00000000000a', 'olena@example.com', now(), now()),
  ('00000000-0000-0000-0000-0000000000c1', 'mark@example.com', now(), now()),
  ('00000000-0000-0000-0000-0000000000d1', 'gone@example.com', null, now() - interval '2 days'),
  ('00000000-0000-0000-0000-0000000000d2', 'typing@example.com', null, now()),
  ('00000000-0000-0000-0000-0000000000d3', 'early@example.com', now(), now() - interval '2 days');

insert into public.masters (id, slug, name, published_at) values
  ('00000000-0000-0000-0000-00000000000a', 'olena', 'Olena', now());

insert into public.services (id, master_id, name, duration_minutes, buffer_minutes, price_kind, format) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', '{"uk": "Манікюр"}', 60, 0, 'none', 'on_site');

insert into public.client_cards (id, master_id, user_id, name) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c1', 'Mark'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-00000000000a', null, 'Walk-in');

create temporary table booked (name text primary key, appointment_id uuid) on commit drop;

create function pg_temp.add(
  name text,
  status public.appointment_status,
  hours integer,
  card uuid,
  created timestamptz default now(),
  hold timestamptz default null,
  confirmed timestamptz default now(),
  buffer integer default 0,
  canceller public.canceller default null
)
returns void
language plpgsql
as $$
declare
  starts timestamptz := date_trunc('hour', now()) + make_interval(hours => hours);
  new_id uuid;
begin
  insert into public.appointments (
    master_id, service_id, during, buffer_minutes, status, hold_until, contact_confirmed_at, source, locale, cancelled_by,
    created_at
  )
  values (
    '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
    tstzrange(starts, starts + interval '1 hour'), buffer, status, hold, case when card is not null then confirmed end,
    'client', 'uk', canceller, created
  )
  returning id into new_id;
  insert into public.appointment_clients (appointment_id, master_id, client_card_id, unconfirmed_email, client_ip, name)
  values (
    new_id, '00000000-0000-0000-0000-00000000000a', card,
    case when card is null then lower(name) || '@example.com' end,
    case when card is null then '203.0.113.1'::inet end,
    name
  );
  insert into booked values (name, new_id);
end;
$$;

select pg_temp.add('waited', 'pending', 48, '00000000-0000-0000-0000-0000000000e1', hold => now() - interval '1 minute');
select pg_temp.add('unconfirmed', 'pending', 50, null, hold => now() - interval '1 minute');
select pg_temp.add('holding', 'pending', 12, '00000000-0000-0000-0000-0000000000e1', now() - interval '3 days', now() + interval '1 hour');
select pg_temp.add('ended', 'confirmed', -4, '00000000-0000-0000-0000-0000000000e1');
select pg_temp.add('in_buffer', 'confirmed', -1, '00000000-0000-0000-0000-0000000000e1', buffer => 120);
select pg_temp.add('tomorrow', 'confirmed', 20, '00000000-0000-0000-0000-0000000000e1', now() - interval '3 days');
select pg_temp.add('far', 'confirmed', 30, '00000000-0000-0000-0000-0000000000e1', now() - interval '3 days');
select pg_temp.add('booked_late', 'confirmed', 22, '00000000-0000-0000-0000-0000000000e1', now() - interval '1 hour');
select pg_temp.add('rescheduled', 'confirmed', 18, '00000000-0000-0000-0000-0000000000e1', now() - interval '3 days');
select pg_temp.add('moved_later', 'confirmed', 16, '00000000-0000-0000-0000-0000000000e1', now() - interval '5 days');
select pg_temp.add('walk_in', 'confirmed', 14, '00000000-0000-0000-0000-0000000000e2', now() - interval '3 days');
select pg_temp.add('old_hold', 'cancelled', -30, null, now() - interval '2 days', canceller => 'system');
select pg_temp.add('old_cancelled', 'cancelled', -26, '00000000-0000-0000-0000-0000000000e1', now() - interval '2 days',
  canceller => 'master');

insert into private.notifications (kind, appointment_id, recipient_id, created_at)
select v.kind::public.notification_kind, b.appointment_id, '00000000-0000-0000-0000-0000000000c1', now() - v.ago
from (values
  ('rescheduled', 'rescheduled_by_master', interval '1 hour'),
  ('moved_later', 'reminder', interval '3 days')
) as v (name, kind, ago)
join booked b using (name);

-- Expiring holds

select private.expire_holds();

select results_eq(
  $$ select b.name, a.status::text, a.cancelled_by::text, a.hold_until from public.appointments a
     join booked b on b.appointment_id = a.id where b.name in ('waited', 'unconfirmed', 'holding') order by b.name $$,
  $$ values ('holding', 'pending', null, now() + interval '1 hour'),
            ('unconfirmed', 'cancelled', 'system', null::timestamptz),
            ('waited', 'cancelled', 'system', null) $$,
  'a hold that ran out is cancelled by the system, a running one is kept'
);

select results_eq(
  $$ select b.name, n.kind::text, n.recipient_id from private.notifications n
     join booked b using (appointment_id) where n.kind = 'master_did_not_respond' $$,
  $$ values ('waited', 'master_did_not_respond', '00000000-0000-0000-0000-0000000000c1'::uuid) $$,
  'a client who waited for the master is told the master did not respond; an unconfirmed hold notifies nobody'
);

select is(
  (select ac.client_ip from public.appointment_clients ac join booked b using (appointment_id) where b.name = 'unconfirmed'),
  null,
  'an expired unconfirmed hold forgets its IP'
);

select is_empty(
  $$ select 1 from private.busy_times t join booked b using (appointment_id) where b.name in ('waited', 'unconfirmed') $$,
  'an expired hold frees its time'
);

-- Completing appointments

select private.complete_appointments();

select results_eq(
  $$ select b.name, a.status::text from public.appointments a
     join booked b on b.appointment_id = a.id where b.name in ('ended', 'in_buffer', 'tomorrow') order by b.name $$,
  $$ values ('ended', 'completed'), ('in_buffer', 'confirmed'), ('tomorrow', 'confirmed') $$,
  'a confirmed appointment completes once it and its buffer are over'
);

select isnt_empty(
  $$ select 1 from private.busy_times t join booked b using (appointment_id) where b.name = 'in_buffer' $$,
  'an appointment still in its buffer keeps the time'
);

-- Reminders

select private.enqueue_reminders();

select results_eq(
  $$ select b.name, n.recipient_id from private.notifications n
     join booked b using (appointment_id) where n.kind = 'reminder' and n.created_at = now() order by b.name $$,
  $$ values ('moved_later', '00000000-0000-0000-0000-0000000000c1'::uuid),
            ('tomorrow', '00000000-0000-0000-0000-0000000000c1'::uuid) $$,
  'a confirmed appointment starting within a day reminds its client, also after a reminder about an earlier start'
);

select private.enqueue_reminders();

select is(
  (select count(*)::integer from private.notifications where kind = 'reminder' and created_at = now()),
  2,
  'an appointment is reminded about once'
);

select is_empty(
  $$ select 1 from private.notifications n join booked b using (appointment_id)
     where n.kind = 'reminder' and b.name in ('far', 'booked_late', 'rescheduled', 'walk_in', 'holding') $$,
  'no reminder for a start more than a day away, a booking made within a day, a fresh notice, a client without a user or a pending appointment'
);

-- Clean-up

insert into private.notifications (kind, appointment_id, recipient_id, status, created_at, data)
select 'reminder', b.appointment_id, '00000000-0000-0000-0000-0000000000c1', v.status, now() - v.ago, jsonb_build_object('case', v.name)
from (values
  ('old_sent', 'sent', interval '31 days'),
  ('old_failed', 'failed', interval '31 days'),
  ('old_pending', 'pending', interval '31 days'),
  ('recent_sent', 'sent', interval '29 days')
) as v (name, status, ago)
cross join booked b
where b.name = 'ended';

insert into private.rate_limits (bucket, window_start, hits) values
  ('test:old', now() - interval '25 hours', 1),
  ('test:recent', now() - interval '23 hours', 1);

insert into cron.job_run_details (runid, jobid, command, status, start_time, end_time) values
  (-1, null, 'select ''old''', 'succeeded', now() - interval '8 days', now() - interval '8 days'),
  (-2, null, 'select ''recent''', 'succeeded', now() - interval '6 days', now() - interval '6 days');

select private.clean_up();

select results_eq(
  $$ select n.data->>'case' from private.notifications n where n.data ? 'case' order by 1 $$,
  $$ values ('old_pending'), ('recent_sent') $$,
  'finished notifications are kept for 30 days, pending ones until they finish'
);

select results_eq(
  $$ select bucket from private.rate_limits where bucket like 'test:%' $$,
  $$ values ('test:recent') $$,
  'rate limit windows are kept for a day'
);

select is_empty(
  $$ select 1 from public.appointments a join booked b on b.appointment_id = a.id where b.name = 'old_hold' $$,
  'a day-old hold whose contact was never confirmed is deleted with its email'
);

select isnt_empty(
  $$ select 1 from public.appointments a join booked b on b.appointment_id = a.id where b.name = 'old_cancelled' $$,
  'an old cancelled booking with a confirmed client stays'
);

select isnt_empty(
  $$ select 1 from public.appointments a join booked b on b.appointment_id = a.id where b.name = 'unconfirmed' $$,
  'an unconfirmed hold from today stays'
);

select results_eq(
  $$ select email::text from auth.users where id in (
       '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d3'
     ) order by email $$,
  $$ values ('early@example.com'), ('typing@example.com') $$,
  'a user who never entered their code is deleted after a day'
);

select results_eq(
  $$ select command from cron.job_run_details where command in ('select ''old''', 'select ''recent''') $$,
  $$ values ('select ''recent''') $$,
  'cron run details are kept for 7 days'
);

-- Schedule

select results_eq(
  $$ select jobname::text, schedule::text, command from cron.job
     where jobname in ('expire-holds', 'complete-appointments', 'enqueue-reminders', 'clean-up') order by jobname $$,
  $$ values ('clean-up', '0 3 * * *', 'select private.clean_up()'),
            ('complete-appointments', '* * * * *', 'select private.complete_appointments()'),
            ('enqueue-reminders', '*/15 * * * *', 'select private.enqueue_reminders()'),
            ('expire-holds', '* * * * *', 'select private.expire_holds()') $$,
  'cron runs each job on its schedule'
);

select * from finish();

rollback;
