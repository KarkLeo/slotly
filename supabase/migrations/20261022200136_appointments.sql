create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
create type public.appointment_source as enum ('client', 'manual');
create type public.canceller as enum ('client', 'master', 'system');

create function private.is_on_five_minutes(value timestamptz)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select extract(epoch from value) % 300 = 0;
$$;

grant execute on function private.is_on_five_minutes(timestamptz) to service_role;

alter table public.services add unique (master_id, id);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  master_id uuid not null references public.masters (id) on delete cascade,
  service_id uuid not null,
  during tstzrange not null check (
    not isempty(during) and not lower_inf(during) and not upper_inf(during)
    and lower_inc(during) and not upper_inc(during)
    and private.is_on_five_minutes(lower(during)) and private.is_on_five_minutes(upper(during))
    and upper(during) - lower(during) <= interval '12 hours'
  ),
  buffer_minutes integer not null default 0 check (buffer_minutes between 0 and 240 and buffer_minutes % 5 = 0),
  status public.appointment_status not null,
  -- A pending appointment holds its time until the contact is confirmed or the master decides.
  hold_until timestamptz,
  contact_confirmed_at timestamptz,
  source public.appointment_source not null,
  locale public.locale not null,
  cancelled_by public.canceller,
  cancel_comment text check (length(cancel_comment) <= 500),
  created_at timestamptz not null default now(),
  check ((status = 'pending') = (hold_until is not null)),
  check (hold_until <= lower(during)),
  check ((status = 'cancelled') = (cancelled_by is not null)),
  check (cancel_comment is null or status = 'cancelled'),
  foreign key (master_id, service_id) references public.services (master_id, id)
);

create index appointments_master_id_during_idx on public.appointments using gist (master_id, during);
create index appointments_hold_until_idx on public.appointments (hold_until) where status = 'pending';

-- Blocks and appointments share busy time, so both use [start, end) bounds.
alter table public.blocks add check (lower_inc(during) and not upper_inc(during));

create table public.appointment_clients (
  id uuid primary key default gen_random_uuid(),
  -- One client per appointment until group services exist; a client's cancel then cancels only their own place.
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (btrim(name) <> '' and length(name) <= 100),
  created_at timestamptz not null default now()
);

create index appointment_clients_user_id_idx on public.appointment_clients (user_id);

-- All time a master is busy, so one exclusion constraint covers appointments and blocks.
create table private.busy_times (
  master_id uuid not null references public.masters (id) on delete cascade,
  during tstzrange not null,
  appointment_id uuid unique references public.appointments (id) on delete cascade,
  block_id uuid unique references public.blocks (id) on delete cascade,
  check (num_nonnulls(appointment_id, block_id) = 1),
  exclude using gist (master_id with =, during with &&)
);

alter table public.blocks drop constraint blocks_master_id_during_excl;

insert into private.busy_times (master_id, during, block_id)
select master_id, during, id from public.blocks;

create function private.sync_block_busy_time()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from private.busy_times where block_id = new.id;
  insert into private.busy_times (master_id, during, block_id) values (new.master_id, new.during, new.id);
  return null;
end;
$$;

create trigger blocks_busy_time
  after insert or update of master_id, during on public.blocks
  for each row execute function private.sync_block_busy_time();

create function private.sync_appointment_busy_time()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from private.busy_times where appointment_id = new.id;
  if new.status in ('pending', 'confirmed') then
    insert into private.busy_times (master_id, during, appointment_id)
    values (
      new.master_id,
      tstzrange(lower(new.during), upper(new.during) + make_interval(mins => new.buffer_minutes)),
      new.id
    );
  end if;
  return null;
end;
$$;

create trigger appointments_busy_time
  after insert or update of master_id, during, buffer_minutes, status on public.appointments
  for each row execute function private.sync_appointment_busy_time();

create function private.is_client_of(appointment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.appointment_clients c
    where c.appointment_id = is_client_of.appointment_id and c.user_id = auth.uid()
  );
$$;

-- Evaluated once per query in RLS instead of once per appointment row.
create function private.my_booking_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.appointment_id from public.appointment_clients c where c.user_id = auth.uid();
$$;

grant execute on function private.is_client_of(uuid), private.my_booking_ids() to authenticated;

alter table public.appointments enable row level security;
alter table public.appointment_clients enable row level security;

revoke all on public.appointments, public.appointment_clients from anon, authenticated;
grant select on public.appointments, public.appointment_clients to authenticated;

create policy "masters see own appointments" on public.appointments
  for select to authenticated
  using (master_id = (select auth.uid()));

create policy "clients see own bookings" on public.appointments
  for select to authenticated
  using (id in (select private.my_booking_ids()));

create policy "masters see clients of own appointments" on public.appointment_clients
  for select to authenticated
  using (exists (select 1 from public.appointments a where a.id = appointment_id and a.master_id = (select auth.uid())));

create policy "clients see own bookings" on public.appointment_clients
  for select to authenticated
  using (user_id = (select auth.uid()));

create function public.confirm_appointment(appointment_id uuid)
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
end;
$$;

create function public.cancel_appointment(appointment_id uuid, comment text default null)
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
end;
$$;

create function public.reschedule_appointment(appointment_id uuid, starts_at timestamptz)
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
end;
$$;

create function public.set_no_show(appointment_id uuid, no_show boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.appointments;
begin
  select * into a from public.appointments
  where id = set_no_show.appointment_id and master_id = auth.uid()
  for update;
  if not found then
    raise exception 'appointment_not_found';
  end if;
  if a.status not in ('confirmed', 'completed', 'no_show') or upper(a.during) > now() then
    raise exception 'appointment_not_finished';
  end if;
  if now() > upper(a.during) + interval '3 days' then
    raise exception 'no_show_window_closed';
  end if;
  update public.appointments
  set status = case when no_show then 'no_show'::public.appointment_status else 'completed' end
  where id = a.id;
end;
$$;

revoke execute on function
  public.confirm_appointment(uuid),
  public.cancel_appointment(uuid, text),
  public.reschedule_appointment(uuid, timestamptz),
  public.set_no_show(uuid, boolean)
from public, anon;

grant execute on function
  public.confirm_appointment(uuid),
  public.cancel_appointment(uuid, text),
  public.reschedule_appointment(uuid, timestamptz),
  public.set_no_show(uuid, boolean)
to authenticated;
