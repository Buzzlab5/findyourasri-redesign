-- Which upload question each file was added under (for example "logo_files"),
-- so the admin page can show a file next to the question that asked for it.
-- Safe to run before or after deploying the function: the function copes with
-- the column being missing. Older rows stay empty and are placed by category.

alter table public.client_files
  add column if not exists field text;
