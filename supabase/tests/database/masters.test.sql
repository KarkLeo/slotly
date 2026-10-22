begin;

select plan(26);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'olena@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'daryna@example.com');

select ok(private.is_valid_slug('olena'), 'a lowercase word is a valid slug');
select ok(private.is_valid_slug('olena-nails-2'), 'hyphens and digits are allowed inside a slug');
select ok(not private.is_valid_slug('Olena'), 'uppercase letters are not allowed');
select ok(not private.is_valid_slug('ol'), 'a slug has at least 3 characters');
select ok(not private.is_valid_slug('2olena'), 'a slug starts with a letter');
select ok(not private.is_valid_slug('olena--nails'), 'a slug has no double hyphens');
select ok(not private.is_valid_slug('olena-'), 'a slug does not end with a hyphen');
select ok(not private.is_valid_slug('oauth'), 'app routes are reserved');
select ok(not private.is_valid_slug('en'), 'locale prefixes are reserved');

select ok(private.is_locale_set('{uk,en}'), 'distinct locales form a locale set');
select ok(not private.is_locale_set('{uk,uk}'), 'a locale set has no duplicates');
select ok(not private.is_locale_set('{uk,NULL}'), 'a locale set has no nulls');
select ok(not private.is_locale_set('{}'), 'a locale set is not empty');

select throws_ok(
  $$ insert into public.masters (id, slug, name, primary_locale, locales)
     values ('00000000-0000-0000-0000-00000000000a', 'olena', 'Olena', 'en', '{uk}') $$,
  '23514', null,
  'the primary locale must be one of the enabled locales'
);

select throws_ok(
  $$ insert into public.masters (id, slug, name, timezone)
     values ('00000000-0000-0000-0000-00000000000a', 'olena', 'Olena', 'Europe/Atlantis') $$,
  '23514', null,
  'the timezone must be a known IANA zone'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.masters (id, slug, name) values ('00000000-0000-0000-0000-00000000000a', 'olena', 'Olena') $$,
  'a user creates their own master profile'
);

select throws_ok(
  $$ insert into public.masters (id, slug, name) values ('00000000-0000-0000-0000-00000000000b', 'daryna', 'Daryna') $$,
  '42501', null,
  'a user cannot create a master profile for someone else'
);

select is(
  (select timezone || ' ' || currency || ' ' || primary_locale || ' ' || locales::text from public.masters),
  'Europe/Kyiv UAH uk {uk}',
  'a new profile defaults to Kyiv time, hryvnia and Ukrainian'
);

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.masters (id, slug, name) values ('00000000-0000-0000-0000-00000000000b', 'daryna', 'Daryna') $$,
  'another user creates their profile'
);

select throws_ok(
  $$ update public.masters set slug = 'olena' where id = '00000000-0000-0000-0000-00000000000b' $$,
  '23505', null,
  'slugs are unique'
);

select is_empty(
  $$ select id from public.masters where id = '00000000-0000-0000-0000-00000000000a' $$,
  'a master does not see an unpublished profile of another master'
);

select is_empty(
  $$ update public.masters set name = 'Hacked' where id = '00000000-0000-0000-0000-00000000000a' returning id $$,
  'a master cannot change another master''s profile'
);

reset role;
update public.masters set published_at = now() where id = '00000000-0000-0000-0000-00000000000a';

set local role anon;

select results_eq(
  $$ select slug from public.masters $$,
  array['olena'],
  'visitors see only published masters'
);

select throws_ok(
  $$ insert into public.masters (id, slug, name) values ('00000000-0000-0000-0000-00000000000b', 'visitor', 'Visitor') $$,
  '42501', null,
  'visitors cannot create profiles'
);

reset role;

select is(
  (select name from public.masters where id = '00000000-0000-0000-0000-00000000000a'),
  'Olena',
  'the other master''s update changed nothing'
);

set local role service_role;

select lives_ok(
  $$ update public.masters set slug = 'olena-nails' where id = '00000000-0000-0000-0000-00000000000a' $$,
  'server code with the service role can write profiles'
);

reset role;

select * from finish();
rollback;
