-- A90 Pulse: analytics geography and near real-time reporting
alter table public.analytics_events add column if not exists country text;
alter table public.analytics_events add column if not exists region text;
create index if not exists analytics_events_page_geo_idx on public.analytics_events (occurred_at desc,country) where event_type='page_view';
create or replace function public.analytics_geography(p_days integer default 30)
returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare v_since timestamptz:=now()-make_interval(days=>greatest(1,least(coalesce(p_days,30),365)));
begin
if public.current_app_role()<>'super_admin'::public.app_role then raise exception 'forbidden' using errcode='42501'; end if;
return jsonb_build_object(
'countries',(select coalesce(jsonb_agg(to_jsonb(t) order by t.sessions desc,t.country),'[]'::jsonb) from (select coalesce(country,'Desconocido') as country,count(distinct session_id) as sessions,count(*) as views from public.analytics_events where event_type='page_view' and occurred_at>=v_since group by coalesce(country,'Desconocido') order by sessions desc,country limit 20)t),
'regions',(select coalesce(jsonb_agg(to_jsonb(t) order by t.sessions desc,t.region),'[]'::jsonb) from (select coalesce(country,'Desconocido') as country,coalesce(region,'Sin región') as region,count(distinct session_id) as sessions,count(*) as views from public.analytics_events where event_type='page_view' and occurred_at>=v_since group by coalesce(country,'Desconocido'),coalesce(region,'Sin región') order by sessions desc,region limit 30)t),
'age_available',false);
end;$$;
create or replace function public.analytics_live() returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
begin
if public.current_app_role()<>'super_admin'::public.app_role then raise exception 'forbidden' using errcode='42501'; end if;
return jsonb_build_object(
'generated_at',now(),
'active_5m',(select count(distinct session_id) from public.analytics_events where occurred_at>=now()-interval '5 minutes' and session_id is not null),
'views_30m',(select count(*) from public.analytics_events where event_type='page_view' and occurred_at>=now()-interval '30 minutes'),
'sessions_30m',(select count(distinct session_id) from public.analytics_events where event_type='page_view' and session_id is not null and occurred_at>=now()-interval '30 minutes'),
'recent_pages',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (select path,count(*) as views from public.analytics_events where event_type='page_view' and occurred_at>=now()-interval '5 minutes' group by path order by views desc,path limit 6)t),
'timeline',(with minutes as (select generate_series(date_trunc('minute',now())-interval '29 minutes',date_trunc('minute',now()),interval '1 minute') as minute),agg as (select date_trunc('minute',occurred_at) as minute,count(*) filter(where event_type='page_view') as views,count(distinct session_id) filter(where event_type='page_view') as sessions from public.analytics_events where occurred_at>=now()-interval '30 minutes' group by 1) select coalesce(jsonb_agg(jsonb_build_object('time',to_char(minutes.minute at time zone 'Europe/Madrid','HH24:MI'),'views',coalesce(agg.views,0),'sessions',coalesce(agg.sessions,0))order by minutes.minute),'[]'::jsonb) from minutes left join agg using(minute)));
end;$$;
revoke all on function public.analytics_geography(integer) from public,anon;
revoke all on function public.analytics_live() from public,anon;
grant execute on function public.analytics_geography(integer) to authenticated;
grant execute on function public.analytics_live() to authenticated;