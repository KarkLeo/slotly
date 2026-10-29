-- A client of an online service may live in another zone and sees its slots, letters and bookings in that zone.
alter table public.appointments
  add column time_zone text check (time_zone is null or private.is_timezone(time_zone));

comment on column public.appointments.time_zone is
  'The zone the client chose for an online booking; null means the master''s zone.';

drop function public.get_available_days(uuid, date, date, integer, uuid, boolean);
drop function public.get_available_slots(uuid, date, date, integer, uuid, boolean);

-- Days are calendar dates in the given zone, the master's one by default.
create function public.get_available_slots(
  service_id uuid,
  day_from date,
  day_to date,
  duration_minutes integer default null,
  ignore_appointment_id uuid default null,
  ignore_booking_rules boolean default false,
  time_zone text default null
)
returns setof timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s record;
  is_master boolean;
  moved_minutes integer;
  zone text;
  -- Zones differ by up to 26 hours, so a day in another zone lies within two master days on either side.
  spread integer;
begin
  select sv.master_id, sv.archived_at, m.published_at, m.timezone into s
  from public.services sv
  join public.masters m on m.id = sv.master_id
  where sv.id = get_available_slots.service_id;
  if not found then
    raise exception 'service_not_found';
  end if;
  is_master := coalesce(s.master_id = auth.uid(), false);
  if not is_master and (s.published_at is null or s.archived_at is not null) then
    raise exception 'service_not_found';
  end if;
  if day_from is null or day_to is null or day_to < day_from or day_to - day_from > 61 then
    raise exception 'invalid_day_range';
  end if;
  if duration_minutes is not null and not is_master then
    raise exception 'duration_not_allowed';
  end if;
  if duration_minutes is not null and (duration_minutes not between 5 and 720 or duration_minutes % 5 <> 0) then
    raise exception 'invalid_duration';
  end if;
  if coalesce(ignore_booking_rules, false) and not is_master then
    raise exception 'booking_rules_not_ignorable';
  end if;
  -- Cheaper than private.is_timezone, which reads the whole zone list on every request.
  begin
    perform now() at time zone get_available_slots.time_zone;
  exception when invalid_parameter_value then
    raise exception 'invalid_time_zone';
  end;
  if ignore_appointment_id is not null then
    select extract(epoch from upper(a.during) - lower(a.during))::integer / 60 into moved_minutes
    from public.appointments a
    where a.id = get_available_slots.ignore_appointment_id
      and a.master_id = s.master_id
      and a.service_id = get_available_slots.service_id
      and (is_master or private.is_client_of(a.id));
    if not found then
      raise exception 'appointment_not_found';
    end if;
  end if;
  zone := coalesce(get_available_slots.time_zone, s.timezone);
  spread := case when zone = s.timezone then 0 else 2 end;
  return query
    select slot
    from private.available_slots(
      get_available_slots.service_id,
      get_available_slots.day_from - spread,
      get_available_slots.day_to + spread,
      now(),
      coalesce(get_available_slots.duration_minutes, moved_minutes),
      get_available_slots.ignore_appointment_id,
      coalesce(get_available_slots.ignore_booking_rules, false)
    ) as slot
    where (slot at time zone zone)::date between get_available_slots.day_from and get_available_slots.day_to
    order by slot;
end;
$$;

create function public.get_available_days(
  service_id uuid,
  day_from date,
  day_to date,
  duration_minutes integer default null,
  ignore_appointment_id uuid default null,
  ignore_booking_rules boolean default false,
  time_zone text default null
)
returns setof date
language sql
stable
security definer
set search_path = ''
as $$
  select distinct (s at time zone coalesce(get_available_days.time_zone, m.timezone))::date
  from public.get_available_slots(
    get_available_days.service_id,
    get_available_days.day_from,
    get_available_days.day_to,
    get_available_days.duration_minutes,
    get_available_days.ignore_appointment_id,
    get_available_days.ignore_booking_rules,
    get_available_days.time_zone
  ) as s
  cross join public.services sv
  join public.masters m on m.id = sv.master_id
  where sv.id = get_available_days.service_id
  order by 1;
$$;

revoke execute on function
  public.get_available_slots(uuid, date, date, integer, uuid, boolean, text),
  public.get_available_days(uuid, date, date, integer, uuid, boolean, text)
from public;

grant execute on function
  public.get_available_slots(uuid, date, date, integer, uuid, boolean, text),
  public.get_available_days(uuid, date, date, integer, uuid, boolean, text)
to anon, authenticated;

drop function public.book_appointment(uuid, timestamptz, text, text, public.locale, text, inet);

