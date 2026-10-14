// Ukážkový režim: rovnaké rozhranie ako Supabase, dáta iba v localStorage.
// Slúži na vyskúšanie a ladenie dizajnu bez pripojenej databázy.

import { DEFAULT_UNITS } from '@/lib/units'
import { blobToDataUrl } from '@/lib/image'
import type { AuthUser, Backend } from './backend'
import { PERMISSIONS, type Kart, type Profile, type Team } from './types'

const KEY = 'ti-demo-v1'

interface DemoDb {
  user: AuthUser | null
  profile: Profile
  teams: Team[]
  karts: Kart[]
}

const MANAGER = { id: 'role-manager', name: 'Manažér', preset: 'manager' as const }

function seed(): DemoDb {
  const teamId = 'team-demo'
  return {
    user: null,
    profile: {
      id: 'user-demo',
      email: 'ukazka@tillotson.app',
      name: 'Ukážkový mechanik',
      avatarUrl: null,
      locale: 'sk',
      unitPrefs: DEFAULT_UNITS,
    },
    teams: [{ id: teamId, name: 'Vilim Motorsport', color: '#132440', iconUrl: null }],
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
const id = () => crypto.randomUUID()

export function createDemoBackend(): Backend {
  const listeners = new Set<(u: AuthUser | null) => void>()
  const emit = (u: AuthUser | null) => listeners.forEach((cb) => cb(u))

  function mutate(fn: (db: DemoDb) => void) {
    const db = load()
    fn(db)
    save(db)
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
      const user = { id: 'user-demo' }
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
      mutate((db) => Object.assign(db.profile, patch))
    },

    async uploadAvatar(file) {
      return blobToDataUrl(file)
    },

    async listMyTeams() {
      await delay()
      return load().teams.map((t) => ({
        ...t,
        membershipId: `m-${t.id}`,
        role: MANAGER,
        permissions: [...PERMISSIONS],
      }))
    },

    async createTeam(name, color) {
      await delay()
      const teamId = id()
      mutate((db) => db.teams.push({ id: teamId, name, color, iconUrl: null }))
      return teamId
    },

    async updateTeam(teamId, patch) {
      await delay()
      mutate((db) => Object.assign(db.teams.find((t) => t.id === teamId)!, patch))
    },

    async uploadTeamIcon(_teamId, file) {
      return blobToDataUrl(file)
    },

    async listMembers() {
      await delay()
      const p = load().profile
      return [
        {
          membershipId: 'm-self',
          profile: { id: p.id, name: p.name, email: p.email, avatarUrl: p.avatarUrl },
          role: MANAGER,
        },
      ]
    },

    async listKarts(teamId) {
      await delay()
      return load()
        .karts.filter((k) => k.teamId === teamId)
        .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
    },

    async createKart(teamId, input) {
      await delay()
      const kartId = id()
      mutate((db) => db.karts.push({ id: kartId, teamId, ...input }))
      return kartId
    },

    async updateKart(kartId, input) {
      await delay()
      mutate((db) => Object.assign(db.karts.find((k) => k.id === kartId)!, input))
    },
  }
}
