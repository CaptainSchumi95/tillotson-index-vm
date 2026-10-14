-- Tillotson Index – fáza 5a: udalosti (preteky / tréning), harmonogram, checklisty.

-- ───────────────────────────── Udalosti ─────────────────────────────

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams on delete cascade,
  kind        text not null check (kind in ('race', 'test')),
  name        text not null check (length(trim(name)) between 1 and 80),
  date_from   date not null,
  date_to     date not null,
  track_name  text not null default '' check (length(track_name) <= 80),
  notes       text not null default '' check (length(notes) <= 4000),
  created_by  uuid references public.profiles on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (date_to >= date_from)
);
create index on public.events (team_id, date_from desc);

create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();

-- Ktorých motokár sa udalosť týka. round = poradie jazdy (checklist Pred/Po jazde).
create table public.event_karts (
  event_id  uuid not null references public.events on delete cascade,
  kart_id   uuid not null references public.karts on delete cascade,
  round     int not null default 1 check (round >= 1),
  primary key (event_id, kart_id)
);

create table public.schedule_items (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events on delete cascade,
  day         date not null,
  time        time,
  title       text not null check (length(trim(title)) between 1 and 80),
  created_at  timestamptz not null default now()
);
create index on public.schedule_items (event_id, day, time);

-- ───────────────────────────── Checklist ─────────────────────────────

-- Šablóna checklistu tímu.
create table public.checklist_items (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams on delete cascade,
  phase       text not null check (phase in ('prep', 'pre_run', 'post_run')),
  text        text not null check (length(trim(text)) between 1 and 120),
  sort_order  int not null default 100,
  created_at  timestamptz not null default now()
);
create index on public.checklist_items (team_id, phase, sort_order);

-- Odškrtnutia. Príprava má round = 0, Pred/Po jazde aktuálne poradie jazdy.
create table public.checklist_checks (
  event_id  uuid not null references public.events on delete cascade,
  kart_id   uuid not null references public.karts on delete cascade,
  item_id   uuid not null references public.checklist_items on delete cascade,
  round     int not null default 0,
  done_by   uuid references public.profiles on delete set null default auth.uid(),
  done_at   timestamptz not null default now(),
  primary key (event_id, kart_id, item_id, round)
);

-- Predvolený checklist pre nový tím (a doplnenie pre existujúce tímy nižšie).
create function public.seed_checklist(p_team uuid) returns void
language sql security definer set search_path = public as $$
  insert into checklist_items (team_id, phase, text, sort_order) values
    (p_team, 'prep', 'Benzín a olej (zmes) pripravené', 10),
    (p_team, 'prep', 'Reťaz skontrolovaná a namazaná', 20),
    (p_team, 'prep', 'Skrutky kolies a náprav dotiahnuté', 30),
    (p_team, 'prep', 'Brzdy skontrolované', 40),
    (p_team, 'prep', 'Náhradné pneumatiky a ráfiky', 50),
    (p_team, 'prep', 'Transpondér nabitý', 60),
    (p_team, 'prep', 'Výstroj jazdca (prilba, kombinéza, rukavice)', 70),
    (p_team, 'pre_run', 'Tlaky v pneumatikách', 10),
    (p_team, 'pre_run', 'Palivo v nádrži', 20),
    (p_team, 'pre_run', 'Napnutie reťaze', 30),
    (p_team, 'pre_run', 'Transpondér na mieste', 40),
    (p_team, 'pre_run', 'Jazdec pripravený', 50),
    (p_team, 'post_run', 'Tlaky za tepla', 10),
    (p_team, 'post_run', 'Spätná väzba od jazdca', 20),
    (p_team, 'post_run', 'Kontrola reťaze a bŕzd', 30),
    (p_team, 'post_run', 'Kontrola poškodení', 40);
$$;

create function public.trg_team_seed_checklist() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform seed_checklist(new.id);
  return new;
end;
$$;

create trigger teams_seed_checklist after insert on public.teams
  for each row execute function public.trg_team_seed_checklist();

select public.seed_checklist(id) from public.teams;

-- ───────────────────────────── Prístup ─────────────────────────────

