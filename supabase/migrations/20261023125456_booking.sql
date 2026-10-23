-- Until the contact is confirmed a booking knows only the typed email; confirming it links the client card.
alter table public.appointment_clients
  alter column client_card_id drop not null,
  add column unconfirmed_email text check (unconfirmed_email = lower(unconfirmed_email) and length(unconfirmed_email) <= 320),
  add column address text check (btrim(address) <> '' and length(address) <= 300),
  add check (num_nonnulls(client_card_id, unconfirmed_email) = 1);

create index appointment_clients_unconfirmed_email_idx on public.appointment_clients (unconfirmed_email)
  where unconfirmed_email is not null;

-- Anyone may type any email, so only the server sees an unconfirmed one.
revoke select on public.appointment_clients from authenticated;
grant select (id, appointment_id, master_id, client_card_id, name, address, created_at)
  on public.appointment_clients to authenticated;

-- A pending appointment whose hold has run out no longer takes its time.
create or replace function private.available_slots(
  service_id uuid,
  day_from date,
  day_to date,
  as_of timestamptz,
  duration_minutes integer,
  ignore_appointment_id uuid,
  ignore_booking_rules boolean
)
returns setof timestamptz
language sql
stable
set search_path = ''
as $$
  with s as (
    select
      m.id as master_id,
      m.timezone,
      make_interval(mins => m.slot_step_minutes) as step,
      make_interval(mins => m.min_notice_minutes) as notice,
      make_interval(days => m.horizon_days) as horizon,
      make_interval(mins => coalesce(available_slots.duration_minutes, sv.duration_minutes)) as duration,
      make_interval(mins => sv.buffer_minutes) as buffer
    from public.services sv
    join public.masters m on m.id = sv.master_id
    where sv.id = available_slots.service_id
  ),
  days as (
    select d::date as day
    from generate_series(available_slots.day_from, available_slots.day_to, interval '1 day') as d
  ),
  local_intervals as (
    select
      (days.day + make_interval(mins => lower(r))) at time zone s.timezone as starts,
      (days.day + make_interval(mins => upper(r))) at time zone s.timezone as ends
    from days
    cross join s
    left join public.schedule_exceptions e on e.master_id = s.master_id and e.day = days.day
    left join public.work_template t on t.master_id = s.master_id and t.weekday = extract(isodow from days.day)
    cross join lateral unnest(coalesce(e.hours, t.hours, '{}')) as r
  ),
  -- Local times inside a skipped DST hour shift forward, so intervals may overlap or invert.
  intervals as (
    select unnest(range_agg(tstzrange(starts, ends))) as during
    from local_intervals
    where starts < ends
  ),
  busy as materialized (
    select range_agg(b.during) as during
    from private.busy_times b
    cross join s
    left join public.appointments a on a.id = b.appointment_id
    where b.master_id = s.master_id
      and b.during && tstzrange(
        (available_slots.day_from - 1)::timestamp at time zone s.timezone,
        (available_slots.day_to + 2)::timestamp at time zone s.timezone
      )
      and (b.appointment_id is null or b.appointment_id is distinct from available_slots.ignore_appointment_id)
      and not coalesce(a.status = 'pending' and a.hold_until <= available_slots.as_of, false)
  )
  select c.starts
  from intervals i
  cross join s
  cross join busy
  cross join lateral generate_series(lower(i.during), upper(i.during) - s.duration, s.step) as c (starts)
  where c.starts >= available_slots.as_of
    and (
      available_slots.ignore_booking_rules
      or (c.starts >= available_slots.as_of + s.notice and c.starts < available_slots.as_of + s.horizon)
    )
    and not coalesce(busy.during && tstzrange(c.starts, c.starts + s.duration + s.buffer), false)
  order by c.starts;
$$;

