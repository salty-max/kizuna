create extension if not exists pgcrypto;

create type public.team_visibility as enum ('private', 'unlisted', 'public');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9][a-z0-9_-]{2,31}$'),
  display_name text check (char_length(display_name) <= 80),
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]{24,64}$'),
  name text not null check (char_length(name) between 1 and 80),
  visibility public.team_visibility not null default 'private',
  current_payload text not null check (
    char_length(current_payload) between 8 and 16384 and current_payload like 'KZ1.%'
  ),
  format_version smallint not null check (format_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

create index teams_owner_updated_idx on public.teams (owner_id, updated_at desc);
create index teams_public_updated_idx on public.teams (updated_at desc)
  where visibility = 'public';

create table public.team_versions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  payload text not null check (
    char_length(payload) between 8 and 16384 and payload like 'KZ1.%'
  ),
  format_version smallint not null check (format_version > 0),
  created_at timestamptz not null default now()
);

create index team_versions_team_created_idx
  on public.team_versions (team_id, created_at desc);

create function public.touch_team()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger teams_touch_before_write
before insert or update on public.teams
for each row execute function public.touch_team();

create function public.append_team_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.current_payload is distinct from old.current_payload then
    insert into public.team_versions (team_id, author_id, payload, format_version)
    values (new.id, new.owner_id, new.current_payload, new.format_version);
  end if;
  return null;
end;
$$;

create trigger teams_version_after_write
after insert or update on public.teams
for each row execute function public.append_team_version();

create function public.create_profile_for_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, handle, display_name)
  values (
    new.id,
    'player_' || substr(replace(new.id::text, '-', ''), 1, 12),
    nullif(new.raw_user_meta_data ->> 'display_name', '')
  );
  return new;
end;
$$;

create trigger auth_user_profile_created
after insert on auth.users
for each row execute function public.create_profile_for_user();

-- Also cover users created before this migration is applied.
insert into public.profiles (user_id, handle, display_name)
select
  users.id,
  'player_' || substr(replace(users.id::text, '-', ''), 1, 12),
  nullif(users.raw_user_meta_data ->> 'display_name', '')
from auth.users as users
on conflict (user_id) do nothing;

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_versions enable row level security;

create policy profiles_owner_all on public.profiles
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy teams_owner_select on public.teams
for select to authenticated
using ((select auth.uid()) = owner_id);
create policy teams_public_select on public.teams
for select to anon, authenticated
using (visibility = 'public');
create policy teams_owner_insert on public.teams
for insert to authenticated
with check ((select auth.uid()) = owner_id);
create policy teams_owner_update on public.teams
for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);
create policy teams_owner_delete on public.teams
for delete to authenticated
using ((select auth.uid()) = owner_id);

create policy team_versions_owner_select on public.team_versions
for select to authenticated
using (
  exists (
    select 1 from public.teams
    where teams.id = team_versions.team_id
      and teams.owner_id = (select auth.uid())
  )
);

-- Unlisted rows cannot be enumerated through the Data API. They are exposed only
-- when the caller already knows the stable slug.
create function public.get_shared_team(team_slug text)
returns table (
  id uuid,
  name text,
  slug text,
  visibility public.team_visibility,
  current_payload text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.name, t.slug, t.visibility, t.current_payload, t.updated_at
  from public.teams as t
  where t.slug = team_slug
    and t.visibility in ('unlisted', 'public')
  limit 1;
$$;

revoke all on function public.get_shared_team(text) from public;
grant execute on function public.get_shared_team(text) to anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.teams to authenticated;
grant select on public.teams to anon;
grant select on public.team_versions to authenticated;
