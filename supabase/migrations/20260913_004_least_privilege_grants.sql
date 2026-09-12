revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to anon, authenticated;
grant update (username, display_name, avatar_url) on table public.profiles to authenticated;

revoke all on table public.user_roles from anon, authenticated;
grant select on table public.user_roles to anon, authenticated;

revoke all on table public.role_audit_log from anon, authenticated;
grant select on table public.role_audit_log to authenticated;

revoke all on table public.forum_categories from anon, authenticated;
grant select on table public.forum_categories to anon, authenticated;
grant insert, update, delete on table public.forum_categories to authenticated;

revoke all on table public.forum_topics from anon, authenticated;
grant select on table public.forum_topics to anon, authenticated;
grant insert, update on table public.forum_topics to authenticated;

revoke all on table public.forum_posts from anon, authenticated;
grant select on table public.forum_posts to anon, authenticated;
grant insert, update on table public.forum_posts to authenticated;

revoke all on table public.forum_reactions from anon, authenticated;
grant select on table public.forum_reactions to anon, authenticated;
grant insert, delete on table public.forum_reactions to authenticated;

revoke all on table public.forum_reports from anon, authenticated;
grant select, insert, update on table public.forum_reports to authenticated;

revoke all on table public.forum_sanctions from anon, authenticated;
grant select, insert, update on table public.forum_sanctions to authenticated;

revoke all on table public.forum_moderation_log from anon, authenticated;
grant select, insert on table public.forum_moderation_log to authenticated;

revoke all on all sequences in schema public from anon;
grant usage, select on all sequences in schema public to authenticated;
