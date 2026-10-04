create table if not exists public.forum_staff_notifications (
  id bigint generated always as identity primary key,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('topic','reply','report')),
  title text not null check (char_length(btrim(title)) between 1 and 180),
  body text not null default '' check (char_length(body) <= 600),
  href text not null check (char_length(href) between 1 and 500 and href like '/foro/%'),
  topic_id bigint references public.forum_topics(id) on delete set null,
  post_id bigint references public.forum_posts(id) on delete set null,
  report_id bigint references public.forum_reports(id) on delete set null,
  event_key text not null check (char_length(event_key) between 3 and 128),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique(recipient_user_id,event_key)
);
alter table public.forum_staff_notifications enable row level security;
revoke all on public.forum_staff_notifications from public,anon,authenticated;
grant select on public.forum_staff_notifications to authenticated;
grant update(read_at) on public.forum_staff_notifications to authenticated;
drop policy if exists forum_staff_notifications_select_own on public.forum_staff_notifications;
create policy forum_staff_notifications_select_own on public.forum_staff_notifications for select to authenticated
using ((select auth.uid()) is not null and recipient_user_id=(select auth.uid()) and public.has_min_role('moderator'::public.app_role));
drop policy if exists forum_staff_notifications_update_own on public.forum_staff_notifications;
create policy forum_staff_notifications_update_own on public.forum_staff_notifications for update to authenticated
using (recipient_user_id=(select auth.uid()) and public.has_min_role('moderator'::public.app_role))
with check (recipient_user_id=(select auth.uid()) and public.has_min_role('moderator'::public.app_role));
create index if not exists forum_staff_notifications_recipient_created_idx on public.forum_staff_notifications(recipient_user_id,created_at desc);
create index if not exists forum_staff_notifications_unread_idx on public.forum_staff_notifications(recipient_user_id,created_at desc) where read_at is null;

create or replace function public.forum_staff_notification_insert(p_kind text,p_actor uuid,p_topic bigint,p_post bigint,p_report bigint,p_title text,p_body text,p_href text,p_event_key text)
returns void language plpgsql security definer set search_path=''
as $$begin
insert into public.forum_staff_notifications(recipient_user_id,actor_user_id,kind,title,body,href,topic_id,post_id,report_id,event_key)
select ur.user_id,p_actor,p_kind,left(p_title,180),left(coalesce(p_body,''),600),left(p_href,500),p_topic,p_post,p_report,left(p_event_key,128)
from public.user_roles ur
where ur.role in ('moderator'::public.app_role,'admin'::public.app_role,'super_admin'::public.app_role)
and ur.user_id is distinct from p_actor
on conflict(recipient_user_id,event_key) do nothing;
end;$$;
revoke all on function public.forum_staff_notification_insert(text,uuid,bigint,bigint,bigint,text,text,text,text) from public,anon,authenticated;

create or replace function public.forum_staff_notify_new_topic() returns trigger language plpgsql security definer set search_path=''
as $$declare v_actor text;v_category text;begin
select coalesce(p.username,p.display_name,'Usuario') into v_actor from public.profiles p where p.id=new.author_id;
select c.name into v_category from public.forum_categories c where c.id=new.category_id;
perform public.forum_staff_notification_insert('topic',new.author_id,new.id,null,null,'Nuevo tema · '||new.title,coalesce(v_actor,'Usuario')||' ha creado un tema en '||coalesce(v_category,'el foro')||'.','/foro/?t='||new.id,'topic:'||new.id);
return new;end;$$;
revoke all on function public.forum_staff_notify_new_topic() from public,anon,authenticated;

create or replace function public.forum_staff_notify_new_post() returns trigger language plpgsql security definer set search_path=''
as $$declare v_actor text;v_title text;begin
if not exists(select 1 from public.forum_posts p where p.topic_id=new.topic_id and p.id<>new.id) then return new;end if;
select coalesce(p.username,p.display_name,'Usuario') into v_actor from public.profiles p where p.id=new.author_id;
select t.title into v_title from public.forum_topics t where t.id=new.topic_id;
perform public.forum_staff_notification_insert('reply',new.author_id,new.topic_id,new.id,null,'Nueva respuesta · '||coalesce(v_title,'Tema del foro'),coalesce(v_actor,'Usuario')||' ha respondido en el foro.','/foro/?t='||new.topic_id||'#post-'||new.id,'reply:'||new.id);
return new;end;$$;
revoke all on function public.forum_staff_notify_new_post() from public,anon,authenticated;

create or replace function public.forum_staff_notify_new_report() returns trigger language plpgsql security definer set search_path=''
as $$declare v_topic bigint;v_actor text;v_href text;begin
v_topic:=new.topic_id;
if v_topic is null and new.post_id is not null then select p.topic_id into v_topic from public.forum_posts p where p.id=new.post_id;end if;
select coalesce(p.username,p.display_name,'Usuario') into v_actor from public.profiles p where p.id=new.reporter_id;
if new.post_id is not null then v_href:='/foro/?t='||coalesce(v_topic,0)||'#post-'||new.post_id;else v_href:='/foro/?t='||coalesce(v_topic,0);end if;
perform public.forum_staff_notification_insert('report',new.reporter_id,v_topic,new.post_id,new.id,'Nuevo reporte pendiente',coalesce(v_actor,'Usuario')||' ha enviado un reporte: '||left(new.reason,420),v_href,'report:'||new.id);
return new;end;$$;
revoke all on function public.forum_staff_notify_new_report() from public,anon,authenticated;

drop trigger if exists forum_staff_notifications_topic_insert on public.forum_topics;
create trigger forum_staff_notifications_topic_insert after insert on public.forum_topics for each row execute function public.forum_staff_notify_new_topic();
drop trigger if exists forum_staff_notifications_post_insert on public.forum_posts;
create trigger forum_staff_notifications_post_insert after insert on public.forum_posts for each row execute function public.forum_staff_notify_new_post();
drop trigger if exists forum_staff_notifications_report_insert on public.forum_reports;
create trigger forum_staff_notifications_report_insert after insert on public.forum_reports for each row execute function public.forum_staff_notify_new_report();
