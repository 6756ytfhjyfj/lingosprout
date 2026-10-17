-- Apply after schema.sql in a dedicated Supabase project. All runtime access is
-- through the service backend. Browser roles cannot read or mutate these tables.
begin;
create schema if not exists lingosprout_private;
revoke all on schema lingosprout_private from public,anon,authenticated;

create table public.ls_accounts (
 id uuid primary key references auth.users(id) on delete cascade,
 email text unique not null, role text not null default 'member' check(role in ('owner','admin','member')),
 disabled boolean not null default false, email_verified boolean not null default false,
 application_count integer not null default 0 check(application_count between 0 and 3),
 created_at timestamptz not null default now()
);
create unique index ls_one_owner on public.ls_accounts(role) where role='owner';
create table public.ls_devices (
 id uuid primary key default gen_random_uuid(),token_hash text unique not null,
 label text not null,registration_count integer not null default 0 check(registration_count between 0 and 10),
 created_at timestamptz not null default now()
);
create table public.ls_device_accounts (
 user_id uuid references public.ls_accounts(id) on delete cascade,
 device_id uuid references public.ls_devices(id) on delete cascade,
 registered_here boolean not null default false,created_at timestamptz not null default now(),revoked_at timestamptz,
 primary key(user_id,device_id)
);
create table lingosprout_private.signup_tickets (
 token_hash text primary key,device_id uuid not null references public.ls_devices(id),email text not null,
 account_role text not null default 'member' check(account_role in ('member','owner')),
 expires_at timestamptz not null default (now()+interval '3 minutes')
);
create table public.ls_sessions (
 token_hash text primary key,user_id uuid not null references public.ls_accounts(id) on delete cascade,
 device_id uuid not null references public.ls_devices(id),created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '7 days'),revoked_at timestamptz
);
create index on public.ls_sessions(user_id);
create table public.ls_titles (
 id uuid primary key default gen_random_uuid(),name text unique not null check(length(name) between 1 and 20),
 color text not null default 'green' check(color in ('green','gold','purple','blue','peach'))
);
insert into public.ls_titles(name,color) values ('创始探索家','gold'),('语言园丁','green'),('热心伙伴','peach'),('多语旅行家','purple');
create table public.ls_user_titles (
 user_id uuid references public.ls_accounts(id) on delete cascade,title_id uuid references public.ls_titles(id) on delete cascade,
 primary key(user_id,title_id)
);
create table public.premium_applications (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.ls_accounts(id) on delete cascade,
 ordinal integer not null check(ordinal between 1 and 3),message text not null check(length(message) between 5 and 500),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),reviewed_at timestamptz,reviewer uuid references public.ls_accounts(id),
 review_note text not null default '',expires_at timestamptz,unique(user_id,ordinal)
);
create unique index ls_one_pending on public.premium_applications(user_id) where status='pending';
create table public.ls_settings (
 id boolean primary key default true check(id),data jsonb not null default '{"model":"deepseek-flash","freeLimit":5,"premiumLimit":100,"siteTitle":"语芽 LingoSprout","applicationsOpen":true}',
 updated_at timestamptz not null default now()
);
insert into public.ls_settings(id) values(true);
create table public.ls_audit (
 id bigint generated always as identity primary key,actor uuid references public.ls_accounts(id),
 action text not null,target text not null,created_at timestamptz not null default now()
);
create table public.ls_rate_limits (key text primary key,hits integer not null,reset_at timestamptz not null);
create table public.ls_qr_logins (
 id uuid primary key default gen_random_uuid(),device_id uuid not null references public.ls_devices(id),
 poll_hash text not null,scan_hash text not null,status text not null default 'pending' check(status in ('pending','approved','denied','consumed')),
 approved_by uuid references public.ls_accounts(id),code text not null,expires_at timestamptz not null default(now()+interval '2 minutes'),
 created_at timestamptz not null default now()
);

