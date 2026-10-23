-- An unconfirmed booking keeps the IP it came from, so holds can be limited per IP.
alter table public.appointment_clients
  add column client_ip inet,
  add check (client_ip is null or unconfirmed_email is not null);

create index appointment_clients_client_ip_idx on public.appointment_clients (client_ip)
  where client_ip is not null;

create table private.rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null,
  primary key (bucket, window_start)
);

create function public.take_rate_limit(bucket text, max_hits integer, window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  started timestamptz := to_timestamp(floor(extract(epoch from now()) / take_rate_limit.window_seconds) * take_rate_limit.window_seconds);
  taken integer;
begin
  insert into private.rate_limits as r (bucket, window_start, hits)
  values (take_rate_limit.bucket, started, 1)
  on conflict on constraint rate_limits_pkey do update set hits = r.hits + 1
  returning r.hits into taken;
  if taken = 1 then
    delete from private.rate_limits r where r.window_start < now() - interval '1 day';
  end if;
  return taken <= take_rate_limit.max_hits;
end;
$$;

drop function public.book_appointment(uuid, timestamptz, text, text, public.locale, text);

create function public.book_appointment(
  service_id uuid,
  starts_at timestamptz,
  name text,
  email text,
  locale public.locale,
  address text default null,
  client_ip inet default null
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
    insert into public.appointments (master_id, service_id, during, buffer_minutes, status, hold_until, source, locale)
    values (
      s.master_id,
      book_appointment.service_id,
      tstzrange(book_appointment.starts_at, book_appointment.starts_at + make_interval(mins => s.duration_minutes)),
      s.buffer_minutes,
      'pending',
      new_hold,
      'client',
      book_appointment.locale
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

create or replace function public.release_booking(appointment_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  with released as (
    update public.appointments a
    set status = 'cancelled', hold_until = null, cancelled_by = 'client'
    where a.id = release_booking.appointment_id
      and a.status = 'pending'
      and a.contact_confirmed_at is null
      and exists (
        select 1 from public.appointment_clients ac
        where ac.appointment_id = a.id and ac.client_card_id is null
      )
    returning a.id
  )
  update public.appointment_clients ac
  set client_ip = null
  from released r
  where ac.appointment_id = r.id;
$$;

create or replace function public.claim_bookings(appointment_ids uuid[])
returns table (appointment_id uuid, status public.appointment_status, hold_until timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  my_email text;
  b record;
  card uuid;
begin
  select c.address into my_email
  from public.contacts c
  where c.user_id = me and c.channel = 'email';
  if my_email is null then
    return;
  end if;

  for b in
    select ac.id, ac.appointment_id, ac.master_id, ac.name, lower(a.during) as starts, m.auto_confirm
    from public.appointment_clients ac
    join public.appointments a on a.id = ac.appointment_id
    join public.masters m on m.id = ac.master_id
    where ac.appointment_id = any (claim_bookings.appointment_ids)
      and ac.unconfirmed_email = my_email
      and a.status = 'pending'
      and a.hold_until > now()
    order by lower(a.during)
    for update of ac, a
  loop
    insert into public.client_cards (master_id, user_id, name)
    values (b.master_id, me, b.name)
    on conflict on constraint client_cards_master_id_user_id_key do nothing;

    select cc.id into card
    from public.client_cards cc
    where cc.master_id = b.master_id and cc.user_id = me;

    update public.appointment_clients ac
    set client_card_id = card, unconfirmed_email = null, client_ip = null
    where ac.id = b.id;

    update public.appointments a
    set contact_confirmed_at = now(),
      status = case when b.auto_confirm then 'confirmed'::public.appointment_status else 'pending' end,
      hold_until = case when b.auto_confirm then null else least(now() + interval '24 hours', b.starts) end
    where a.id = b.appointment_id
    returning a.id, a.status, a.hold_until into claim_bookings.appointment_id, claim_bookings.status, claim_bookings.hold_until;

    return next;
  end loop;
end;
$$;

-- Only the server books, so a bot cannot skip its limits by calling the database directly.
revoke execute on function
  public.take_rate_limit(text, integer, integer),
  public.book_appointment(uuid, timestamptz, text, text, public.locale, text, inet),
  public.release_booking(uuid),
  public.booking_email_details(uuid, text)
from public, anon, authenticated;

grant execute on function
  public.take_rate_limit(text, integer, integer),
  public.book_appointment(uuid, timestamptz, text, text, public.locale, text, inet),
  public.release_booking(uuid),
  public.booking_email_details(uuid, text)
to service_role;
