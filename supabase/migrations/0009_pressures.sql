-- Tillotson Index – Inžinier: výpočet tlakov, merania z jázd, príkazy na natlakovanie.
--
-- Merania (tlak za studena / za tepla, teploty) sú v samostatnej tabuľke chránenej
-- oprávnením setup.view – jazdec bez neho ich nevidí ani cez jazdy.

-- ───────────────────────────── Oprávnenie a rola Inžinier ─────────────────────────────

insert into public.permissions (code, sort_order) values ('pressure.engineer', 32)
on conflict (code) do nothing;

alter table public.roles drop constraint roles_preset_check;
alter table public.roles add constraint roles_preset_check
  check (preset in ('manager', 'chief_mechanic', 'mechanic', 'driver', 'engineer'));

-- Oprávnenia predvolenej roly Inžinier.
create function public.engineer_permissions() returns text[]
language sql immutable as $$
  select array['kart.all', 'setup.view', 'event.view', 'session.edit', 'session.feedback',
               'track.view', 'pressure.engineer'];
$$;

-- Existujúce tímy: rola Inžinier + nové oprávnenie pre manažérov.
do $$
declare
  t record;
  r uuid;
begin
  for t in select id from public.teams loop
    r := null;
    insert into public.roles (team_id, name, preset, sort_order)
    values (t.id, 'Inžinier', 'engineer', 25)
    on conflict (team_id, name) do nothing
    returning id into r;
    if r is not null then
      insert into public.role_permissions (role_id, permission)
      select r, unnest(public.engineer_permissions());
    end if;
  end loop;

  insert into public.role_permissions (role_id, permission)
  select id, 'pressure.engineer' from public.roles where preset = 'manager'
  on conflict do nothing;
end;
$$;

-- Nové tímy dostanú rolu Inžinier rovno pri založení.
create or replace function public.create_team(p_name text, p_color text default '#1d56e9') returns uuid
language plpgsql security definer set search_path = public as $$
declare
  tid uuid;
  r_manager uuid;
  r_chief uuid;
  r_engineer uuid;
  r_mech uuid;
  r_driver uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into teams (name, color, created_by) values (p_name, p_color, auth.uid()) returning id into tid;

  insert into roles (team_id, name, preset, sort_order) values (tid, 'Manažér', 'manager', 10) returning id into r_manager;
  insert into roles (team_id, name, preset, sort_order) values (tid, 'Šéfmechanik', 'chief_mechanic', 20) returning id into r_chief;
  insert into roles (team_id, name, preset, sort_order) values (tid, 'Inžinier', 'engineer', 25) returning id into r_engineer;
  insert into roles (team_id, name, preset, sort_order) values (tid, 'Mechanik', 'mechanic', 30) returning id into r_mech;
  insert into roles (team_id, name, preset, sort_order) values (tid, 'Jazdec', 'driver', 40) returning id into r_driver;

  insert into role_permissions (role_id, permission)
  select r_manager, code from permissions;

  insert into role_permissions (role_id, permission)
  select r_chief, code from permissions where code not in ('team.manage', 'pressure.engineer');

  insert into role_permissions (role_id, permission)
  select r_engineer, unnest(engineer_permissions());

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

-- ───────────────────────────── Merania z jázd ─────────────────────────────
-- tires: { "fl": { "cold": 0.62, "hot": 0.80, "temp": 52 }, "fr": …, "rl": …, "rr": … }
-- Tlaky v bar, teploty v °C (kanonické jednotky).

create table public.session_pressures (
  session_id  uuid primary key references public.sessions on delete cascade,
  kart_id     uuid not null references public.karts on delete cascade,
  team_id     uuid not null references public.teams on delete cascade,
  air_temp    numeric(4, 1),
  track_temp  numeric(4, 1),
  tires       jsonb not null default '{}'::jsonb,
  updated_by  uuid references public.profiles on delete set null default auth.uid(),
  updated_at  timestamptz not null default now()
);
create index on public.session_pressures (kart_id);

create trigger session_pressures_team before insert on public.session_pressures
  for each row execute function public.set_team_from_kart();

alter table public.session_pressures enable row level security;

create policy session_pressures_select on public.session_pressures for select
  using (has_perm(team_id, 'setup.view') and can_access_kart(kart_id));
create policy session_pressures_write on public.session_pressures for all
  using (has_perm(team_id, 'setup.view') and has_perm(team_id, 'session.edit') and can_access_kart(kart_id))
  with check (has_perm(team_id, 'setup.view') and has_perm(team_id, 'session.edit') and can_access_kart(kart_id));

-- ───────────────────────────── Príkazy na natlakovanie ─────────────────────────────
-- Inžinier pošle tlaky motokáre, mechanik natlakuje a potvrdí → zapíše sa do setupu.

create table public.pressure_orders (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.teams on delete cascade,
  kart_id      uuid not null references public.karts on delete cascade,
  event_id     uuid references public.events on delete set null,
  values       jsonb not null,                -- { tire_fl, tire_fr, tire_rl, tire_rr } v bar
  target_hot   numeric(4, 2),
  air_temp     numeric(4, 1),
  track_temp   numeric(4, 1),
  note         text not null default '' check (length(note) <= 500),
  status       text not null default 'pending' check (status in ('pending', 'done', 'replaced', 'cancelled')),
  created_by   uuid references public.profiles on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  done_by      uuid references public.profiles on delete set null,
  done_at      timestamptz,
  revision_id  uuid references public.setup_revisions on delete set null
);
create index on public.pressure_orders (kart_id, created_at desc);

create trigger pressure_orders_team before insert on public.pressure_orders
  for each row execute function public.set_team_from_kart();

-- Nový príkaz nahradí starší nevybavený príkaz tej istej motokáry.
create function public.trg_pressure_order_replace() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update pressure_orders set status = 'replaced'
   where kart_id = new.kart_id and status = 'pending' and id <> new.id;
  return null;
end;
$$;

create trigger pressure_orders_replace after insert on public.pressure_orders
  for each row execute function public.trg_pressure_order_replace();

alter table public.pressure_orders enable row level security;

create policy pressure_orders_select on public.pressure_orders for select
  using (has_perm(team_id, 'setup.view') and can_access_kart(kart_id));
create policy pressure_orders_insert on public.pressure_orders for insert
  with check (has_perm(team_id, 'pressure.engineer') and can_access_kart(kart_id) and created_by = auth.uid());
create policy pressure_orders_update on public.pressure_orders for update
  using (has_perm(team_id, 'pressure.engineer')) with check (has_perm(team_id, 'pressure.engineer'));

-- Mechanik potvrdí natlakovanie (revízia setupu je už uložená).
create function public.complete_pressure_order(p_order uuid, p_revision uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_team uuid;
  v_kart uuid;
begin
  select team_id, kart_id into v_team, v_kart from pressure_orders where id = p_order;
  if v_team is null or not has_perm(v_team, 'setup.edit') or not can_access_kart(v_kart) then
    raise exception 'forbidden';
  end if;
  update pressure_orders
     set status = 'done', done_by = auth.uid(), done_at = now(), revision_id = p_revision
   where id = p_order and status = 'pending';
end;
$$;

grant execute on function public.complete_pressure_order(uuid, uuid) to authenticated;
