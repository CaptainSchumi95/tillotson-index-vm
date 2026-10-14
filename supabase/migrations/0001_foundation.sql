-- Tillotson Index – základ: profily, tímy, roly, oprávnenia, členstvá, motokáry.
-- Oprávnenia sa vynucujú cez Row Level Security, nie iba v rozhraní.

create extension if not exists citext;

-- ───────────────────────────── Profily ─────────────────────────────
-- Profil patrí človeku (meno, fotka, jazyk, jednotky) a je spoločný pre všetky tímy.

create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       citext not null,
  name        text not null default '',
  avatar_url  text,
  locale      text not null default 'sk',
  unit_prefs  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ───────────────────────────── Oprávnenia ─────────────────────────────
-- Pevný katalóg kódov. Rozhodujú oprávnenia roly, nie jej názov.

create table public.permissions (
  code        text primary key,
  sort_order  int not null default 0
);

insert into public.permissions (code, sort_order) values
  ('team.manage',      10),  -- členovia, roly, motokáry, vzhľad tímu
  ('kart.all',         20),  -- prístup ku všetkým motokáram, nielen prideleným
  ('setup.view',       30),
  ('setup.edit',       31),
  ('event.view',       40),
  ('event.manage',     41),  -- vytvárať a upravovať udalosti
  ('session.edit',     50),  -- zapisovať výsledky jázd
  ('session.feedback', 51),  -- spätná väzba jazdca
  ('checklist.edit',   60),
  ('track.view',       70),
  ('track.manage',     71),
  ('track.apply',      72),  -- použiť setup trate na motokáru
  ('service.edit',     80),
  ('notes.edit',       90);

-- ───────────────────────────── Tímy ─────────────────────────────

create table public.teams (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (length(trim(name)) between 1 and 80),
  color            text not null default '#1d56e9' check (color ~ '^#[0-9a-fA-F]{6}$'),
  icon_url         text,
  created_by       uuid references public.profiles on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 40),
  -- kľúč predvolenej roly (manager, chief_mechanic, mechanic, driver); vlastné roly majú null
  preset      text check (preset in ('manager', 'chief_mechanic', 'mechanic', 'driver')),
  sort_order  int not null default 100,
  created_at  timestamptz not null default now(),
  unique (team_id, name)
);

create table public.role_permissions (
  role_id     uuid not null references public.roles on delete cascade,
  permission  text not null references public.permissions on delete cascade,
  primary key (role_id, permission)
);

create table public.memberships (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams on delete cascade,
  profile_id  uuid not null references public.profiles on delete cascade,
  role_id     uuid not null references public.roles on delete restrict,
  created_at  timestamptz not null default now(),
  unique (team_id, profile_id)
);

-- Pozvánka cez Google e-mail. Po prvom prihlásení sa zmení na členstvo.
create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams on delete cascade,
  email       citext not null,
  role_id     uuid not null references public.roles on delete cascade,
  kart_ids    uuid[] not null default '{}',
  invited_by  uuid references public.profiles on delete set null,
  created_at  timestamptz not null default now(),
  unique (team_id, email)
);

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 40),
  unique (team_id, name)
);

create table public.karts (
  id                 uuid primary key default gen_random_uuid(),
  team_id            uuid not null references public.teams on delete cascade,
  number             text not null check (length(trim(number)) between 1 and 6),
  driver_name        text not null default '',
  driver_profile_id  uuid references public.profiles on delete set null,
  category_id        uuid references public.categories on delete set null,
  archived           boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index on public.karts (team_id);

create table public.kart_assignments (
  membership_id  uuid not null references public.memberships on delete cascade,
  kart_id        uuid not null references public.karts on delete cascade,
  primary key (membership_id, kart_id)
);

-- ───────────────────────────── Pomocné funkcie ─────────────────────────────
-- security definer, aby sa RLS politiky nezacyklili na tabuľke memberships.

create function public.is_member(p_team uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where team_id = p_team and profile_id = auth.uid());
$$;

create function public.has_perm(p_team uuid, p_perm text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    join role_permissions rp on rp.role_id = m.role_id
    where m.team_id = p_team and m.profile_id = auth.uid() and rp.permission = p_perm
  );
$$;

-- Motokáru vidí člen tímu s oprávnením kart.all alebo ten, komu je pridelená.
create function public.can_access_kart(p_kart uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from karts k
    where k.id = p_kart
      and (
        has_perm(k.team_id, 'kart.all')
        or exists (
          select 1 from kart_assignments ka
          join memberships m on m.id = ka.membership_id
          where ka.kart_id = k.id and m.profile_id = auth.uid()
        )
      )
  );
$$;

create function public.shares_team_with(p_profile uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships a
    join memberships b on b.team_id = a.team_id
    where a.profile_id = auth.uid() and b.profile_id = p_profile
  );
$$;

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger teams_touch before update on public.teams
  for each row execute function public.touch_updated_at();
create trigger karts_touch before update on public.karts
  for each row execute function public.touch_updated_at();

-- ───────────────────────────── Nový používateľ ─────────────────────────────

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prijme všetky čakajúce pozvánky na e-mail prihláseného používateľa.
create function public.accept_invitations() returns int
language plpgsql security definer set search_path = public as $$
declare
  inv record;
  mid uuid;
  n int := 0;
begin
  for inv in
    select i.* from invitations i
    join profiles p on p.email = i.email
    where p.id = auth.uid()
  loop
    insert into memberships (team_id, profile_id, role_id)
    values (inv.team_id, auth.uid(), inv.role_id)
    on conflict (team_id, profile_id) do nothing
    returning id into mid;

    if mid is not null then
      insert into kart_assignments (membership_id, kart_id)
      select mid, k.id from karts k
      where k.id = any (inv.kart_ids) and k.team_id = inv.team_id
      on conflict do nothing;
      n := n + 1;
    end if;

    delete from invitations where id = inv.id;
  end loop;
  return n;
end;
$$;

-- Vytvorí tím s predvolenými rolami a zakladateľa spraví manažérom.
create function public.create_team(p_name text, p_color text default '#1d56e9') returns uuid
language plpgsql security definer set search_path = public as $$
declare
  tid uuid;
  r_manager uuid;
  r_chief uuid;
  r_mech uuid;
  r_driver uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into teams (name, color, created_by) values (p_name, p_color, auth.uid()) returning id into tid;

  insert into roles (team_id, name, preset, sort_order) values (tid, 'Manažér', 'manager', 10) returning id into r_manager;
  insert into roles (team_id, name, preset, sort_order) values (tid, 'Šéfmechanik', 'chief_mechanic', 20) returning id into r_chief;
  insert into roles (team_id, name, preset, sort_order) values (tid, 'Mechanik', 'mechanic', 30) returning id into r_mech;
  insert into roles (team_id, name, preset, sort_order) values (tid, 'Jazdec', 'driver', 40) returning id into r_driver;

  insert into role_permissions (role_id, permission)
  select r_manager, code from permissions;

  insert into role_permissions (role_id, permission)
  select r_chief, code from permissions where code <> 'team.manage';

  insert into role_permissions (role_id, permission)
  select r_mech, unnest(array[
    'setup.view', 'setup.edit', 'event.view', 'event.manage', 'session.edit', 'session.feedback',
    'checklist.edit', 'track.view', 'track.apply', 'service.edit', 'notes.edit'
  ]);

  insert into role_permissions (role_id, permission)
  select r_driver, unnest(array['event.view', 'session.feedback', 'track.view', 'notes.edit']);

  insert into memberships (team_id, profile_id, role_id) values (tid, auth.uid(), r_manager);

  return tid;
end;
$$;

-- ───────────────────────────── RLS ─────────────────────────────

alter table public.profiles          enable row level security;
alter table public.permissions       enable row level security;
alter table public.teams             enable row level security;
alter table public.roles             enable row level security;
alter table public.role_permissions  enable row level security;
alter table public.memberships       enable row level security;
alter table public.invitations       enable row level security;
alter table public.categories        enable row level security;
alter table public.karts             enable row level security;
alter table public.kart_assignments  enable row level security;

-- profiles: vidím seba a ľudí z mojich tímov, meniť môžem iba seba
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or shares_team_with(id));
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

