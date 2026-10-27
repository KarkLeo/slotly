begin;

select plan(24);

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

-- Deliveries are requested only once Vault knows where to send them.
delete from vault.secrets where name in ('notifications_url', 'notifications_secret');

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'olena@example.com', now(), '{"locale": "ru"}'),
  ('00000000-0000-0000-0000-00000000000b', 'daryna@example.com', now(), '{}'),
  ('00000000-0000-0000-0000-00000000000c', 'zoya@example.com', now(), '{}'),
  ('00000000-0000-0000-0000-0000000000c1', 'mark@example.com', now(), '{"locale": "en"}');

insert into public.masters (id, slug, name, published_at, auto_confirm, primary_locale, locales) values
  ('00000000-0000-0000-0000-00000000000a', 'olena', 'Olena', now(), false, 'uk', '{uk,ru}'),
  ('00000000-0000-0000-0000-00000000000b', 'daryna', 'Daryna', now(), false, 'en', '{en}'),
  ('00000000-0000-0000-0000-00000000000c', 'zoya', 'Zoya', now(), true, 'uk', '{uk}');

insert into public.services (id, master_id, name, duration_minutes, buffer_minutes, price_kind, format) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', '{"uk": "Манікюр"}', 60, 0, 'none', 'on_site'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', '{"en": "Haircut"}', 60, 0, 'none', 'on_site'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000c', '{"uk": "Масаж"}', 60, 0, 'none', 'on_site');

insert into public.work_template (master_id, weekday, hours)
select m, d, '{[0,1440)}'
from unnest(array[
  '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c'
]::uuid[]) as m
cross join generate_series(1, 7) as d;

create temporary table booked (name text primary key, appointment_id uuid) on commit drop;
grant all on booked to service_role, authenticated;

set local role service_role;

insert into booked
select v.name, b.appointment_id
from (values
  ('olena', '00000000-0000-0000-0000-0000000000a1'::uuid, 2),
  ('daryna', '00000000-0000-0000-0000-0000000000b1'::uuid, 3),
  ('zoya', '00000000-0000-0000-0000-0000000000c1'::uuid, 4),
  ('released', '00000000-0000-0000-0000-0000000000a1'::uuid, 5)
) as v (name, service, hours)
cross join lateral public.book_appointment(v.service, pg_temp.slot(v.hours), 'Mark', 'mark@example.com', 'uk') b;

select public.release_booking((select appointment_id from booked where name = 'released'));

reset role;

select is_empty(
  $$ select 1 from private.notifications $$,
  'unconfirmed holds, booked or released, notify nobody'
);

-- Contact confirmed

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select * from public.claim_bookings(array(select appointment_id from booked where name in ('olena', 'daryna', 'zoya')));
reset role;

select results_eq(
  $$ select n.kind::text, n.recipient_id from private.notifications n order by n.recipient_id $$,
  $$ values ('decision_needed', '00000000-0000-0000-0000-00000000000a'::uuid),
            ('decision_needed', '00000000-0000-0000-0000-00000000000b'::uuid) $$,
  'each master without auto-confirm is asked to decide, the auto-confirming master is not notified'
);

-- Master decisions

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select public.confirm_appointment((select appointment_id from booked where name = 'olena'));
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select public.cancel_appointment((select appointment_id from booked where name = 'daryna'), '  Захворіла  ');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select public.reschedule_appointment((select appointment_id from booked where name = 'zoya'), pg_temp.slot(8));
select public.cancel_appointment((select appointment_id from booked where name = 'zoya'));
reset role;

select results_eq(
  $$ select n.kind::text, n.recipient_id from private.notifications n
     join booked b using (appointment_id) where b.name = 'olena' and n.kind = 'confirmed' $$,
  $$ values ('confirmed', '00000000-0000-0000-0000-0000000000c1'::uuid) $$,
  'a master confirming tells the client'
);

select results_eq(
  $$ select n.kind::text, n.recipient_id from private.notifications n
     join booked b using (appointment_id) where b.name = 'daryna' and n.kind <> 'decision_needed' $$,
  $$ values ('declined', '00000000-0000-0000-0000-0000000000c1'::uuid) $$,
  'a master cancelling an appointment that waits for them declines it'
);

select results_eq(
  $$ select n.kind::text, n.data from private.notifications n
     join booked b using (appointment_id) where b.name = 'zoya' order by n.kind::text $$,
  $$ values ('cancelled_by_master', '{}'::jsonb),
            ('rescheduled_by_master', jsonb_build_object('previousStartsAt', pg_temp.slot(4))) $$,
  'a master rescheduling keeps the previous start; cancelling a confirmed appointment is not a decline'
);

-- Client cancels

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select public.cancel_appointment((select appointment_id from booked where name = 'olena'), 'Не встигаю');
reset role;

select results_eq(
  $$ select n.kind::text, n.recipient_id from private.notifications n
     join booked b using (appointment_id) where b.name = 'olena' and n.kind = 'cancelled_by_client' $$,
  $$ values ('cancelled_by_client', '00000000-0000-0000-0000-00000000000a'::uuid) $$,
  'a client cancelling tells the master'
);

select is(
  (select count(*)::integer from private.notifications),
  7,
  'every event above queued exactly one notification'
);

-- Delivery requests

select is(
  (select count(*)::integer from net.http_request_queue),
  0,
  'without Vault secrets no delivery is requested'
);

select vault.create_secret('http://notifications.test/deliver', 'notifications_url');
select vault.create_secret('test-secret', 'notifications_secret');

select private.enqueue_notification('reminder', (select appointment_id from booked where name = 'olena'));

