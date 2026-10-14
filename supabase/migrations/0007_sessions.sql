-- Tillotson Index – fáza 5b: jazdy (výsledok, podmienky, spätná väzba, plán).
--
-- Setup jazdy sa neukladá ako kópia, ale ako odkaz na revíziu setupu.
-- Jazdec bez oprávnenia setup.view sa tak k setupu nedostane ani cez jazdy.

create table public.sessions (
  id                 uuid primary key,                -- generuje aplikácia (offline uloženie)
  event_id           uuid not null references public.events on delete cascade,
  kart_id            uuid not null references public.karts on delete cascade,
  team_id            uuid not null references public.teams on delete cascade,
  label              text not null default '' check (length(label) <= 80),
  best_lap_ms        int check (best_lap_ms is null or best_lap_ms between 1000 and 3600000),
  laps               int check (laps is null or laps between 0 and 500),
  track_condition    text check (track_condition in ('dry', 'damp', 'wet')),
  conditions_note    text not null default '' check (length(conditions_note) <= 500),
  balance            text check (balance in ('understeer', 'neutral', 'oversteer')),
  behaviour          text not null default '' check (length(behaviour) <= 2000),
  driver_feedback    text not null default '' check (length(driver_feedback) <= 2000),
  next_plan          text not null default '' check (length(next_plan) <= 2000),
  setup_revision_id  uuid references public.setup_revisions on delete set null,
  author_id          uuid references public.profiles on delete set null default auth.uid(),
  recorded_at        timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index on public.sessions (kart_id, recorded_at desc);
create index on public.sessions (event_id);

create trigger sessions_team before insert on public.sessions
  for each row execute function public.set_team_from_kart();
create trigger sessions_touch before update on public.sessions
  for each row execute function public.touch_updated_at();

alter table public.sessions enable row level security;

create policy sessions_select on public.sessions for select
  using (can_view_event(event_id) and can_access_kart(kart_id));
create policy sessions_insert on public.sessions for insert
  with check (
    has_perm((select team_id from karts where id = kart_id), 'session.edit')
    and can_access_kart(kart_id)
    and author_id = auth.uid()
  );
create policy sessions_update on public.sessions for update
  using (has_perm(team_id, 'session.edit') and can_access_kart(kart_id))
  with check (has_perm(team_id, 'session.edit') and can_access_kart(kart_id));
create policy sessions_delete on public.sessions for delete
  using (has_perm(team_id, 'session.edit') and can_access_kart(kart_id));

-- Jazdec (session.feedback bez session.edit) smie meniť iba svoju spätnú väzbu.
create function public.set_session_feedback(p_session uuid, p_text text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_team uuid;
  v_kart uuid;
begin
  select team_id, kart_id into v_team, v_kart from sessions where id = p_session;
  if v_team is null or not (has_perm(v_team, 'session.feedback') or has_perm(v_team, 'session.edit'))
     or not can_access_kart(v_kart) then
    raise exception 'forbidden';
  end if;
  update sessions set driver_feedback = left(coalesce(p_text, ''), 2000) where id = p_session;
end;
$$;

grant execute on function public.set_session_feedback(uuid, text) to authenticated;
