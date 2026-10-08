-- Minimal stand-in for Supabase's auth schema and roles, so migrations and RLS policies can be
-- tested in plain Postgres (PGlite) without Docker. Mirrors Supabase's definitions of
-- auth.uid() and auth.jwt(). Test-only; never applied to a real project.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key,
  phone text
);

create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to service_role;
