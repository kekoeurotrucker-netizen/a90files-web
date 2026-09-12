-- A 90 Files forum role foundation
-- Security-first: roles are server-side, never trusted from client metadata.

begin;

create type public.app_role as enum ('user','moderator','admin','super_admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  display_name text not null default 'Usuario',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username is null or username ~ '^[A-Za-z0-9_.-]{3,32}$'
  ),
  constraint profiles_display_name_len check (
    char_length(display_name) between 1 and 80
  ),
  constraint profiles_avatar_len check (
    avatar_url is null or char_length(avatar_url) <= 2048
  )
);

create unique index profiles_username_ci_unique
  on public.profiles (lower(username))
  where username is not null;

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now()
);

create table public.role_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid not null,
  old_role public.app_role,
  new_role public.app_role not null,
  created_at timestamptz not null default now()
);

create or replace function public.role_rank(p_role public.app_role)
returns integer
language sql
immutable
strict
set search_path = ''
as $$
  select case p_role
    when 'user'::public.app_role then 10
    when 'moderator'::public.app_role then 20
    when 'admin'::public.app_role then 30
    when 'super_admin'::public.app_role then 40
  end;
$$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select ur.role from public.user_roles ur where ur.user_id = auth.uid()),
    'user'::public.app_role
  );
$$;

create or replace function public.has_min_role(p_required public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.role_rank(public.current_app_role()) >= public.role_rank(p_required);
$$;

create or replace function public.handle_new_forum_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_avatar text;
begin
  v_name := left(
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name',''),
      nullif(new.raw_user_meta_data ->> 'name',''),
      'Usuario'
    ),
    80
  );

  v_avatar := nullif(left(coalesce(new.raw_user_meta_data ->> 'avatar_url',''), 2048), '');

  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, v_name, v_avatar)
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user'::public.app_role)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created_forum
  after insert on auth.users
  for each row execute function public.handle_new_forum_user();

create or replace function public.touch_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_profile_updated_at();

-- Controlled role changes.
-- Admins may only move users between user/moderator.
-- Only super admins may assign admin/super_admin.
-- Nobody can change their own role through the app, preventing accidental or malicious self-escalation/demotion.
create or replace function public.set_user_role(
  p_target_user_id uuid,
  p_new_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_old_role public.app_role;
begin
  if v_actor is null then
    raise exception 'authentication required';
  end if;

  if p_target_user_id is null then
    raise exception 'target user required';
  end if;

  if p_target_user_id = v_actor then
    raise exception 'you cannot change your own role';
  end if;

  v_actor_role := public.current_app_role();

  select ur.role into v_old_role
  from public.user_roles ur
  where ur.user_id = p_target_user_id
  for update;

  if v_old_role is null then
    raise exception 'target user not found';
  end if;

  if v_actor_role = 'super_admin'::public.app_role then
    null;
  elsif v_actor_role = 'admin'::public.app_role then
    if v_old_role not in ('user'::public.app_role, 'moderator'::public.app_role)
       or p_new_role not in ('user'::public.app_role, 'moderator'::public.app_role) then
      raise exception 'admins may only manage user/moderator roles';
    end if;
  else
    raise exception 'insufficient privileges';
  end if;

  if v_old_role = p_new_role then
    return;
  end if;

  update public.user_roles
  set role = p_new_role,
      assigned_by = v_actor,
      assigned_at = now()
  where user_id = p_target_user_id;

  insert into public.role_audit_log(actor_user_id, target_user_id, old_role, new_role)
  values (v_actor, p_target_user_id, v_old_role, p_new_role);
end;
$$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.role_audit_log enable row level security;

-- Public profile information only. Email and OAuth secrets remain inside auth schema.
create policy profiles_public_read
on public.profiles
for select
to anon, authenticated
using (true);

create policy profiles_self_update
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Roles are visible for forum badges, but assignment fields are not granted to clients.
create policy user_roles_public_read
on public.user_roles
for select
to anon, authenticated
using (true);

-- Audit log visible only to admins and super admins.
create policy role_audit_admin_read
on public.role_audit_log
for select
to authenticated
using (public.has_min_role('admin'::public.app_role));

-- Start from least privilege and grant only what the browser actually needs.
revoke all on public.profiles from anon, authenticated;
revoke all on public.user_roles from anon, authenticated;
revoke all on public.role_audit_log from anon, authenticated;

-- Anonymous visitors can read safe public profile fields and role badges.
grant select (id, username, display_name, avatar_url, created_at) on public.profiles to anon, authenticated;
grant select (user_id, role) on public.user_roles to anon, authenticated;

-- Authenticated users can edit only their safe profile columns; RLS also enforces ownership.
grant update (username, display_name, avatar_url) on public.profiles to authenticated;

-- Admin audit view; RLS limits rows to admin+ callers.
grant select on public.role_audit_log to authenticated;

-- Role-management RPC is callable by authenticated users, but the function itself enforces hierarchy.
revoke all on function public.set_user_role(uuid, public.app_role) from public;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;

revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to anon, authenticated;

revoke all on function public.has_min_role(public.app_role) from public;
grant execute on function public.has_min_role(public.app_role) to authenticated;

-- Trigger/helper functions should never be directly callable by browser roles.
revoke all on function public.handle_new_forum_user() from public, anon, authenticated;
revoke all on function public.touch_profile_updated_at() from public, anon, authenticated;

commit;
