create function private.is_localized_text_within(value jsonb, max_length integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select not exists (
    select 1
    from jsonb_each_text(value) as t (locale, text)
    where length(t.text) > max_length
  );
$$;

-- CHECK constraints run with the writer's privileges.
grant execute on function private.is_localized_text_within(jsonb, integer) to authenticated, service_role;

alter table public.service_categories
  add constraint service_categories_name_length check (private.is_localized_text_within(name, 100));

alter table public.services
  add constraint services_name_length check (private.is_localized_text_within(name, 100)),
  add constraint services_description_length check (private.is_localized_text_within(description, 1000));

-- One statement, so a list is never left half reordered. RLS keeps these to the caller's own rows.
create function public.reorder_services(ids uuid[])
returns void
language sql
set search_path = ''
as $$
  update public.services s
  set position = o.position - 1
  from unnest(reorder_services.ids) with ordinality as o (id, position)
  where s.id = o.id;
$$;

create function public.reorder_service_categories(ids uuid[])
returns void
language sql
set search_path = ''
as $$
  update public.service_categories c
  set position = o.position - 1
  from unnest(reorder_service_categories.ids) with ordinality as o (id, position)
  where c.id = o.id;
$$;

revoke execute on function public.reorder_services(uuid[]), public.reorder_service_categories(uuid[]) from public, anon;
grant execute on function public.reorder_services(uuid[]), public.reorder_service_categories(uuid[]) to authenticated;
