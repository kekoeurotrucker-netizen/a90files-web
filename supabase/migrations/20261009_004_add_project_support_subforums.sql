-- Add support subforums for the rest of the active A 90 projects.
with parent as (
  select id from public.forum_categories where slug='soporte' limit 1
)
insert into public.forum_categories(parent_id,slug,name,description,sort_order,min_role_to_post,is_locked,is_visible)
select id,'marea-studio-soporte','Soporte Marea Studio','Ayuda, pruebas e incidencias de Marea Studio.',30,'user'::public.app_role,false,true from parent
union all
select id,'autominer-soporte','Soporte AutoMiner','Ayuda, pruebas e incidencias de AutoMiner.',40,'user'::public.app_role,false,true from parent
union all
select id,'startwise-soporte','Soporte StartWise','Ayuda, pruebas e incidencias de StartWise.',50,'user'::public.app_role,false,true from parent
union all
select id,'project-trucker-soporte','Soporte Project Trucker','Ayuda, pruebas e incidencias de Project Trucker.',60,'user'::public.app_role,false,true from parent
on conflict (slug) do update set
  parent_id=excluded.parent_id,
  name=excluded.name,
  description=excluded.description,
  sort_order=excluded.sort_order,
  min_role_to_post=excluded.min_role_to_post,
  is_locked=false,
  is_visible=true;
