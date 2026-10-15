// Ukážkový režim: rovnaké rozhranie ako Supabase, dáta iba v localStorage.
// Slúži na vyskúšanie a ladenie dizajnu bez pripojenej databázy.

import { DEFAULT_UNITS } from '@/lib/units'
import { blobToDataUrl } from '@/lib/image'
import { P_ATM, TIRES } from '@/lib/pressure'
import type { AuthUser, Backend } from './backend'
import {
  PERMISSIONS,
  type ChatKind,
  type ChatMessage,
  type ChecklistItem,
  type CustomSetupField,
  type ScheduleItem,
  type SessionInput,
  type TeamEvent,
  type Kart,
  type KartNoteInput,
  type PressureOrder,
  type SessionPressures,
  type ServiceEntryInput,
  type Permission,
  type Profile,
  type RolePreset,
  type SetupValues,
  type Team,
  type Track,
  type TrackSetupInput,
} from './types'

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

interface DemoRevision {
  id: string
  kartId: string
  values: SetupValues
  note: string
  authorId: string
  recordedAt: string
}

interface DemoVariant {
  id: string
  kartId: string
  name: string
  values: SetupValues
  updatedAt: string
}

interface DemoChannel {
  id: string
  teamId: string
  kind: ChatKind
  postRoles: string[]
  postProfiles: string[]
  members: string[]
}

