-- A master on own landing sees the slots a client can book; only an explicit request ignores notice and horizon.
drop function public.get_available_days(uuid, date, date, integer, uuid);
drop function public.get_available_slots(uuid, date, date, integer, uuid);

-- Visitors see published masters and active services; the master also sees own drafts
-- and may pick a custom duration or ignore notice and horizon.
create function public.get_available_slots(
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
  if ignore_appointment_id is not null and not exists (
    select 1
    from public.appointments a
    where a.id = get_available_slots.ignore_appointment_id
      and a.master_id = s.master_id
      and (is_master or private.is_client_of(a.id))
  ) then
    raise exception 'appointment_not_found';
  end if;
  return query
    select private.available_slots(
      get_available_slots.service_id,
      get_available_slots.day_from,
      get_available_slots.day_to,
      now(),
      get_available_slots.duration_minutes,
      get_available_slots.ignore_appointment_id,
      coalesce(get_available_slots.ignore_booking_rules, false)
    );
end;
$$;

create function public.get_available_days(
  service_id uuid,
  day_from date,
  day_to date,
  duration_minutes integer default null,
  ignore_appointment_id uuid default null,
  ignore_booking_rules boolean default false
)
returns setof date
language sql
stable
security definer
set search_path = ''
as $$
  select distinct (s at time zone m.timezone)::date
  from public.get_available_slots(
    get_available_days.service_id,
    get_available_days.day_from,
    get_available_days.day_to,
    get_available_days.duration_minutes,
    get_available_days.ignore_appointment_id,
    get_available_days.ignore_booking_rules
  ) as s
  cross join public.services sv
  join public.masters m on m.id = sv.master_id
  where sv.id = get_available_days.service_id
  order by 1;
$$;

revoke execute on function
  public.get_available_slots(uuid, date, date, integer, uuid, boolean),
  public.get_available_days(uuid, date, date, integer, uuid, boolean)
from public;

grant execute on function
  public.get_available_slots(uuid, date, date, integer, uuid, boolean),
  public.get_available_days(uuid, date, date, integer, uuid, boolean)
to anon, authenticated;
