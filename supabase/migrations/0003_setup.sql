-- Tillotson Index – fáza 3: setup motokáry, história zmien, varianty, vlastné položky.
--
-- Hodnoty setupu sú jsonb { kľúč: hodnota } v kanonických jednotkách (bar, mm, °).
-- Kľúče štandardných položiek definuje aplikácia (src/data/setup-fields.ts),
-- vlastné položky tímu majú ako kľúč svoje id.

-- Vlastné položky setupu, ktoré si tím doplní k štandardným.
create table public.setup_fields (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams on delete cascade,
  group_key   text not null check (group_key in ('tires', 'gearing', 'carb', 'geometry', 'dimensions', 'other')),
  label       text not null check (length(trim(label)) between 1 and 40),
  unit        text not null default 'none',
  sort_order  int not null default 100,
  created_at  timestamptz not null default now()
);
create index on public.setup_fields (team_id);

-- Každé uloženie setupu = nová revízia (celý stav). Revízie sa nemenia ani nemažú.
-- Aktuálny setup motokáry = najnovšia revízia.
create table public.setup_revisions (
  id           uuid primary key,                       -- generuje aplikácia (offline uloženie bez duplicít)
  kart_id      uuid not null references public.karts on delete cascade,
  team_id      uuid not null references public.teams on delete cascade,
  values       jsonb not null default '{}'::jsonb,
  note         text not null default '' check (length(note) <= 500),
  author_id    uuid references public.profiles on delete set null default auth.uid(),
  recorded_at  timestamptz not null default now(),    -- kedy zmenu urobil mechanik (aj offline)
  created_at   timestamptz not null default now()     -- kedy dorazila na server
);
create index on public.setup_revisions (kart_id, recorded_at desc);

-- Pomenované varianty (mokrý, kvalifikácia…) – nemenia aktuálny setup, kým sa nepoužijú.
create table public.setup_variants (
  id          uuid primary key default gen_random_uuid(),
  kart_id     uuid not null references public.karts on delete cascade,
  team_id     uuid not null references public.teams on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 40),
  values      jsonb not null default '{}'::jsonb,
  updated_by  uuid references public.profiles on delete set null default auth.uid(),
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index on public.setup_variants (kart_id);

-- team_id sa dopĺňa z motokáry, aby ho klient nemohol podvrhnúť.
create function public.set_team_from_kart() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select team_id into new.team_id from karts where id = new.kart_id;
  return new;
end;
$$;

create trigger setup_revisions_team before insert on public.setup_revisions
  for each row execute function public.set_team_from_kart();
create trigger setup_variants_team before insert or update on public.setup_variants
  for each row execute function public.set_team_from_kart();

create function public.touch_variant() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

create trigger setup_variants_touch before update on public.setup_variants
  for each row execute function public.touch_variant();

-- ───────────────────────────── RLS ─────────────────────────────

alter table public.setup_fields    enable row level security;
alter table public.setup_revisions enable row level security;
alter table public.setup_variants  enable row level security;

create policy setup_fields_select on public.setup_fields for select using (is_member(team_id));
create policy setup_fields_write on public.setup_fields for all
  using (has_perm(team_id, 'team.manage')) with check (has_perm(team_id, 'team.manage'));

-- Setup vidí a mení iba ten, kto má oprávnenie a k motokáre prístup.
create policy setup_revisions_select on public.setup_revisions for select
  using (has_perm(team_id, 'setup.view') and can_access_kart(kart_id));
create policy setup_revisions_insert on public.setup_revisions for insert
  with check (
    has_perm((select team_id from karts where id = kart_id), 'setup.edit')
    and can_access_kart(kart_id)
    and author_id = auth.uid()
  );
-- Žiadne update/delete politiky → história sa nedá prepísať.

create policy setup_variants_select on public.setup_variants for select
  using (has_perm(team_id, 'setup.view') and can_access_kart(kart_id));
create policy setup_variants_write on public.setup_variants for all
  using (has_perm(team_id, 'setup.edit') and can_access_kart(kart_id))
  with check (has_perm((select team_id from karts where id = kart_id), 'setup.edit') and can_access_kart(kart_id));
