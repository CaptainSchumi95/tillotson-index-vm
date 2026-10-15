import type { UnitPrefs } from '@/lib/units'
import type { FieldUnit, SetupGroup, SetupValues } from './setup-fields'
import type { PressureSample, Tire, TireReading } from '@/lib/pressure'

export const PERMISSIONS = [
  'team.manage',
  'kart.all',
  'setup.view',
  'setup.edit',
  'pressure.engineer',
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

export type RolePreset = 'manager' | 'chief_mechanic' | 'engineer' | 'mechanic' | 'driver'

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
  /** Trať z knižnice (ak bola vybraná). */
  trackId: string | null
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
  trackId: string | null
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

// ───────────── Jazdy ─────────────

export type TrackCondition = 'dry' | 'damp' | 'wet'
export type Balance = 'understeer' | 'neutral' | 'oversteer'

export interface Session {
  id: string
  eventId: string
  kartId: string
  label: string
  bestLapMs: number | null
  laps: number | null
  trackCondition: TrackCondition | null
  conditionsNote: string
  balance: Balance | null
  behaviour: string
  driverFeedback: string
  nextPlan: string
  /** Revízia setupu, ktorá bola na motokáre počas jazdy. */
  setupRevisionId: string | null
  /** Merania tlakov a teplôt (iba pre toho, kto vidí setup). undefined = nemeniť. */
  pressures?: SessionPressures | null
  author: Author
  recordedAt: string
  pending?: boolean
}

export type SessionInput = Omit<Session, 'author' | 'pending'>

// ───────────── Trate ─────────────

export interface Track {
  id: string
  /** null = spoločná trať pripravená aplikáciou */
  teamId: string | null
  name: string
  location: string
  lengthM: number | null
}

export type TrackInput = Pick<Track, 'name' | 'location' | 'lengthM'> & { id?: string }

/** Setup k trati – odporúčanie / uložená skúsenosť tímu (nie stav motokáry). */
export interface TrackSetup {
  id: string
  trackId: string
  name: string
  values: SetupValues
  notes: string
  updatedAt: string
  updatedBy: Author
}

export type TrackSetupInput = Pick<TrackSetup, 'trackId' | 'name' | 'values' | 'notes'> & { id?: string }

// ───────────── Tlaky (Inžinier) ─────────────

export interface SessionPressures {
  /** °C */
  airTemp: number | null
  /** °C */
  trackTemp: number | null
  tires: Partial<Record<Tire, TireReading>>
}

/** Meranie z jazdy pre výpočet (s údajmi o jazde). */
export interface PressureSampleRow extends PressureSample {
  sessionId: string
  label: string
  recordedAt: string
}

export type PressureOrderStatus = 'pending' | 'done' | 'replaced' | 'cancelled'

/** Príkaz inžiniera na natlakovanie motokáry. */
export interface PressureOrder {
  id: string
  kartId: string
  eventId: string | null
  /** tire_fl … tire_rr v bar (za studena) */
  values: Record<string, number>
  targetHot: number | null
  airTemp: number | null
  trackTemp: number | null
  note: string
  status: PressureOrderStatus
  createdBy: Author
  createdAt: string
  doneBy: Author
  doneAt: string | null
}

export type PressureOrderInput = Pick<
  PressureOrder,
  'kartId' | 'eventId' | 'values' | 'targetHot' | 'airTemp' | 'trackTemp' | 'note'
>

// ───────────── Správy ─────────────

export type ChatKind = 'announcements' | 'team' | 'direct'

/** Konverzácia v zozname: posledná správa a neprečítané. */
export interface ChatChannel {
  id: string
  kind: ChatKind
  /** Pri priamej konverzácii – druhý človek. */
  otherId: string | null
  /** Nástenka: roly a ľudia, ktorí smú písať. */
  postRoles: string[]
  postProfiles: string[]
  canPost: boolean
  lastBody: string | null
  lastAt: string | null
  lastAuthorId: string | null
  unread: number
}

export interface ChatReaction {
  emoji: string
  profileIds: string[]
}

export interface ChatMessage {
  id: string
  channelId: string
  authorId: string | null
  body: string
  createdAt: string
  /** Odpoveď na správu. */
  replyTo: string | null
  editedAt: string | null
  reactions: ChatReaction[]
  /** Ešte neodoslaná (slabý signál). */
  pending?: boolean
}

export interface MessageInput {
  id: string
  teamId: string
  channelId: string
  body: string
  createdAt: string
  replyTo: string | null
}

/** GIF z KLIPY – náhľad do výberu a väčšia verzia do správy. */
export interface GifFile {
  url: string
  w: number
  h: number
}

export interface GifItem {
  id: string
  title: string
  preview: GifFile
  full: GifFile
}

export interface GifPage {
  items: GifItem[]
  hasNext: boolean
}

export interface PushSubscriptionInput {
  endpoint: string
  p256dh: string
  auth: string
  userAgent: string
}
