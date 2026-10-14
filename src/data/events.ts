import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { todayIso } from '@/lib/time'
import { backend } from '.'
import { useProfile } from './queries'
import type { ChecklistCheck, ChecklistItem, CheckInput, EventInput, ScheduleItem, TeamEvent } from './types'

export const ek = {
  events: (teamId: string) => ['events', teamId] as const,
  schedule: (eventId: string) => ['events', 'schedule', eventId] as const,
  checklist: (teamId: string) => ['checklist', 'items', teamId] as const,
  checks: (eventId: string, kartId: string) => ['checklist', 'checks', eventId, kartId] as const,
}

export const TOGGLE_CHECK_KEY = ['checklist', 'toggle'] as const
export const SET_ROUND_KEY = ['checklist', 'round'] as const

// ───────────── Pomocné ─────────────

export function isActive(e: Pick<TeamEvent, 'dateFrom' | 'dateTo'>, today = todayIso()) {
  return e.dateFrom <= today && today <= e.dateTo
}

export function isUpcoming(e: Pick<TeamEvent, 'dateTo'>, today = todayIso()) {
  return e.dateTo >= today
}

/** Udalosť, ktorá sa motokáry týka práve teraz – inak najbližšia budúca. */
export function currentEventFor(events: TeamEvent[] | undefined, kartId: string | undefined) {
  if (!events || !kartId) return null
  const mine = events.filter((e) => e.karts.some((k) => k.kartId === kartId))
  return (
    mine.find((e) => isActive(e)) ??
    mine.filter((e) => isUpcoming(e)).sort((a, b) => a.dateFrom.localeCompare(b.dateFrom))[0] ??
    null
  )
}

// ───────────── Udalosti ─────────────

export function useEvents(teamId: string | undefined) {
  return useQuery({ queryKey: ek.events(teamId ?? ''), queryFn: () => backend.listEvents(teamId!), enabled: !!teamId })
}

export function useSaveEvent(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: EventInput) => backend.saveEvent(teamId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ek.events(teamId) }),
  })
}

export function useDeleteEvent(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => backend.deleteEvent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ek.events(teamId) }),
  })
}

// ───────────── Harmonogram ─────────────

export function useSchedule(eventId: string | undefined) {
  return useQuery({ queryKey: ek.schedule(eventId ?? ''), queryFn: () => backend.listSchedule(eventId!), enabled: !!eventId })
}

export function useSaveScheduleItem(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<ScheduleItem, 'id' | 'eventId'> & { id?: string }) => backend.saveScheduleItem({ ...input, eventId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ek.schedule(eventId) }),
  })
}

export function useDeleteScheduleItem(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => backend.deleteScheduleItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ek.schedule(eventId) }),
  })
}

// ───────────── Checklist ─────────────

export function useChecklistItems(teamId: string | undefined) {
  return useQuery({ queryKey: ek.checklist(teamId ?? ''), queryFn: () => backend.listChecklistItems(teamId!), enabled: !!teamId })
}

export function useSaveChecklistItem(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<ChecklistItem, 'id'> & { id?: string }) => backend.saveChecklistItem(teamId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ek.checklist(teamId) }),
  })
}

export function useDeleteChecklistItem(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => backend.deleteChecklistItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ek.checklist(teamId) }),
  })
}

export function useChecks(eventId: string | undefined, kartId: string | undefined) {
  return useQuery({
    queryKey: ek.checks(eventId ?? '', kartId ?? ''),
    queryFn: () => backend.listChecks(eventId!, kartId!),
    enabled: !!eventId && !!kartId,
  })
}

/** Odškrtnutie – okamžite v rozhraní, odoslanie aj offline (mutationFn v main.tsx). */
export function useToggleCheck() {
  const qc = useQueryClient()
  const p = useProfile().data
  return useMutation({
    mutationKey: TOGGLE_CHECK_KEY,
    onMutate: async (input: CheckInput) => {
      const key = ek.checks(input.eventId, input.kartId)
      await qc.cancelQueries({ queryKey: key })
      qc.setQueryData<ChecklistCheck[]>(key, (cur = []) => {
        const rest = cur.filter((c) => !(c.itemId === input.itemId && c.round === input.round))
        if (!input.done) return rest
        const doneBy = p ? { id: p.id, name: p.name, avatarUrl: p.avatarUrl } : null
        return [...rest, { itemId: input.itemId, round: input.round, doneBy, doneAt: new Date().toISOString(), pending: true }]
      })
    },
  })
}

export interface RoundInput {
  teamId: string
  eventId: string
  kartId: string
  round: number
}

/** Ďalšia jazda – Pred/Po jazde sa začne odznova. */
export function useSetRound() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: SET_ROUND_KEY,
    onMutate: async (input: RoundInput) => {
      await qc.cancelQueries({ queryKey: ek.events(input.teamId) })
      qc.setQueryData<TeamEvent[]>(ek.events(input.teamId), (cur) =>
        cur?.map((e) =>
          e.id !== input.eventId
            ? e
            : { ...e, karts: e.karts.map((k) => (k.kartId === input.kartId ? { ...k, round: input.round } : k)) },
        ),
      )
    },
  })
}

/** Najbližší bod programu, ktorý ešte nezačal (dnes neskôr alebo v ďalšie dni). */
export function nextScheduleItem<T extends { day: string; time: string | null }>(items: T[] | undefined, today: string, now: string) {
  return items?.find((i) => i.day > today || (i.day === today && (i.time ?? '') >= now))
}
