-- Add a dedicated Marea Studio subforum under Software.
insert into public.forum_categories
  (parent_id, slug, name, description, sort_order, min_role_to_post, is_locked, is_visible)
values
  (
    (select id from public.forum_categories where slug='software' limit 1),
    'marea-studio',
    'Marea Studio',
    'Desarrollo, pruebas, remixes, editor de pistas y feedback sobre Marea Studio.',
    15,
    'user',
    false,
    true
  )
on conflict (slug) do update
set parent_id=excluded.parent_id,
    name=excluded.name,
    description=excluded.description,
    sort_order=excluded.sort_order,
    is_visible=true;
