-- Tillotson Index – fáza 4: poznámky jazdca a servisná knižka motokáry.
-- Id generuje aplikácia, aby sa záznam urobený offline uložil iba raz.

create table public.kart_notes (
  id           uuid primary key,
  kart_id      uuid not null references public.karts on delete cascade,
  team_id      uuid not null references public.teams on delete cascade,
  text         text not null check (length(trim(text)) between 1 and 2000),
  author_id    uuid references public.profiles on delete set null default auth.uid(),
  recorded_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index on public.kart_notes (kart_id, recorded_at desc);

create table public.service_log (
  id           uuid primary key,
  kart_id      uuid not null references public.karts on delete cascade,
  team_id      uuid not null references public.teams on delete cascade,
  kind         text not null check (kind in ('oil', 'chain', 'spark_plug', 'air_filter', 'clutch', 'other')),
  performed_on date not null default current_date,
  note         text not null default '' check (length(note) <= 500),
  author_id    uuid references public.profiles on delete set null default auth.uid(),
  created_at   timestamptz not null default now()
);
create index on public.service_log (kart_id, performed_on desc);

create trigger kart_notes_team before insert on public.kart_notes
  for each row execute function public.set_team_from_kart();
create trigger service_log_team before insert on public.service_log
  for each row execute function public.set_team_from_kart();

alter table public.kart_notes  enable row level security;
alter table public.service_log enable row level security;

-- Vidí každý člen tímu, ktorý má k motokáre prístup.
create policy kart_notes_select on public.kart_notes for select
  using (is_member(team_id) and can_access_kart(kart_id));
create policy kart_notes_insert on public.kart_notes for insert
  with check (
    has_perm((select team_id from karts where id = kart_id), 'notes.edit')
    and can_access_kart(kart_id)
    and author_id = auth.uid()
  );
-- Zmazať môže autor alebo manažér.
create policy kart_notes_delete on public.kart_notes for delete
  using (author_id = auth.uid() or has_perm(team_id, 'team.manage'));

create policy service_log_select on public.service_log for select
  using (is_member(team_id) and can_access_kart(kart_id));
create policy service_log_insert on public.service_log for insert
  with check (
    has_perm((select team_id from karts where id = kart_id), 'service.edit')
    and can_access_kart(kart_id)
    and author_id = auth.uid()
  );
create policy service_log_delete on public.service_log for delete
  using (author_id = auth.uid() or has_perm(team_id, 'team.manage'));
