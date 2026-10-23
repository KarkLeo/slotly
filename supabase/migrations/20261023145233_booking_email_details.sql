-- The email hook shows a booking only to the email it waits for, and only while that email can still confirm it.
create function public.booking_email_details(appointment_id uuid, email text)
returns table (
  master_name text,
  service_name jsonb,
  primary_locale public.locale,
  locale public.locale,
  starts_at timestamptz,
  ends_at timestamptz,
  time_zone text,
  price_kind public.price_kind,
  price numeric,
  currency text,
  address text,
  hold_until timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.name, sv.name, m.primary_locale, a.locale, lower(a.during), upper(a.during), m.timezone,
    sv.price_kind, sv.price, m.currency, ac.address, a.hold_until
  from public.appointments a
  join public.appointment_clients ac on ac.appointment_id = a.id
  join public.masters m on m.id = a.master_id
  join public.services sv on sv.id = a.service_id
  where a.id = booking_email_details.appointment_id
    and ac.unconfirmed_email = lower(btrim(booking_email_details.email))
    and a.status = 'pending'
    and a.contact_confirmed_at is null
    and a.hold_until > now();
$$;

revoke execute on function public.booking_email_details(uuid, text) from public, anon, authenticated;
grant execute on function public.booking_email_details(uuid, text) to anon;
