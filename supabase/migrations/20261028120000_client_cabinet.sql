-- Moving an appointment keeps its own length, which a manual booking may have set apart from the service.
create or replace function public.get_available_slots(
  service_id uuid,
  day_from date,
  day_to date,
  duration_minutes integer default null,
  ignore_appointment_id uuid default null,
  ignore_booking_rules boolean default false
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
begin
  select sv.master_id, sv.archived_at, m.published_at into s
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
  return query
    select private.available_slots(
      get_available_slots.service_id,
      get_available_slots.day_from,
      get_available_slots.day_to,
      now(),
      coalesce(get_available_slots.duration_minutes, moved_minutes),
      get_available_slots.ignore_appointment_id,
      coalesce(get_available_slots.ignore_booking_rules, false)
    );
end;
$$;

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

create function public.reschedule_booking(appointment_id uuid, starts_at timestamptz)
returns public.appointment_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.appointments;
  m public.masters;
  span interval;
  new_status public.appointment_status;
  new_hold timestamptz;
begin
  select * into a from public.appointments where id = reschedule_booking.appointment_id for update;
  if not found or not private.is_client_of(a.id) then
    raise exception 'appointment_not_found';
  end if;
  if a.status not in ('pending', 'confirmed') or a.hold_until <= now() then
    raise exception 'appointment_not_active';
  end if;
  select * into m from public.masters where id = a.master_id;
  if now() > lower(a.during) - make_interval(mins => m.cancel_deadline_minutes) then
    raise exception 'cancel_deadline_passed';
  end if;
  if m.published_at is null or exists (
    select 1 from public.services sv where sv.id = a.service_id and sv.archived_at is not null
  ) then
    raise exception 'service_not_found';
  end if;
  span := upper(a.during) - lower(a.during);
  if starts_at is null or starts_at = lower(a.during) or not exists (
    select 1
    from private.available_slots(
      a.service_id,
      (starts_at at time zone m.timezone)::date,
      (starts_at at time zone m.timezone)::date,
      now(),
      extract(epoch from span)::integer / 60,
      a.id,
      false
    ) as slot
    where slot = starts_at
  ) then
    raise exception 'slot_unavailable';
  end if;
  if m.auto_confirm then
    new_status := a.status;
    new_hold := case when a.status = 'pending' then least(a.hold_until, starts_at) end;
  else
    new_status := 'pending';
    new_hold := least(now() + interval '24 hours', starts_at);
  end if;
  begin
    update public.appointments
    set during = tstzrange(starts_at, starts_at + span), status = new_status, hold_until = new_hold
    where id = a.id;
  exception when exclusion_violation then
    raise exception 'slot_unavailable';
  end;
  perform private.enqueue_notification('rescheduled_by_client', a.id, jsonb_build_object('previousStartsAt', lower(a.during)));
  return new_status;
end;
$$;

revoke execute on function public.get_my_bookings(), public.reschedule_booking(uuid, timestamptz) from public, anon;
grant execute on function public.get_my_bookings(), public.reschedule_booking(uuid, timestamptz) to authenticated;
