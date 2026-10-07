-- Restore least-privilege avatar updates for authenticated users.
-- RLS still restricts updates to the user's own profile row.

grant update (avatar_url) on table public.profiles to authenticated;
