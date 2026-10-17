-- Run in a dedicated Supabase project's SQL editor. No secrets belong here.
-- Do not expose server state to browsers: only the server's service role can use it.
begin;
create table if not exists public.lingosprout_server_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.lingosprout_server_state enable row level security;
revoke all on public.lingosprout_server_state from public, anon, authenticated;
grant select, insert, update, delete on public.lingosprout_server_state to service_role;

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'free' check (status in ('free','active')),
  source text not null default 'none' check (source in ('none','payment','admin')),
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  check (status <> 'active' or source in ('payment','admin')),
  check (source <> 'admin' or expires_at is not null)
);
alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from public, anon, authenticated;
grant select on public.subscriptions to authenticated;
grant select, insert, update, delete on public.subscriptions to service_role;
drop policy if exists "read_own_subscription" on public.subscriptions;
create policy "read_own_subscription" on public.subscriptions for select to authenticated
using ((select auth.uid()) = user_id);
-- No browser INSERT or UPDATE policy: trusted administrator transactions manage
-- current entitlements. User metadata is never used for authorization.

create or replace function public.lingosprout_read(p_user_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('revision', revision, 'data', data)
  from public.lingosprout_server_state where user_id = p_user_id;
$$;
create or replace function public.lingosprout_cas(p_user_id uuid, p_revision bigint, p_data jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare changed integer;
begin
  if p_revision = 0 then
    insert into public.lingosprout_server_state(user_id,revision,data)
    values (p_user_id,1,p_data) on conflict (user_id) do nothing;
  else
    update public.lingosprout_server_state set data=p_data, revision=revision+1, updated_at=now()
    where user_id=p_user_id and revision=p_revision;
  end if;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;
revoke all on function public.lingosprout_read(uuid) from public, anon, authenticated;
revoke all on function public.lingosprout_cas(uuid,bigint,jsonb) from public, anon, authenticated;
grant execute on function public.lingosprout_read(uuid) to service_role;
grant execute on function public.lingosprout_cas(uuid,bigint,jsonb) to service_role;
commit;
