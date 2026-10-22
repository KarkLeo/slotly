create type public.locale as enum ('uk', 'ru', 'en');
create type public.price_kind as enum ('fixed', 'from', 'none');
create type public.service_format as enum ('on_site', 'online', 'at_client');

-- Landings live at /<slug>, so a slug must not shadow an app route or a locale prefix.
create function private.is_valid_slug(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'
    and length(value) between 3 and 40
    and value <> all (array[
      'about', 'account', 'admin', 'agent', 'agents', 'api', 'app', 'apps', 'assets', 'auth',
      'blog', 'book', 'booking', 'bookings', 'callback', 'client', 'clients', 'contact', 'dashboard',
      'docs', 'en', 'faq', 'favicon', 'health', 'help', 'home', 'legal', 'login', 'logout', 'master',
      'masters', 'mcp', 'me', 'new', 'oauth', 'onboarding', 'pricing', 'privacy', 'profile', 'register',
      'robots', 'ru', 'security', 'settings', 'signin', 'signup', 'sitemap', 'slotly', 'static',
      'status', 'support', 'terms', 'uk', 'www'
    ]);
$$;

create function private.is_timezone(value text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where name = value);
$$;

create function private.is_localized_text(value jsonb)
returns boolean
language sql
stable
set search_path = ''
as $$
  select jsonb_typeof(value) = 'object'
    and not exists (
      select 1
      from jsonb_each(value) as t (locale, text)
      where t.locale <> all (enum_range(null::public.locale)::text[])
        or jsonb_typeof(t.text) <> 'string'
        or btrim(t.text #>> '{}') = ''
    );
$$;

create function private.is_locale_set(value public.locale[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(value) > 0
    and array_position(value, null) is null
    and cardinality(value) = (select count(distinct v) from unnest(value) as v);
$$;

-- CHECK constraints run with the writer's privileges.
grant execute on function
  private.is_valid_slug(text),
  private.is_timezone(text),
  private.is_localized_text(jsonb),
  private.is_locale_set(public.locale[])
to authenticated, service_role;

create table public.masters (
  id uuid primary key references auth.users (id) on delete cascade,
  slug text not null unique check (private.is_valid_slug(slug)),
  name text not null check (btrim(name) <> '' and length(name) <= 100),
  timezone text not null default 'Europe/Kyiv' check (private.is_timezone(timezone)),
  currency text not null default 'UAH' check (currency ~ '^[A-Z]{3}$'),
  primary_locale public.locale not null default 'uk',
  locales public.locale[] not null default '{uk}' check (private.is_locale_set(locales) and primary_locale = any (locales)),
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  master_id uuid not null references public.masters (id) on delete cascade,
  name jsonb not null check (private.is_localized_text(name) and name <> '{}'),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (master_id, id)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  master_id uuid not null references public.masters (id) on delete cascade,
  category_id uuid,
  name jsonb not null check (private.is_localized_text(name) and name <> '{}'),
  description jsonb not null default '{}' check (private.is_localized_text(description)),
  duration_minutes integer not null check (duration_minutes between 5 and 720 and duration_minutes % 5 = 0),
  buffer_minutes integer not null default 0 check (buffer_minutes between 0 and 240 and buffer_minutes % 5 = 0),
  price_kind public.price_kind not null default 'fixed',
  price numeric(10, 2) check (price >= 0),
  format public.service_format not null default 'on_site',
  position integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  check ((price_kind = 'none') = (price is null)),
  foreign key (master_id, category_id)
    references public.service_categories (master_id, id)
    on delete set null (category_id)
);

create index services_master_id_idx on public.services (master_id);

alter table public.masters enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;

revoke all on public.masters, public.service_categories, public.services from anon, authenticated;
grant select on public.masters, public.service_categories, public.services to anon;
grant select, insert, update on public.masters, public.services to authenticated;
grant select, insert, update, delete on public.service_categories to authenticated;

create policy "published masters are public" on public.masters
  for select to anon, authenticated
  using (published_at is not null);

create policy "masters manage own profile" on public.masters
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "categories of published masters are public" on public.service_categories
  for select to anon, authenticated
  using (exists (select 1 from public.masters m where m.id = master_id and m.published_at is not null));

create policy "masters manage own categories" on public.service_categories
  for all to authenticated
  using (master_id = (select auth.uid()))
  with check (master_id = (select auth.uid()));

create policy "active services of published masters are public" on public.services
  for select to anon, authenticated
  using (
    archived_at is null
    and exists (select 1 from public.masters m where m.id = master_id and m.published_at is not null)
  );

create policy "masters manage own services" on public.services
  for all to authenticated
  using (master_id = (select auth.uid()))
  with check (master_id = (select auth.uid()));
