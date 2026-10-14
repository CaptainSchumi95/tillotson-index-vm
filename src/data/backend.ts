import type { Kart, KartInput, Member, MyTeam, Profile, ProfilePatch, TeamPatch } from './types'

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

  listKarts(teamId: string): Promise<Kart[]>
  createKart(teamId: string, input: KartInput): Promise<string>
  updateKart(kartId: string, input: KartInput): Promise<void>
}
