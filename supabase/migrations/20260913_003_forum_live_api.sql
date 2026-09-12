create or replace function public.forum_topic_guard()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  if tg_op='INSERT' then
    if auth.uid() is not null and new.author_id <> auth.uid() then raise exception 'invalid author'; end if;
    return new;
  end if;

  if pg_trigger_depth() > 1
     and new.author_id is not distinct from old.author_id
     and new.category_id is not distinct from old.category_id
     and new.title is not distinct from old.title
     and new.is_pinned is not distinct from old.is_pinned
     and new.is_locked is not distinct from old.is_locked
     and new.is_hidden is not distinct from old.is_hidden
     and new.created_at is not distinct from old.created_at
     and new.last_post_at is distinct from old.last_post_at then
    return new;
  end if;

  if auth.uid() is not null and not public.has_min_role('moderator'::public.app_role) then
    if old.author_id <> auth.uid() then raise exception 'not allowed'; end if;
    if new.author_id is distinct from old.author_id
       or new.category_id is distinct from old.category_id
       or new.is_pinned is distinct from old.is_pinned
       or new.is_locked is distinct from old.is_locked
       or new.is_hidden is distinct from old.is_hidden
       or new.created_at is distinct from old.created_at
       or new.last_post_at is distinct from old.last_post_at then
      raise exception 'protected topic fields';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.forum_bump_topic_last_post()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  update public.forum_topics
  set last_post_at = greatest(last_post_at, new.created_at), updated_at = now()
  where id = new.topic_id;
  return new;
end;
$$;
revoke all on function public.forum_bump_topic_last_post() from public, anon, authenticated;

drop trigger if exists forum_posts_bump_topic on public.forum_posts;
create trigger forum_posts_bump_topic after insert on public.forum_posts
for each row execute function public.forum_bump_topic_last_post();

create or replace function public.forum_create_topic(p_category_id bigint, p_title text, p_body text)
returns bigint language plpgsql security invoker set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_topic_id bigint; v_title text:=btrim(coalesce(p_title,'')); v_body text:=btrim(coalesce(p_body,''));
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if char_length(v_title)<3 or char_length(v_title)>180 or position(chr(0) in v_title)>0 then raise exception 'invalid title'; end if;
  if char_length(v_body)<1 or char_length(v_body)>20000 or position(chr(0) in v_body)>0 then raise exception 'invalid body'; end if;
  if exists(select 1 from public.forum_topics where author_id=v_user and created_at>now()-interval '20 seconds') then raise exception 'topic rate limit'; end if;
  insert into public.forum_topics(category_id,author_id,title) values(p_category_id,v_user,v_title) returning id into v_topic_id;
  insert into public.forum_posts(topic_id,author_id,body) values(v_topic_id,v_user,v_body);
  return v_topic_id;
end;$$;
revoke all on function public.forum_create_topic(bigint,text,text) from public, anon;
grant execute on function public.forum_create_topic(bigint,text,text) to authenticated;

create or replace function public.forum_create_reply(p_topic_id bigint, p_body text)
returns bigint language plpgsql security invoker set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_post_id bigint; v_body text:=btrim(coalesce(p_body,''));
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if char_length(v_body)<1 or char_length(v_body)>20000 or position(chr(0) in v_body)>0 then raise exception 'invalid body'; end if;
  if exists(select 1 from public.forum_posts where author_id=v_user and created_at>now()-interval '4 seconds') then raise exception 'reply rate limit'; end if;
  insert into public.forum_posts(topic_id,author_id,body) values(p_topic_id,v_user,v_body) returning id into v_post_id;
  return v_post_id;
end;$$;
revoke all on function public.forum_create_reply(bigint,text) from public, anon;
grant execute on function public.forum_create_reply(bigint,text) to authenticated;

create or replace function public.forum_toggle_reaction(p_post_id bigint, p_reaction text)
returns boolean language plpgsql security invoker set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_exists boolean;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if p_reaction not in ('👍','❤️','😂','😮','😢','👏') then raise exception 'invalid reaction'; end if;
  if not exists(select 1 from public.forum_posts where id=p_post_id and deleted_at is null and not is_hidden) then raise exception 'post not found'; end if;
  select exists(select 1 from public.forum_reactions where post_id=p_post_id and user_id=v_user and reaction=p_reaction) into v_exists;
  if v_exists then delete from public.forum_reactions where post_id=p_post_id and user_id=v_user and reaction=p_reaction; return false; end if;
  insert into public.forum_reactions(post_id,user_id,reaction) values(p_post_id,v_user,p_reaction); return true;
end;$$;
revoke all on function public.forum_toggle_reaction(bigint,text) from public, anon;
grant execute on function public.forum_toggle_reaction(bigint,text) to authenticated;

create or replace function public.forum_create_report(p_topic_id bigint, p_post_id bigint, p_reason text)
returns bigint language plpgsql security invoker set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_report_id bigint; v_reason text:=btrim(coalesce(p_reason,''));
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if (p_topic_id is null)=(p_post_id is null) then raise exception 'select one target'; end if;
  if char_length(v_reason)<3 or char_length(v_reason)>1000 or position(chr(0) in v_reason)>0 then raise exception 'invalid reason'; end if;
  if exists(select 1 from public.forum_reports where reporter_id=v_user and created_at>now()-interval '20 seconds') then raise exception 'report rate limit'; end if;
  if p_topic_id is not null and not exists(select 1 from public.forum_topics where id=p_topic_id) then raise exception 'topic not found'; end if;
  if p_post_id is not null and not exists(select 1 from public.forum_posts where id=p_post_id) then raise exception 'post not found'; end if;
  insert into public.forum_reports(reporter_id,topic_id,post_id,reason) values(v_user,p_topic_id,p_post_id,v_reason) returning id into v_report_id;
  return v_report_id;
end;$$;
revoke all on function public.forum_create_report(bigint,bigint,text) from public, anon;
grant execute on function public.forum_create_report(bigint,bigint,text) to authenticated;
