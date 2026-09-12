create index if not exists forum_reactions_user_idx on public.forum_reactions(user_id);
create index if not exists forum_reports_reporter_idx on public.forum_reports(reporter_id);
create index if not exists forum_reports_topic_idx on public.forum_reports(topic_id);
create index if not exists forum_reports_post_idx on public.forum_reports(post_id);
create index if not exists forum_reports_handled_by_idx on public.forum_reports(handled_by);
create index if not exists forum_sanctions_issued_by_idx on public.forum_sanctions(issued_by);
create index if not exists forum_moderation_actor_idx on public.forum_moderation_log(actor_user_id);
create index if not exists role_audit_actor_idx on public.role_audit_log(actor_user_id);
create index if not exists user_roles_assigned_by_idx on public.user_roles(assigned_by);

drop policy if exists sanctions_mod_insert on public.forum_sanctions;
create policy sanctions_mod_insert on public.forum_sanctions for insert to authenticated
with check (
  public.has_min_role('moderator'::public.app_role)
  and issued_by=(select auth.uid())
  and user_id<>(select auth.uid())
  and public.role_rank(public.current_app_role()) > coalesce((select public.role_rank(ur.role) from public.user_roles ur where ur.user_id=forum_sanctions.user_id),10)
);

drop policy if exists sanctions_mod_update on public.forum_sanctions;
create policy sanctions_mod_update on public.forum_sanctions for update to authenticated
using (
  public.has_min_role('moderator'::public.app_role)
  and user_id<>(select auth.uid())
  and public.role_rank(public.current_app_role()) > coalesce((select public.role_rank(ur.role) from public.user_roles ur where ur.user_id=forum_sanctions.user_id),10)
)
with check (
  public.has_min_role('moderator'::public.app_role)
  and user_id<>(select auth.uid())
  and public.role_rank(public.current_app_role()) > coalesce((select public.role_rank(ur.role) from public.user_roles ur where ur.user_id=forum_sanctions.user_id),10)
);

create or replace function public.forum_report_guard()
returns trigger language plpgsql set search_path=''
as $$
begin
  if tg_op='UPDATE' then
    if not public.has_min_role('moderator'::public.app_role) then raise exception 'moderator required'; end if;
    if new.reporter_id is distinct from old.reporter_id or new.topic_id is distinct from old.topic_id or new.post_id is distinct from old.post_id or new.reason is distinct from old.reason or new.created_at is distinct from old.created_at then raise exception 'protected report fields'; end if;
    if new.status is distinct from old.status then new.handled_by:=auth.uid(); new.handled_at:=now(); else new.handled_by:=old.handled_by; new.handled_at:=old.handled_at; end if;
  end if;
  return new;
end;$$;

drop trigger if exists forum_reports_guard on public.forum_reports;
create trigger forum_reports_guard before update on public.forum_reports for each row execute function public.forum_report_guard();

create or replace function public.forum_sanction_guard()
returns trigger language plpgsql set search_path=''
as $$
declare v_actor public.app_role; v_target public.app_role;
begin
  if auth.uid() is null or not public.has_min_role('moderator'::public.app_role) then raise exception 'moderator required'; end if;
  if new.user_id=auth.uid() then raise exception 'cannot sanction yourself'; end if;
  v_actor:=public.current_app_role();
  select role into v_target from public.user_roles where user_id=new.user_id;
  v_target:=coalesce(v_target,'user'::public.app_role);
  if public.role_rank(v_actor)<=public.role_rank(v_target) then raise exception 'cannot sanction equal or higher role'; end if;
  if new.ends_at is not null and new.ends_at<=new.starts_at then raise exception 'invalid sanction end'; end if;
  if tg_op='INSERT' then new.issued_by:=auth.uid();
  else
    if new.user_id is distinct from old.user_id or new.kind is distinct from old.kind or new.starts_at is distinct from old.starts_at or new.issued_by is distinct from old.issued_by or new.created_at is distinct from old.created_at then raise exception 'protected sanction fields'; end if;
  end if;
  return new;
end;$$;

drop trigger if exists forum_sanctions_guard on public.forum_sanctions;
create trigger forum_sanctions_guard before insert or update on public.forum_sanctions for each row execute function public.forum_sanction_guard();
