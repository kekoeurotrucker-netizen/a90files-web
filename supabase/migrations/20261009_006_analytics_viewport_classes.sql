alter table public.analytics_events add column if not exists viewport_class text;
create or replace function public.analytics_screens(p_days integer default 30) returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare v_since timestamptz:=now()-make_interval(days=>greatest(1,least(coalesce(p_days,30),365)));
begin
if public.current_app_role()<>'super_admin'::public.app_role then raise exception 'forbidden' using errcode='42501'; end if;
return (select coalesce(jsonb_agg(to_jsonb(t) order by t.sessions desc),'[]'::jsonb) from (select coalesce(viewport_class,'Desconocido') as category,count(distinct session_id) as sessions,count(*) as views from public.analytics_events where event_type='page_view' and occurred_at>=v_since group by coalesce(viewport_class,'Desconocido') order by sessions desc)t);
end;$$;
revoke all on function public.analytics_screens(integer) from public,anon;
grant execute on function public.analytics_screens(integer) to authenticated;