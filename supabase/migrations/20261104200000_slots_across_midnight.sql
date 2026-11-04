-- The day after the range counts too: working time that continues past midnight is one interval,
-- so the slots of a day no longer depend on which days were asked for.
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
    from generate_series(available_slots.day_from, available_slots.day_to + 1, interval '1 day') as d
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
    and (c.starts at time zone s.timezone)::date between available_slots.day_from and available_slots.day_to
    and (
      available_slots.ignore_booking_rules
      or (c.starts >= available_slots.as_of + s.notice and c.starts < available_slots.as_of + s.horizon)
    )
    and not coalesce(busy.during && tstzrange(c.starts, c.starts + s.duration + s.buffer), false)
  order by c.starts;
$$;
