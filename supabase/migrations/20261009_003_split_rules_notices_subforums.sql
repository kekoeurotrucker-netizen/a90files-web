-- Split the former single "Normas y avisos" area into real subforums.
with parent as (
  select id from public.forum_categories where slug='normas-y-avisos' limit 1
),
normas as (
  insert into public.forum_categories(parent_id,slug,name,description,sort_order,min_role_to_post,is_locked,is_visible)
  select id,'normas-de-la-comunidad','Normas de la comunidad','Reglas oficiales de participación y convivencia en A 90 Files.',10,'moderator',false,true
  from parent
  on conflict (slug) do update set
    parent_id=excluded.parent_id,name=excluded.name,description=excluded.description,
    sort_order=excluded.sort_order,is_visible=true
  returning id
),
avisos as (
  insert into public.forum_categories(parent_id,slug,name,description,sort_order,min_role_to_post,is_locked,is_visible)
  select id,'avisos-y-comunicados','Avisos y comunicados','Bienvenida, anuncios importantes y comunicaciones oficiales de A 90 Files.',20,'moderator',false,true
  from parent
  on conflict (slug) do update set
    parent_id=excluded.parent_id,name=excluded.name,description=excluded.description,
    sort_order=excluded.sort_order,is_visible=true
  returning id
),
cambios as (
  insert into public.forum_categories(parent_id,slug,name,description,sort_order,min_role_to_post,is_locked,is_visible)
  select id,'cambios-y-roadmap','Cambios y roadmap','Evolución del portal y del foro, funciones nuevas y hoja de ruta.',30,'moderator',false,true
  from parent
  on conflict (slug) do update set
    parent_id=excluded.parent_id,name=excluded.name,description=excluded.description,
    sort_order=excluded.sort_order,is_visible=true
  returning id
)
update public.forum_topics
set category_id = case
  when id=6 then (select id from normas)
  when id=20 then (select id from avisos)
  when id in (24,27) then (select id from cambios)
  else category_id
end,
updated_at=now()
where id in (6,20,24,27);