interface DemoDb {
  channels: DemoChannel[]
  messages: (ChatMessage & { teamId: string })[]
  reads: Record<string, string>
  pressures: Record<string, SessionPressures & { kartId: string }>
  orders: (Omit<PressureOrder, 'createdBy' | 'doneBy'> & { teamId: string; createdById: string; doneById: string | null })[]
  tracks: Track[]
  trackSetups: (TrackSetupInput & { id: string; teamId: string; updatedAt: string; updatedById: string })[]
  sessions: (SessionInput & { authorId: string })[]
  events: (TeamEvent & { teamId: string })[]
  schedule: ScheduleItem[]
  checklist: (ChecklistItem & { teamId: string })[]
  checks: { eventId: string; kartId: string; itemId: string; round: number; doneBy: string; doneAt: string }[]
  notes: (KartNoteInput & { authorId: string })[]
  service: (ServiceEntryInput & { authorId: string; createdAt: string })[]
  revisions: DemoRevision[]
  variants: DemoVariant[]
  fields: (CustomSetupField & { teamId: string })[]
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
const ENGINEER: Permission[] = [
  'kart.all', 'setup.view', 'event.view', 'session.edit', 'session.feedback', 'track.view', 'pressure.engineer',
]

/** Rovnaké predvolené roly ako create_team() v databáze. */
function defaultRoles(teamId: string): DemoRole[] {
  return [
    { id: `${teamId}-manager`, teamId, name: 'Manažér', preset: 'manager', permissions: [...PERMISSIONS] },
    {
      id: `${teamId}-chief`, teamId, name: 'Šéfmechanik', preset: 'chief_mechanic',
      permissions: PERMISSIONS.filter((p) => p !== 'team.manage' && p !== 'pressure.engineer'),
    },
    { id: `${teamId}-engineer`, teamId, name: 'Inžinier', preset: 'engineer', permissions: ENGINEER },
    { id: `${teamId}-mechanic`, teamId, name: 'Mechanik', preset: 'mechanic', permissions: MECHANIC },
    { id: `${teamId}-driver`, teamId, name: 'Jazdec', preset: 'driver', permissions: DRIVER },
  ]
}

/** Vzorový setup motokáry 95 s dvoma zmenami v histórii. */
function demoSetup(): Pick<DemoDb, 'revisions' | 'variants' | 'fields'> {
  const base: SetupValues = {
    tire_fl: 0.85, tire_fr: 0.85, tire_rl: 0.9, tire_rr: 0.9,
    sprocket_front: 10, sprocket_rear: 82,
    carb_low: 1.25, carb_high: 1.5,
    camber_left: -1, camber_right: -1, caster: 12, toe: 1,
    track_front: 1080, track_rear: 1390, height_front: 30, height_rear: 35,
  }
  const day = 24 * 60 * 60 * 1000
  const at = (offset: number) => new Date(Date.now() - offset).toISOString()
  return {
    revisions: [
      { id: 'rev-3', kartId: 'kart-95', values: { ...base, tire_fl: 0.82, tire_fr: 0.82, sprocket_rear: 83 }, note: 'Viac záberu na výjazde z vlásenky.', authorId: 'p-peter', recordedAt: at(2 * 60 * 60 * 1000) },
      { id: 'rev-2', kartId: 'kart-95', values: { ...base, tire_fl: 0.82, tire_fr: 0.82 }, note: '', authorId: ME, recordedAt: at(day) },
      { id: 'rev-1', kartId: 'kart-95', values: base, note: 'Základ na sezónu.', authorId: ME, recordedAt: at(6 * day) },
    ],
    variants: [
      { id: 'var-wet', kartId: 'kart-95', name: 'Mokrá trať', values: { ...base, tire_fl: 1.1, tire_fr: 1.1, tire_rl: 1.15, tire_rr: 1.15, track_rear: 1340 }, updatedAt: at(3 * day) },
    ],
    fields: [],
  }
}

const DEFAULT_CHECKLIST: [ChecklistItem['phase'], string][] = [
  ['prep', 'Dotiahnuť kolesá a náboje'],
  ['prep', 'Dotiahnuť osku'],
  ['prep', 'Dotiahnuť motor a spojku'],
  ['prep', 'Skontrolovať napnutie reťaze, dotiahnuť krytku reťaze'],
  ['prep', 'Dotiahnuť karburátor a filter'],
  ['prep', 'Dotiahnuť nádrž'],
  ['prep', 'Dotiahnuť ostatné skrutky (sedačka, podlaha) – brzdový kotúč a zadný nárazník NEdoťahovať úplne'],
  ['pre_run', 'Dotankovať'],
  ['pre_run', 'Nafúkať pneumatiky a nastaviť tlaky'],
  ['pre_run', 'Skontrolovať napnutie reťaze'],
  ['post_run', 'Spätná väzba od jazdca'],
  ['post_run', 'Skontrolovať poškodenia'],
  ['post_run', 'Ak je čas, vyčistiť motokáru'],
]

/** Rovnaký predvolený checklist ako seed_checklist() v databáze. */
function defaultChecklist(teamId: string): DemoDb['checklist'] {
  return DEFAULT_CHECKLIST.map(([phase, text], i) => ({ id: teamId + '-cl-' + i, teamId, phase, text, sortOrder: (i + 1) * 10 }))
}

/** Dátum RRRR-MM-DD posunutý o dni od dneška. */
function dayOffset(offset: number) {
  const d = new Date(Date.now() + offset * 86_400_000)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

/** Vzorové udalosti: práve prebiehajúce preteky (95, 51) a minulý tréning (73). */
function demoEvents(): Pick<DemoDb, 'events' | 'schedule' | 'checklist' | 'checks'> {
  const day = dayOffset
  const teamId = 'team-demo'
  const checklist = defaultChecklist(teamId)
  return {
    events: [
      {
        id: 'ev-race', teamId, kind: 'race', name: '3. kolo seriálu T4', dateFrom: day(0), dateTo: day(1),
        trackName: 'Slovakia Ring', trackId: 'track-sr', notes: 'Depo č. 14. Technická prebierka do 8:30, transpondéry vyzdvihnúť v kancelárii.',
        karts: [{ kartId: 'kart-95', round: 1 }, { kartId: 'kart-51', round: 1 }],
      },
      {
        id: 'ev-test', teamId, kind: 'test', name: 'Tréning – nastavenie prevodu', dateFrom: day(-7), dateTo: day(-7),
        trackName: 'Slovakia Ring', trackId: 'track-sr', notes: '', karts: [{ kartId: 'kart-73', round: 1 }],
      },
    ],
    schedule: [
      { id: 'sc-1', eventId: 'ev-race', day: day(0), time: '08:00', title: 'Technická prebierka' },
      { id: 'sc-2', eventId: 'ev-race', day: day(0), time: '09:30', title: 'Voľný tréning 1' },
      { id: 'sc-3', eventId: 'ev-race', day: day(0), time: '11:40', title: 'Voľný tréning 2' },
      { id: 'sc-4', eventId: 'ev-race', day: day(0), time: '14:15', title: 'Kvalifikácia' },
      { id: 'sc-5', eventId: 'ev-race', day: day(1), time: '10:00', title: 'Rozjazd' },
      { id: 'sc-6', eventId: 'ev-race', day: day(1), time: '13:30', title: 'Finále' },
    ],
    checklist,
    checks: checklist.slice(0, 4).map((c) => ({
      eventId: 'ev-race', kartId: 'kart-95', itemId: c.id, round: 0, doneBy: 'p-peter', doneAt: new Date().toISOString(),
    })),
  }
}

/** Rovnaké spoločné trate ako v migrácii 0008 + dva setupy tímu pre Slovakia Ring. */
function demoTracks(): Pick<DemoDb, 'tracks' | 'trackSetups'> {
  const base = demoSetup().revisions[0].values
  const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString()
  return {
    tracks: [
      { id: 'track-sr', teamId: null, name: 'Slovakia Ring', location: 'Orechová Potôň, SK', lengthM: null },
      { id: 'track-kakucs', teamId: null, name: 'Kakucs Ring', location: 'Kakucs, HU', lengthM: null },
      { id: 'track-vm', teamId: null, name: 'Autodrom Vysoké Mýto', location: 'Vysoké Mýto, CZ', lengthM: null },
    ],
    trackSetups: [
      {
        id: 'ts-dry', teamId: 'team-demo', trackId: 'track-sr', name: 'Suchá – osvedčený',
        values: { ...base, tire_rl: 0.88, tire_rr: 0.88 },
        notes: 'Najlepšie časy v 2. kole. Pri teplom asfalte ubrať vzadu.',
        updatedAt: daysAgo(20), updatedById: 'p-peter',
      },
      {
        id: 'ts-wet', teamId: 'team-demo', trackId: 'track-sr', name: 'Mokrá trať',
        values: { ...base, tire_fl: 1.1, tire_fr: 1.1, tire_rl: 1.15, tire_rr: 1.15, track_rear: 1340 },
        notes: '', updatedAt: daysAgo(45), updatedById: ME,
      },
    ],
  }
}

/**
 * Merania tlakov: 95 má 5 jázd pri rôznej teplote trate (výpočet použije model),
 * 51 jednu (priemer), 73 žiadnu (odhad z teploty pneumatík).
 * Teplé tlaky sú dopočítané fyzikálne z „ohrevu“ pneumatiky, ktorý rastie s teplotou trate.
 */
function demoPressures(): Pick<DemoDb, 'pressures' | 'orders'> & { history: DemoDb['sessions'] } {
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()
  const reading = (kartId: string, air: number, track: number, cold: number, heat: number): SessionPressures & { kartId: string } => {
    // ľavé kolesá sa na okruhu v smere hodín zohrejú o kúsok viac
    const offset = { fl: 2, fr: -1, rl: 3, rr: 0 } as const
    const tires = Object.fromEntries(
      TIRES.map((t) => {
        const eff = heat + 0.9 * track + offset[t]
        const hot = Math.round(((cold + P_ATM) * (eff + 273.15)) / (air + 273.15) * 100 - P_ATM * 100) / 100
        return [t, { cold, hot, temp: Math.round(eff - 4) }]
      }),
    )
    return { kartId, airTemp: air, trackTemp: track, tires }
  }
  const old = (id: string, kartId: string, label: string, h: number, lap: number): DemoDb['sessions'][number] => ({
    id, eventId: 'ev-test', kartId, label, bestLapMs: lap, laps: 12, trackCondition: 'dry', conditionsNote: '',
    balance: 'neutral', behaviour: '', driverFeedback: '', nextPlan: '', setupRevisionId: null, authorId: 'p-peter',
    recordedAt: hoursAgo(h),
  })
  return {
    history: [
      old('ses-h1', 'kart-95', 'Tréning – ráno', 24 * 9 + 6, 55_310),
      old('ses-h2', 'kart-95', 'Tréning – poobede', 24 * 9 + 2, 54_980),
      old('ses-h3', 'kart-95', 'Tréning – večer', 24 * 9, 55_120),
      old('ses-h4', 'kart-51', 'Tréning', 24 * 9 + 3, 55_640),
    ],
    pressures: {
      'ses-h1': reading('kart-95', 14, 18, 0.68, 24),
      'ses-h2': reading('kart-95', 21, 34, 0.6, 24),
      'ses-h3': reading('kart-95', 17, 25, 0.64, 24),
      'ses-1': reading('kart-95', 19, 27, 0.63, 24),
      'ses-2': reading('kart-95', 22, 31, 0.61, 24),
      'ses-h4': reading('kart-51', 20, 30, 0.62, 20),
    },
    orders: [],
  }
}

/** Dve vzorové jazdy motokáry 95 dnes – s rôznym setupom, nech je čo porovnať. */
function demoSessions(): Pick<DemoDb, 'sessions'> {
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()
  return {
    sessions: [
      {
        id: 'ses-2', eventId: 'ev-race', kartId: 'kart-95', label: 'Voľný tréning 2',
        bestLapMs: 54_403, laps: 14, trackCondition: 'dry', conditionsNote: 'Trať sa pogumovala',
        balance: 'neutral', behaviour: 'Lepší výjazd z vlásenky, na brzdách stabilná.',
        driverFeedback: 'Ide to lepšie, na rovinke ešte trochu chýba.', nextPlan: 'Skúsiť o 0,02 bar menej vzadu.',
        setupRevisionId: 'rev-3', authorId: 'p-peter', recordedAt: hoursAgo(2),
      },
      {
        id: 'ses-1', eventId: 'ev-race', kartId: 'kart-95', label: 'Voľný tréning 1',
        bestLapMs: 54_812, laps: 12, trackCondition: 'dry', conditionsNote: '',
        balance: 'understeer', behaviour: 'Nedotáča na vstupe do pomalých zákrut.',
        driverFeedback: 'Volant je ťažký, predok nejde do zákruty.', nextPlan: 'Pridať zub na rozete.',
        setupRevisionId: 'rev-2', authorId: 'p-peter', recordedAt: hoursAgo(5),
      },
    ],
  }
}

/** Vzorové poznámky jazdca a servis motokáry 95. */
function demoNotesService(): Pick<DemoDb, 'notes' | 'service'> {
  const day = 24 * 60 * 60 * 1000
  const iso = (offset: number) => new Date(Date.now() - offset).toISOString()
  const date = (offset: number) => iso(offset).slice(0, 10)
  return {
    notes: [
      { id: 'note-2', kartId: 'kart-95', text: 'Na brzdách vpredu sa zadok trochu vlní, inak super. Na rovinke to ťahá lepšie ako minule.', authorId: 'p-adam', recordedAt: iso(3 * 60 * 60 * 1000) },
      { id: 'note-1', kartId: 'kart-95', text: 'Volant je trochu ťažký v pomalých zákrutách.', authorId: 'p-adam', recordedAt: iso(2 * day) },
    ],
    service: [
      { id: 'srv-2', kartId: 'kart-95', kind: 'oil', performedOn: date(5 * day), engineHours: 12.5, note: '', authorId: 'p-peter', createdAt: iso(5 * day) },
      { id: 'srv-1', kartId: 'kart-95', kind: 'spark_plug', performedOn: date(12 * day), engineHours: 10, note: 'NGK, nová', authorId: ME, createdAt: iso(12 * day) },
    ],
  }
}

/** Vzorové jazdy + historické jazdy s meraniami tlakov. */
function withPressures(base: Pick<DemoDb, 'sessions'>): Pick<DemoDb, 'sessions' | 'pressures' | 'orders'> {
  const { history, pressures, orders } = demoPressures()
  return { sessions: [...base.sessions, ...history], pressures, orders }
}

/** Nástenka a tímová skupina tímu (rovnako ako seed_channels() v databáze). */
function teamChannels(teamId: string): DemoChannel[] {
  return [
    { id: teamId + '-ann', teamId, kind: 'announcements', postRoles: [teamId + '-manager', teamId + '-chief'], postProfiles: [], members: [] },
    { id: teamId + '-team', teamId, kind: 'team', postRoles: [], postProfiles: [], members: [] },
  ]
}

/** Vzorové správy: oznam na nástenke, skupina a priama konverzácia s Petrom. */
function demoChat(): Pick<DemoDb, 'channels' | 'messages' | 'reads'> {
  const teamId = 'team-demo'
  const minAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()
  const msg = (id: string, channelId: string, authorId: string, body: string, m: number) => ({
    id, channelId, teamId, authorId, body, createdAt: minAgo(m),
  })
  const dm = 'dm-peter'
  return {
    channels: [
      ...teamChannels(teamId),
      { id: dm, teamId, kind: 'direct', postRoles: [], postProfiles: [], members: [ME, 'p-peter'] },
    ],
    messages: [
      msg('msg-1', teamId + '-ann', ME, 'Vitajte v aplikácii! Pred každou jazdou prejdite checklist a po jazde zapíšte čas a tlaky.', 60 * 26),
      msg('msg-2', teamId + '-ann', ME, 'Zajtra zraz o 7:00 pri depe č. 14. Technická prebierka do 8:30.', 60 * 3),
      msg('msg-3', teamId + '-team', 'p-peter', 'Má niekto náhradnú reťaz 219?', 95),
      msg('msg-4', teamId + '-team', 'p-adam', 'Ja mám jednu v kufri 👍', 90),
      msg('msg-5', teamId + '-team', 'p-peter', 'Super, ďakujem!', 88),
      msg('msg-6', dm, 'p-peter', 'Tlaky na 95 som nastavil podľa inžiniera, pozri prosím ešte napnutie reťaze.', 12),
    ],
    reads: { [teamId + '-ann']: minAgo(60 * 5) },
  }
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
    ...demoSetup(),
    ...demoNotesService(),
    ...demoEvents(),
    ...demoSessions(),
    ...demoTracks(),
    ...withPressures(demoSessions()),
    ...demoChat(),
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
    if (raw) return { ...demoSetup(), ...demoNotesService(), ...demoEvents(), ...withPressures(demoSessions()), ...demoTracks(), ...demoChat(), ...(JSON.parse(raw) as DemoDb) }
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

function authorOf(db: DemoDb, profileId: string) {
  const p = db.members.find((m) => m.profile.id === profileId)?.profile
  return p ? { id: p.id, name: p.name, avatarUrl: p.avatarUrl } : null
}

/** Rovnaká poistka ako v databáze: tím musí mať aspoň jedného manažéra. */
function ensureManager(db: DemoDb, teamId: string) {
  const ok = db.members.some(
    (m) => m.teamId === teamId && db.roles.find((r) => r.id === m.roleId)?.permissions.includes('team.manage'),
  )
  if (!ok) throw new Error('last_manager')
}

export function createDemoBackend(): Backend {
  const chatListeners = new Map<string, Set<(m: ChatMessage) => void>>()
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
        db.checklist.push(...defaultChecklist(teamId))
        db.channels.push(...teamChannels(teamId))
        db.members.push({ id: uid(), teamId, profile: db.profile, roleId: `${teamId}-manager`, kartIds: [] })
      })
      return teamId
    },

