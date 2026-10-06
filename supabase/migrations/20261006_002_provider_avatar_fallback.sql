-- Prefer the social-provider avatar on newly created forum profiles.

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

  v_avatar := nullif(
    left(
      coalesce(
        nullif(new.raw_user_meta_data ->> 'avatar_url',''),
        nullif(new.raw_user_meta_data ->> 'picture',''),
        ''
      ),
      2048
    ),
    ''
  );

  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, v_name, v_avatar)
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user'::public.app_role)
  on conflict (user_id) do nothing;

  return new;
end;
$$;