-- Auth insert is allowed only when the trusted backend has reserved capacity.
-- This narrow trigger needs definer privileges: supabase_auth_admin cannot read
-- application tables. It is private and has no callable browser entry point.
create function lingosprout_private.accept_signup() returns trigger
language plpgsql security definer set search_path='' as $$
declare ticket lingosprout_private.signup_tickets; dev public.ls_devices;
begin
 select * into ticket from lingosprout_private.signup_tickets
 where token_hash=new.raw_user_meta_data->>'lingosprout_ticket' and lower(email)=lower(new.email) and expires_at>now();
 if ticket.token_hash is null then raise exception 'Registration requires the LingoSprout server'; end if;
 select * into dev from public.ls_devices where id=ticket.device_id for update;
 if dev.registration_count>=10 then raise exception 'Device registration limit reached'; end if;
 delete from lingosprout_private.signup_tickets where token_hash=ticket.token_hash;
 if not found then raise exception 'Registration ticket already used'; end if;
 insert into public.ls_accounts(id,email,role) values(new.id,lower(new.email),ticket.account_role);
 insert into public.ls_device_accounts(user_id,device_id,registered_here) values(new.id,dev.id,true);
 update public.ls_devices set registration_count=registration_count+1 where id=dev.id;
 return new;
end $$;
revoke all on function lingosprout_private.accept_signup() from public,anon,authenticated;
create trigger ls_guard_registration after insert on auth.users for each row execute function lingosprout_private.accept_signup();

create function public.lingosprout_throttle(p_key text,p_limit integer,p_seconds integer) returns void
language plpgsql security invoker set search_path='' as $$
declare r public.ls_rate_limits;
begin
 insert into public.ls_rate_limits(key,hits,reset_at) values(p_key,1,now()+make_interval(secs=>p_seconds))
 on conflict(key) do update set hits=case when ls_rate_limits.reset_at<=now() then 1 else ls_rate_limits.hits+1 end,
 reset_at=case when ls_rate_limits.reset_at<=now() then now()+make_interval(secs=>p_seconds) else ls_rate_limits.reset_at end returning * into r;
 if r.hits>p_limit then raise exception 'LS:操作频繁，请稍后再试。'; end if;
 delete from public.ls_rate_limits where reset_at<now()-interval '1 day';
end $$;
create function public.lingosprout_reserve_signup(p_device text,p_label text,p_email text,p_ticket text) returns void
language plpgsql security invoker set search_path='' as $$
declare dev public.ls_devices; pending integer;
begin
 insert into public.ls_devices(token_hash,label) values(p_device,p_label) on conflict(token_hash) do nothing;
 select * into dev from public.ls_devices where token_hash=p_device for update;
 delete from lingosprout_private.signup_tickets where expires_at<=now();
 select count(*) into pending from lingosprout_private.signup_tickets where device_id=dev.id;
 if dev.registration_count+pending>=10 then raise exception 'LS:当前浏览器设备已达到 10 个账号的累计注册上限。'; end if;
 if exists(select 1 from public.ls_accounts where email=lower(p_email)) then raise exception 'LS:注册未完成，邮箱可能已注册，请尝试登录。'; end if;
 insert into lingosprout_private.signup_tickets(token_hash,device_id,email) values(p_ticket,dev.id,lower(p_email));
end $$;
create function public.lingosprout_release_signup(p_ticket text) returns void language sql security invoker set search_path='' as $$
 delete from lingosprout_private.signup_tickets where token_hash=p_ticket;