select results_eq(
  $$ select url, headers->>'Authorization' from net.http_request_queue $$,
  $$ values ('http://notifications.test/deliver', 'Bearer test-secret') $$,
  'a queued notification requests a delivery with the secret'
);

insert into private.notifications (kind, appointment_id, recipient_id)
select 'reminder', appointment_id, '00000000-0000-0000-0000-0000000000c1'
from booked where name in ('olena', 'zoya');

select is(
  (select count(*)::integer from net.http_request_queue),
  2,
  'one statement requests one delivery however many rows it queues'
);

select is(
  (select count(*)::integer from cron.job where jobname = 'deliver-notifications' and schedule = '* * * * *'),
  1,
  'a cron job retries deliveries every minute'
);

delete from private.notifications where kind = 'reminder';

-- Claiming

set local role service_role;
create temporary table claimed on commit drop as select * from public.claim_due_notifications(100);
create temporary table claimed_again on commit drop as select * from public.claim_due_notifications(100);
reset role;

select is((select count(*)::integer from claimed), 7, 'all due notifications are claimed');
select is((select count(*)::integer from claimed_again), 0, 'a claimed notification is not handed out twice');

select results_eq(
  $$ select c.kind::text, c.audience, c.locale::text, c.recipient_email, c.master_slug, c.client_name
     from claimed c where c.kind in ('decision_needed', 'cancelled_by_client') order by c.master_slug, c.kind::text $$,
  $$ values ('decision_needed', 'master', 'en', 'daryna@example.com', 'daryna', 'Mark'),
            ('cancelled_by_client', 'master', 'ru', 'olena@example.com', 'olena', 'Mark'),
            ('decision_needed', 'master', 'ru', 'olena@example.com', 'olena', 'Mark') $$,
  'a master is written in their own language, else their landing''s primary language'
);

select results_eq(
  $$ select distinct c.audience, c.locale::text, c.recipient_email from claimed c
     where c.kind in ('confirmed', 'declined', 'rescheduled_by_master', 'cancelled_by_master') $$,
  $$ values ('client', 'uk', 'mark@example.com') $$,
  'a client is written in the language of the booking'
);

select ok(
  (select bool_and(c.recipient_id = n.recipient_id) from claimed c join private.notifications n using (id)),
  'a claimed notification names its recipient'
);

select results_eq(
  $$ select c.cancel_comment, c.status::text, c.service_name from claimed c where c.kind = 'declined' $$,
  $$ values ('Захворіла', 'cancelled', '{"en": "Haircut"}'::jsonb) $$,
  'a claimed notification carries the appointment it is about'
);

select ok(
  (select bool_and(locked_until = now() + interval '2 minutes') from private.notifications),
  'claiming locks a notification for two minutes'
);

-- Outcomes

create temporary table picked on commit drop as
select id from private.notifications where kind = 'confirmed';
create temporary table finished on commit drop as
select kind, id from private.notifications where kind in ('declined', 'cancelled_by_master');
grant select on picked, finished to service_role;

set local role service_role;
select public.finish_notification((select id from picked), 'retry', null, 'Email provider answered 500');
reset role;

select results_eq(
  $$ select n.status, n.attempts, n.next_attempt_at, n.locked_until, n.last_error from private.notifications n join picked using (id) $$,
  $$ values ('pending', 1, now() + interval '1 minute', null::timestamptz, 'Email provider answered 500') $$,
  'a failed delivery is retried in a minute'
);

set local role service_role;
select public.finish_notification((select id from picked), 'retry');
select public.finish_notification((select id from picked), 'retry');
select public.finish_notification((select id from picked), 'retry');
reset role;

select results_eq(
  $$ select n.status, n.attempts, n.next_attempt_at from private.notifications n join picked using (id) $$,
  $$ values ('pending', 4, now() + interval '2 hours') $$,
  'retries back off to two hours'
);

set local role service_role;
select public.finish_notification((select id from picked), 'retry');
reset role;

select is(
  (select status from private.notifications join picked using (id)),
  'failed',
  'the fifth failure gives up'
);

set local role service_role;
select public.finish_notification((select id from finished where kind = 'declined'), 'sent', 'email');
select public.finish_notification((select id from finished where kind = 'cancelled_by_master'), 'skipped', null, 'Daily email cap reached');
reset role;

select results_eq(
  $$ select n.kind::text, n.status, n.channel::text, n.sent_at, n.last_error from private.notifications n
     where n.kind in ('declined', 'cancelled_by_master') order by n.kind::text $$,
  $$ values ('cancelled_by_master', 'skipped', null, null::timestamptz, 'Daily email cap reached'),
            ('declined', 'sent', 'email', now(), null) $$,
  'a sent notification records its channel, a skipped one its reason'
);

-- Privileges

select ok(
  not has_function_privilege('anon', 'public.claim_due_notifications(integer)', 'execute')
    and not has_function_privilege('authenticated', 'public.claim_due_notifications(integer)', 'execute')
    and not has_function_privilege('anon', 'public.finish_notification(uuid, text, public.contact_channel, text)', 'execute')
    and not has_function_privilege('authenticated', 'public.finish_notification(uuid, text, public.contact_channel, text)', 'execute'),
  'clients and masters cannot claim or finish notifications'
);

select ok(
  has_function_privilege('service_role', 'public.claim_due_notifications(integer)', 'execute')
    and has_function_privilege('service_role', 'public.finish_notification(uuid, text, public.contact_channel, text)', 'execute'),
  'the server can claim and finish notifications'
);

select * from finish();

rollback;
