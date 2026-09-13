alter policy profiles_self_update on public.profiles
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

alter policy topics_read on public.forum_topics
  using ((not is_hidden) or (author_id = (select auth.uid())) or public.has_min_role('moderator'::public.app_role));

alter policy topics_insert on public.forum_topics
  with check (
    author_id = (select auth.uid())
    and not public.forum_user_blocked((select auth.uid()))
    and exists (
      select 1 from public.forum_categories c
      where c.id = forum_topics.category_id
        and c.is_visible
        and not c.is_locked
        and public.role_rank(public.current_app_role()) >= public.role_rank(c.min_role_to_post)
    )
  );

alter policy topics_update on public.forum_topics
  using ((author_id = (select auth.uid())) or public.has_min_role('moderator'::public.app_role))
  with check ((author_id = (select auth.uid())) or public.has_min_role('moderator'::public.app_role));

alter policy posts_read on public.forum_posts
  using (
    (((not is_hidden) and deleted_at is null) or author_id = (select auth.uid()) or public.has_min_role('moderator'::public.app_role))
    and exists (
      select 1 from public.forum_topics t
      where t.id = forum_posts.topic_id
        and ((not t.is_hidden) or t.author_id = (select auth.uid()) or public.has_min_role('moderator'::public.app_role))
    )
  );

alter policy posts_insert on public.forum_posts
  with check (
    author_id = (select auth.uid())
    and not public.forum_user_blocked((select auth.uid()))
    and exists (
      select 1
      from public.forum_topics t
      join public.forum_categories c on c.id = t.category_id
      where t.id = forum_posts.topic_id
        and not t.is_hidden
        and not t.is_locked
        and c.is_visible
        and not c.is_locked
        and public.role_rank(public.current_app_role()) >= public.role_rank(c.min_role_to_post)
    )
  );

alter policy posts_update on public.forum_posts
  using ((author_id = (select auth.uid())) or public.has_min_role('moderator'::public.app_role))
  with check ((author_id = (select auth.uid())) or public.has_min_role('moderator'::public.app_role));

alter policy reactions_insert on public.forum_reactions
  with check ((user_id = (select auth.uid())) and not public.forum_user_blocked((select auth.uid())));

alter policy reactions_delete on public.forum_reactions
  using (user_id = (select auth.uid()));

alter policy reports_insert on public.forum_reports
  with check (reporter_id = (select auth.uid()));

alter policy reports_own_read on public.forum_reports
  using ((reporter_id = (select auth.uid())) or public.has_min_role('moderator'::public.app_role));

alter policy sanctions_self_read on public.forum_sanctions
  using ((user_id = (select auth.uid())) or public.has_min_role('moderator'::public.app_role));

alter policy moderation_log_mod_insert on public.forum_moderation_log
  with check (public.has_min_role('moderator'::public.app_role) and actor_user_id = (select auth.uid()));