-- The zone is kept only for an online service shown in a zone other than the master's.
create function public.book_appointment(
  service_id uuid,
  starts_at timestamptz,
  name text,
  email text,
  locale public.locale,
  address text default null,
  client_ip inet default null,
  time_zone text default null
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
  unconfirmed integer;
  oldest uuid;
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
  if book_appointment.time_zone is not null and not private.is_timezone(book_appointment.time_zone) then
    raise exception 'invalid_time_zone';
  end if;

  -- Counting a master's holds and then inserting would race without a lock per master.
  perform pg_advisory_xact_lock(hashtextextended('booking:' || s.master_id, 0));

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

  if book_appointment.client_ip is not null and (
    select count(*)
    from public.appointment_clients ac
    join public.appointments a on a.id = ac.appointment_id
    where ac.client_ip = book_appointment.client_ip
      and a.status = 'pending' and a.contact_confirmed_at is null and a.hold_until > now()
  ) >= 2 then
    raise exception 'too_many_pending';
  end if;

  select count(*) into unconfirmed
  from public.appointments a
  where a.master_id = s.master_id
    and a.status = 'pending' and a.contact_confirmed_at is null and a.hold_until > now();
  if unconfirmed >= 5 then
    -- A person confirms the code within minutes, so a hold older than that is most likely a bot's.
    select a.id into oldest
    from public.appointments a
    where a.master_id = s.master_id
      and a.status = 'pending' and a.contact_confirmed_at is null and a.hold_until > now()
      and a.created_at <= now() - interval '5 minutes'
    order by a.created_at
    limit 1
    for update;
    if oldest is null then
      raise exception 'too_many_pending';
    end if;
    update public.appointments a
    set status = 'cancelled', hold_until = null, cancelled_by = 'system'
    where a.id = oldest;
    update public.appointment_clients ac set client_ip = null where ac.appointment_id = oldest;
  end if;

  new_hold := least(now() + interval '15 minutes', book_appointment.starts_at);
  begin
    insert into public.appointments (master_id, service_id, during, buffer_minutes, status, hold_until, source, locale, time_zone)
    values (
      s.master_id,
      book_appointment.service_id,
      tstzrange(book_appointment.starts_at, book_appointment.starts_at + make_interval(mins => s.duration_minutes)),
      s.buffer_minutes,
      'pending',
      new_hold,
      'client',
      book_appointment.locale,
      case when s.format = 'online' and book_appointment.time_zone <> s.timezone then book_appointment.time_zone end
    )
    returning id into new_id;
  exception when exclusion_violation then
    raise exception 'slot_unavailable';
  end;

  insert into public.appointment_clients (appointment_id, master_id, unconfirmed_email, name, address, client_ip)
  values (new_id, s.master_id, client_email, client_name, client_address, book_appointment.client_ip);

  return query select new_id, new_hold;
end;
$$;

-- Only the server books, so a bot cannot skip its limits by calling the database directly.
revoke execute on function public.book_appointment(uuid, timestamptz, text, text, public.locale, text, inet, text)
from public, anon, authenticated;
grant execute on function public.book_appointment(uuid, timestamptz, text, text, public.locale, text, inet, text)
to service_role;

create or replace function public.booking_email_details(appointment_id uuid, email text)
returns table (
  master_name text,
  service_name jsonb,
  primary_locale public.locale,
  locale public.locale,
  starts_at timestamptz,
  ends_at timestamptz,
  time_zone text,
  price_kind public.price_kind,
  price numeric,
  currency text,
  address text,
  hold_until timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.name, sv.name, m.primary_locale, a.locale, lower(a.during), upper(a.during), coalesce(a.time_zone, m.timezone),
    sv.price_kind, sv.price, m.currency, ac.address, a.hold_until
  from public.appointments a
  join public.appointment_clients ac on ac.appointment_id = a.id
  join public.masters m on m.id = a.master_id
  join public.services sv on sv.id = a.service_id
  where a.id = booking_email_details.appointment_id
    and ac.unconfirmed_email = lower(btrim(booking_email_details.email))
    and a.status = 'pending'
    and a.contact_confirmed_at is null
    and a.hold_until > now();
$$;

-- The client reads a notification in the zone of the booking, the master in their own.
create or replace function public.claim_due_notifications(max_count integer)
returns table (
  id uuid,
  kind public.notification_kind,
  data jsonb,
  attempts integer,
  audience text,
  locale public.locale,
  recipient_id uuid,
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
  select l.id, l.kind, l.data, l.attempts, private.notification_audience(l.kind),
    case
      when private.notification_audience(l.kind) = 'client' then a.locale
      when u.raw_user_meta_data->>'locale' = any (enum_range(null::public.locale)::text[])
        then (u.raw_user_meta_data->>'locale')::public.locale
      else m.primary_locale
    end,
    l.recipient_id, c.address, a.id, a.status, lower(a.during), upper(a.during), a.hold_until,
    case when private.notification_audience(l.kind) = 'client' then coalesce(a.time_zone, m.timezone) else m.timezone end,
    m.name, m.slug, sv.name, m.primary_locale, sv.price_kind, sv.price, m.currency, ac.address, cc.name, a.cancel_comment
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

drop function public.get_my_bookings();

-- What a client sees of their bookings with every master; a no-show is the master's own mark.
-- An unconfirmed hold has no client card yet, so it is not listed.
create function public.get_my_bookings()
returns table (
  appointment_id uuid,
  status public.appointment_status,
  starts_at timestamptz,
  ends_at timestamptz,
  hold_until timestamptz,
  change_until timestamptz,
  can_reschedule boolean,
  master_name text,
  master_slug text,
  time_zone text,
  booking_time_zone text,
  auto_confirm boolean,
  horizon_days integer,
  primary_locale public.locale,
  service_id uuid,
  service_name jsonb,
  price_kind public.price_kind,
  price numeric,
  currency text,
  format public.service_format,
  address text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,
    case when a.status = 'no_show' then 'completed'::public.appointment_status else a.status end,
    lower(a.during),
    upper(a.during),
    a.hold_until,
    lower(a.during) - make_interval(mins => m.cancel_deadline_minutes),
    m.published_at is not null and sv.archived_at is null,
    m.name,
    m.slug,
    m.timezone,
    coalesce(a.time_zone, m.timezone),
    m.auto_confirm,
    m.horizon_days,
    m.primary_locale,
    sv.id,
    sv.name,
    sv.price_kind,
    sv.price,
    m.currency,
    sv.format,
    ac.address
  from public.appointment_clients ac
  join public.client_cards cc on cc.id = ac.client_card_id
  join public.appointments a on a.id = ac.appointment_id
  join public.masters m on m.id = a.master_id
  join public.services sv on sv.id = a.service_id
  where cc.user_id = auth.uid()
  order by lower(a.during);
$$;

revoke execute on function public.get_my_bookings() from public, anon;
grant execute on function public.get_my_bookings() to authenticated;
