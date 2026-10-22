create type public.contact_channel as enum ('email', 'telegram');

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  channel public.contact_channel not null,
  address text not null check (btrim(address) <> '' and length(address) <= 320),
  confirmed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (channel, address),
  unique (user_id, channel)
);

-- A confirmed sign-in email is the user's email contact.
create function private.sync_email_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or new.email_confirmed_at is null or new.deleted_at is not null then
    delete from public.contacts where user_id = new.id and channel = 'email';
  else
    -- Auth keeps the first confirmation time when the email changes.
    insert into public.contacts (user_id, channel, address, confirmed_at)
    values (new.id, 'email', lower(new.email), new.email_confirmed_at)
    on conflict (user_id, channel) do update
      set address = excluded.address,
        confirmed_at = case when contacts.address = excluded.address then excluded.confirmed_at else now() end;
  end if;
  return null;
end;
$$;

create trigger sync_email_contact
  after insert or update of email, email_confirmed_at, deleted_at on auth.users
  for each row execute function private.sync_email_contact();

insert into public.contacts (user_id, channel, address, confirmed_at)
select id, 'email', lower(email), email_confirmed_at
from auth.users
where email is not null and email_confirmed_at is not null and deleted_at is null;

create table public.client_cards (
  id uuid primary key default gen_random_uuid(),
  master_id uuid not null references public.masters (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (btrim(name) <> '' and length(name) <= 100),
  note text check (length(note) <= 2000),
  created_at timestamptz not null default now(),
  unique (master_id, user_id),
  unique (master_id, id)
);

create index client_cards_user_id_idx on public.client_cards (user_id);

alter table public.appointments add unique (master_id, id);

drop policy "masters see clients of own appointments" on public.appointment_clients;
drop policy "clients see own bookings" on public.appointment_clients;

-- The client of a booking is the user of its card, so the booking no longer stores the user itself.
alter table public.appointment_clients
  drop column user_id,
  add column master_id uuid not null,
  add column client_card_id uuid not null,
  add foreign key (master_id, appointment_id) references public.appointments (master_id, id) on delete cascade,
  add foreign key (master_id, client_card_id) references public.client_cards (master_id, id);

create index appointment_clients_client_card_id_idx on public.appointment_clients (client_card_id);

create or replace function private.is_client_of(appointment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.appointment_clients ac
    join public.client_cards cc on cc.id = ac.client_card_id
    where ac.appointment_id = is_client_of.appointment_id and cc.user_id = auth.uid()
  );
$$;

create or replace function private.my_booking_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select ac.appointment_id
  from public.appointment_clients ac
  join public.client_cards cc on cc.id = ac.client_card_id
  where cc.user_id = auth.uid();
$$;

create policy "masters see own bookings" on public.appointment_clients
  for select to authenticated
  using (master_id = (select auth.uid()));

create policy "clients see own bookings" on public.appointment_clients
  for select to authenticated
  using (appointment_id in (select private.my_booking_ids()));

alter table public.contacts enable row level security;
alter table public.client_cards enable row level security;

revoke all on public.contacts, public.client_cards from anon, authenticated;
grant select on public.contacts to authenticated;
-- Linking a card to a user is left to server code; otherwise a master could reveal anyone's contacts.
grant select, delete on public.client_cards to authenticated;
grant insert (master_id, name, note), update (name, note) on public.client_cards to authenticated;

create policy "users see own contacts" on public.contacts
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "masters see contacts of own clients" on public.contacts
  for select to authenticated
  using (user_id in (select cc.user_id from public.client_cards cc where cc.master_id = (select auth.uid())));

create policy "masters manage own client cards" on public.client_cards
  for all to authenticated
  using (master_id = (select auth.uid()))
  with check (master_id = (select auth.uid()));
