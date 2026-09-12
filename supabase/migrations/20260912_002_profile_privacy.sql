-- A 90 Files forum public-identity privacy hardening
-- Public forum identity may use the OAuth provider name or a forum alias.
-- Email stays exclusively in auth.users and is never copied to public.profile data.

begin;

alter table public.profiles
  add column if not exists name_mode text not null default 'provider'
  check (name_mode in ('provider','alias'));

-- Tighten direct profile writes: use a controlled RPC instead.
revoke update (username, display_name, avatar_url) on public.profiles from authenticated;

create or replace function public.set_my_forum_identity(
  p_display_name text,
  p_username text default null,
  p_name_mode text default 'provider'
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_display text := btrim(coalesce(p_display_name,''));
  v_username text := nullif(btrim(coalesce(p_username,'')), '');
  v_row public.profiles;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  if p_name_mode not in ('provider','alias') then
    raise exception 'invalid name mode';
  end if;

  if char_length(v_display) < 1 or char_length(v_display) > 80 then
    raise exception 'display name must be between 1 and 80 characters';
  end if;

  -- Keep control characters out of public display names.
  if v_display ~ '[[:cntrl:]]' then
    raise exception 'display name contains invalid characters';
  end if;

  if p_name_mode = 'alias' then
    if v_username is null then
      raise exception 'forum alias required';
    end if;
    if v_username !~ '^[A-Za-z0-9_.-]{3,32}$' then
      raise exception 'alias must be 3-32 characters using letters, numbers, dot, dash or underscore';
    end if;
    -- For alias mode, public visible name is always the alias itself.
    v_display := v_username;
  end if;

  update public.profiles
     set display_name = v_display,
         username = v_username,
         name_mode = p_name_mode,
         updated_at = now()
   where id = v_uid
   returning * into v_row;

  if v_row.id is null then
    raise exception 'profile not found';
  end if;

  return v_row;
end;
$$;

revoke all on function public.set_my_forum_identity(text, text, text) from public;
grant execute on function public.set_my_forum_identity(text, text, text) to authenticated;

-- Public readers receive only safe forum identity fields.
-- No email column exists here, and auth.users remains inaccessible from browser roles.
grant select (id, username, display_name, avatar_url, name_mode, created_at)
  on public.profiles to anon, authenticated;

commit;
