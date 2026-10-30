-- Days are calendar dates in the master's zone; a block is split by them, an appointment belongs to the day it starts.
create function public.get_master_agenda(from_date date, to_date date)
returns table (
  kind text,
  id uuid,
  day date,
  starts_at timestamptz,
  ends_at timestamptz,
  all_day boolean,
  status public.appointment_status,
  hold_until timestamptz,
  client_name text,
  service_name jsonb,
  note text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if from_date is null or to_date is null or to_date < from_date or to_date - from_date > 61 then
    raise exception 'invalid_range';
  end if;
  return query
  with me as (
    select m.id, m.timezone from public.masters m where m.id = auth.uid()
  ),
  days as (
    select d::date as day,
      d at time zone me.timezone as day_start,
      (d::date + 1)::timestamp at time zone me.timezone as day_end
    from me
    cross join generate_series(get_master_agenda.from_date::timestamp, get_master_agenda.to_date::timestamp, interval '1 day') d
  )
  select 'appointment', a.id, (lower(a.during) at time zone me.timezone)::date, lower(a.during), upper(a.during),
    false, a.status, a.hold_until, cc.name, sv.name, null::text
  from me
  join public.appointments a on a.master_id = me.id
  join public.services sv on sv.id = a.service_id
  left join public.appointment_clients ac on ac.appointment_id = a.id
  left join public.client_cards cc on cc.id = ac.client_card_id
  where a.during && tstzrange(get_master_agenda.from_date::timestamp at time zone me.timezone,
      (get_master_agenda.to_date + 1)::timestamp at time zone me.timezone)
    and (lower(a.during) at time zone me.timezone)::date between get_master_agenda.from_date and get_master_agenda.to_date
    and (a.status in ('confirmed', 'completed', 'no_show')
      or (a.status = 'pending' and a.contact_confirmed_at is not null and a.hold_until > now()))
  union all
  select 'block', b.id, days.day, greatest(lower(b.during), days.day_start), least(upper(b.during), days.day_end),
    lower(b.during) <= days.day_start and upper(b.during) >= days.day_end,
    null::public.appointment_status, null::timestamptz, null::text, null::jsonb, b.note
  from me
  join public.blocks b on b.master_id = me.id
  join days on b.during && tstzrange(days.day_start, days.day_end)
  order by 3, 4;
end;
$$;

-- Awaiting decisions are pending appointments whose client confirmed a contact and whose hold is alive.
create function public.get_awaiting_decisions()
returns table (
  appointment_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  hold_until timestamptz,
  client_name text,
  service_name jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, lower(a.during), upper(a.during), a.hold_until, cc.name, sv.name
  from public.appointments a
  join public.services sv on sv.id = a.service_id
  left join public.appointment_clients ac on ac.appointment_id = a.id
  left join public.client_cards cc on cc.id = ac.client_card_id
  where a.master_id = auth.uid()
    and a.status = 'pending'
    and a.contact_confirmed_at is not null
    and a.hold_until > now()
  order by a.hold_until, lower(a.during);
$$;

revoke execute on function public.get_master_agenda(date, date), public.get_awaiting_decisions() from public, anon;
grant execute on function public.get_master_agenda(date, date), public.get_awaiting_decisions() to authenticated;
