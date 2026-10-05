begin;

select plan(2);

select has_function('public', 'health', 'health check function exists');

select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  $$,
  'every table in public has row level security enabled'
);

select * from finish();
rollback;
