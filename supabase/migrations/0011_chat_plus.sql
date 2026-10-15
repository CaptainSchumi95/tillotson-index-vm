-- Tillotson Index – správy: odpovede, reakcie, úpravy a push notifikácie.

-- ───────────────────────────── Odpovede a úpravy ─────────────────────────────

alter table public.messages add column reply_to uuid references public.messages on delete set null;
alter table public.messages add column edited_at timestamptz;

-- Úprava vlastnej správy (iba text).
create function public.edit_message(p_message uuid, p_body text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if length(trim(coalesce(p_body, ''))) not between 1 and 4000 then
    raise exception 'invalid';
  end if;
  update messages set body = p_body, edited_at = now()
   where id = p_message and author_id = auth.uid();
  if not found then
    raise exception 'forbidden';
  end if;
end;
$$;

grant execute on function public.edit_message(uuid, text) to authenticated;

-- ───────────────────────────── Reakcie ─────────────────────────────

create table public.message_reactions (
  message_id  uuid not null references public.messages on delete cascade,
  profile_id  uuid not null references public.profiles on delete cascade default auth.uid(),
  emoji       text not null check (length(emoji) between 1 and 16),
  channel_id  uuid not null references public.channels on delete cascade,
  team_id     uuid not null references public.teams on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (message_id, profile_id, emoji)
);
create index on public.message_reactions (channel_id);

-- Kanál a tím sa doplnia zo správy (klient ich nemôže podvrhnúť).
create function public.set_reaction_context() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select channel_id, team_id into new.channel_id, new.team_id from messages where id = new.message_id;
  return new;
end;
$$;

create trigger message_reactions_context before insert on public.message_reactions
  for each row execute function public.set_reaction_context();

alter table public.message_reactions enable row level security;

create policy message_reactions_select on public.message_reactions for select using (can_read_channel(channel_id));
create policy message_reactions_insert on public.message_reactions for insert
  with check (profile_id = auth.uid() and can_read_channel(channel_id));
create policy message_reactions_delete on public.message_reactions for delete using (profile_id = auth.uid());

-- Naživo aj úpravy, mazania a reakcie (pre filter podľa tímu pri mazaní treba celý riadok).
alter table public.messages replica identity full;
alter table public.message_reactions replica identity full;
alter publication supabase_realtime add table public.message_reactions;

-- ───────────────────────────── Push notifikácie ─────────────────────────────

create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles on delete cascade default auth.uid(),
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text not null default '',
  created_at  timestamptz not null default now()
);
create index on public.push_subscriptions (profile_id);

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_own on public.push_subscriptions for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Súkromné nastavenia servera (bez RLS politík = z aplikácie nedostupné).
create table public.app_config (
  key    text primary key,
  value  text not null
);
alter table public.app_config enable row level security;

insert into public.app_config (key, value) values
  ('push_url', 'https://wvlsmyxjqyhdikuvylzn.supabase.co/functions/v1/push'),
  ('push_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;

create extension if not exists pg_net;

-- Po novej správe zavolá funkciu „push“, ktorá rozpošle upozornenia.
-- Chyba pri volaní nikdy nezablokuje odoslanie správy.
create function public.notify_push() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_url text;
  v_secret text;
begin
  select value into v_url from app_config where key = 'push_url';
  select value into v_secret from app_config where key = 'push_secret';
  if v_url is null then
    return null;
  end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('message_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    timeout_milliseconds := 5000
  );
  return null;
exception when others then
  return null;
end;
$$;

create trigger messages_notify_push after insert on public.messages
  for each row execute function public.notify_push();
