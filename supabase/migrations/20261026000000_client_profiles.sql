-- Client profile intake (/client-profile/ on the site).
--
-- The site is a static export, so the browser never touches these tables. It
-- talks to the `client-profile` Edge Function, which uses the service role.
-- RLS is on with no policies and no grants for anon or authenticated: nobody
-- but the service role can read or write anything here.

create table public.client_profiles (
  -- Generated in the browser when the form is first opened, so uploads can
  -- be filed under it before the profile is submitted. Unguessable (uuid v4).
  id              uuid primary key,
  status          text not null default 'submitted'
                    check (status in ('submitted', 'synced', 'sync_failed')),

  -- The few answers the team filters by. Everything else lives in `answers`.
  business_name   text not null,
  contact_name    text not null,
  contact_email   text not null,
  country         text,
  sector          text,
  services        text[] not null default '{}',
  budget          text,

  -- Every visible answer, keyed by field id (lib/client-profile/schema.ts).
  answers         jsonb not null,
  -- The "Team follow-ups" list: [{ "kind": "setup" | "check" | "note", "text": "..." }].
  followups       jsonb not null default '[]',
  consent         boolean not null,
  source          jsonb not null default '{}',
  submitted_at    timestamptz not null default now(),

  -- Filled in by the Google sync (Docs + Drive), a later step.
  google_doc_url   text,
  drive_folder_url text,
  synced_at        timestamptz,
  sync_error       text
);

create index client_profiles_submitted_at_idx on public.client_profiles (submitted_at desc);
create index client_profiles_email_idx on public.client_profiles (lower(contact_email));

create table public.client_files (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.client_profiles (id) on delete cascade,
  -- Object path in the client-brand-assets bucket: <profile id>/<uuid>-<name>.
  path        text not null unique,
  name        text not null,
  size        bigint not null,
  category    text not null default 'Other',
  created_at  timestamptz not null default now()
);

create index client_files_profile_idx on public.client_files (profile_id);

-- Rate limiting: one row per upload or submit request, keyed by a hash of the
-- caller's IP. The function prunes rows older than a day.
create table public.client_profile_hits (
  id       bigint generated always as identity primary key,
  ip_hash  text not null,
  kind     text not null,
  at       timestamptz not null default now()
);

create index client_profile_hits_lookup_idx on public.client_profile_hits (ip_hash, kind, at desc);

alter table public.client_profiles     enable row level security;
alter table public.client_files        enable row level security;
alter table public.client_profile_hits enable row level security;

revoke all on public.client_profiles     from anon, authenticated;
revoke all on public.client_files        from anon, authenticated;
revoke all on public.client_profile_hits from anon, authenticated;

-- The Edge Function is the only caller. Granted explicitly so it works whether
-- or not the project was created with "Automatically expose new tables" ticked.
grant all on public.client_profiles     to service_role;
grant all on public.client_files        to service_role;
grant all on public.client_profile_hits to service_role;

-- Private bucket. Objects are written through signed upload URLs that the
-- Edge Function hands out, and read by the team through the dashboard or by
-- signed download URLs. 50 MB is the Free plan's ceiling; on Pro, raise it here
-- and in MAX_FILE_BYTES in the function. Bigger files go in as a link.
insert into storage.buckets (id, name, public, file_size_limit)
values ('client-brand-assets', 'client-brand-assets', false, 52428800)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit;

-- No storage.objects policies on purpose: anon and authenticated get nothing.
-- Uploads that never end up in a submitted profile are orphans. Clear them
-- now and then (Dashboard > Storage, or a scheduled job): any folder in the
-- bucket whose name is not in client_profiles.id and is older than a week.
