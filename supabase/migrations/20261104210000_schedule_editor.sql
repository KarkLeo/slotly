-- Empty hours mean a day off in the template, so the rows of those weekdays are removed.
create function public.set_work_template_days(weekdays smallint[], hours int4multirange)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if coalesce(cardinality(set_work_template_days.weekdays), 0) = 0 then
    raise exception 'invalid_weekdays';
  end if;
  if isempty(set_work_template_days.hours) then
    delete from public.work_template t
    where t.master_id = auth.uid()
      and t.weekday = any (set_work_template_days.weekdays);
  else
    insert into public.work_template (master_id, weekday, hours)
    select auth.uid(), d, set_work_template_days.hours
    from unnest(set_work_template_days.weekdays) as d
    on conflict (master_id, weekday) do update set hours = excluded.hours;
  end if;
end;
$$;

-- Replaces a period of exceptions; days before today in the master's zone are history and stay.
create function public.set_schedule_exceptions(
  from_date date,
  to_date date,
  hours int4multirange,
  replaced_from date default null,
  replaced_to date default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  today date;
begin
  select (now() at time zone m.timezone)::date into today from public.masters m where m.id = auth.uid();
  if today is null
    or set_schedule_exceptions.from_date > set_schedule_exceptions.to_date
    or set_schedule_exceptions.to_date - set_schedule_exceptions.from_date >= 365
    or set_schedule_exceptions.from_date < today then
    raise exception 'invalid_range';
  end if;
  delete from public.schedule_exceptions e
  where e.master_id = auth.uid()
    and e.day between set_schedule_exceptions.replaced_from and set_schedule_exceptions.replaced_to
    and e.day >= today;
  insert into public.schedule_exceptions (master_id, day, hours)
  select auth.uid(), d::date, set_schedule_exceptions.hours
  from generate_series(
    set_schedule_exceptions.from_date::timestamp,
    set_schedule_exceptions.to_date::timestamp,
    interval '1 day'
  ) as d
  on conflict (master_id, day) do update set hours = excluded.hours;
end;
$$;

-- Appointments that still occupy time: not over, and either confirmed or a pending one with a live hold.
create function public.get_upcoming_appointments()
returns table (id uuid, starts_at timestamptz, ends_at timestamptz, client_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, lower(a.during), upper(a.during), cc.name
  from public.appointments a
  left join public.appointment_clients ac on ac.appointment_id = a.id
  left join public.client_cards cc on cc.id = ac.client_card_id
  where a.master_id = auth.uid()
    and upper(a.during) > now()
    and (a.status = 'confirmed'
      or (a.status = 'pending' and a.contact_confirmed_at is not null and a.hold_until > now()))
  order by lower(a.during), a.id;
$$;

revoke execute on function
  public.set_work_template_days(smallint[], int4multirange),
  public.set_schedule_exceptions(date, date, int4multirange, date, date),
  public.get_upcoming_appointments()
from public, anon;
grant execute on function
  public.set_work_template_days(smallint[], int4multirange),
  public.set_schedule_exceptions(date, date, int4multirange, date, date),
  public.get_upcoming_appointments()
to authenticated;
