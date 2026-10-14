import type { UnitPrefs } from '@/lib/units'
import type { FieldUnit, SetupGroup, SetupValues } from './setup-fields'

export const PERMISSIONS = [
  'team.manage',
  'kart.all',
  'setup.view',
  'setup.edit',
  'event.view',
  'event.manage',
  'session.edit',
  'session.feedback',
  'checklist.edit',
  'track.view',
  'track.manage',
  'track.apply',
  'service.edit',
  'notes.edit',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export type RolePreset = 'manager' | 'chief_mechanic' | 'mechanic' | 'driver'

export interface Profile {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  locale: string
  unitPrefs: UnitPrefs
}

export interface Team {
  id: string
  name: string
  color: string
  iconUrl: string | null
}

export interface Role {
  id: string
  name: string
  preset: RolePreset | null
}

/** Tím z pohľadu prihláseného človeka – s jeho rolou a oprávneniami. */
export interface MyTeam extends Team {
  membershipId: string
  role: Role
  permissions: Permission[]
}

export interface Member {
  membershipId: string
  profile: Pick<Profile, 'id' | 'name' | 'email' | 'avatarUrl'>
  role: Role
  kartIds: string[]
}

/** Rola so zoznamom oprávnení – pre editor rolí. */
export interface TeamRole extends Role {
  permissions: Permission[]
  memberCount: number
}

export interface Invitation {
  id: string
  email: string
  role: Role
  kartIds: string[]
}

export type InviteResult = 'added' | 'invited'

/** Kódy chýb z databázy, ktoré vieme vysvetliť používateľovi. */
export const KNOWN_ERRORS = ['last_manager', 'already_member', 'invalid_email', 'role_in_use', 'forbidden'] as const
export type KnownError = (typeof KNOWN_ERRORS)[number]

export interface Kart {
  id: string
  teamId: string
  number: string
  driverName: string
}

export type ProfilePatch = Partial<Pick<Profile, 'name' | 'avatarUrl' | 'locale' | 'unitPrefs'>>
export type TeamPatch = Partial<Pick<Team, 'name' | 'color' | 'iconUrl'>>
export type KartInput = Pick<Kart, 'number' | 'driverName'>
export interface RoleInput {
  id?: string
  name: string
  permissions: Permission[]
}

// ───────────── Setup ─────────────

export type { SetupValue, SetupValues } from './setup-fields'

export interface SetupRevision {
  id: string
  kartId: string
  values: SetupValues
  note: string
  author: Pick<Profile, 'id' | 'name' | 'avatarUrl'> | null
  /** Kedy zmenu urobil mechanik (ISO). */
  recordedAt: string
  /** Ešte neodoslané na server (uložené offline). */
  pending?: boolean
}

export interface SetupRevisionInput {
  id: string
  kartId: string
  values: SetupValues
  note: string
  recordedAt: string
}

export interface SetupVariant {
  id: string
  kartId: string
  name: string
  values: SetupValues
  updatedAt: string
}

export interface CustomSetupField {
  id: string
  group: SetupGroup
  label: string
  unit: FieldUnit
}

// ───────────── Poznámky a servis ─────────────

type Author = Pick<Profile, 'id' | 'name' | 'avatarUrl'> | null

export interface KartNote {
  id: string
  kartId: string
  text: string
  author: Author
  recordedAt: string
  pending?: boolean
}

export type KartNoteInput = Pick<KartNote, 'id' | 'kartId' | 'text' | 'recordedAt'>

export const SERVICE_KINDS = ['oil', 'chain', 'spark_plug', 'air_filter', 'clutch', 'other'] as const
export type ServiceKind = (typeof SERVICE_KINDS)[number]

export interface ServiceEntry {
  id: string
  kartId: string
  kind: ServiceKind
  /** Dátum vo formáte RRRR-MM-DD. */
  performedOn: string
  /** Stav motohodín v čase servisu (pri oleji rozhodujúci údaj). */
  engineHours: number | null
  note: string
  author: Author
  pending?: boolean
}

export type ServiceEntryInput = Pick<ServiceEntry, 'id' | 'kartId' | 'kind' | 'performedOn' | 'engineHours' | 'note'>

/** Interval výmeny oleja v motohodinách (Tillotson T4). */
export const OIL_INTERVAL_HOURS = 3

// ───────────── Udalosti, harmonogram, checklist ─────────────

export type EventKind = 'race' | 'test'

export interface TeamEvent {
  id: string
  kind: EventKind
  name: string
  /** RRRR-MM-DD */
  dateFrom: string
  dateTo: string
  trackName: string
  notes: string
  /** Motokáry udalosti a ich aktuálne poradie jazdy (checklist Pred/Po jazde). */
  karts: { kartId: string; round: number }[]
}

export interface EventInput {
  id?: string
  kind: EventKind
  name: string
  dateFrom: string
  dateTo: string
  trackName: string
  notes: string
  kartIds: string[]
}

export interface ScheduleItem {
  id: string
  eventId: string
  day: string
  /** HH:MM alebo null */
  time: string | null
  title: string
}

export type ChecklistPhase = 'prep' | 'pre_run' | 'post_run'

export interface ChecklistItem {
  id: string
  phase: ChecklistPhase
  text: string
  sortOrder: number
}

export interface ChecklistCheck {
  itemId: string
  round: number
  doneBy: Author
  doneAt: string
  pending?: boolean
}

export interface CheckInput {
  eventId: string
  kartId: string
  itemId: string
  round: number
  done: boolean
}
