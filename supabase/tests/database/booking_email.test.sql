begin;

select plan(9);

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000000a', 'olena@example.com', now()),
  ('00000000-0000-0000-0000-00000000000c', 'client@example.com', now());

insert into public.masters (id, slug, name, timezone, currency, primary_locale, locales, published_at) values
  ('00000000-0000-0000-0000-00000000000a', 'olena', 'Olena', 'Europe/Warsaw', 'PLN', 'uk', '{uk,en}', now());

insert into public.services (id, master_id, name, duration_minutes, price_kind, price, format) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', '{"uk": "Манікюр", "en": "Manicure"}', 90, 'from', 450, 'at_client');

insert into public.client_cards (id, master_id, user_id, name) values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c', 'Iryna');

insert into public.appointments (id, master_id, service_id, during, status, hold_until, contact_confirmed_at, source, locale, cancelled_by) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   tstzrange('2030-01-10 10:00+00', '2030-01-10 11:30+00'), 'pending', now() + interval '10 minutes', null, 'client', 'en', null),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   tstzrange('2030-01-11 10:00+00', '2030-01-11 11:30+00'), 'pending', now() - interval '1 minute', null, 'client', 'uk', null),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   tstzrange('2030-01-12 10:00+00', '2030-01-12 11:30+00'), 'pending', now() + interval '1 day', now(), 'client', 'uk', null),
  ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   tstzrange('2030-01-13 10:00+00', '2030-01-13 11:30+00'), 'cancelled', null, null, 'client', 'uk', 'client');

insert into public.appointment_clients (appointment_id, master_id, client_card_id, unconfirmed_email, name, address) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000a', null, 'mark@example.com', 'Mark', 'Main St 1'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-00000000000a', null, 'mark@example.com', 'Mark', 'Main St 1'),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000ca', null, 'Iryna', 'Main St 2'),
  ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-00000000000a', null, 'mark@example.com', 'Mark', 'Main St 1');

set local role anon;

select results_eq(
  $$ select master_name, service_name, primary_locale::text, locale::text, starts_at, ends_at, time_zone,
            price_kind::text, price, currency, address, hold_until
     from public.booking_email_details('00000000-0000-0000-0000-0000000000e1', 'mark@example.com') $$,
  $$ values ('Olena', '{"uk": "Манікюр", "en": "Manicure"}'::jsonb, 'uk', 'en',
             '2030-01-10 10:00+00'::timestamptz, '2030-01-10 11:30+00'::timestamptz, 'Europe/Warsaw',
             'from', 450::numeric, 'PLN', 'Main St 1', now() + interval '10 minutes') $$,
  'a booking waiting for its email gets its details'
);

select is(
  (select count(*) from public.booking_email_details('00000000-0000-0000-0000-0000000000e1', ' Mark@Example.COM ')),
  1::bigint,
  'the email matches regardless of case and spaces'
);

select is_empty(
  $$ select * from public.booking_email_details('00000000-0000-0000-0000-0000000000e1', 'other@example.com') $$,
  'another email gets nothing'
);

select is_empty(
  $$ select * from public.booking_email_details('00000000-0000-0000-0000-0000000000e2', 'mark@example.com') $$,
  'a booking whose hold has run out gets nothing'
);

select is_empty(
  $$ select * from public.booking_email_details('00000000-0000-0000-0000-0000000000e3', 'client@example.com') $$,
  'a booking with a confirmed contact gets nothing'
);

select is_empty(
  $$ select * from public.booking_email_details('00000000-0000-0000-0000-0000000000e4', 'mark@example.com') $$,
  'a released booking gets nothing'
);

select is_empty(
  $$ select * from public.booking_email_details('00000000-0000-0000-0000-0000000000e9', 'mark@example.com') $$,
  'an unknown booking gets nothing'
);

reset role;

select ok(
  has_function_privilege('anon', 'public.booking_email_details(uuid, text)', 'execute'),
  'the email hook reads details as anon'
);

select ok(
  not has_function_privilege('authenticated', 'public.booking_email_details(uuid, text)', 'execute'),
  'signed-in users do not need the details function'
);

select * from finish();
rollback;
