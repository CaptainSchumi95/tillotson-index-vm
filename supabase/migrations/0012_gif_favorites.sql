-- Obľúbené GIFy – patria účtu (nie tímu), takže sú rovnaké vo všetkých tímoch a zariadeniach.

create table public.gif_favorites (
  profile_id  uuid not null references public.profiles on delete cascade default auth.uid(),
  url         text not null check (url ~ '^https://static\.klipy\.com/'),
  w           int not null default 0,
  h           int not null default 0,
  preview_url text not null check (preview_url ~ '^https://static\.klipy\.com/'),
  preview_w   int not null default 0,
  preview_h   int not null default 0,
  title       text not null default '',
  created_at  timestamptz not null default now(),
  primary key (profile_id, url)
);

alter table public.gif_favorites enable row level security;

create policy gif_favorites_own on public.gif_favorites for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
