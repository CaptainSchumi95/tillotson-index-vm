-- Tillotson Index – fáza 2: pozvánky, správa členov, vlastné roly.

-- ───────────────────────────── Poistka: tím vždy má manažéra ─────────────────────────────
-- Kontroluje sa až na konci transakcie (deferred), aby sa dali oprávnenia roly
-- prepísať naraz (zmazať a znova vložiť).

create function public.ensure_team_manager(p_team uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_team is null or not exists (select 1 from teams where id = p_team) then
    return; -- tím sa práve maže
  end if;
  if not exists (
    select 1 from memberships m
    join role_permissions rp on rp.role_id = m.role_id
    where m.team_id = p_team and rp.permission = 'team.manage'
  ) then
    raise exception 'last_manager';
  end if;
end;
$$;

create function public.trg_memberships_manager() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform ensure_team_manager(old.team_id);
  return null;
end;
$$;

create constraint trigger memberships_keep_manager
  after update or delete on public.memberships
  deferrable initially deferred
  for each row execute function public.trg_memberships_manager();

create function public.trg_role_permissions_manager() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.permission = 'team.manage' then
    perform ensure_team_manager((select team_id from roles where id = old.role_id));
  end if;
  return null;
end;
$$;

create constraint trigger role_permissions_keep_manager
  after delete on public.role_permissions
  deferrable initially deferred
  for each row execute function public.trg_role_permissions_manager();

-- ───────────────────────────── Pozvanie člena ─────────────────────────────
-- Ak už človek má účet, pridá sa do tímu hneď. Inak vznikne pozvánka,
-- ktorá sa prijme pri jeho prvom prihlásení cez Google.

create function public.invite_member(p_team uuid, p_email text, p_role uuid, p_karts uuid[] default '{}')
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_email citext := lower(trim(p_email));
  v_profile uuid;
  v_membership uuid;
begin
  if not has_perm(p_team, 'team.manage') then
    raise exception 'forbidden';
  end if;
  if not exists (select 1 from roles where id = p_role and team_id = p_team) then
    raise exception 'invalid_role';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email';
  end if;

  select id into v_profile from profiles where email = v_email;

  if v_profile is not null then
    if exists (select 1 from memberships where team_id = p_team and profile_id = v_profile) then
      raise exception 'already_member';
    end if;
    insert into memberships (team_id, profile_id, role_id) values (p_team, v_profile, p_role)
    returning id into v_membership;
    insert into kart_assignments (membership_id, kart_id)
    select v_membership, k.id from karts k where k.id = any (p_karts) and k.team_id = p_team;
    return 'added';
  end if;

  insert into invitations (team_id, email, role_id, kart_ids, invited_by)
  values (p_team, v_email, p_role,
          array(select k.id from karts k where k.id = any (p_karts) and k.team_id = p_team),
          auth.uid())
  on conflict (team_id, email) do update
    set role_id = excluded.role_id, kart_ids = excluded.kart_ids, invited_by = excluded.invited_by;
  return 'invited';
end;
$$;

-- ───────────────────────────── Úprava a odstránenie člena ─────────────────────────────

create function public.update_member(p_membership uuid, p_role uuid, p_karts uuid[])
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_team uuid;
begin
  select team_id into v_team from memberships where id = p_membership;
  if v_team is null or not has_perm(v_team, 'team.manage') then
    raise exception 'forbidden';
  end if;
  if not exists (select 1 from roles where id = p_role and team_id = v_team) then
    raise exception 'invalid_role';
  end if;

  update memberships set role_id = p_role where id = p_membership;

  delete from kart_assignments where membership_id = p_membership;
  insert into kart_assignments (membership_id, kart_id)
  select p_membership, k.id from karts k where k.id = any (p_karts) and k.team_id = v_team;
end;
$$;

-- Odstrániť môže manažér kohokoľvek, ostatní iba seba (opustenie tímu).
create function public.remove_member(p_membership uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_team uuid;
  v_profile uuid;
begin
  select team_id, profile_id into v_team, v_profile from memberships where id = p_membership;
  if v_team is null then
    return;
  end if;
  if v_profile <> auth.uid() and not has_perm(v_team, 'team.manage') then
    raise exception 'forbidden';
  end if;
  delete from memberships where id = p_membership;
end;
$$;

-- ───────────────────────────── Roly ─────────────────────────────

-- Vytvorí (p_role = null) alebo upraví rolu. Predvoleným rolám sa nemení názov.
create function public.save_role(p_team uuid, p_role uuid, p_name text, p_permissions text[])
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_role uuid := p_role;
begin
  if not has_perm(p_team, 'team.manage') then
    raise exception 'forbidden';
  end if;

  if v_role is null then
    insert into roles (team_id, name, sort_order)
    values (p_team, trim(p_name), 100 + (select count(*) from roles where team_id = p_team))
    returning id into v_role;
  else
    if not exists (select 1 from roles where id = v_role and team_id = p_team) then
      raise exception 'invalid_role';
    end if;
    update roles set name = trim(p_name) where id = v_role and preset is null;
  end if;

  delete from role_permissions where role_id = v_role;
  insert into role_permissions (role_id, permission)
  select v_role, p.code from permissions p where p.code = any (p_permissions);

  return v_role;
end;
$$;

create function public.delete_role(p_role uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_team uuid;
  v_preset text;
begin
  select team_id, preset into v_team, v_preset from roles where id = p_role;
  if v_team is null or not has_perm(v_team, 'team.manage') then
    raise exception 'forbidden';
  end if;
  if v_preset is not null then
    raise exception 'preset_role';
  end if;
  if exists (select 1 from memberships where role_id = p_role) then
    raise exception 'role_in_use';
  end if;
  delete from roles where id = p_role;
end;
$$;

grant execute on function public.invite_member(uuid, text, uuid, uuid[]) to authenticated;
grant execute on function public.update_member(uuid, uuid, uuid[]) to authenticated;
grant execute on function public.remove_member(uuid) to authenticated;
grant execute on function public.save_role(uuid, uuid, text, text[]) to authenticated;
grant execute on function public.delete_role(uuid) to authenticated;
