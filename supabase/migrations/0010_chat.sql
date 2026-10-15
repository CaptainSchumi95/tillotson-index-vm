-- Tillotson Index – správy: nástenka, tímová skupina, priame správy.
--
-- Všetko patrí konkrétnemu tímu (team_id). Priama konverzácia tých istých dvoch ľudí
-- v inom tíme je iná konverzácia – tímy sa nemiešajú.

create table public.channels (
  id             uuid primary key default gen_random_uuid(),
  team_id        uuid not null references public.teams on delete cascade,
  kind           text not null check (kind in ('announcements', 'team', 'direct')),
  -- Nástenka: kto smie písať (roly a konkrétni ľudia). Ostatní iba čítajú.
  post_roles     uuid[] not null default '{}',
  post_profiles  uuid[] not null default '{}',
  -- Priama konverzácia: dvojica ľudí (zoradené id, aby existovala iba raz).
  member_a       uuid references public.profiles on delete cascade,
  member_b       uuid references public.profiles on delete cascade,
  created_at     timestamptz not null default now(),
  check ((kind = 'direct') = (member_a is not null and member_b is not null))
);
create unique index channels_team_kind on public.channels (team_id, kind) where kind <> 'direct';
create unique index channels_direct_pair on public.channels (team_id, member_a, member_b) where kind = 'direct';

create table public.messages (
  id          uuid primary key,                   -- generuje aplikácia (offline odoslanie bez duplicít)
  channel_id  uuid not null references public.channels on delete cascade,
  team_id     uuid not null references public.teams on delete cascade,
  author_id   uuid references public.profiles on delete set null default auth.uid(),
  body        text not null check (length(trim(body)) between 1 and 4000),
  created_at  timestamptz not null default now()
);
create index on public.messages (channel_id, created_at desc);
create index on public.messages (team_id, created_at desc);

-- Kedy kto naposledy čítal kanál (neprečítané správy).
create table public.channel_reads (
  channel_id    uuid not null references public.channels on delete cascade,
  profile_id    uuid not null references public.profiles on delete cascade,
  last_read_at  timestamptz not null default now(),
  primary key (channel_id, profile_id)
);

-- ───────────────────────────── Prístup ─────────────────────────────

create function public.can_read_channel(p_channel uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from channels c
    where c.id = p_channel
      and is_member(c.team_id)
      and (c.kind <> 'direct' or auth.uid() in (c.member_a, c.member_b))
  );
$$;

create function public.can_post_channel(p_channel uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from channels c
    where c.id = p_channel
      and can_read_channel(c.id)
      and (
        c.kind <> 'announcements'
        or auth.uid() = any (c.post_profiles)
        or exists (
          select 1 from memberships m
          where m.team_id = c.team_id and m.profile_id = auth.uid() and m.role_id = any (c.post_roles)
        )
      )
  );
$$;

alter table public.channels      enable row level security;
alter table public.messages      enable row level security;
alter table public.channel_reads enable row level security;

create policy channels_select on public.channels for select using (can_read_channel(id));
-- Nastavenie nástenky (kto píše) mení iba správca tímu.
create policy channels_update on public.channels for update
  using (kind = 'announcements' and has_perm(team_id, 'team.manage'))
  with check (kind = 'announcements' and has_perm(team_id, 'team.manage'));

create policy messages_select on public.messages for select using (can_read_channel(channel_id));
create policy messages_insert on public.messages for insert
  with check (
    author_id = auth.uid()
    and can_post_channel(channel_id)
    and team_id = (select c.team_id from channels c where c.id = channel_id)
  );
create policy messages_delete on public.messages for delete
  using (author_id = auth.uid() or has_perm(team_id, 'team.manage'));

create policy channel_reads_own on public.channel_reads for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid() and can_read_channel(channel_id));

-- ───────────────────────────── Kanály tímu ─────────────────────────────

-- Nástenka (píšu manažér a šéfmechanik) + tímová skupina.
create function public.seed_channels(p_team uuid) returns void
language sql security definer set search_path = public as $$
  insert into channels (team_id, kind, post_roles)
  values (
    p_team, 'announcements',
    coalesce(array(select id from roles where team_id = p_team and preset in ('manager', 'chief_mechanic')), '{}')
  )
  on conflict do nothing;
  insert into channels (team_id, kind) values (p_team, 'team') on conflict do nothing;
$$;

-- Pri novom tíme sa kanály vytvoria až po rolách (create_team), preto deferred.
create function public.trg_team_seed_channels() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform seed_channels(new.id);
  return null;
end;
$$;

create constraint trigger teams_seed_channels after insert on public.teams
  deferrable initially deferred
  for each row execute function public.trg_team_seed_channels();

select public.seed_channels(id) from public.teams;

-- Priama konverzácia s členom tímu (vytvorí sa iba raz pre dvojicu v tíme).
create function public.open_direct(p_team uuid, p_other uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  a uuid := least(auth.uid(), p_other);
  b uuid := greatest(auth.uid(), p_other);
  v_id uuid;
begin
  if p_other = auth.uid() or not is_member(p_team)
     or not exists (select 1 from memberships where team_id = p_team and profile_id = p_other) then
    raise exception 'forbidden';
  end if;
  select id into v_id from channels where team_id = p_team and kind = 'direct' and member_a = a and member_b = b;
  if v_id is null then
    insert into channels (team_id, kind, member_a, member_b) values (p_team, 'direct', a, b) returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- Prehľad konverzácií: posledná správa a počet neprečítaných (RLS platí – security invoker).
create function public.chat_overview(p_team uuid)
returns table (
  channel_id uuid, kind text, other_id uuid, post_roles uuid[], post_profiles uuid[], can_post boolean,
  last_body text, last_at timestamptz, last_author uuid, unread int
)
language sql stable set search_path = public as $$
  select
    c.id, c.kind,
    case when c.kind = 'direct' then (case when c.member_a = auth.uid() then c.member_b else c.member_a end) end,
    c.post_roles, c.post_profiles, can_post_channel(c.id),
    lm.body, lm.created_at, lm.author_id,
    (select count(*)::int from messages m
      where m.channel_id = c.id and m.author_id is distinct from auth.uid()
        and m.created_at > coalesce(r.last_read_at, '-infinity'))
  from channels c
  left join channel_reads r on r.channel_id = c.id and r.profile_id = auth.uid()
  left join lateral (
    select m.body, m.created_at, m.author_id from messages m
    where m.channel_id = c.id order by m.created_at desc limit 1
  ) lm on true
  where c.team_id = p_team;
$$;

grant execute on function public.open_direct(uuid, uuid) to authenticated;
grant execute on function public.chat_overview(uuid) to authenticated;

-- Okamžité doručenie správ (Supabase Realtime rešpektuje RLS).
alter publication supabase_realtime add table public.messages;