-- Udalosť vidí člen s oprávnením event.view, ak sa týka niektorej z jeho
-- motokár (alebo vidí všetky motokáry, alebo udalosť nemá žiadne motokáry).
create function public.can_view_event(p_event uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from events e
    where e.id = p_event
      and has_perm(e.team_id, 'event.view')
      and (
        has_perm(e.team_id, 'kart.all')
        or not exists (select 1 from event_karts ek where ek.event_id = e.id)
        or exists (select 1 from event_karts ek where ek.event_id = e.id and can_access_kart(ek.kart_id))
      )
  );
$$;

alter table public.events           enable row level security;
alter table public.event_karts      enable row level security;
alter table public.schedule_items   enable row level security;
alter table public.checklist_items  enable row level security;
alter table public.checklist_checks enable row level security;

create policy events_select on public.events for select using (can_view_event(id));
create policy events_insert on public.events for insert
  with check (has_perm(team_id, 'event.manage') and created_by = auth.uid());
create policy events_update on public.events for update
  using (has_perm(team_id, 'event.manage')) with check (has_perm(team_id, 'event.manage'));
create policy events_delete on public.events for delete using (has_perm(team_id, 'event.manage'));

create policy event_karts_select on public.event_karts for select using (can_view_event(event_id));
-- Pridať do udalosti môže iba motokáru, ku ktorej má prístup.
create policy event_karts_insert on public.event_karts for insert
  with check (
    exists (select 1 from events e where e.id = event_id and has_perm(e.team_id, 'event.manage'))
    and can_access_kart(kart_id)
  );
create policy event_karts_delete on public.event_karts for delete
  using (exists (select 1 from events e where e.id = event_id and has_perm(e.team_id, 'event.manage')) and can_access_kart(kart_id));
-- Posun na ďalšiu jazdu robí ten, kto odškrtáva checklist.
create policy event_karts_update on public.event_karts for update
  using (exists (select 1 from events e where e.id = event_id and has_perm(e.team_id, 'checklist.edit')) and can_access_kart(kart_id))
  with check (exists (select 1 from events e where e.id = event_id and has_perm(e.team_id, 'checklist.edit')) and can_access_kart(kart_id));

create policy schedule_items_select on public.schedule_items for select using (can_view_event(event_id));
create policy schedule_items_write on public.schedule_items for all
  using (exists (select 1 from events e where e.id = event_id and has_perm(e.team_id, 'event.manage')))
  with check (exists (select 1 from events e where e.id = event_id and has_perm(e.team_id, 'event.manage')));

create policy checklist_items_select on public.checklist_items for select using (is_member(team_id));
create policy checklist_items_write on public.checklist_items for all
  using (has_perm(team_id, 'team.manage')) with check (has_perm(team_id, 'team.manage'));

create policy checklist_checks_select on public.checklist_checks for select
  using (can_view_event(event_id) and can_access_kart(kart_id));
create policy checklist_checks_insert on public.checklist_checks for insert
  with check (
    exists (select 1 from events e where e.id = event_id and has_perm(e.team_id, 'checklist.edit'))
    and can_access_kart(kart_id)
    and done_by = auth.uid()
  );
create policy checklist_checks_delete on public.checklist_checks for delete
  using (exists (select 1 from events e where e.id = event_id and has_perm(e.team_id, 'checklist.edit')) and can_access_kart(kart_id));

-- ───────────────────────────── Uloženie udalosti naraz s motokárami ─────────────────────────────
-- Motokáry, ku ktorým človek nemá prístup, sa ignorujú; cudzie motokáry v udalosti ostanú.

create function public.save_event(
  p_id uuid, p_team uuid, p_kind text, p_name text, p_from date, p_to date,
  p_track text, p_notes text, p_karts uuid[]
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := p_id;
begin
  if not has_perm(p_team, 'event.manage') then
    raise exception 'forbidden';
  end if;

  if v_id is null then
    insert into events (team_id, kind, name, date_from, date_to, track_name, notes, created_by)
    values (p_team, p_kind, trim(p_name), p_from, p_to, trim(p_track), p_notes, auth.uid())
    returning id into v_id;
  else
    update events
       set kind = p_kind, name = trim(p_name), date_from = p_from, date_to = p_to,
           track_name = trim(p_track), notes = p_notes
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

grant execute on function public.save_event(uuid, uuid, text, text, date, date, text, text, uuid[]) to authenticated;
