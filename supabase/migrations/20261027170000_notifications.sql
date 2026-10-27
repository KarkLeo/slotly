create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create type public.notification_kind as enum (
  'decision_needed',
  'confirmed',
  'declined',
  'cancelled_by_master',
  'cancelled_by_client',
  'rescheduled_by_master',
  'rescheduled_by_client',
  'master_did_not_respond',
  'booked_by_master',
  'reminder'
);

create table private.notifications (
  id uuid primary key default gen_random_uuid(),
  kind public.notification_kind not null,
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  -- What the appointment no longer holds, such as the start before a reschedule.
  data jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  channel public.contact_channel,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index notifications_due_idx on private.notifications (next_attempt_at) where status = 'pending';
create index notifications_appointment_id_idx on private.notifications (appointment_id);
create index notifications_recipient_id_idx on private.notifications (recipient_id);

create function private.notification_audience(kind public.notification_kind)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when kind in ('decision_needed', 'cancelled_by_client', 'rescheduled_by_client') then 'master' else 'client' end;
$$;

-- A client without a user (a manual booking without a contact) gets nothing.
create function private.enqueue_notification(kind public.notification_kind, appointment_id uuid, data jsonb default '{}')
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.notifications (kind, appointment_id, recipient_id, data)
  select r.kind, r.appointment_id, r.recipient_id, enqueue_notification.data
  from (
    select enqueue_notification.kind, a.id as appointment_id,
      case private.notification_audience(enqueue_notification.kind) when 'master' then a.master_id else cc.user_id end as recipient_id
    from public.appointments a
    left join public.appointment_clients ac on ac.appointment_id = a.id
    left join public.client_cards cc on cc.id = ac.client_card_id
    where a.id = enqueue_notification.appointment_id
  ) r
  where r.recipient_id is not null;
$$;

create function private.request_notification_delivery()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  url text;
  secret text;
begin
  select s.decrypted_secret into url from vault.decrypted_secrets s where s.name = 'notifications_url';
  select s.decrypted_secret into secret from vault.decrypted_secrets s where s.name = 'notifications_secret';
  if url is null or secret is null then
    return;
  end if;
  perform net.http_post(
    url := url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret, 'Content-Type', 'application/json'),
    timeout_milliseconds := 30000
  );
end;
$$;

create function private.notifications_request_delivery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.request_notification_delivery();
  return null;
end;
$$;

create trigger notifications_request_delivery
  after insert on private.notifications
  for each statement execute function private.notifications_request_delivery();

-- Retries and deliveries whose request was lost.
select cron.schedule(
  'deliver-notifications',
  '* * * * *',
  $$
    select private.request_notification_delivery()
    where exists (
      select 1 from private.notifications
      where status = 'pending' and next_attempt_at <= now() and (locked_until is null or locked_until <= now())
    )
  $$
);

create function public.claim_due_notifications(max_count integer)
returns table (
  id uuid,
  kind public.notification_kind,
  data jsonb,
  audience text,
  locale public.locale,
  recipient_email text,
  appointment_id uuid,
  status public.appointment_status,
  starts_at timestamptz,
  ends_at timestamptz,
  hold_until timestamptz,
  time_zone text,
  master_name text,
  master_slug text,
  service_name jsonb,
  primary_locale public.locale,
  price_kind public.price_kind,
  price numeric,
  currency text,
  address text,
  client_name text,
  cancel_comment text
)
language sql
security definer
set search_path = ''
as $$
  with due as (
    select n.id
    from private.notifications n
    where n.status = 'pending'
      and n.next_attempt_at <= now()
      and (n.locked_until is null or n.locked_until <= now())
    order by n.created_at
    limit claim_due_notifications.max_count
    for update skip locked
  ),
  locked as (
    update private.notifications n
    set locked_until = now() + interval '2 minutes'
    from due
    where n.id = due.id
    returning n.*
  )
  select l.id, l.kind, l.data, private.notification_audience(l.kind),
    case
      when private.notification_audience(l.kind) = 'client' then a.locale
      when u.raw_user_meta_data->>'locale' = any (enum_range(null::public.locale)::text[])
        then (u.raw_user_meta_data->>'locale')::public.locale
      else m.primary_locale
    end,
    c.address, a.id, a.status, lower(a.during), upper(a.during), a.hold_until, m.timezone, m.name, m.slug,
    sv.name, m.primary_locale, sv.price_kind, sv.price, m.currency, ac.address, cc.name, a.cancel_comment
  from locked l
  join public.appointments a on a.id = l.appointment_id
  join public.masters m on m.id = a.master_id
  join public.services sv on sv.id = a.service_id
  left join public.appointment_clients ac on ac.appointment_id = a.id
  left join public.client_cards cc on cc.id = ac.client_card_id
  left join auth.users u on u.id = l.recipient_id
  left join public.contacts c on c.user_id = l.recipient_id and c.channel = 'email'
  order by l.created_at;
$$;

