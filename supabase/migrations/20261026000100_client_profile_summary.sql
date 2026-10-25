-- The readable copy of the answers (section titles, question labels, values),
-- built by the browser and used to write the Google Doc. Run this before
-- deploying the version of the function that has the Google sync.

alter table public.client_profiles
  add column if not exists summary jsonb not null default '[]';
