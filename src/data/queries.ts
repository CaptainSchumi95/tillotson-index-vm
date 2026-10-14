import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkspace } from '@/state/workspace'
import { backend } from '.'
import type { KartInput, Permission, ProfilePatch, TeamPatch } from './types'

export const qk = {
  profile: ['profile'] as const,
  teams: ['teams'] as const,
  members: (teamId: string) => ['members', teamId] as const,
  karts: (teamId: string) => ['karts', teamId] as const,
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