create policy permissions_select on public.permissions for select to authenticated using (true);

-- teams: vytvára sa cez create_team()
create policy teams_select on public.teams for select using (is_member(id));
create policy teams_update on public.teams for update
  using (has_perm(id, 'team.manage')) with check (has_perm(id, 'team.manage'));
create policy teams_delete on public.teams for delete using (has_perm(id, 'team.manage'));

-- roles a role_permissions
create policy roles_select on public.roles for select using (is_member(team_id));
create policy roles_write on public.roles for all
  using (has_perm(team_id, 'team.manage')) with check (has_perm(team_id, 'team.manage'));

create policy role_permissions_select on public.role_permissions for select
  using (exists (select 1 from roles r where r.id = role_id and is_member(r.team_id)));
create policy role_permissions_write on public.role_permissions for all
  using (exists (select 1 from roles r where r.id = role_id and has_perm(r.team_id, 'team.manage')))
  with check (exists (select 1 from roles r where r.id = role_id and has_perm(r.team_id, 'team.manage')));

-- memberships
create policy memberships_select on public.memberships for select using (is_member(team_id));
create policy memberships_write on public.memberships for all
  using (has_perm(team_id, 'team.manage')) with check (has_perm(team_id, 'team.manage'));
create policy memberships_leave on public.memberships for delete using (profile_id = auth.uid());

-- invitations
create policy invitations_all on public.invitations for all
  using (has_perm(team_id, 'team.manage')) with check (has_perm(team_id, 'team.manage'));

-- categories
create policy categories_select on public.categories for select using (is_member(team_id));
create policy categories_write on public.categories for all
  using (has_perm(team_id, 'team.manage')) with check (has_perm(team_id, 'team.manage'));

-- karts
create policy karts_select on public.karts for select using (can_access_kart(id));
create policy karts_write on public.karts for all
  using (has_perm(team_id, 'team.manage')) with check (has_perm(team_id, 'team.manage'));

-- kart_assignments
create policy kart_assignments_select on public.kart_assignments for select
  using (exists (select 1 from karts k where k.id = kart_id and is_member(k.team_id)));
create policy kart_assignments_write on public.kart_assignments for all
  using (exists (select 1 from karts k where k.id = kart_id and has_perm(k.team_id, 'team.manage')))
  with check (exists (select 1 from karts k where k.id = kart_id and has_perm(k.team_id, 'team.manage')));

-- ───────────────────────────── Storage ─────────────────────────────
-- Verejný bucket pre avatary a ikony tímov (cesty: avatars/<uid>/…, teams/<team_id>/…).

insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do nothing;

create policy media_avatar_write on storage.objects for all to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = 'avatars' and (storage.foldername(name))[2] = auth.uid()::text)
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = 'avatars' and (storage.foldername(name))[2] = auth.uid()::text);

create policy media_team_write on storage.objects for all to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = 'teams' and has_perm(((storage.foldername(name))[2])::uuid, 'team.manage'))
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = 'teams' and has_perm(((storage.foldername(name))[2])::uuid, 'team.manage'));

grant execute on function public.create_team(text, text) to authenticated;
grant execute on function public.accept_invitations() to authenticated;
