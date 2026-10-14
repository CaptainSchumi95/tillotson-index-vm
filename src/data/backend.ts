import type {
  InviteResult,
  Invitation,
  Kart,
  KartInput,
  Member,
  MyTeam,
  Profile,
  ProfilePatch,
  RoleInput,
  TeamPatch,
  TeamRole,
} from './types'

export interface AuthUser {
  id: string
}

/** Spoločné rozhranie pre Supabase aj ukážkový režim. */
export interface Backend {
  readonly kind: 'supabase' | 'demo'

  getUser(): Promise<AuthUser | null>
  onAuthChange(cb: (user: AuthUser | null) => void): () => void
  signIn(): Promise<void>
  signOut(): Promise<void>
  /** Po prihlásení: prijme čakajúce pozvánky do tímov. */
  afterSignIn(): Promise<void>

  getProfile(): Promise<Profile>
  updateProfile(patch: ProfilePatch): Promise<void>
  uploadAvatar(file: Blob): Promise<string>

  listMyTeams(): Promise<MyTeam[]>
  createTeam(name: string, color: string): Promise<string>
  updateTeam(teamId: string, patch: TeamPatch): Promise<void>
  uploadTeamIcon(teamId: string, file: Blob): Promise<string>
  listMembers(teamId: string): Promise<Member[]>

  updateMember(membershipId: string, roleId: string, kartIds: string[]): Promise<void>
  removeMember(membershipId: string): Promise<void>

  listInvitations(teamId: string): Promise<Invitation[]>
  inviteMember(teamId: string, email: string, roleId: string, kartIds: string[]): Promise<InviteResult>
  cancelInvitation(invitationId: string): Promise<void>

  listRoles(teamId: string): Promise<TeamRole[]>
  saveRole(teamId: string, input: RoleInput): Promise<string>
  deleteRole(roleId: string): Promise<void>

  listKarts(teamId: string): Promise<Kart[]>
  createKart(teamId: string, input: KartInput): Promise<string>
  updateKart(kartId: string, input: KartInput): Promise<void>
  archiveKart(kartId: string): Promise<void>
}
