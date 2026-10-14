import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { normalizeUnitPrefs } from '@/lib/units'
import type { AuthUser, Backend } from './backend'
import {
  KNOWN_ERRORS,
  type CustomSetupField,
  type Invitation,
  type KartNote,
  type ServiceEntry,
  type Kart,
  type Member,
  type MyTeam,
  type Permission,
  type Role,
  type SetupRevision,
  type SetupVariant,
  type TeamRole,
} from './types'

type Row = Record<string, any>

function toRole(r: Row): Role {
  return { id: r.id, name: r.name, preset: r.preset ?? null }
}

function toAuthor(r: Row | null) {
  return r ? { id: r.id as string, name: r.name as string, avatarUrl: r.avatar_url as string | null } : null
}

function toKart(r: Row): Kart {
  return { id: r.id, teamId: r.team_id, number: r.number, driverName: r.driver_name }
}

/** Chyby z databázových funkcií (raise exception 'last_manager' …) prevedie na známy kód. */
function must<T>(res: { data: T; error: { message?: string } | null }): T {
  if (res.error) {
    const code = KNOWN_ERRORS.find((c) => res.error?.message === c)
    throw code ? new Error(code) : res.error
  }
  return res.data
}

export function createSupabaseBackend(url: string, anonKey: string): Backend {
  const sb: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })

  async function uid(): Promise<string> {
    const { data } = await sb.auth.getSession()
    const id = data.session?.user.id
    if (!id) throw new Error('not authenticated')
    return id
  }

  async function upload(path: string, file: Blob): Promise<string> {
    must(await sb.storage.from('media').upload(path, file, { upsert: true, contentType: 'image/jpeg' }))
    return sb.storage.from('media').getPublicUrl(path).data.publicUrl
  }

  return {
    kind: 'supabase',

    async getUser() {
      const { data } = await sb.auth.getSession()
      return data.session ? { id: data.session.user.id } : null
    },

    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => {
        cb(session ? ({ id: session.user.id } satisfies AuthUser) : null)
      })
      return () => data.subscription.unsubscribe()
    },

    async signIn() {
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
    },

    async signOut() {
      await sb.auth.signOut()
    },

    async afterSignIn() {
      must(await sb.rpc('accept_invitations'))
    },

    async getProfile() {
      const r = must(await sb.from('profiles').select('*').eq('id', await uid()).single())
      return {
        id: r.id,
        email: r.email,
        name: r.name,
        avatarUrl: r.avatar_url,
        locale: r.locale,
        unitPrefs: normalizeUnitPrefs(r.unit_prefs),
      }
    },

    async updateProfile(patch) {
      const row: Row = {}
      if (patch.name !== undefined) row.name = patch.name
      if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl
      if (patch.locale !== undefined) row.locale = patch.locale
      if (patch.unitPrefs !== undefined) row.unit_prefs = patch.unitPrefs
      must(await sb.from('profiles').update(row).eq('id', await uid()))
    },

    async uploadAvatar(file) {
      return upload(`avatars/${await uid()}/${Date.now()}.jpg`, file)
    },

    async listMyTeams() {
      const rows = must(
        await sb
          .from('memberships')
          .select('id, team:teams(id, name, color, icon_url), role:roles(id, name, preset, role_permissions(permission))')
          .eq('profile_id', await uid()),
      ) as Row[]
      return rows
        .map(
          (m): MyTeam => ({
            id: m.team.id,
            name: m.team.name,
            color: m.team.color,
            iconUrl: m.team.icon_url,
            membershipId: m.id,
            role: toRole(m.role),
            permissions: (m.role.role_permissions as Row[]).map((p) => p.permission as Permission),
          }),
        )
        .sort((a, b) => a.name.localeCompare(b.name))
    },

    async createTeam(name, color) {
      return must(await sb.rpc('create_team', { p_name: name, p_color: color })) as string
    },

    async updateTeam(teamId, patch) {
      const row: Row = {}
      if (patch.name !== undefined) row.name = patch.name
      if (patch.color !== undefined) row.color = patch.color
      if (patch.iconUrl !== undefined) row.icon_url = patch.iconUrl
      must(await sb.from('teams').update(row).eq('id', teamId))
    },

    async deleteTeam(teamId) {
      must(await sb.from('teams').delete().eq('id', teamId))
    },

    async uploadTeamIcon(teamId, file) {
      return upload(`teams/${teamId}/icon-${Date.now()}.jpg`, file)
    },

    async listMembers(teamId) {
      const rows = must(
        await sb
          .from('memberships')
          .select(
            'id, profile:profiles(id, name, email, avatar_url), role:roles(id, name, preset, sort_order), kart_assignments(kart_id)',
          )
          .eq('team_id', teamId),
      ) as Row[]
      return rows
        .sort((a, b) => a.role.sort_order - b.role.sort_order || a.profile.name.localeCompare(b.profile.name))
        .map(
          (m): Member => ({
            membershipId: m.id,
            profile: { id: m.profile.id, name: m.profile.name, email: m.profile.email, avatarUrl: m.profile.avatar_url },
            role: toRole(m.role),
            kartIds: (m.kart_assignments as Row[]).map((a) => a.kart_id),
          }),
        )
    },

    async updateMember(membershipId, roleId, kartIds) {
      must(await sb.rpc('update_member', { p_membership: membershipId, p_role: roleId, p_karts: kartIds }))
    },

    async removeMember(membershipId) {
      must(await sb.rpc('remove_member', { p_membership: membershipId }))
    },

    async listInvitations(teamId) {
      const rows = must(
        await sb
          .from('invitations')
          .select('id, email, kart_ids, role:roles(id, name, preset)')
          .eq('team_id', teamId)
          .order('created_at'),
      ) as Row[]
      return rows.map((r): Invitation => ({ id: r.id, email: r.email, role: toRole(r.role), kartIds: r.kart_ids ?? [] }))
    },

    async inviteMember(teamId, email, roleId, kartIds) {
      return must(
        await sb.rpc('invite_member', { p_team: teamId, p_email: email, p_role: roleId, p_karts: kartIds }),
      ) as 'added' | 'invited'
    },

    async cancelInvitation(invitationId) {
      must(await sb.from('invitations').delete().eq('id', invitationId))
    },

    async listRoles(teamId) {
      const rows = must(
        await sb
          .from('roles')
          .select('id, name, preset, sort_order, role_permissions(permission), memberships(count)')
          .eq('team_id', teamId)
          .order('sort_order'),
      ) as Row[]
      return rows.map(
        (r): TeamRole => ({
          ...toRole(r),
          permissions: (r.role_permissions as Row[]).map((p) => p.permission as Permission),
          memberCount: r.memberships?.[0]?.count ?? 0,
        }),
      )
    },

    async saveRole(teamId, input) {
      return must(
        await sb.rpc('save_role', {
          p_team: teamId,
          p_role: input.id ?? null,
          p_name: input.name,
          p_permissions: input.permissions,
        }),
      ) as string
    },

    async deleteRole(roleId) {
      must(await sb.rpc('delete_role', { p_role: roleId }))
    },

    async listKarts(teamId) {
      const rows = must(
        await sb.from('karts').select('id, team_id, number, driver_name').eq('team_id', teamId).eq('archived', false),
      ) as Row[]
      return rows.map(toKart).sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
    },

    async createKart(teamId, input) {
      const r = must(
        await sb
          .from('karts')
          .insert({ team_id: teamId, number: input.number, driver_name: input.driverName })
          .select('id')
          .single(),
      )
      return r!.id as string
    },

    async updateKart(kartId, input) {
      must(await sb.from('karts').update({ number: input.number, driver_name: input.driverName }).eq('id', kartId))
    },

    async archiveKart(kartId) {
      must(await sb.from('karts').update({ archived: true }).eq('id', kartId))
    },

    async listSetupRevisions(kartId) {
      const rows = must(
        await sb
          .from('setup_revisions')
          .select('id, kart_id, values, note, recorded_at, author:profiles(id, name, avatar_url)')
          .eq('kart_id', kartId)
          .order('recorded_at', { ascending: false })
          .limit(100),
      ) as Row[]
      return rows.map(
        (r): SetupRevision => ({
          id: r.id,
          kartId: r.kart_id,
          values: r.values ?? {},
          note: r.note,
          recordedAt: r.recorded_at,
          author: r.author ? { id: r.author.id, name: r.author.name, avatarUrl: r.author.avatar_url } : null,
        }),
      )
    },

    async saveSetupRevision(input) {
      must(
        await sb.from('setup_revisions').upsert(
          {
            id: input.id,
            kart_id: input.kartId,
            values: input.values,
            note: input.note,
            recorded_at: input.recordedAt,
            author_id: await uid(),
          },
          { onConflict: 'id', ignoreDuplicates: true },
        ),
      )
    },

    async listSetupVariants(kartId) {
      const rows = must(
        await sb.from('setup_variants').select('id, kart_id, name, values, updated_at').eq('kart_id', kartId).order('name'),
      ) as Row[]
      return rows.map(
        (r): SetupVariant => ({ id: r.id, kartId: r.kart_id, name: r.name, values: r.values ?? {}, updatedAt: r.updated_at }),
      )
    },

    async saveSetupVariant(input) {
      const row = { kart_id: input.kartId, name: input.name, values: input.values }
      if (input.id) {
        must(await sb.from('setup_variants').update(row).eq('id', input.id))
        return input.id
      }
      return must(await sb.from('setup_variants').insert(row).select('id').single())!.id as string
    },

    async deleteSetupVariant(variantId) {
      must(await sb.from('setup_variants').delete().eq('id', variantId))
    },

    async listSetupFields(teamId) {
      const rows = must(
        await sb.from('setup_fields').select('id, group_key, label, unit').eq('team_id', teamId).order('sort_order').order('created_at'),
      ) as Row[]
      return rows.map((r): CustomSetupField => ({ id: r.id, group: r.group_key, label: r.label, unit: r.unit }))
    },

    async saveSetupField(teamId, input) {
      const row = { team_id: teamId, group_key: input.group, label: input.label, unit: input.unit }
      if (input.id) {
        must(await sb.from('setup_fields').update(row).eq('id', input.id))
        return input.id
      }
      return must(await sb.from('setup_fields').insert(row).select('id').single())!.id as string
    },

    async deleteSetupField(fieldId) {
      must(await sb.from('setup_fields').delete().eq('id', fieldId))
    },

    async listNotes(kartId) {
      const rows = must(
        await sb
          .from('kart_notes')
          .select('id, kart_id, text, recorded_at, author:profiles(id, name, avatar_url)')
          .eq('kart_id', kartId)
          .order('recorded_at', { ascending: false })
          .limit(200),
      ) as Row[]
      return rows.map(
        (r): KartNote => ({ id: r.id, kartId: r.kart_id, text: r.text, recordedAt: r.recorded_at, author: toAuthor(r.author) }),
      )
    },

    async saveNote(input) {
      must(
        await sb
          .from('kart_notes')
          .upsert(
            { id: input.id, kart_id: input.kartId, text: input.text, recorded_at: input.recordedAt, author_id: await uid() },
            { onConflict: 'id', ignoreDuplicates: true },
          ),
      )
    },

    async deleteNote(noteId) {
      must(await sb.from('kart_notes').delete().eq('id', noteId))
    },

    async listService(kartId) {
      const rows = must(
        await sb
          .from('service_log')
          .select('id, kart_id, kind, performed_on, note, author:profiles(id, name, avatar_url)')
          .eq('kart_id', kartId)
          .order('performed_on', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(200),
      ) as Row[]
      return rows.map(
        (r): ServiceEntry => ({
          id: r.id,
          kartId: r.kart_id,
          kind: r.kind,
          performedOn: r.performed_on,
          note: r.note,
          author: toAuthor(r.author),
        }),
      )
    },

    async saveService(input) {
      must(
        await sb.from('service_log').upsert(
          {
            id: input.id,
            kart_id: input.kartId,
            kind: input.kind,
            performed_on: input.performedOn,
            note: input.note,
            author_id: await uid(),
          },
          { onConflict: 'id', ignoreDuplicates: true },
        ),
      )
    },

    async deleteService(entryId) {
      must(await sb.from('service_log').delete().eq('id', entryId))
    },
  }
}
