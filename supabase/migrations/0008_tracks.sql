-- Tillotson Index – fáza 6: knižnica tratí a setupy k tratiam.
--
-- Trate: spoločné (team_id = null, pripravuje aplikácia) + vlastné trate tímov.
-- Setup k trati je vždy tímový – odporúčanie / uložená skúsenosť tímu, nie stav motokáry.

create table public.tracks (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid references public.teams on delete cascade,     -- null = spoločná trať
  name        text not null check (length(trim(name)) between 1 and 80),
  location    text not null default '' check (length(location) <= 80),
  length_m    int check (length_m is null or length_m between 100 and 10000),
  created_by  uuid references public.profiles on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);
create index on public.tracks (team_id);

create table public.track_setups (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams on delete cascade,
  track_id    uuid not null references public.tracks on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 60),
  values      jsonb not null default '{}'::jsonb,
  notes       text not null default '' check (length(notes) <= 2000),
  updated_by  uuid references public.profiles on delete set null default auth.uid(),
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index on public.track_setups (team_id, track_id);

create function public.touch_track_setup() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

create trigger track_setups_touch before update on public.track_setups
  for each row execute function public.touch_track_setup();

-- Udalosť môže odkazovať na trať z knižnice (track_name ostáva ako text).
alter table public.events add column track_id uuid references public.tracks on delete set null;

-- ───────────────────────────── RLS ─────────────────────────────

alter table public.tracks       enable row level security;
alter table public.track_setups enable row level security;

create policy tracks_select on public.tracks for select
  to authenticated using (team_id is null or is_member(team_id));
create policy tracks_write on public.tracks for all
  using (team_id is not null and has_perm(team_id, 'track.manage'))
  with check (team_id is not null and has_perm(team_id, 'track.manage'));

create policy track_setups_select on public.track_setups for select
  using (has_perm(team_id, 'track.view'));
create policy track_setups_write on public.track_setups for all
  using (has_perm(team_id, 'track.manage'))
  with check (
    has_perm(team_id, 'track.manage')
    and exists (select 1 from tracks t where t.id = track_id and (t.team_id is null or t.team_id = track_setups.team_id))
  );

-- ───────────────────────────── Spoločné trate ─────────────────────────────

insert into public.tracks (team_id, name, location, created_by) values
  (null, 'Slovakia Ring', 'Orechová Potôň, SK', null),
  (null, 'Kakucs Ring', 'Kakucs, HU', null),
  (null, 'Autodrom Vysoké Mýto', 'Vysoké Mýto, CZ', null);

-- ───────────────────────────── save_event s traťou z knižnice ─────────────────────────────

drop function public.save_event(uuid, uuid, text, text, date, date, text, text, uuid[]);

create function public.save_event(
  p_id uuid, p_team uuid, p_kind text, p_name text, p_from date, p_to date,
  p_track text, p_notes text, p_karts uuid[], p_track_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := p_id;
  v_track uuid := p_track_id;
begin
  if not has_perm(p_team, 'event.manage') then
    raise exception 'forbidden';
  end if;

  -- Iba spoločná trať alebo trať vlastného tímu.
  if v_track is not null and not exists (
    select 1 from tracks t where t.id = v_track and (t.team_id is null or t.team_id = p_team)
  ) then
    v_track := null;
  end if;

  if v_id is null then
    insert into events (team_id, kind, name, date_from, date_to, track_name, track_id, notes, created_by)
    values (p_team, p_kind, trim(p_name), p_from, p_to, trim(p_track), v_track, p_notes, auth.uid())
    returning id into v_id;
  else
    update events
       set kind = p_kind, name = trim(p_name), date_from = p_from, date_to = p_to,
           track_name = trim(p_track), track_id = v_track, notes = p_notes
     where id = v_id and team_id = p_team;
    if not found then
      raise exception 'forbidden';
    end if;
    delete from event_karts ek
     where ek.event_id = v_id and not (ek.kart_id = any (p_karts)) and can_access_kart(ek.kart_id);
  end if;

  insert into event_karts (event_id, kart_id)
  select v_id, k.id from karts k
   where k.id = any (p_karts) and k.team_id = p_team and can_access_kart(k.id)
  on conflict do nothing;

  return v_id;
end;
$$;

grant execute on function public.save_event(uuid, uuid, text, text, date, date, text, text, uuid[], uuid) to authenticated;
