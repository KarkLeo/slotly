begin;

select plan(31);

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000000a', 'olena@example.com', now()),
  ('00000000-0000-0000-0000-00000000000b', 'daryna@example.com', now()),
  ('00000000-0000-0000-0000-00000000000c', 'client@example.com', now()),
  ('00000000-0000-0000-0000-00000000000d', 'pending@example.com', null),
  ('00000000-0000-0000-0000-00000000000e', 'Mixed@Example.com', now());

insert into public.masters (id, slug, name, published_at) values
  ('00000000-0000-0000-0000-00000000000a', 'olena', 'Olena', now()),
  ('00000000-0000-0000-0000-00000000000b', 'daryna', 'Daryna', now());

insert into public.services (id, master_id, name, duration_minutes, price_kind) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', '{"uk": "Манікюр"}', 60, 'none'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', '{"uk": "Стрижка"}', 60, 'none');

insert into public.client_cards (id, master_id, user_id, name, note) values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c', 'Ірина', 'Алергія на ацетон'),
  ('00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c', 'Іра К.', null),
  ('00000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-00000000000a', null, 'Без контакту', null);

insert into public.appointments (id, master_id, service_id, during, status, source, locale) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   '[2030-01-14 10:00+00,2030-01-14 11:00+00)', 'confirmed', 'client', 'uk'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1',
   '[2030-01-14 10:00+00,2030-01-14 11:00+00)', 'confirmed', 'client', 'uk'),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   '[2030-01-15 10:00+00,2030-01-15 11:00+00)', 'confirmed', 'manual', 'uk');

insert into public.client_cards (id, master_id, user_id, name) values
  ('00000000-0000-0000-0000-0000000000cd', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000d', 'Ольга');

insert into public.appointments (id, master_id, service_id, during, status, source, locale) values
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
   '[2030-01-16 10:00+00,2030-01-16 11:00+00)', 'confirmed', 'client', 'uk');

insert into public.appointment_clients (appointment_id, master_id, client_card_id, name) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000ca', 'Iryna'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000cb', 'Iryna'),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000cd', 'Olha');

-- Contacts

select results_eq(
  $$ select channel::text, address from public.contacts where user_id = '00000000-0000-0000-0000-00000000000c' $$,
  $$ values ('email', 'client@example.com') $$,
  'a confirmed email is a contact'
);

select is_empty(
  $$ select 1 from public.contacts where user_id = '00000000-0000-0000-0000-00000000000d' $$,
  'an unconfirmed email is not a contact yet'
);

update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-00000000000d';

select results_eq(
  $$ select address from public.contacts where user_id = '00000000-0000-0000-0000-00000000000d' $$,
  $$ values ('pending@example.com') $$,
  'confirming the email adds the contact'
);

update auth.users set email_confirmed_at = '2020-01-01' where id = '00000000-0000-0000-0000-00000000000c';
update auth.users set email = 'iryna@example.com' where id = '00000000-0000-0000-0000-00000000000c';

select results_eq(
  $$ select address from public.contacts where user_id = '00000000-0000-0000-0000-00000000000c' $$,
  $$ values ('iryna@example.com') $$,
  'changing the email updates the contact'
);

select results_eq(
  $$ select address from public.contacts where user_id = '00000000-0000-0000-0000-00000000000e' $$,
  $$ values ('mixed@example.com') $$,
  'email contacts are stored in lower case'
);

select is(
  (select confirmed_at from public.contacts where user_id = '00000000-0000-0000-0000-00000000000c'),
  now(),
  'a changed email counts as confirmed when it changed'
);

update auth.users set email_confirmed_at = null where id = '00000000-0000-0000-0000-00000000000e';

select is_empty(
  $$ select 1 from public.contacts where user_id = '00000000-0000-0000-0000-00000000000e' $$,
  'an email that is no longer confirmed stops being a contact'
);

update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-00000000000e';
update auth.users set deleted_at = now(), email = 'hashed-' || id where id = '00000000-0000-0000-0000-00000000000e';

select is_empty(
  $$ select 1 from public.contacts where user_id = '00000000-0000-0000-0000-00000000000e' $$,
  'a soft-deleted user has no contacts'
);

-- Integrity

select throws_ok(
  $$ insert into public.client_cards (master_id, user_id, name) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c', 'Ще раз') $$,
  '23505', null,
  'a user has one card at a master'
);

select throws_ok(
  $$ insert into public.appointment_clients (appointment_id, master_id, client_card_id, name) values
       ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000cb', 'Iryna') $$,
  '23503', null,
  'a booking uses a card of the same master'
);

select throws_ok(
  $$ insert into public.appointment_clients (appointment_id, master_id, client_card_id, name) values
       ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000cb', 'Iryna') $$,
  '23503', null,
  'a booking belongs to an appointment of the same master'
);

