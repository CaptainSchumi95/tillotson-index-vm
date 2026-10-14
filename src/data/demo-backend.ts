// Ukážkový režim: rovnaké rozhranie ako Supabase, dáta iba v localStorage.
// Slúži na vyskúšanie a ladenie dizajnu bez pripojenej databázy.

import { DEFAULT_UNITS } from '@/lib/units'
import { blobToDataUrl } from '@/lib/image'
import type { AuthUser, Backend } from './backend'
import { PERMISSIONS, type Kart, type Permission, type Profile, type RolePreset, type Team } from './types'

const KEY = 'ti-demo-v2'

interface DemoRole {
  id: string
  teamId: string
  name: string
  preset: RolePreset | null
  permissions: Permission[]
}

interface DemoMember {
  id: string
  teamId: string
  profile: Pick<Profile, 'id' | 'name' | 'email' | 'avatarUrl'>
  roleId: string
  kartIds: string[]
}

interface DemoInvitation {
  id: string
  teamId: string
  email: string
  roleId: string
  kartIds: string[]
}

interface DemoDb {
  user: AuthUser | null
  profile: Profile
  teams: Team[]
  roles: DemoRole[]
  members: DemoMember[]
  invitations: DemoInvitation[]
  karts: (Kart & { archived?: boolean })[]
}

const ME = 'user-demo'

const MECHANIC: Permission[] = [
  'setup.view', 'setup.edit', 'event.view', 'event.manage', 'session.edit', 'session.feedback',
  'checklist.edit', 'track.view', 'track.apply', 'service.edit', 'notes.edit',
]
const DRIVER: Permission[] = ['event.view', 'session.feedback', 'track.view', 'notes.edit']

/** Rovnaké predvolené roly ako create_team() v databáze. */
function defaultRoles(teamId: string): DemoRole[] {
  return [
    { id: `${teamId}-manager`, teamId, name: 'Manažér', preset: 'manager', permissions: [...PERMISSIONS] },
    {
      id: `${teamId}-chief`, teamId, name: 'Šéfmechanik', preset: 'chief_mechanic',
      permissions: PERMISSIONS.filter((p) => p !== 'team.manage'),
    },
    { id: `${teamId}-mechanic`, teamId, name: 'Mechanik', preset: 'mechanic', permissions: MECHANIC },
    { id: `${teamId}-driver`, teamId, name: 'Jazdec', preset: 'driver', permissions: DRIVER },
  ]
}

function seed(): DemoDb {
  const teamId = 'team-demo'
  const profile: Profile = {
    id: ME,
    email: 'ukazka@tillotson.app',
    name: 'Ukážkový mechanik',
    avatarUrl: null,
    locale: 'sk',
    unitPrefs: DEFAULT_UNITS,
  }
  return {
    user: null,
    profile,
    teams: [{ id: teamId, name: 'Vilim Motorsport', color: '#132440', iconUrl: null }],
    roles: defaultRoles(teamId),
    members: [
      { id: 'm-me', teamId, profile, roleId: `${teamId}-manager`, kartIds: [] },
      {
        id: 'm-peter', teamId, roleId: `${teamId}-mechanic`, kartIds: ['kart-95'],
        profile: { id: 'p-peter', name: 'Peter Novák', email: 'peter@example.com', avatarUrl: null },
      },
      {
        id: 'm-adam', teamId, roleId: `${teamId}-driver`, kartIds: ['kart-95'],
        profile: { id: 'p-adam', name: 'Adam', email: 'adam@example.com', avatarUrl: null },
      },
    ],
    invitations: [],
    karts: [
      { id: 'kart-95', teamId, number: '95', driverName: 'Adam' },
      { id: 'kart-51', teamId, number: '51', driverName: 'Ema' },
      { id: 'kart-73', teamId, number: '73', driverName: 'Samuel' },
    ],
  }
}

function load(): DemoDb {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as DemoDb
  } catch {
    /* poškodené dáta – začneme odznova */
  }
  return seed()
}

function save(db: DemoDb) {
  localStorage.setItem(KEY, JSON.stringify(db))
}

const delay = () => new Promise((r) => setTimeout(r, 120))
const uid = () => crypto.randomUUID()

/** Rovnaká poistka ako v databáze: tím musí mať aspoň jedného manažéra. */
function ensureManager(db: DemoDb, teamId: string) {
  const ok = db.members.some(
    (m) => m.teamId === teamId && db.roles.find((r) => r.id === m.roleId)?.permissions.includes('team.manage'),
  )
  if (!ok) throw new Error('last_manager')
}

