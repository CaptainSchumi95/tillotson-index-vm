import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { normalizeUnitPrefs } from '@/lib/units'
import type { AuthUser, Backend } from './backend'
import type { Kart, Member, MyTeam, Permission, Role } from './types'

type Row = Record<string, any>

function toRole(r: Row): Role {
  return { id: r.id, name: r.name, preset: r.preset ?? null }
}

function toKart(r: Row): Kart {
  return { id: r.id, teamId: r.team_id, number: r.number, driverName: r.driver_name }
}

function must<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error
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

    async uploadTeamIcon(teamId, file) {
      return upload(`teams/${teamId}/icon-${Date.now()}.jpg`, file)
    },

    async listMembers(teamId) {
      const rows = must(
        await sb
          .from('memberships')
          .select('id, profile:profiles(id, name, email, avatar_url), role:roles(id, name, preset, sort_order)')
          .eq('team_id', teamId),
      ) as Row[]
      return rows
        .sort((a, b) => a.role.sort_order - b.role.sort_order || a.profile.name.localeCompare(b.profile.name))
        .map(
          (m): Member => ({
            membershipId: m.id,
            profile: { id: m.profile.id, name: m.profile.name, email: m.profile.email, avatarUrl: m.profile.avatar_url },
            role: toRole(m.role),
          }),
        )
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
  }
}