$$;
create function public.lingosprout_account_json(p_user uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select to_jsonb(a)||jsonb_build_object('titles',coalesce((select jsonb_agg(t order by t.name) from public.ls_titles t join public.ls_user_titles ut on ut.title_id=t.id where ut.user_id=a.id),'[]'::jsonb))
 from public.ls_accounts a where a.id=p_user;
$$;
create function public.lingosprout_session(p_session text,p_device text) returns jsonb language sql stable security invoker set search_path='' as $$
 select public.lingosprout_account_json(a.id) from public.ls_sessions s
 join public.ls_accounts a on a.id=s.user_id join public.ls_devices d on d.id=s.device_id
 join public.ls_device_accounts da on da.device_id=d.id and da.user_id=a.id
 where s.token_hash=p_session and d.token_hash=p_device and s.expires_at>now() and s.revoked_at is null and da.revoked_at is null and not a.disabled;
$$;
create function public.lingosprout_issue_session(p_user uuid,p_device text,p_session text,p_label text) returns void
language plpgsql security invoker set search_path='' as $$
declare dev uuid;
begin
 if not exists(select 1 from public.ls_accounts where id=p_user and not disabled) then raise exception 'LS:账户不可用，请联系管理员。'; end if;
 insert into public.ls_devices(token_hash,label) values(p_device,p_label) on conflict(token_hash) do nothing;
 select id into dev from public.ls_devices where token_hash=p_device;
 insert into public.ls_device_accounts(user_id,device_id) values(p_user,dev) on conflict(user_id,device_id) do update set revoked_at=null;
 insert into public.ls_sessions(token_hash,user_id,device_id) values(p_session,p_user,dev) on conflict(token_hash) do nothing;
 delete from public.ls_sessions where expires_at<now()-interval '7 days';
end $$;
create function public.lingosprout_logout(p_session text) returns void language sql security invoker set search_path='' as $$
 update public.ls_sessions set revoked_at=now() where token_hash=p_session;
$$;
create function public.lingosprout_revoke_all(p_user uuid) returns void language sql security invoker set search_path='' as $$
 update public.ls_sessions set revoked_at=now() where user_id=p_user;
$$;
create function public.lingosprout_revoke_device(p_user uuid,p_device uuid,p_current text) returns void language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.ls_device_accounts where user_id=p_user and device_id=p_device) then raise exception 'LS:设备不存在。'; end if;
 update public.ls_device_accounts set revoked_at=now() where user_id=p_user and device_id=p_device;
 update public.ls_sessions set revoked_at=now() where user_id=p_user and device_id=p_device;
end $$;
create function public.lingosprout_account_overview(p_user uuid,p_device text) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('account',public.lingosprout_account_json(p_user),
 'applications',coalesce((select jsonb_agg(a order by a.created_at desc) from public.premium_applications a where user_id=p_user),'[]'::jsonb),
 'devices',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'label',d.label,'registered_here',a.registered_here,'created_at',a.created_at,'revoked_at',a.revoked_at,'current',d.token_hash=p_device) order by a.created_at desc) from public.ls_device_accounts a join public.ls_devices d on d.id=a.device_id where a.user_id=p_user),'[]'::jsonb));
$$;
create function public.lingosprout_settings() returns jsonb language sql stable security invoker set search_path='' as $$
 select data||jsonb_build_object('keyConfigured',coalesce(length(data->>'encryptedKey')>0,false)) from public.ls_settings where id;
$$;
create function public.lingosprout_apply(p_user uuid,p_message text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.ls_accounts; result jsonb;
begin
 select * into a from public.ls_accounts where id=p_user and not disabled for update;
 if a.id is null then raise exception 'LS:请先登录可用账户。'; end if;
 if not coalesce((select (data->>'applicationsOpen')::boolean from public.ls_settings where id),true) then raise exception 'LS:管理员暂时关闭了 Premium 申请。'; end if;
 if a.application_count>=3 then raise exception 'LS:每个账号最多申请三次，你已达到上限。'; end if;
 if exists(select 1 from public.premium_applications where user_id=p_user and status='pending') then raise exception 'LS:你已有一份待审核申请，请等待管理员处理。'; end if;
 if exists(select 1 from public.subscriptions where user_id=p_user and status='active' and expires_at>now()) then raise exception 'LS:Premium 仍在有效期内，到期后可再次申请。'; end if;
 update public.ls_accounts set application_count=application_count+1 where id=p_user;
 insert into public.premium_applications(user_id,ordinal,message) values(p_user,a.application_count+1,p_message) returning to_jsonb(premium_applications.*) into result;
 return result;
end $$;

create function public.lingosprout_admin_snapshot(p_actor uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.ls_accounts where id=p_actor and role in ('owner','admin') and not disabled) then raise exception 'LS:仅管理员可访问。'; end if;
 return jsonb_build_object(
 'accounts',coalesce((select jsonb_agg(public.lingosprout_account_json(a.id)||jsonb_build_object('premium_expires_at',s.expires_at,'premium_active',coalesce(s.status='active' and s.expires_at>now(),false)) order by a.created_at desc) from (select * from public.ls_accounts order by created_at desc limit 200) a left join public.subscriptions s on s.user_id=a.id),'[]'::jsonb),
 'applications',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('email',a.email) order by p.created_at desc) from (select * from public.premium_applications order by created_at desc limit 200) p join public.ls_accounts a on a.id=p.user_id),'[]'::jsonb),
 'titles',coalesce((select jsonb_agg(t order by name) from public.ls_titles t),'[]'::jsonb),
 'settings',public.lingosprout_settings()-'encryptedKey',
 'audit',coalesce((select jsonb_agg(to_jsonb(x) order by x.id desc) from (select l.id,l.action,a.email as actor_email,l.target,l.created_at from public.ls_audit l left join public.ls_accounts a on l.actor=a.id order by l.id desc limit 50) x),'[]'::jsonb),
 'counts',jsonb_build_object('accounts',(select count(*) from public.ls_accounts),'devices',(select count(*) from public.ls_devices),'pending',(select count(*) from public.premium_applications where status='pending'),'premium',(select count(*) from public.subscriptions where status='active' and expires_at>now())));
