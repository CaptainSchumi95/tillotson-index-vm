import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkspace } from '@/state/workspace'
import { backend } from '.'
import { KNOWN_ERRORS, type KartInput, type KnownError, type Permission, type ProfilePatch, type RoleInput, type TeamPatch } from './types'

export const qk = {
  profile: ['profile'] as const,
  teams: ['teams'] as const,
  members: (teamId: string) => ['members', teamId] as const,
  karts: (teamId: string) => ['karts', teamId] as const,
  roles: (teamId: string) => ['roles', teamId] as const,
  invitations: (teamId: string) => ['invitations', teamId] as const,
}

/** Známy kód chyby z databázy (napr. 'last_manager'), inak null. */
export function errorCode(error: unknown): KnownError | null {
  const msg = error instanceof Error ? error.message : ''
  return (KNOWN_ERRORS as readonly string[]).includes(msg) ? (msg as KnownError) : null
}

// ───────────── Profil ─────────────

export function useProfile() {
  return useQuery({ queryKey: qk.profile, queryFn: () => backend.getProfile() })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: ProfilePatch) => backend.updateProfile(patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: qk.profile })
      const prev = qc.getQueryData(qk.profile)
      qc.setQueryData(qk.profile, (p: typeof prev) => (p ? { ...p, ...patch } : p))
      return { prev }
    },
    onError: (_e, _p, ctx) => qc.setQueryData(qk.profile, ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['members'] }),
  })
}

// ───────────── Tímy ─────────────

export function useMyTeams() {
  return useQuery({ queryKey: qk.teams, queryFn: () => backend.listMyTeams() })
}

/** Aktuálne vybraný tím (alebo null, ak výber nie je platný). */
export function useCurrentTeam() {
  const teams = useMyTeams()
  const teamId = useWorkspace((s) => s.teamId)
  const team = teams.data?.find((t) => t.id === teamId) ?? null
  return { team, teams }
}

export function useCan() {
  const { team } = useCurrentTeam()
  return (perm: Permission) => !!team?.permissions.includes(perm)
}

export function useCreateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) => backend.createTeam(name, color),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.teams }),
  })
}

export function useUpdateTeam(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: TeamPatch) => backend.updateTeam(teamId, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.teams }),
  })
}

export function useMembers(teamId: string | undefined) {
  return useQuery({
    queryKey: qk.members(teamId ?? ''),
    queryFn: () => backend.listMembers(teamId!),
    enabled: !!teamId,
  })
}

// ───────────── Motokáry ─────────────

export function useKarts(teamId: string | undefined) {
  return useQuery({
    queryKey: qk.karts(teamId ?? ''),
    queryFn: () => backend.listKarts(teamId!),
    enabled: !!teamId,
  })
}

export function useCurrentKart() {
  const { team } = useCurrentTeam()
  const karts = useKarts(team?.id)
  const kartId = useWorkspace((s) => (team ? s.kartByTeam[team.id] : null))
  const kart = karts.data?.find((k) => k.id === kartId) ?? null
  return { kart, karts }
}

export function useSaveKart(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: KartInput & { id?: string }) =>
      id ? backend.updateKart(id, input).then(() => id) : backend.createKart(teamId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.karts(teamId) }),
  })
}

export function useArchiveKart(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (kartId: string) => backend.archiveKart(kartId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.karts(teamId) }),
  })
}

// ───────────── Členovia, pozvánky, roly ─────────────

/** Po zmene členov alebo rolí obnoví všetko, čo od nich závisí (aj moje oprávnenia). */
function useInvalidateTeam(teamId: string) {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: qk.members(teamId) }),
      qc.invalidateQueries({ queryKey: qk.invitations(teamId) }),
      qc.invalidateQueries({ queryKey: qk.roles(teamId) }),
      qc.invalidateQueries({ queryKey: qk.teams }),
    ])
}

export function useInvitations(teamId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: qk.invitations(teamId ?? ''),
    queryFn: () => backend.listInvitations(teamId!),
    enabled: !!teamId && enabled,
  })
}

export function useRoles(teamId: string | undefined) {
  return useQuery({
    queryKey: qk.roles(teamId ?? ''),
    queryFn: () => backend.listRoles(teamId!),
    enabled: !!teamId,
  })
}

export function useInviteMember(teamId: string) {
  const invalidate = useInvalidateTeam(teamId)
  return useMutation({
    mutationFn: ({ email, roleId, kartIds }: { email: string; roleId: string; kartIds: string[] }) =>
      backend.inviteMember(teamId, email, roleId, kartIds),
    onSuccess: invalidate,
  })
}

export function useCancelInvitation(teamId: string) {
  const invalidate = useInvalidateTeam(teamId)
  return useMutation({ mutationFn: (id: string) => backend.cancelInvitation(id), onSuccess: invalidate })
}

export function useUpdateMember(teamId: string) {
  const invalidate = useInvalidateTeam(teamId)
  return useMutation({
    mutationFn: ({ membershipId, roleId, kartIds }: { membershipId: string; roleId: string; kartIds: string[] }) =>
      backend.updateMember(membershipId, roleId, kartIds),
    onSuccess: invalidate,
  })
}

export function useRemoveMember(teamId: string) {
  const invalidate = useInvalidateTeam(teamId)
  return useMutation({ mutationFn: (id: string) => backend.removeMember(id), onSuccess: invalidate })
}

export function useSaveRole(teamId: string) {
  const invalidate = useInvalidateTeam(teamId)
  return useMutation({ mutationFn: (input: RoleInput) => backend.saveRole(teamId, input), onSuccess: invalidate })
}

export function useDeleteRole(teamId: string) {
  const invalidate = useInvalidateTeam(teamId)
  return useMutation({ mutationFn: (roleId: string) => backend.deleteRole(roleId), onSuccess: invalidate })
}

/**
 * Počká na mutáciu bez neošetrenej chyby – chybu zobrazí stav mutácie (isError).
 * Pri neúspechu vráti ok: false, aby sa nevykonal krok, ktorý nasleduje (napr. zatvorenie panela).
 */
export async function safe<T>(promise: Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    return { ok: true, value: await promise }
  } catch {
    return { ok: false }
  }
}
