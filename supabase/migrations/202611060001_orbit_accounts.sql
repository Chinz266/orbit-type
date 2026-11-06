-- Run once in the selected Supabase project. Auth owns accounts/passwords.
begin;
create table public.orbit_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  ended_at timestamptz not null,
  language text not null check (language in ('th', 'en')),
  level text not null check (level in ('home', 'words')),
  category text not null check (char_length(category) between 1 and 200),
  category_id text,
  mode text not null check (mode in ('practice', 'timed')),
  seconds double precision not null check (seconds >= 0 and seconds < 'Infinity'::float8),
  score integer not null check (score >= 0),
  hits integer not null check (hits >= 0),
  errors integer not null check (errors >= 0),
  targets integer not null check (targets >= 0),
  mistakes jsonb not null default '[]'::jsonb check (jsonb_typeof(mistakes) = 'array'),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index orbit_sessions_user_time on public.orbit_sessions (user_id, ended_at desc, id);
alter table public.orbit_sessions enable row level security;
revoke all on public.orbit_sessions from anon, authenticated;
grant select, insert on public.orbit_sessions to authenticated;
create policy "Read own typing sessions" on public.orbit_sessions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own typing sessions" on public.orbit_sessions
  for insert to authenticated with check ((select auth.uid()) = user_id);
comment on table public.orbit_sessions is 'Private self-reported practice history, not a verified competitive leaderboard.';
commit;
