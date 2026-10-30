-- Local development data, loaded by `supabase db reset`. Dates are relative to the reset day in Kyiv.
-- Sign in through Mailpit as olena.melnyk@example.com or daryna.koval@example.com (masters),
-- iryna.kovalenko@example.com or mark.taylor@example.com (clients).

do $$
declare
  olena constant uuid := '5eed0000-0000-4000-8000-000000000001';
  daryna constant uuid := '5eed0000-0000-4000-8000-000000000002';
  iryna constant uuid := '5eed0000-0000-4000-8000-000000000011';
  mark constant uuid := '5eed0000-0000-4000-8000-000000000012';
  today constant date := (now() at time zone 'Europe/Kyiv')::date;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
  )
  select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(),
    '{"provider": "email", "providers": ["email"]}', jsonb_build_object('locale', u.locale),
    now(), now(), '', '', '', ''
  from (values
    (olena, 'olena.melnyk@example.com', 'uk'),
    (daryna, 'daryna.koval@example.com', 'uk'),
    (iryna, 'iryna.kovalenko@example.com', 'uk'),
    (mark, 'mark.taylor@example.com', 'en')
  ) as u (id, email, locale);

  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  select u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now()
  from auth.users u
  where u.id in (olena, daryna, iryna, mark);

  insert into public.masters (id, slug, name, primary_locale, locales, published_at, slot_step_minutes, auto_confirm, cancel_deadline_minutes) values
    (olena, 'olena-nails', 'Олена Мельник', 'uk', '{uk,en}', now(), 15, true, 720),
    (daryna, 'daryna-hair', 'Дарина Коваль', 'uk', '{uk}', now(), 30, false, 1440);

  insert into public.service_categories (id, master_id, name, position) values
    ('5eed0000-0000-4000-8000-0000000000c1', olena, '{"uk": "Манікюр", "en": "Manicure"}', 0),
    ('5eed0000-0000-4000-8000-0000000000c2', olena, '{"uk": "Педикюр", "en": "Pedicure"}', 1);

  insert into public.services (id, master_id, category_id, name, description, duration_minutes, buffer_minutes, price_kind, price, format, position, archived_at) values
    ('5eed0000-0000-4000-8000-0000000000a1', olena, '5eed0000-0000-4000-8000-0000000000c1',
     '{"uk": "Манікюр з покриттям", "en": "Gel manicure"}',
     '{"uk": "Догляд, форма та покриття гель-лаком. Дизайн обговорюємо на місці.", "en": "Care, shaping and gel polish. We agree on the design on site."}',
     90, 15, 'fixed', 900, 'on_site', 0, null),
    ('5eed0000-0000-4000-8000-0000000000a2', olena, '5eed0000-0000-4000-8000-0000000000c1',
     '{"uk": "Зняття покриття", "en": "Gel removal"}', '{}', 30, 0, 'fixed', 250, 'on_site', 1, null),
    ('5eed0000-0000-4000-8000-0000000000a3', olena, '5eed0000-0000-4000-8000-0000000000c2',
     '{"uk": "Педикюр", "en": "Pedicure"}', '{"uk": "Ціна залежить від стану стоп.", "en": "The price depends on the condition of the feet."}',
     120, 15, 'from', 1100, 'on_site', 0, null),
    ('5eed0000-0000-4000-8000-0000000000a4', olena, '5eed0000-0000-4000-8000-0000000000c1',
     '{"uk": "Френч", "en": "French manicure"}', '{}', 90, 15, 'fixed', 1000, 'on_site', 2, now()),
    ('5eed0000-0000-4000-8000-0000000000b1', daryna, null,
     '{"uk": "Жіноча стрижка"}', '{"uk": "Миття, стрижка та легка укладка."}', 60, 15, 'from', 650, 'on_site', 0, null),
    ('5eed0000-0000-4000-8000-0000000000b2', daryna, null,
     '{"uk": "Укладка"}', '{}', 45, 0, 'none', null, 'on_site', 1, null),
    ('5eed0000-0000-4000-8000-0000000000b3', daryna, null,
     '{"uk": "Онлайн-консультація"}', '{"uk": "Підберемо стрижку і догляд за відеодзвінком."}', 30, 0, 'none', null, 'online', 2, null);

  -- Olena: weekdays 9–13 and 14–19, Saturday 10–15. Daryna: Tuesday to Saturday 10–18.
  insert into public.work_template (master_id, weekday, hours)
  select olena, d, '{[540,780),[840,1140)}'::int4multirange from generate_series(1, 5) as d
  union all select olena, 6, '{[600,900)}'::int4multirange
  union all select daryna, d, '{[600,1080)}'::int4multirange from generate_series(2, 6) as d;

  insert into public.schedule_exceptions (master_id, day, hours)
  select olena, today + 5, '{[720,960)}'::int4multirange
  union all select olena, today + d, '{}'::int4multirange from generate_series(10, 12) as d
  union all select daryna, today + 3, '{}'::int4multirange;

  insert into public.blocks (master_id, during, note) values
    (olena, tstzrange((today + 1 + time '15:00') at time zone 'Europe/Kyiv', (today + 1 + time '16:00') at time zone 'Europe/Kyiv'), 'Стоматолог'),
    (olena, tstzrange((today + time '14:30') at time zone 'Europe/Kyiv', (today + time '15:00') at time zone 'Europe/Kyiv'), 'Обід');

  insert into public.client_cards (id, master_id, user_id, name, note) values
    ('5eed0000-0000-4000-8000-0000000000d1', olena, iryna, 'Ірина Коваленко', 'Любить нюдові відтінки'),
    ('5eed0000-0000-4000-8000-0000000000d2', olena, mark, 'Mark', null),
    ('5eed0000-0000-4000-8000-0000000000d3', olena, null, 'Світлана', 'Без контакту, записується телефоном'),
    ('5eed0000-0000-4000-8000-0000000000d4', daryna, iryna, 'Іра', null);

  insert into public.appointments (id, master_id, service_id, during, buffer_minutes, status, hold_until, contact_confirmed_at, source, locale, cancelled_by, cancel_comment)
  select a.id, a.master_id, a.service_id,
    tstzrange((today + a.day + a.starts) at time zone 'Europe/Kyiv', (today + a.day + a.starts + a.duration) at time zone 'Europe/Kyiv'),
    a.buffer, a.status::public.appointment_status,
    case when a.status = 'pending' then least(now() + interval '24 hours', (today + a.day + a.starts) at time zone 'Europe/Kyiv') end,
    case when a.status = 'pending' then now() end,
    a.source::public.appointment_source, a.locale::public.locale, a.cancelled_by::public.canceller, a.cancel_comment
  from (values
    ('5eed0000-0000-4000-8000-0000000000e1'::uuid, olena, '5eed0000-0000-4000-8000-0000000000a1'::uuid, 1, time '10:00', interval '90 minutes', 15, 'confirmed', 'client', 'uk', null, null),
    ('5eed0000-0000-4000-8000-0000000000e2', olena, '5eed0000-0000-4000-8000-0000000000a2', 2, time '11:00', interval '30 minutes', 0, 'confirmed', 'client', 'en', null, null),
    ('5eed0000-0000-4000-8000-0000000000e3', olena, '5eed0000-0000-4000-8000-0000000000a3', 2, time '15:00', interval '120 minutes', 15, 'confirmed', 'manual', 'uk', null, null),
    ('5eed0000-0000-4000-8000-0000000000e4', olena, '5eed0000-0000-4000-8000-0000000000a1', 4, time '10:00', interval '90 minutes', 15, 'cancelled', 'client', 'uk', 'client', 'Не встигаю, перезапишуся'),
    ('5eed0000-0000-4000-8000-0000000000e5', olena, '5eed0000-0000-4000-8000-0000000000a1', -7, time '10:00', interval '90 minutes', 15, 'completed', 'client', 'uk', null, null),
    ('5eed0000-0000-4000-8000-0000000000e6', olena, '5eed0000-0000-4000-8000-0000000000a2', -2, time '12:00', interval '30 minutes', 0, 'no_show', 'client', 'en', null, null),
    ('5eed0000-0000-4000-8000-0000000000e7', daryna, '5eed0000-0000-4000-8000-0000000000b1', 2, time '12:00', interval '60 minutes', 15, 'pending', 'client', 'uk', null, null),
    ('5eed0000-0000-4000-8000-0000000000e8', daryna, '5eed0000-0000-4000-8000-0000000000b2', 6, time '14:00', interval '45 minutes', 0, 'confirmed', 'client', 'uk', null, null),
    ('5eed0000-0000-4000-8000-0000000000e9', daryna, '5eed0000-0000-4000-8000-0000000000b1', 1, time '10:00', interval '60 minutes', 15, 'cancelled', 'client', 'uk', 'master', 'Захворіла, вибачте. Оберіть, будь ласка, інший час.'),
    ('5eed0000-0000-4000-8000-000000000e10', olena, '5eed0000-0000-4000-8000-0000000000a1', 0, time '09:00', interval '90 minutes', 15, 'confirmed', 'client', 'uk', null, null),
    ('5eed0000-0000-4000-8000-000000000e11', olena, '5eed0000-0000-4000-8000-0000000000a2', 0, time '13:00', interval '30 minutes', 0, 'confirmed', 'manual', 'uk', null, null),
    ('5eed0000-0000-4000-8000-000000000e12', olena, '5eed0000-0000-4000-8000-0000000000a3', 0, time '16:30', interval '120 minutes', 15, 'confirmed', 'client', 'en', null, null),
    ('5eed0000-0000-4000-8000-000000000e13', olena, '5eed0000-0000-4000-8000-0000000000a2', 1, time '16:00', interval '30 minutes', 0, 'pending', 'client', 'en', null, null),
    ('5eed0000-0000-4000-8000-000000000e14', olena, '5eed0000-0000-4000-8000-0000000000a1', 5, time '12:30', interval '90 minutes', 15, 'pending', 'client', 'uk', null, null)
  ) as a (id, master_id, service_id, day, starts, duration, buffer, status, source, locale, cancelled_by, cancel_comment);

  insert into public.appointment_clients (appointment_id, master_id, client_card_id, name) values
    ('5eed0000-0000-4000-8000-0000000000e1', olena, '5eed0000-0000-4000-8000-0000000000d1', 'Ірина'),
    ('5eed0000-0000-4000-8000-0000000000e2', olena, '5eed0000-0000-4000-8000-0000000000d2', 'Mark Taylor'),
    ('5eed0000-0000-4000-8000-0000000000e3', olena, '5eed0000-0000-4000-8000-0000000000d3', 'Світлана'),
    ('5eed0000-0000-4000-8000-0000000000e4', olena, '5eed0000-0000-4000-8000-0000000000d1', 'Ірина'),
    ('5eed0000-0000-4000-8000-0000000000e5', olena, '5eed0000-0000-4000-8000-0000000000d1', 'Ірина'),
    ('5eed0000-0000-4000-8000-0000000000e6', olena, '5eed0000-0000-4000-8000-0000000000d2', 'Mark Taylor'),
    ('5eed0000-0000-4000-8000-0000000000e7', daryna, '5eed0000-0000-4000-8000-0000000000d4', 'Ірина'),
    ('5eed0000-0000-4000-8000-0000000000e8', daryna, '5eed0000-0000-4000-8000-0000000000d4', 'Ірина'),
    ('5eed0000-0000-4000-8000-0000000000e9', daryna, '5eed0000-0000-4000-8000-0000000000d4', 'Ірина'),
    ('5eed0000-0000-4000-8000-000000000e10', olena, '5eed0000-0000-4000-8000-0000000000d1', 'Ірина'),
    ('5eed0000-0000-4000-8000-000000000e11', olena, '5eed0000-0000-4000-8000-0000000000d3', 'Світлана'),
    ('5eed0000-0000-4000-8000-000000000e12', olena, '5eed0000-0000-4000-8000-0000000000d2', 'Mark Taylor'),
    ('5eed0000-0000-4000-8000-000000000e13', olena, '5eed0000-0000-4000-8000-0000000000d2', 'Mark Taylor'),
    ('5eed0000-0000-4000-8000-000000000e14', olena, '5eed0000-0000-4000-8000-0000000000d1', 'Ірина');
end;
$$;

-- Local-only values: the database asks the dev server to deliver notifications (NOTIFICATIONS_SECRET in .env).
select vault.create_secret('http://host.docker.internal:3000/api/notifications/deliver', 'notifications_url');
select vault.create_secret('local-notifications-secret', 'notifications_secret');
