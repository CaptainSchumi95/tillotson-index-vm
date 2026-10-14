import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { backend } from '.'
import { useCan } from './queries'
import type { TrackInput, TrackSetupInput } from './types'

export const tk = {
  tracks: (teamId: string) => ['tracks', teamId] as const,
  setups: (teamId: string) => ['tracks', 'setups', teamId] as const,
}

/** Spoločné trate + vlastné trate tímu (zoradené podľa názvu). */
export function useTracks(teamId: string | undefined) {
  return useQuery({ queryKey: tk.tracks(teamId ?? ''), queryFn: () => backend.listTracks(teamId!), enabled: !!teamId })
}

export function useSaveTrack(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: TrackInput) => backend.saveTrack(teamId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: tk.tracks(teamId) }),
  })
}

export function useDeleteTrack(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => backend.deleteTrack(id),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: tk.tracks(teamId) }),
        qc.invalidateQueries({ queryKey: tk.setups(teamId) }),
      ]),
  })
}

/** Setupy k tratiam tímu (iba s oprávnením track.view). */
export function useTrackSetups(teamId: string | undefined) {
  const can = useCan()
  return useQuery({
    queryKey: tk.setups(teamId ?? ''),
    queryFn: () => backend.listTrackSetups(teamId!),
    enabled: !!teamId && can('track.view'),
  })
}

export function useSaveTrackSetup(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: TrackSetupInput) => backend.saveTrackSetup(teamId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: tk.setups(teamId) }),
  })
}

export function useDeleteTrackSetup(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => backend.deleteTrackSetup(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: tk.setups(teamId) }),
  })
}
