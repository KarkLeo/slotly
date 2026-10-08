-- Functions are executable by PUBLIC by default; agent tokens must not inherit that.
revoke execute on all functions in schema public from public;
alter default privileges for role postgres revoke execute on functions from public;

create role agent nologin noinherit;
grant agent to authenticator;

create schema agent_api;
grant usage on schema agent_api to agent;

create function agent_api.ping()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'sub', auth.uid(),
    'client_id', auth.jwt() ->> 'client_id'
  );
$$;

grant execute on function agent_api.ping() to agent;

create schema private;

create function private.custom_access_token(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  claims jsonb := event -> 'claims';
begin
  if claims ? 'client_id' then
    claims := jsonb_set(claims, '{aud}', '"slotly-mcp"');
    claims := jsonb_set(claims, '{role}', '"agent"');
  end if;
  return jsonb_build_object('claims', claims);
end;
$$;

grant usage on schema private to supabase_auth_admin;
grant execute on function private.custom_access_token(jsonb) to supabase_auth_admin;
