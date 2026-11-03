alter table public.masters add column first_published_at timestamptz;

update public.masters set first_published_at = published_at;

-- A retired slug stays taken after its master is deleted, so old links never reach someone else.
create table public.retired_slugs (
  slug text primary key,
  master_id uuid references public.masters (id) on delete set null,
  retired_at timestamptz not null default now()
);

create index retired_slugs_master_id_idx on public.retired_slugs (master_id);

alter table public.retired_slugs enable row level security;

revoke all on public.retired_slugs from anon, authenticated;
grant select on public.retired_slugs to authenticated;

create policy "masters read own retired slugs" on public.retired_slugs
  for select to authenticated
  using (master_id = (select auth.uid()));

create table private.slug_changes (
  id bigint generated always as identity primary key,
  master_id uuid not null references public.masters (id) on delete cascade,
  changed_at timestamptz not null default now()
);

create index slug_changes_master_id_changed_at_idx on private.slug_changes (master_id, changed_at);

-- After the first publication a change needs 30 days since the last one and fewer than 3 in 365 days.
create function private.slug_policy(master_id uuid, at timestamptz)
returns table (limited boolean, next_change_at timestamptz, changes_left integer, last_change_at timestamptz)
language sql
stable
set search_path = ''
as $$
  select
    m.first_published_at is not null,
    case when m.first_published_at is not null and w.next_at > slug_policy.at then w.next_at end,
    greatest(0, 3 - w.changes),
    w.last_at
  from public.masters m
  cross join lateral (
    select
      count(*)::integer as changes,
      max(sc.changed_at) as last_at,
      greatest(
        max(sc.changed_at) + interval '30 days',
        (array_agg(sc.changed_at order by sc.changed_at desc))[3] + interval '365 days'
      ) as next_at
    from private.slug_changes sc
    where sc.master_id = m.id
      and sc.changed_at > slug_policy.at - interval '365 days'
      and sc.changed_at <= slug_policy.at
  ) w
  where m.id = slug_policy.master_id;
$$;

-- Sorted keys, so two concurrent renames cannot deadlock.
create function private.lock_slugs(variadic slugs text[])
returns void
language plpgsql
set search_path = ''
as $$
declare
  k bigint;
begin
  for k in select distinct hashtextextended('slug:' || s, 0) from unnest(slugs) as s order by 1 loop
    perform pg_advisory_xact_lock(k);
  end loop;
end;
$$;

create function private.guard_master_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.first_published_at := case when tg_op = 'INSERT' then new.published_at
    else coalesce(old.first_published_at, new.published_at) end;

  if tg_op = 'UPDATE' and new.slug = old.slug then
    return new;
  end if;

  if tg_op = 'INSERT' then
    perform private.lock_slugs(new.slug);
  else
    perform private.lock_slugs(old.slug, new.slug);
  end if;

  if exists (
    select 1 from public.retired_slugs r
    where r.slug = new.slug and r.master_id is distinct from new.id
  ) then
    raise exception 'slug_taken';
  end if;

  if tg_op = 'UPDATE' and old.first_published_at is not null then
    if (select p.next_change_at from private.slug_policy(old.id, now()) p) is not null then
      raise exception 'slug_change_locked';
    end if;
    insert into private.slug_changes (master_id) values (old.id);
    insert into public.retired_slugs (slug, master_id, retired_at)
    values (old.slug, old.id, now())
    on conflict (slug) do update set retired_at = excluded.retired_at
      where public.retired_slugs.master_id = excluded.master_id;
    delete from public.retired_slugs r where r.slug = new.slug and r.master_id = old.id;
  end if;

  return new;
end;
$$;

create trigger masters_guard_slug
  before insert or update on public.masters
  for each row execute function private.guard_master_slug();

create function private.retire_deleted_master_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.lock_slugs(old.slug);
  insert into public.retired_slugs (slug, master_id) values (old.slug, null)
  on conflict (slug) do nothing;
  return old;
end;
$$;

create trigger masters_retire_deleted_slug
  before delete on public.masters
  for each row execute function private.retire_deleted_master_slug();

create function public.is_slug_available(slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_valid_slug(is_slug_available.slug)
    and not exists (
      select 1 from public.masters m
      where m.slug = is_slug_available.slug and m.id is distinct from auth.uid()
    )
    and not exists (
      select 1 from public.retired_slugs r
      where r.slug = is_slug_available.slug and r.master_id is distinct from auth.uid()
    );
$$;

create function public.get_slug_policy()
returns table (limited boolean, next_change_at timestamptz, changes_left integer, last_change_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.limited, p.next_change_at, p.changes_left, p.last_change_at
  from private.slug_policy(auth.uid(), now()) p;
$$;

-- Resolves even for an unpublished master, so an old link reaches the "page unavailable" screen.
create function public.resolve_landing_slug(slug text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select m.slug from public.masters m where m.slug = resolve_landing_slug.slug),
    (
      select m.slug
      from public.retired_slugs r
      join public.masters m on m.id = r.master_id
      where r.slug = resolve_landing_slug.slug
    )
  );
$$;

revoke execute on function public.is_slug_available(text), public.get_slug_policy() from public, anon;
grant execute on function public.is_slug_available(text), public.get_slug_policy() to authenticated;
revoke execute on function public.resolve_landing_slug(text) from public;
grant execute on function public.resolve_landing_slug(text) to anon, authenticated;
