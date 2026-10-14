import type { UnitPrefs } from '@/lib/units'

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
