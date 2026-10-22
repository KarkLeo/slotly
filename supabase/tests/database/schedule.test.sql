begin;

select plan(34);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'olena@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'daryna@example.com');

insert into public.masters (id, slug, name, published_at) values
  ('00000000-0000-0000-0000-00000000000a', 'olena', 'Olena', now()),
  ('00000000-0000-0000-0000-00000000000b', 'daryna', 'Daryna', now());

select is(
  (select row(slot_step_minutes, min_notice_minutes, horizon_days, auto_confirm, cancel_deadline_minutes, max_active_bookings)::text
   from public.masters where slug = 'olena'),
  '(15,120,30,t,720,3)',
  'booking settings default to a 15-minute step, 2 hours notice, 30 days ahead, auto-confirm, 12 hours to cancel and 3 active bookings'
);

select throws_ok(
  $$ update public.masters set slot_step_minutes = 7 where slug = 'olena' $$,
  '23514', null,
  'the slot step is one of the offered values'
);

select throws_ok(
  $$ update public.masters set horizon_days = 0 where slug = 'olena' $$,
  '23514', null,
  'the booking horizon is at least one day'
);

select throws_ok(
  $$ update public.masters set max_active_bookings = 0 where slug = 'olena' $$,
  '23514', null,
  'a contact may have at least one active booking'
);

select ok(private.is_day_minutes('{[540,780),[840,1080)}'), 'intervals in minutes from midnight are valid hours');
select ok(private.is_day_minutes('{[600,1440)}'), 'hours may run until midnight');
select ok(private.is_day_minutes('{}'), 'no hours are valid hours');
select ok(not private.is_day_minutes('{[540,782)}'), 'hours start and end on 5-minute marks');
select ok(not private.is_day_minutes('{[1400,1445)}'), 'hours end by midnight');
select ok(not private.is_day_minutes('{[-5,60)}'), 'hours start after midnight');
select ok(not private.is_day_minutes('{[600,)}'), 'hours have an end');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.work_template (master_id, weekday, hours) values
       ('00000000-0000-0000-0000-00000000000a', 1, '{[540,780),[840,1080)}'),
       ('00000000-0000-0000-0000-00000000000a', 7, '{[600,1440)}') $$,
  'a master sets working hours for weekdays'
);

select throws_ok(
  $$ insert into public.work_template (master_id, weekday, hours) values ('00000000-0000-0000-0000-00000000000a', 1, '{[600,720)}') $$,
  '23505', null,
  'a weekday has one set of hours'
);

select throws_ok(
  $$ insert into public.work_template (master_id, weekday, hours) values ('00000000-0000-0000-0000-00000000000a', 8, '{[600,720)}') $$,
  '23514', null,
  'weekdays run from Monday (1) to Sunday (7)'
);

select throws_ok(
  $$ insert into public.work_template (master_id, weekday, hours) values ('00000000-0000-0000-0000-00000000000a', 2, '{}') $$,
  '23514', null,
  'a day off is a missing weekday, not empty hours'
);

select throws_ok(
  $$ insert into public.work_template (master_id, weekday, hours) values ('00000000-0000-0000-0000-00000000000a', 2, '{[600,1500)}') $$,
  '23514', null,
  'working hours stay within one day'
);

select lives_ok(
  $$ insert into public.schedule_exceptions (master_id, day)
     select '00000000-0000-0000-0000-00000000000a', d::date
     from generate_series('2026-11-02'::date, '2026-11-08'::date, '1 day') as d $$,
  'a master takes a week off'
);

select lives_ok(
  $$ update public.schedule_exceptions set hours = '{[720,960)}' where day = '2026-11-05' $$,
  'a master gives one vacation day special hours'
);

select throws_ok(
  $$ insert into public.schedule_exceptions (master_id, day) values ('00000000-0000-0000-0000-00000000000a', '2026-11-05') $$,
  '23505', null,
  'a date has one exception'
);

