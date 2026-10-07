-- A 90 Files first-party audience measurement retention.
-- AEPD guidance for consent-exempt audience measurement sets a maximum
-- retention period of 25 months. Prune automatically after inserts.

create or replace function private.prune_a90_analytics_retention()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.analytics_events
  where occurred_at < now() - interval '25 months';
  return null;
end;
$$;

revoke all on function private.prune_a90_analytics_retention() from public, anon, authenticated;

drop trigger if exists a90_analytics_retention_prune on public.analytics_events;
create trigger a90_analytics_retention_prune
after insert on public.analytics_events
for each statement execute function private.prune_a90_analytics_retention();