end $$;

create function public.lingosprout_admin_mutation(p_actor uuid,p_action text,p_data jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare actor public.ls_accounts; target public.ls_accounts; app public.premium_applications; until_at timestamptz; uid uuid;
begin
 select * into actor from public.ls_accounts where id=p_actor for update;
 if actor.id is null or actor.disabled or actor.role not in ('owner','admin') then raise exception 'LS:仅管理员可操作。'; end if;
 if p_action in ('grant','revoke','disable','role','assign-title','remove-title') then
  uid=(p_data->>'userId')::uuid;select * into target from public.ls_accounts where id=uid for update;
  if target.id is null then raise exception 'LS:账户不存在。'; end if;
  if target.role='owner' and actor.id<>target.id then raise exception 'LS:不能修改站点所有者。'; end if;
 end if;
 if p_action in ('grant','approve') then
  until_at=(p_data->>'expiresAt')::timestamptz;
  if until_at is null or until_at<=now() or until_at>now()+interval '3 years' then raise exception 'LS:请选择未来三年内的有效期。'; end if;
 end if;
 if p_action in ('approve','reject') then
  select * into app from public.premium_applications where id=(p_data->>'applicationId')::uuid for update;
  if app.id is null or app.status<>'pending' then raise exception 'LS:该申请已处理，请刷新列表。'; end if;
  uid=app.user_id;
  update public.premium_applications set status=case when p_action='approve' then 'approved' else 'rejected' end,reviewed_at=now(),reviewer=p_actor,review_note=coalesce(p_data->>'note',''),expires_at=case when p_action='approve' then until_at end where id=app.id;
 end if;
 if p_action in ('approve','grant') then
  insert into public.subscriptions(user_id,status,source,expires_at) values(uid,'active','admin',until_at)
  on conflict(user_id) do update set status='active',source='admin',expires_at=until_at,updated_at=now();
 elsif p_action='revoke' then update public.subscriptions set status='free',source='none',expires_at=null,updated_at=now() where user_id=uid;
 elsif p_action='disable' then
  if target.role='owner' or uid=p_actor then raise exception 'LS:不能停用所有者或自己的账户。'; end if;
  update public.ls_accounts set disabled=(p_data->>'disabled')::boolean where id=uid;
  if (p_data->>'disabled')::boolean then perform public.lingosprout_revoke_all(uid);end if;
 elsif p_action='role' then
  if actor.role<>'owner' or target.role='owner' then raise exception 'LS:仅所有者可任免管理员，不能修改所有者身份。'; end if;
  if p_data->>'role' not in ('member','admin') then raise exception 'LS:无效身份。';end if;
  update public.ls_accounts set role=p_data->>'role' where id=uid;
 elsif p_action='create-title' then insert into public.ls_titles(name,color) values(p_data->>'name',p_data->>'color');
 elsif p_action='assign-title' then insert into public.ls_user_titles(user_id,title_id) values(uid,(p_data->>'titleId')::uuid) on conflict do nothing;
 elsif p_action='remove-title' then delete from public.ls_user_titles where user_id=uid and title_id=(p_data->>'titleId')::uuid;
 elsif p_action='settings' then update public.ls_settings set data=data||p_data,updated_at=now() where id;
 elsif p_action not in ('approve','reject','grant') then raise exception 'LS:无效的管理操作。';
 end if;
 insert into public.ls_audit(actor,action,target) values(p_actor,p_action,coalesce(uid::text,p_data->>'name',p_action));
end $$;

-- Single-use QR challenges. Poll and scan capabilities are independent, hashed,
-- and expire after two minutes. Consumption and session creation are atomic.
create function public.lingosprout_qr_start(p_device text,p_label text,p_poll text,p_scan text,p_code text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare dev uuid; result jsonb;
begin
 insert into public.ls_devices(token_hash,label) values(p_device,p_label) on conflict(token_hash) do nothing;
 select id into dev from public.ls_devices where token_hash=p_device;
 update public.ls_qr_logins set status='denied' where device_id=dev and status in ('pending','approved');
 delete from public.ls_qr_logins where expires_at<now()-interval '1 day';
 insert into public.ls_qr_logins(device_id,poll_hash,scan_hash,code) values(dev,p_poll,p_scan,p_code) returning jsonb_build_object('id',id,'expiresAt',expires_at,'code',code) into result;
 return result;
end $$;
create function public.lingosprout_qr_scan(p_id uuid,p_scan text,p_user uuid,p_action text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare q public.ls_qr_logins;
begin
 if not exists(select 1 from public.ls_accounts where id=p_user and not disabled) then raise exception 'LS:请先登录可用账户。';end if;
 select * into q from public.ls_qr_logins where id=p_id and scan_hash=p_scan for update;
 if q.id is null or q.expires_at<=now() or q.status<>'pending' then raise exception 'LS:二维码已过期或已使用，请在原设备刷新。';end if;
 if p_action='approve' then update public.ls_qr_logins set status='approved',approved_by=p_user where id=q.id;
 elsif p_action='deny' then update public.ls_qr_logins set status='denied' where id=q.id;
 elsif p_action<>'inspect' then raise exception 'LS:无效操作。';end if;
 return jsonb_build_object('code',q.code,'label',(select label from public.ls_devices where id=q.device_id),'expiresAt',q.expires_at,'status',case when p_action='approve' then 'approved' when p_action='deny' then 'denied' else q.status end);
end $$;
create function public.lingosprout_qr_poll(p_id uuid,p_poll text,p_device text,p_session text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare q public.ls_qr_logins; dev public.ls_devices;
begin
 select * into dev from public.ls_devices where token_hash=p_device;
 select * into q from public.ls_qr_logins where id=p_id and poll_hash=p_poll and device_id=dev.id for update;
 if q.id is null then raise exception 'LS:登录请求不存在。';end if;
 if q.expires_at<=now() then return '{"status":"expired"}'::jsonb;end if;
 if q.status='approved' then
  if not exists(select 1 from public.ls_accounts where id=q.approved_by and not disabled) then raise exception 'LS:账户不可用。';end if;
  perform public.lingosprout_issue_session(q.approved_by,p_device,p_session,dev.label);
  update public.ls_qr_logins set status='consumed' where id=q.id;
  return '{"status":"authenticated"}'::jsonb;
 end if;
 return jsonb_build_object('status',q.status);
end $$;

-- Apply permissions to every new table and function, including future direct
-- REST attempts with the public project key. No user-editable JWT claims confer admin.
do $$ declare t record;f record;begin
 for t in select tablename from pg_tables where schemaname='public' and (tablename like 'ls_%' or tablename='premium_applications') loop
  execute format('alter table public.%I enable row level security',t.tablename);
  execute format('revoke all on public.%I from public,anon,authenticated',t.tablename);
  execute format('grant all on public.%I to service_role',t.tablename);
 end loop;
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public' and p.proname like 'lingosprout_%' loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
grant usage on schema lingosprout_private to service_role;
grant all on lingosprout_private.signup_tickets to service_role;
grant usage,select on sequence public.ls_audit_id_seq to service_role;
alter table lingosprout_private.signup_tickets enable row level security;
commit;
