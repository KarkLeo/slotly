create extension if not exists btree_gist with schema extensions;

alter table public.masters
  add column slot_step_minutes integer not null default 15
    check (slot_step_minutes in (5, 10, 15, 20, 30, 60)),
  add column min_notice_minutes integer not null default 120
    check (min_notice_minutes between 0 and 10080),
  add column horizon_days integer not null default 30
    check (horizon_days between 1 and 365),
  add column auto_confirm boolean not null default true,
  add column cancel_deadline_minutes integer not null default 720
    check (cancel_deadline_minutes between 0 and 10080),
  add column max_active_bookings integer not null default 3
    check (max_active_bookings between 1 and 20);

-- Hours of a day are minutes from local midnight: '{[540,780),[840,1080)}' is 09:00–13:00 and 14:00–18:00.
create function private.is_day_minutes(value int4multirange)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select not exists (
    select 1
    from unnest(value) as r
    where lower_inf(r) or upper_inf(r)
      or lower(r) < 0 or upper(r) > 1440
      or lower(r) % 5 <> 0 or upper(r) % 5 <> 0
  );
$$;

grant execute on function private.is_day_minutes(int4multirange) to authenticated, service_role;

create table public.work_template (
  master_id uuid not null references public.masters (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  hours int4multirange not null check (not isempty(hours) and private.is_day_minutes(hours)),
  primary key (master_id, weekday)
);

create table public.schedule_exceptions (
  master_id uuid not null references public.masters (id) on delete cascade,
  day date not null,
  hours int4multirange not null default '{}' check (private.is_day_minutes(hours)),
  primary key (master_id, day)
);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  master_id uuid not null references public.masters (id) on delete cascade,
  during tstzrange not null
    check (not isempty(during) and not lower_inf(during) and not upper_inf(during)),
  note text check (btrim(note) <> '' and length(note) <= 200),
  created_at timestamptz not null default now(),
  exclude using gist (master_id with =, during with &&)
);

alter table public.work_template enable row level security;
alter table public.schedule_exceptions enable row level security;
alter table public.blocks enable row level security;

revoke all on public.work_template, public.schedule_exceptions, public.blocks from anon, authenticated;
grant select, insert, update, delete on public.work_template, public.schedule_exceptions, public.blocks to authenticated;

create policy "masters manage own work template" on public.work_template
  for all to authenticated
  using (master_id = (select auth.uid()))
  with check (master_id = (select auth.uid()));

create policy "masters manage own schedule exceptions" on public.schedule_exceptions
  for all to authenticated
  using (master_id = (select auth.uid()))
  with check (master_id = (select auth.uid()));

create policy "masters manage own blocks" on public.blocks
  for all to authenticated
  using (master_id = (select auth.uid()))
  with check (master_id = (select auth.uid()));
