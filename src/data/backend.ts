import type {
  ChecklistCheck,
  ChecklistItem,
  CheckInput,
  CustomSetupField,
  EventInput,
  InviteResult,
  Invitation,
  KartNote,
  KartNoteInput,
  ServiceEntry,
  ServiceEntryInput,
  Kart,
  KartInput,
  Member,
  MyTeam,
  Profile,
  ProfilePatch,
  RoleInput,
  ScheduleItem,
  Session,
  SessionInput,
  SetupRevision,
  SetupRevisionInput,
  SetupVariant,
  SetupValues,
  TeamPatch,
  TeamEvent,
  TeamRole,
  Track,
  TrackInput,
  TrackSetup,
  TrackSetupInput,
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
  /** Nevratne zmaže tím so všetkými dátami. */
  deleteTeam(teamId: string): Promise<void>
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

  /** Revízie setupu, najnovšia prvá. Prvá = aktuálny setup motokáry. */
  listSetupRevisions(kartId: string): Promise<SetupRevision[]>
  /** Idempotentné – rovnaké id sa uloží iba raz (bezpečné opakovanie po výpadku siete). */
  saveSetupRevision(input: SetupRevisionInput): Promise<void>

  listSetupVariants(kartId: string): Promise<SetupVariant[]>
  saveSetupVariant(input: { id?: string; kartId: string; name: string; values: SetupValues }): Promise<string>
  deleteSetupVariant(variantId: string): Promise<void>

  listSetupFields(teamId: string): Promise<CustomSetupField[]>
  saveSetupField(teamId: string, input: Omit<CustomSetupField, 'id'> & { id?: string }): Promise<string>
  deleteSetupField(fieldId: string): Promise<void>

  listNotes(kartId: string): Promise<KartNote[]>
  /** Idempotentné (id generuje aplikácia) – bezpečné pri offline uložení. */
  saveNote(input: KartNoteInput): Promise<void>
  deleteNote(noteId: string): Promise<void>

  listService(kartId: string): Promise<ServiceEntry[]>
  /** Idempotentné (id generuje aplikácia) – bezpečné pri offline uložení. */
  saveService(input: ServiceEntryInput): Promise<void>
  deleteService(entryId: string): Promise<void>

  listEvents(teamId: string): Promise<TeamEvent[]>
  saveEvent(teamId: string, input: EventInput): Promise<string>
  deleteEvent(eventId: string): Promise<void>

  listSchedule(eventId: string): Promise<ScheduleItem[]>
  saveScheduleItem(input: Omit<ScheduleItem, 'id'> & { id?: string }): Promise<void>
  deleteScheduleItem(itemId: string): Promise<void>

  listChecklistItems(teamId: string): Promise<ChecklistItem[]>
  saveChecklistItem(teamId: string, input: Omit<ChecklistItem, 'id'> & { id?: string }): Promise<void>
  deleteChecklistItem(itemId: string): Promise<void>

  listChecks(eventId: string, kartId: string): Promise<ChecklistCheck[]>
  /** Idempotentné odškrtnutie / zrušenie – bezpečné pri offline fronte. */
  setCheck(input: CheckInput): Promise<void>
  /** Posun na ďalšiu jazdu (vynuluje Pred/Po jazde). */
  setRound(eventId: string, kartId: string, round: number): Promise<void>

  /** Všetky jazdy motokáry (naprieč udalosťami), najnovšia prvá. */
  listSessions(kartId: string): Promise<Session[]>
  /** Vytvorí alebo prepíše jazdu (id generuje aplikácia – bezpečné offline). */
  saveSession(input: SessionInput): Promise<void>
  deleteSession(sessionId: string): Promise<void>
  /** Spätná väzba jazdca – smie aj jazdec bez práva upravovať jazdy. */
  setSessionFeedback(sessionId: string, text: string): Promise<void>

  /** Spoločné trate + vlastné trate tímu. */
  listTracks(teamId: string): Promise<Track[]>
  saveTrack(teamId: string, input: TrackInput): Promise<string>
  deleteTrack(trackId: string): Promise<void>

  /** Všetky setupy k tratiam, ktoré má tím uložené. */
  listTrackSetups(teamId: string): Promise<TrackSetup[]>
  saveTrackSetup(teamId: string, input: TrackSetupInput): Promise<string>
  deleteTrackSetup(setupId: string): Promise<void>
}
