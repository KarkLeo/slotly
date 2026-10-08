begin;

select plan(10);

select has_role('agent', 'agent role exists');

select is(
  private.custom_access_token(
    '{"claims": {"sub": "u", "aud": "authenticated", "role": "authenticated", "client_id": "c"}}'
  ) -> 'claims' ->> 'aud',
  'slotly-mcp',
  'OAuth tokens get the MCP audience'
);

select is(
  private.custom_access_token(
    '{"claims": {"sub": "u", "aud": "authenticated", "role": "authenticated", "client_id": "c"}}'
  ) -> 'claims' ->> 'role',
  'agent',
  'OAuth tokens get the agent role'
);

select is(
  private.custom_access_token(
    '{"claims": {"sub": "u", "aud": "authenticated", "role": "authenticated"}}'
  ) -> 'claims',
  '{"sub": "u", "aud": "authenticated", "role": "authenticated"}'::jsonb,
  'session tokens keep their claims'
);

select is_empty(
  $$
    select p.oid::regprocedure::text
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and has_function_privilege('agent', p.oid, 'execute')
  $$,
  'agent cannot execute functions in public'
);

select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p', 'v', 'm', 'f')
      and has_table_privilege('agent', c.oid, 'select, insert, update, delete')
  $$,
  'agent has no privileges on tables in public'
);

create table public.agent_probe (id int primary key);
select ok(
  not has_table_privilege('agent', 'public.agent_probe', 'select, insert, update, delete'),
  'new tables in public are closed to agent'
);

create function public.agent_probe_fn() returns int language sql as 'select 1';
select ok(
  not has_function_privilege('agent', 'public.agent_probe_fn()', 'execute'),
  'new functions in public are closed to agent'
);

select ok(
  has_function_privilege('agent', 'agent_api.ping()', 'execute'),
  'agent can call agent_api functions'
);

select ok(
  not has_schema_privilege('authenticated', 'agent_api', 'usage'),
  'web sessions cannot reach agent_api'
);

select * from finish();
rollback;
