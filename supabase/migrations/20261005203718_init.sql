create function public.health()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select now();
$$;
