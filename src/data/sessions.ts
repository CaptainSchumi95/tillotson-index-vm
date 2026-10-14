import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { backend } from '.'
import { useProfile } from './queries'
import type { Session, SessionInput } from './types'

export const sk = {
  sessions: (kartId: string) => ['sessions', kartId] as const,
}

export const SAVE_SESSION_KEY = ['sessions', 'save'] as const

/** Jazdy motokáry naprieč udalosťami, najnovšia prvá. */
export function useSessions(kartId: string | undefined) {
  return useQuery({ queryKey: sk.sessions(kartId ?? ''), queryFn: () => backend.listSessions(kartId!), enabled: !!kartId })
}

/** Predchádzajúca jazda tej istej motokáry (podľa času), alebo null. */
export function previousSession(all: Session[] | undefined, session: Session): Session | null {
  if (!all) return null
  return all.filter((s) => s.recordedAt < session.recordedAt).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null
}

/** Uloženie jazdy – okamžite v rozhraní, odoslanie aj offline (mutationFn v main.tsx). */
export function useSaveSession(kartId: string) {
  const qc = useQueryClient()
  const p = useProfile().data
  return useMutation({
    mutationKey: SAVE_SESSION_KEY,
    onMutate: async (input: SessionInput) => {
      await qc.cancelQueries({ queryKey: sk.sessions(kartId) })
      const author = p ? { id: p.id, name: p.name, avatarUrl: p.avatarUrl } : null
      qc.setQueryData<Session[]>(sk.sessions(kartId), (cur = []) => {
        const prev = cur.find((s) => s.id === input.id)
        const next: Session = { ...input, author: prev?.author ?? author, pending: true }
        return [next, ...cur.filter((s) => s.id !== input.id)].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
      })
    },
  })
}

export function useDeleteSession(kartId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => backend.deleteSession(id),
    onMutate: (id) => qc.setQueryData<Session[]>(sk.sessions(kartId), (cur) => cur?.filter((s) => s.id !== id)),
    onSettled: () => qc.invalidateQueries({ queryKey: sk.sessions(kartId) }),
  })
}

export function useSessionFeedback(kartId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => backend.setSessionFeedback(id, text),
    onMutate: ({ id, text }) =>
      qc.setQueryData<Session[]>(sk.sessions(kartId), (cur) => cur?.map((s) => (s.id === id ? { ...s, driverFeedback: text } : s))),
    onSettled: () => qc.invalidateQueries({ queryKey: sk.sessions(kartId) }),
  })
}