export function createDemoBackend(): Backend {
  const listeners = new Set<(u: AuthUser | null) => void>()
  const emit = (u: AuthUser | null) => listeners.forEach((cb) => cb(u))

  /** Zmena sa uloží, iba ak prejde celá (ako transakcia). */
  function mutate<T>(fn: (db: DemoDb) => T): T {
    const db = load()
    const out = fn(db)
    save(db)
    return out
  }

  const roleOf = (db: DemoDb, roleId: string) => {
    const r = db.roles.find((x) => x.id === roleId)!
    return { id: r.id, name: r.name, preset: r.preset }
  }

  return {
    kind: 'demo',

    async getUser() {
      return load().user
    },

    onAuthChange(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },

    async signIn() {
      await delay()
      const user = { id: ME }
      mutate((db) => (db.user = user))
      emit(user)
    },

    async signOut() {
      localStorage.removeItem(KEY)
      emit(null)
    },

    async afterSignIn() {},

    async getProfile() {
      await delay()
      return load().profile
    },

    async updateProfile(patch) {
      await delay()
      mutate((db) => {
        Object.assign(db.profile, patch)
        db.members.filter((m) => m.profile.id === ME).forEach((m) => Object.assign(m.profile, patch))
      })
    },

    async uploadAvatar(file) {
      return blobToDataUrl(file)
    },

    async listMyTeams() {
      await delay()
      const db = load()
      return db.members
        .filter((m) => m.profile.id === ME)
        .map((m) => {
          const team = db.teams.find((t) => t.id === m.teamId)!
          const role = db.roles.find((r) => r.id === m.roleId)!
          return { ...team, membershipId: m.id, role: roleOf(db, role.id), permissions: role.permissions }
        })
    },

    async createTeam(name, color) {
      await delay()
      const teamId = uid()
      mutate((db) => {
        db.teams.push({ id: teamId, name, color, iconUrl: null })
        db.roles.push(...defaultRoles(teamId))
        db.members.push({ id: uid(), teamId, profile: db.profile, roleId: `${teamId}-manager`, kartIds: [] })
      })
      return teamId
    },

    async updateTeam(teamId, patch) {
      await delay()
      mutate((db) => Object.assign(db.teams.find((t) => t.id === teamId)!, patch))
    },

    async uploadTeamIcon(_teamId, file) {
      return blobToDataUrl(file)
    },

    async listMembers(teamId) {
      await delay()
      const db = load()
      return db.members
        .filter((m) => m.teamId === teamId)
        .map((m) => ({ membershipId: m.id, profile: m.profile, role: roleOf(db, m.roleId), kartIds: m.kartIds }))
    },

    async updateMember(membershipId, roleId, kartIds) {
      await delay()
      mutate((db) => {
        const m = db.members.find((x) => x.id === membershipId)!
        m.roleId = roleId
        m.kartIds = kartIds
        ensureManager(db, m.teamId)
      })
    },

    async removeMember(membershipId) {
      await delay()
      mutate((db) => {
        const m = db.members.find((x) => x.id === membershipId)!
        db.members = db.members.filter((x) => x.id !== membershipId)
        ensureManager(db, m.teamId)
      })
    },

    async listInvitations(teamId) {
      await delay()
      const db = load()
      return db.invitations
        .filter((i) => i.teamId === teamId)
        .map((i) => ({ id: i.id, email: i.email, role: roleOf(db, i.roleId), kartIds: i.kartIds }))
    },

    async inviteMember(teamId, email, roleId, kartIds) {
      await delay()
      const e = email.trim().toLowerCase()
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('invalid_email')
      return mutate((db) => {
        if (db.members.some((m) => m.teamId === teamId && m.profile.email === e)) throw new Error('already_member')
        db.invitations = db.invitations.filter((i) => !(i.teamId === teamId && i.email === e))
        db.invitations.push({ id: uid(), teamId, email: e, roleId, kartIds })
        return 'invited' as const
      })
    },

    async cancelInvitation(invitationId) {
      await delay()
      mutate((db) => (db.invitations = db.invitations.filter((i) => i.id !== invitationId)))
    },

    async listRoles(teamId) {
      await delay()
      const db = load()
      return db.roles
        .filter((r) => r.teamId === teamId)
        .map((r) => ({
          id: r.id,
          name: r.name,
          preset: r.preset,
          permissions: r.permissions,
          memberCount: db.members.filter((m) => m.roleId === r.id).length,
        }))
    },

    async saveRole(teamId, input) {
      await delay()
      return mutate((db) => {
        let role = input.id ? db.roles.find((r) => r.id === input.id) : undefined
        if (!role) {
          role = { id: uid(), teamId, name: input.name.trim(), preset: null, permissions: [] }
          db.roles.push(role)
        } else if (!role.preset) {
          role.name = input.name.trim()
        }
        role.permissions = [...input.permissions]
        ensureManager(db, teamId)
        return role.id
      })
    },

    async deleteRole(roleId) {
      await delay()
      mutate((db) => {
        if (db.members.some((m) => m.roleId === roleId)) throw new Error('role_in_use')
        db.roles = db.roles.filter((r) => r.id !== roleId)
      })
    },

    async listKarts(teamId) {
      await delay()
      return load()
        .karts.filter((k) => k.teamId === teamId && !k.archived)
        .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
    },

    async createKart(teamId, input) {
      await delay()
      const kartId = uid()
      mutate((db) => db.karts.push({ id: kartId, teamId, ...input }))
      return kartId
    },

    async updateKart(kartId, input) {
      await delay()
      mutate((db) => Object.assign(db.karts.find((k) => k.id === kartId)!, input))
    },

    async archiveKart(kartId) {
      await delay()
      mutate((db) => (db.karts.find((k) => k.id === kartId)!.archived = true))
    },
  }
}