select lives_ok(
  $$ insert into public.blocks (master_id, during, note) values
       ('00000000-0000-0000-0000-00000000000a', '[2026-11-10 10:00+02,2026-11-10 11:00+02)', 'Dentist'),
       ('00000000-0000-0000-0000-00000000000a', '[2026-11-10 11:00+02,2026-11-10 12:00+02)', null) $$,
  'a master adds back-to-back blocks'
);

select throws_ok(
  $$ insert into public.blocks (master_id, during) values ('00000000-0000-0000-0000-00000000000a', '[2026-11-10 11:30+02,2026-11-10 12:30+02)') $$,
  '23P01', null,
  'blocks of a master do not overlap'
);

select throws_ok(
  $$ insert into public.blocks (master_id, during) values ('00000000-0000-0000-0000-00000000000a', '[2026-11-10 13:00+02,2026-11-10 13:00+02)') $$,
  '23514', null,
  'a block is not empty'
);

select throws_ok(
  $$ insert into public.blocks (master_id, during) values ('00000000-0000-0000-0000-00000000000a', '[2026-11-10 13:00+02,)') $$,
  '23514', null,
  'a block has an end'
);

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.blocks (master_id, during) values ('00000000-0000-0000-0000-00000000000b', '[2026-11-10 10:00+02,2026-11-10 11:00+02)') $$,
  'blocks of different masters may overlap'
);

select is_empty(
  $$ select 1 from public.work_template where master_id = '00000000-0000-0000-0000-00000000000a'
     union all select 1 from public.schedule_exceptions where master_id = '00000000-0000-0000-0000-00000000000a'
     union all select 1 from public.blocks where master_id = '00000000-0000-0000-0000-00000000000a' $$,
  'another master sees none of the schedule'
);

select throws_ok(
  $$ insert into public.blocks (master_id, during) values ('00000000-0000-0000-0000-00000000000a', '[2026-11-11 10:00+02,2026-11-11 11:00+02)') $$,
  '42501', null,
  'another master cannot block time for someone else'
);

select is_empty(
  $$ update public.work_template set hours = '{[0,60)}' where master_id = '00000000-0000-0000-0000-00000000000a' returning weekday $$,
  'another master cannot change someone else''s work template'
);

select is_empty(
  $$ delete from public.schedule_exceptions where master_id = '00000000-0000-0000-0000-00000000000a' returning day $$,
  'another master cannot delete someone else''s exceptions'
);

select is_empty(
  $$ update public.masters set auto_confirm = false where slug = 'olena' returning id $$,
  'another master cannot change someone else''s booking settings'
);

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select lives_ok(
  $$ delete from public.blocks where note = 'Dentist' $$,
  'a master deletes own block'
);

reset role;
set local role anon;

select throws_ok(
  $$ select 1 from public.work_template
     union all select 1 from public.schedule_exceptions
     union all select 1 from public.blocks $$,
  '42501', null,
  'visitors cannot read the schedule'
);

select throws_ok(
  $$ insert into public.blocks (master_id, during) values ('00000000-0000-0000-0000-00000000000a', '[2026-11-12 10:00+02,2026-11-12 11:00+02)') $$,
  '42501', null,
  'visitors cannot change the schedule'
);

reset role;

select is(
  (select row(
     (select hours::text from public.work_template where master_id = '00000000-0000-0000-0000-00000000000a' and weekday = 1),
     (select count(*) from public.schedule_exceptions where master_id = '00000000-0000-0000-0000-00000000000a'),
     (select count(*) from public.blocks where master_id = '00000000-0000-0000-0000-00000000000a'),
     (select auto_confirm from public.masters where slug = 'olena')
   )::text),
  '("{[540,780),[840,1080)}",7,1,t)',
  'only the owner''s changes took effect'
);

delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';

select is(
  (select count(*)::int from public.work_template where master_id = '00000000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.schedule_exceptions where master_id = '00000000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.blocks where master_id = '00000000-0000-0000-0000-00000000000a'),
  0,
  'deleting a user removes their schedule'
);

select * from finish();
rollback;