    async updateTeam(teamId, patch) {
      await delay()
      mutate((db) => Object.assign(db.teams.find((t) => t.id === teamId)!, patch))
    },

    async deleteTeam(teamId) {
      await delay()
      mutate((db) => {
        db.teams = db.teams.filter((t) => t.id !== teamId)
        db.members = db.members.filter((m) => m.teamId !== teamId)
        db.roles = db.roles.filter((r) => r.teamId !== teamId)
        db.invitations = db.invitations.filter((i) => i.teamId !== teamId)
        const kartIds = new Set(db.karts.filter((k) => k.teamId === teamId).map((k) => k.id))
        db.karts = db.karts.filter((k) => k.teamId !== teamId)
        db.revisions = db.revisions.filter((r) => !kartIds.has(r.kartId))
        db.variants = db.variants.filter((v) => !kartIds.has(v.kartId))
        db.notes = db.notes.filter((n) => !kartIds.has(n.kartId))
        db.service = db.service.filter((s) => !kartIds.has(s.kartId))
        db.fields = db.fields.filter((f) => f.teamId !== teamId)
        const eventIds = new Set(db.events.filter((e) => e.teamId === teamId).map((e) => e.id))
        db.events = db.events.filter((e) => e.teamId !== teamId)
        db.schedule = db.schedule.filter((s) => !eventIds.has(s.eventId))
        db.checks = db.checks.filter((c) => !eventIds.has(c.eventId))
        db.checklist = db.checklist.filter((c) => c.teamId !== teamId)
        db.sessions = db.sessions.filter((s) => !kartIds.has(s.kartId))
        db.tracks = db.tracks.filter((t) => t.teamId !== teamId)
        db.trackSetups = db.trackSetups.filter((t) => t.teamId !== teamId)
        db.channels = db.channels.filter((c) => c.teamId !== teamId)
        db.messages = db.messages.filter((m) => m.teamId !== teamId)
      })
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

    async listSetupRevisions(kartId) {
      await delay()
      const db = load()
      return db.revisions
        .filter((r) => r.kartId === kartId)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
        .map((r) => {
          const p = db.members.find((m) => m.profile.id === r.authorId)?.profile
          return {
            id: r.id,
            kartId: r.kartId,
            values: r.values,
            note: r.note,
            recordedAt: r.recordedAt,
            author: p ? { id: p.id, name: p.name, avatarUrl: p.avatarUrl } : null,
          }
        })
    },

    async saveSetupRevision(input) {
      await delay()
      mutate((db) => {
        if (db.revisions.some((r) => r.id === input.id)) return
        db.revisions.push({ ...input, authorId: ME })
      })
    },

    async listSetupVariants(kartId) {
      await delay()
      return load()
        .variants.filter((v) => v.kartId === kartId)
        .sort((a, b) => a.name.localeCompare(b.name))
    },

    async saveSetupVariant(input) {
      await delay()
      return mutate((db) => {
        const updatedAt = new Date().toISOString()
        const existing = input.id ? db.variants.find((v) => v.id === input.id) : undefined
        if (existing) {
          Object.assign(existing, { name: input.name, values: input.values, updatedAt })
          return existing.id
        }
        const id = uid()
        db.variants.push({ id, kartId: input.kartId, name: input.name, values: input.values, updatedAt })
        return id
      })
    },

    async deleteSetupVariant(variantId) {
      await delay()
      mutate((db) => (db.variants = db.variants.filter((v) => v.id !== variantId)))
    },

    async listSetupFields(teamId) {
      await delay()
      return load()
        .fields.filter((f) => f.teamId === teamId)
        .map(({ teamId: _t, ...f }) => f)
    },

    async saveSetupField(teamId, input) {
      await delay()
      return mutate((db) => {
        const existing = input.id ? db.fields.find((f) => f.id === input.id) : undefined
        if (existing) {
          Object.assign(existing, input)
          return existing.id
        }
        const id = uid()
        db.fields.push({ ...input, id, teamId })
        return id
      })
    },

    async deleteSetupField(fieldId) {
      await delay()
      mutate((db) => (db.fields = db.fields.filter((f) => f.id !== fieldId)))
    },

    async listNotes(kartId) {
      await delay()
      const db = load()
      return db.notes
        .filter((n) => n.kartId === kartId)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
        .map(({ authorId, ...n }) => ({ ...n, author: authorOf(db, authorId) }))
    },

    async saveNote(input) {
      await delay()
      mutate((db) => {
        if (!db.notes.some((n) => n.id === input.id)) db.notes.push({ ...input, authorId: ME })
      })
    },

    async deleteNote(noteId) {
      await delay()
      mutate((db) => (db.notes = db.notes.filter((n) => n.id !== noteId)))
    },

    async listService(kartId) {
      await delay()
      const db = load()
      return db.service
        .filter((s) => s.kartId === kartId)
        .sort((a, b) => b.performedOn.localeCompare(a.performedOn) || b.createdAt.localeCompare(a.createdAt))
        .map(({ authorId, createdAt: _c, ...s }) => ({ ...s, engineHours: s.engineHours ?? null, author: authorOf(db, authorId) }))
    },

    async saveService(input) {
      await delay()
      mutate((db) => {
        if (!db.service.some((s) => s.id === input.id))
          db.service.push({ ...input, authorId: ME, createdAt: new Date().toISOString() })
      })
    },

    async deleteService(entryId) {
      await delay()
      mutate((db) => (db.service = db.service.filter((s) => s.id !== entryId)))
    },

    async listEvents(teamId) {
      await delay()
      return load()
        .events.filter((e) => e.teamId === teamId)
        .sort((a, b) => b.dateFrom.localeCompare(a.dateFrom))
        .map(({ teamId: _t, ...e }) => e)
    },

    async saveEvent(teamId, input) {
      await delay()
      return mutate((db) => {
        const { kartIds, id, ...fields } = input
        const existing = id ? db.events.find((e) => e.id === id) : undefined
        if (existing) {
          const rounds = new Map(existing.karts.map((k) => [k.kartId, k.round]))
          Object.assign(existing, fields, { karts: kartIds.map((k) => ({ kartId: k, round: rounds.get(k) ?? 1 })) })
          return existing.id
        }
        const newId = uid()
        db.events.push({ ...fields, id: newId, teamId, karts: kartIds.map((k) => ({ kartId: k, round: 1 })) })
        return newId
      })
    },

    async deleteEvent(eventId) {
      await delay()
      mutate((db) => {
        db.events = db.events.filter((e) => e.id !== eventId)
        db.schedule = db.schedule.filter((s) => s.eventId !== eventId)
        db.checks = db.checks.filter((c) => c.eventId !== eventId)
      })
    },

    async listSchedule(eventId) {
      await delay()
      return load()
        .schedule.filter((s) => s.eventId === eventId)
        .sort((a, b) => a.day.localeCompare(b.day) || (a.time ?? '').localeCompare(b.time ?? ''))
    },

    async saveScheduleItem(input) {
      await delay()
      mutate((db) => {
        const existing = input.id ? db.schedule.find((s) => s.id === input.id) : undefined
        if (existing) Object.assign(existing, input)
        else db.schedule.push({ ...input, id: uid() })
      })
    },

    async deleteScheduleItem(itemId) {
      await delay()
      mutate((db) => (db.schedule = db.schedule.filter((s) => s.id !== itemId)))
    },

    async listChecklistItems(teamId) {
      await delay()
      return load()
        .checklist.filter((c) => c.teamId === teamId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(({ teamId: _t, ...c }) => c)
    },

    async saveChecklistItem(teamId, input) {
      await delay()
      mutate((db) => {
        const existing = input.id ? db.checklist.find((c) => c.id === input.id) : undefined
        if (existing) Object.assign(existing, input)
        else db.checklist.push({ ...input, id: uid(), teamId })
      })
    },

    async deleteChecklistItem(itemId) {
      await delay()
      mutate((db) => {
        db.checklist = db.checklist.filter((c) => c.id !== itemId)
        db.checks = db.checks.filter((c) => c.itemId !== itemId)
      })
    },

    async listChecks(eventId, kartId) {
      await delay()
      const db = load()
      return db.checks
        .filter((c) => c.eventId === eventId && c.kartId === kartId)
        .map((c) => ({ itemId: c.itemId, round: c.round, doneAt: c.doneAt, doneBy: authorOf(db, c.doneBy) }))
    },

    async setCheck(input) {
      await delay()
      mutate((db) => {
        const same = (c: DemoDb['checks'][number]) =>
          c.eventId === input.eventId && c.kartId === input.kartId && c.itemId === input.itemId && c.round === input.round
        db.checks = db.checks.filter((c) => !same(c))
        if (input.done)
          db.checks.push({
            eventId: input.eventId, kartId: input.kartId, itemId: input.itemId, round: input.round,
            doneBy: ME, doneAt: new Date().toISOString(),
          })
      })
    },

    async listTracks(teamId) {
      await delay()
      return load()
        .tracks.filter((t) => t.teamId === null || t.teamId === teamId)
        .sort((a, b) => a.name.localeCompare(b.name))
    },

    async saveTrack(teamId, input) {
      await delay()
      return mutate((db) => {
        const existing = input.id ? db.tracks.find((t) => t.id === input.id && t.teamId === teamId) : undefined
        if (existing) {
          Object.assign(existing, { name: input.name, location: input.location, lengthM: input.lengthM })
          return existing.id
        }
        const id = uid()
        db.tracks.push({ id, teamId, name: input.name, location: input.location, lengthM: input.lengthM })
        return id
      })
    },

    async deleteTrack(trackId) {
      await delay()
      mutate((db) => {
        db.tracks = db.tracks.filter((t) => t.id !== trackId)
        db.trackSetups = db.trackSetups.filter((t) => t.trackId !== trackId)
      })
    },

    async listTrackSetups(teamId) {
      await delay()
      const db = load()
      return db.trackSetups
        .filter((t) => t.teamId === teamId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(({ teamId: _t, updatedById, ...t }) => ({ ...t, updatedBy: authorOf(db, updatedById) }))
    },

    async saveTrackSetup(teamId, input) {
      await delay()
      return mutate((db) => {
        const updatedAt = new Date().toISOString()
        const existing = input.id ? db.trackSetups.find((t) => t.id === input.id) : undefined
        if (existing) {
          Object.assign(existing, { name: input.name, values: input.values, notes: input.notes, updatedAt, updatedById: ME })
          return existing.id
        }
        const id = uid()
        db.trackSetups.push({ ...input, id, teamId, updatedAt, updatedById: ME })
        return id
      })
    },

    async deleteTrackSetup(setupId) {
      await delay()
      mutate((db) => (db.trackSetups = db.trackSetups.filter((t) => t.id !== setupId)))
    },

    async listSessions(kartId) {
      await delay()
      const db = load()
      return db.sessions
        .filter((s) => s.kartId === kartId)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
        .map(({ authorId, ...s }) => {
          const pr = db.pressures[s.id]
          return { ...s, pressures: pr ? { airTemp: pr.airTemp, trackTemp: pr.trackTemp, tires: pr.tires } : null, author: authorOf(db, authorId) }
        })
    },

    async saveSession(input) {
      await delay()
      mutate((db) => {
        const { pressures, ...session } = input
        db.sessions = db.sessions.filter((s) => s.id !== input.id)
        db.sessions.push({ ...session, authorId: ME })
        if (pressures) db.pressures[input.id] = { ...pressures, kartId: input.kartId }
      })
    },

    async listPressureSamples(teamId) {
      await delay()
      const db = load()
      const teamKarts = new Set(db.karts.filter((k) => k.teamId === teamId).map((k) => k.id))
      return Object.entries(db.pressures)
        .filter(([, pr]) => teamKarts.has(pr.kartId))
        .map(([sessionId, pr]) => {
          const s = db.sessions.find((x) => x.id === sessionId)
          return { sessionId, label: s?.label ?? '', recordedAt: s?.recordedAt ?? '', ...pr }
        })
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    },

    async listPressureOrders(teamId) {
      await delay()
      const db = load()
      return db.orders
        .filter((o) => o.teamId === teamId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(({ teamId: _t, createdById, doneById, ...o }) => ({
          ...o,
          createdBy: authorOf(db, createdById),
          doneBy: doneById ? authorOf(db, doneById) : null,
        }))
    },

    async sendPressureOrders(orders) {
      await delay()
      mutate((db) => {
        for (const o of orders) {
          const teamId = db.karts.find((k) => k.id === o.kartId)?.teamId ?? ''
          db.orders.forEach((x) => {
            if (x.kartId === o.kartId && x.status === 'pending') x.status = 'replaced'
          })
          db.orders.push({ ...o, id: uid(), teamId, status: 'pending', createdById: ME, createdAt: new Date().toISOString(), doneById: null, doneAt: null })
        }
      })
    },

    async cancelPressureOrder(orderId) {
      await delay()
      mutate((db) => {
        const o = db.orders.find((x) => x.id === orderId)
        if (o?.status === 'pending') o.status = 'cancelled'
      })
    },

    async chatOverview(teamId) {
      await delay()
      const db = load()
      const myRole = db.members.find((m) => m.teamId === teamId && m.profile.id === ME)?.roleId
      return db.channels
        .filter((c) => c.teamId === teamId && (c.kind !== 'direct' || c.members.includes(ME)))
        .map((c) => {
          const msgs = db.messages.filter((m) => m.channelId === c.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          const last = msgs.at(-1)
          const readAt = db.reads[c.id] ?? ''
          return {
            id: c.id,
            kind: c.kind,
            otherId: c.kind === 'direct' ? (c.members.find((x) => x !== ME) ?? null) : null,
            postRoles: c.postRoles,
            postProfiles: c.postProfiles,
            canPost: c.kind !== 'announcements' || c.postProfiles.includes(ME) || (!!myRole && c.postRoles.includes(myRole)),
            lastBody: last?.body ?? null,
            lastAt: last?.createdAt ?? null,
            lastAuthorId: last?.authorId ?? null,
            unread: msgs.filter((m) => m.authorId !== ME && m.createdAt > readAt).length,
          }
        })
    },

    async listMessages(channelId) {
      await delay()
      return load()
        .messages.filter((m) => m.channelId === channelId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map(({ teamId: _t, ...m }) => m)
    },

    async sendMessage(input) {
      await delay()
      const message = { id: input.id, channelId: input.channelId, authorId: ME, body: input.body, createdAt: new Date().toISOString() }
      const added = mutate((db) => {
        if (db.messages.some((m) => m.id === input.id)) return false
        db.messages.push({ ...message, teamId: input.teamId })
        return true
      })
      if (added) chatListeners.get(input.teamId)?.forEach((cb) => cb(message))
    },

    async deleteMessage(messageId) {
      await delay()
      mutate((db) => (db.messages = db.messages.filter((m) => m.id !== messageId)))
    },

    async markRead(channelId) {
      mutate((db) => (db.reads[channelId] = new Date().toISOString()))
    },

    async openDirect(teamId, profileId) {
      await delay()
      return mutate((db) => {
        const existing = db.channels.find(
          (c) => c.teamId === teamId && c.kind === 'direct' && c.members.includes(ME) && c.members.includes(profileId),
        )
        if (existing) return existing.id
        const id = uid()
        db.channels.push({ id, teamId, kind: 'direct', postRoles: [], postProfiles: [], members: [ME, profileId] })
        return id
      })
    },

    async updatePosters(channelId, roleIds, profileIds) {
      await delay()
      mutate((db) => {
        const c = db.channels.find((x) => x.id === channelId)
        if (c) Object.assign(c, { postRoles: roleIds, postProfiles: profileIds })
      })
    },

    subscribeChat(teamId, onMessage) {
      const set = chatListeners.get(teamId) ?? new Set()
      set.add(onMessage)
      chatListeners.set(teamId, set)
      return () => void set.delete(onMessage)
    },

    async completePressureOrder(orderId, revision) {
      await delay()
      mutate((db) => {
        if (!db.revisions.some((r) => r.id === revision.id)) db.revisions.push({ ...revision, authorId: ME })
        const o = db.orders.find((x) => x.id === orderId)
        if (o?.status === 'pending') Object.assign(o, { status: 'done', doneById: ME, doneAt: new Date().toISOString() })
      })
    },

    async deleteSession(sessionId) {
      await delay()
      mutate((db) => (db.sessions = db.sessions.filter((s) => s.id !== sessionId)))
    },

    async setSessionFeedback(sessionId, text) {
      await delay()
      mutate((db) => {
        const s = db.sessions.find((x) => x.id === sessionId)
        if (s) s.driverFeedback = text
      })
    },

    async setRound(eventId, kartId, round) {
      await delay()
      mutate((db) => {
        const k = db.events.find((e) => e.id === eventId)?.karts.find((x) => x.kartId === kartId)
        if (k) k.round = round
      })
    },
  }
}