-- Expiring holds on schedule belongs to a job; booking frees the master's run-out holds itself so they never block it.
create function private.expire_holds(master_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.appointments a
  set status = 'cancelled', hold_until = null, cancelled_by = 'system'
  where a.master_id = expire_holds.master_id and a.status = 'pending' and a.hold_until <= now();
$$;

create function public.book_appointment(
  service_id uuid,
  starts_at timestamptz,
  name text,
  email text,
  locale public.locale,
  address text default null
)
returns table (appointment_id uuid, hold_until timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  client_name text := btrim(book_appointment.name);
  client_email text := lower(btrim(book_appointment.email));
  client_address text := nullif(btrim(book_appointment.address), '');
  client_user uuid;
  active integer;
  new_id uuid;
  new_hold timestamptz;
begin
  select sv.master_id, sv.duration_minutes, sv.buffer_minutes, sv.format, m.timezone, m.max_active_bookings into s
  from public.services sv
  join public.masters m on m.id = sv.master_id
  where sv.id = book_appointment.service_id and sv.archived_at is null and m.published_at is not null;
  if not found then
    raise exception 'service_not_found';
  end if;
  if client_name is null or client_name = '' or length(client_name) > 100 then
    raise exception 'invalid_name';
  end if;
  if client_email is null or length(client_email) > 320 or client_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'invalid_email';
  end if;
  if s.format <> 'at_client' then
    client_address := null;
  elsif client_address is null then
    raise exception 'address_required';
  elsif length(client_address) > 300 then
    raise exception 'invalid_address';
  end if;

  -- Counting active bookings and then inserting would race without a lock per contact.
  perform pg_advisory_xact_lock(hashtextextended('booking:' || s.master_id || ':' || client_email, 0));
  perform private.expire_holds(s.master_id);

  select c.user_id into client_user
  from public.contacts c
  where c.channel = 'email' and c.address = client_email;

  select count(*) into active
  from public.appointment_clients ac
  join public.appointments a on a.id = ac.appointment_id
  left join public.client_cards cc on cc.id = ac.client_card_id
  where ac.master_id = s.master_id
    and (ac.unconfirmed_email = client_email or cc.user_id = client_user)
    and (
      (a.status = 'pending' and a.hold_until > now())
      or (a.status = 'confirmed' and upper(a.during) > now())
    );
  if active >= s.max_active_bookings then
    raise exception 'booking_limit_reached';
  end if;

  if book_appointment.starts_at is null or not exists (
    select 1
    from private.available_slots(
      book_appointment.service_id,
      (book_appointment.starts_at at time zone s.timezone)::date,
      (book_appointment.starts_at at time zone s.timezone)::date,
      now(),
      null,
      null,
      false
    ) as slot
    where slot = book_appointment.starts_at
  ) then
    raise exception 'slot_unavailable';
  end if;

  new_hold := least(now() + interval '15 minutes', book_appointment.starts_at);
  begin
    insert into public.appointments (master_id, service_id, during, buffer_minutes, status, hold_until, source, locale)
    values (
      s.master_id,
      book_appointment.service_id,
      tstzrange(book_appointment.starts_at, book_appointment.starts_at + make_interval(mins => s.duration_minutes)),
      s.buffer_minutes,
      'pending',
      new_hold,
      'client',
      book_appointment.locale
    )
    returning id into new_id;
  exception when exclusion_violation then
    raise exception 'slot_unavailable';
  end;

  insert into public.appointment_clients (appointment_id, master_id, unconfirmed_email, name, address)
  values (new_id, s.master_id, client_email, client_name, client_address);

  return query select new_id, new_hold;
end;
$$;

-- Only whoever booked knows the new appointment's id, so it is enough to release a booking whose contact is not confirmed yet.
create function public.release_booking(appointment_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.appointments a
  set status = 'cancelled', hold_until = null, cancelled_by = 'client'
  where a.id = release_booking.appointment_id
    and a.status = 'pending'
    and a.contact_confirmed_at is null
    and exists (
      select 1 from public.appointment_clients ac
      where ac.appointment_id = a.id and ac.client_card_id is null
    );
$$;

-- Confirming an email signs the user in and confirms every booking made with it that still holds its time.
create function public.claim_bookings()
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
    where ac.unconfirmed_email = my_email and a.status = 'pending' and a.hold_until > now()
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
    set client_card_id = card, unconfirmed_email = null
    where ac.id = b.id;

    update public.appointments a
    set contact_confirmed_at = now(),
      status = case when b.auto_confirm then 'confirmed'::public.appointment_status else 'pending' end,
      hold_until = case when b.auto_confirm then null else least(now() + interval '24 hours', b.starts) end
    where a.id = b.appointment_id
    returning a.id, a.status, a.hold_until into claim_bookings.appointment_id, claim_bookings.status, claim_bookings.hold_until;

    return next;
  end loop;
end;
$$;

revoke execute on function
  private.expire_holds(uuid),
  public.book_appointment(uuid, timestamptz, text, text, public.locale, text),
  public.release_booking(uuid),
  public.claim_bookings()
from public, anon, authenticated;

grant execute on function
  public.book_appointment(uuid, timestamptz, text, text, public.locale, text),
  public.release_booking(uuid)
to anon, authenticated;

grant execute on function public.claim_bookings() to authenticated;
