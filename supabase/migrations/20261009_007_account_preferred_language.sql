-- Account language is an explicit preference, never inferred from country.
alter table public.profiles add column if not exists preferred_language text not null default 'es' check (preferred_language in ('es','en'));