create function public.finish_notification(
  notification_id uuid,
  outcome text,
  channel public.contact_channel default null,
  error text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if outcome not in ('sent', 'retry', 'skipped') then
    raise exception 'unknown_outcome';
  end if;
  update private.notifications n
  set status = case
      when outcome <> 'retry' then outcome
      when n.attempts + 1 >= 5 then 'failed'
      else 'pending'
    end,
    attempts = n.attempts + (outcome = 'retry')::integer,
    next_attempt_at = case
      when outcome = 'retry'
        then now() + (array[interval '1 minute', interval '5 minutes', interval '30 minutes', interval '2 hours'])[least(n.attempts + 1, 4)]
      else n.next_attempt_at
    end,
    locked_until = null,
    channel = finish_notification.channel,
    sent_at = case when outcome = 'sent' then now() end,
    last_error = finish_notification.error
  where n.id = finish_notification.notification_id;
end;
$$;

create or replace function public.claim_bookings(appointment_ids uuid[])
returns table (appointment_id uuid, status public.appointment_status, hold_until timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  my_email text;
  b record;
  card uuid;
begin
  select c.address into my_email
  from public.contacts c
  where c.user_id = me and c.channel = 'email';
  if my_email is null then
    return;
  end if;

  for b in
    select ac.id, ac.appointment_id, ac.master_id, ac.name, lower(a.during) as starts, m.auto_confirm
    from public.appointment_clients ac
    join public.appointments a on a.id = ac.appointment_id
    join public.masters m on m.id = ac.master_id
    where ac.appointment_id = any (claim_bookings.appointment_ids)
      and ac.unconfirmed_email = my_email
      and a.status = 'pending'
      and a.hold_until > now()
    order by lower(a.during)
    for update of ac, a
  loop
    insert into public.client_cards (master_id, user_id, name)
    values (b.master_id, me, b.name)
    on conflict on constraint client_cards_master_id_user_id_key do nothing;

    select cc.id into card
    from public.client_cards cc
    where cc.master_id = b.master_id and cc.user_id = me;

    update public.appointment_clients ac
    set client_card_id = card, unconfirmed_email = null, client_ip = null
    where ac.id = b.id;

    update public.appointments a
    set contact_confirmed_at = now(),
      status = case when b.auto_confirm then 'confirmed'::public.appointment_status else 'pending' end,
      hold_until = case when b.auto_confirm then null else least(now() + interval '24 hours', b.starts) end
    where a.id = b.appointment_id
    returning a.id, a.status, a.hold_until into claim_bookings.appointment_id, claim_bookings.status, claim_bookings.hold_until;

    if not b.auto_confirm then
      perform private.enqueue_notification('decision_needed', b.appointment_id);
    end if;

    return next;
  end loop;
end;
$$;

create or replace function public.confirm_appointment(appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.appointments;
begin
  select * into a from public.appointments
  where id = confirm_appointment.appointment_id and master_id = auth.uid()
  for update;
  if not found then
    raise exception 'appointment_not_found';
  end if;
  if a.status <> 'pending' or a.contact_confirmed_at is null then
    raise exception 'appointment_not_awaiting_master';
  end if;
  if a.hold_until <= now() then
    raise exception 'appointment_expired';
  end if;
  update public.appointments set status = 'confirmed', hold_until = null where id = a.id;
  perform private.enqueue_notification('confirmed', a.id);
end;
$$;

create or replace function public.cancel_appointment(appointment_id uuid, comment text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.appointments;
  canceller public.canceller;
begin
  select * into a from public.appointments where id = cancel_appointment.appointment_id for update;
  if a.master_id = auth.uid() then
    canceller := 'master';
  elsif private.is_client_of(a.id) then
    canceller := 'client';
  else
    raise exception 'appointment_not_found';
  end if;
  if a.status not in ('pending', 'confirmed') then
    raise exception 'appointment_not_active';
  end if;
  if canceller = 'client' and now() > lower(a.during) - make_interval(
    mins => (select m.cancel_deadline_minutes from public.masters m where m.id = a.master_id)
  ) then
    raise exception 'cancel_deadline_passed';
  end if;
  update public.appointments
  set status = 'cancelled', hold_until = null, cancelled_by = canceller, cancel_comment = nullif(btrim(comment), '')
  where id = a.id;
  perform private.enqueue_notification(
    case
      when canceller = 'client' then 'cancelled_by_client'
      when a.status = 'pending' then 'declined'
      else 'cancelled_by_master'
    end::public.notification_kind,
    a.id
  );
end;
$$;

create or replace function public.reschedule_appointment(appointment_id uuid, starts_at timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.appointments;
begin
  select * into a from public.appointments
  where id = reschedule_appointment.appointment_id and master_id = auth.uid()
  for update;
  if not found then
    raise exception 'appointment_not_found';
  end if;
  if a.status not in ('pending', 'confirmed') or upper(a.during) <= now() then
    raise exception 'appointment_not_active';
  end if;
  if starts_at < now() then
    raise exception 'starts_in_past';
  end if;
  update public.appointments
  set during = tstzrange(starts_at, starts_at + (upper(a.during) - lower(a.during))),
    hold_until = case when a.status = 'pending' then least(a.hold_until, starts_at) end
  where id = a.id;
  perform private.enqueue_notification('rescheduled_by_master', a.id, jsonb_build_object('previousStartsAt', lower(a.during)));
end;
$$;

revoke execute on function
  private.enqueue_notification(public.notification_kind, uuid, jsonb),
  private.request_notification_delivery()
from public;

-- Only the server delivers notifications.
revoke execute on function
  public.claim_due_notifications(integer),
  public.finish_notification(uuid, text, public.contact_channel, text)
from public, anon, authenticated;

grant execute on function
  public.claim_due_notifications(integer),
  public.finish_notification(uuid, text, public.contact_channel, text)
to service_role;