-- Master Olena

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select results_eq(
  $$ select id from public.client_cards order by id $$,
  $$ values ('00000000-0000-0000-0000-0000000000ca'::uuid), ('00000000-0000-0000-0000-0000000000cc'::uuid), ('00000000-0000-0000-0000-0000000000cd'::uuid) $$,
  'a master sees own client cards'
);

select results_eq(
  $$ select appointment_id from public.appointment_clients order by appointment_id $$,
  $$ values ('00000000-0000-0000-0000-0000000000f1'::uuid), ('00000000-0000-0000-0000-0000000000f4'::uuid) $$,
  'a master does not see bookings of the same client at another master'
);

select results_eq(
  $$ select address from public.contacts where user_id <> '00000000-0000-0000-0000-00000000000a' order by address $$,
  $$ values ('iryna@example.com'), ('pending@example.com') $$,
  'a master sees contacts of own clients only'
);

select lives_ok(
  $$ insert into public.client_cards (master_id, name, note) values ('00000000-0000-0000-0000-00000000000a', 'Нова клієнтка', 'Прийде з подругою') $$,
  'a master adds a client card'
);

select throws_ok(
  $$ insert into public.client_cards (master_id, user_id, name) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000d', 'Чужа') $$,
  '42501', null,
  'a master cannot link a card to a user'
);

select throws_ok(
  $$ update public.client_cards set user_id = '00000000-0000-0000-0000-00000000000d' where id = '00000000-0000-0000-0000-0000000000cc' $$,
  '42501', null,
  'a master cannot relink a card to another user'
);

select lives_ok(
  $$ update public.client_cards set name = 'Ірина Коваль', note = 'Любить нюд' where id = '00000000-0000-0000-0000-0000000000ca' $$,
  'a master renames a client and edits the note'
);

select throws_ok(
  $$ insert into public.appointment_clients (appointment_id, master_id, client_card_id, name) values
       ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000ca', 'Iryna') $$,
  '42501', null,
  'a master books clients only through functions'
);

select throws_ok(
  $$ insert into public.client_cards (master_id, name) values ('00000000-0000-0000-0000-00000000000b', 'Підкинута') $$,
  '42501', null,
  'a master cannot add cards for another master'
);

select lives_ok(
  $$ delete from public.client_cards where id = '00000000-0000-0000-0000-0000000000cc' $$,
  'a master deletes a card without bookings'
);

select throws_ok(
  $$ delete from public.client_cards where id = '00000000-0000-0000-0000-0000000000ca' $$,
  '23503', null,
  'a card with bookings stays'
);

-- Master Daryna

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}', true);

select is_empty(
  $$ select 1 from public.client_cards where master_id = '00000000-0000-0000-0000-00000000000a'
     union all select 1 from public.appointments where master_id = '00000000-0000-0000-0000-00000000000a'
     union all select 1 from public.appointment_clients where master_id = '00000000-0000-0000-0000-00000000000a' $$,
  'master B sees none of master A''s clients and appointments, even for a shared client'
);

-- Client

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}', true);

select results_eq(
  $$ select a.id from public.appointments a join public.appointment_clients c on c.appointment_id = a.id order by a.id $$,
  $$ values ('00000000-0000-0000-0000-0000000000f1'::uuid), ('00000000-0000-0000-0000-0000000000f2'::uuid) $$,
  'a client sees own bookings at every master'
);

select is_empty(
  $$ select note from public.client_cards $$,
  'a client sees no client cards and no master''s notes'
);

select is_empty(
  $$ select 1 from public.appointment_clients where appointment_id = '00000000-0000-0000-0000-0000000000f4'
     union all select 1 from public.appointments where id = '00000000-0000-0000-0000-0000000000f4' $$,
  'a client does not see another client''s booking at the same master'
);

select results_eq(
  $$ select address from public.contacts $$,
  $$ values ('iryna@example.com') $$,
  'a client sees own contacts'
);

select throws_ok(
  $$ insert into public.contacts (user_id, channel, address, confirmed_at) values ('00000000-0000-0000-0000-00000000000c', 'email', 'fake@example.com', now()) $$,
  '42501', null,
  'contacts are written by the platform only'
);

select lives_ok(
  $$ select public.cancel_appointment('00000000-0000-0000-0000-0000000000f2', null) $$,
  'a client cancels a booking found through the card'
);

reset role;
set local role anon;

select throws_ok(
  $$ select 1 from public.contacts union all select 1 from public.client_cards $$,
  '42501', null,
  'visitors cannot read contacts or client cards'
);

reset role;

delete from auth.users where id = '00000000-0000-0000-0000-00000000000c';

select is(
  (select user_id from public.client_cards where id = '00000000-0000-0000-0000-0000000000ca'),
  null,
  'a deleted user leaves the master''s card without a link'
);

select * from finish();
rollback;
