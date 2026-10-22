-- Slots start every slot step from the start of each working interval, in the master's time zone.
-- The service must fit the interval; its buffer may run past it but must not overlap busy time.
create function private.available_slots(
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
    where b.master_id = s.master_id
      and b.during && tstzrange(
        (available_slots.day_from - 1)::timestamp at time zone s.timezone,
        (available_slots.day_to + 2)::timestamp at time zone s.timezone
      )
      and (b.appointment_id is null or b.appointment_id is distinct from available_slots.ignore_appointment_id)
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

-- Visitors see published masters and active services; the master also sees own drafts,
-- ignores notice and horizon, and may pick a custom duration.
create function public.get_available_slots(
  service_id uuid,
  day_from date,
  day_to date,
  duration_minutes integer default null,
  ignore_appointment_id uuid default null
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
      is_master
    );
end;
$$;

create function public.get_available_days(
  service_id uuid,
  day_from date,
  day_to date,
  duration_minutes integer default null,
  ignore_appointment_id uuid default null
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
    get_available_days.ignore_appointment_id
  ) as s
  cross join public.services sv
  join public.masters m on m.id = sv.master_id
  where sv.id = get_available_days.service_id
  order by 1;
$$;

revoke execute on function
  public.get_available_slots(uuid, date, date, integer, uuid),
  public.get_available_days(uuid, date, date, integer, uuid)
from public;

grant execute on function
  public.get_available_slots(uuid, date, date, integer, uuid),
  public.get_available_days(uuid, date, date, integer, uuid)
to anon, authenticated;
