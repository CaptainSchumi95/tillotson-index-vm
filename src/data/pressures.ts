import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { backend } from '.'
import { qk, useCan, useProfile } from './queries'
import type { PressureOrder, PressureOrderInput, SetupRevision, SetupRevisionInput } from './types'

export const pk = {
  samples: (teamId: string) => ['pressures', 'samples', teamId] as const,
  orders: (teamId: string) => ['pressures', 'orders', teamId] as const,
}

export const COMPLETE_ORDER_KEY = ['pressures', 'complete'] as const

/** Merania tlakov celého tímu (pre výpočet a štatistiku). */
export function usePressureSamples(teamId: string | undefined) {
  const can = useCan()
  return useQuery({
    queryKey: pk.samples(teamId ?? ''),
    queryFn: () => backend.listPressureSamples(teamId!),
    enabled: !!teamId && can('setup.view'),
  })
}

/**
 * Príkazy na natlakovanie. Obnovujú sa samé, aby mechanik videl nové tlaky
 * od inžiniera bez obnovenia stránky.
 */
export function usePressureOrders(teamId: string | undefined) {
  const can = useCan()
  return useQuery({
    queryKey: pk.orders(teamId ?? ''),
    queryFn: () => backend.listPressureOrders(teamId!),
    enabled: !!teamId && can('setup.view'),
    refetchInterval: 20_000,
  })
}

/** Nevybavený príkaz pre motokáru (najnovší). */
export function pendingOrderFor(orders: PressureOrder[] | undefined, kartId: string | undefined) {
  return orders?.find((o) => o.kartId === kartId && o.status === 'pending') ?? null
}

/** Posledný odoslaný alebo vybavený príkaz motokáry (na zobrazenie stavu inžinierovi). */
export function lastOrderFor(orders: PressureOrder[] | undefined, kartId: string) {
  return orders?.find((o) => o.kartId === kartId && (o.status === 'pending' || o.status === 'done')) ?? null
}

export function useSendPressureOrders(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orders: PressureOrderInput[]) => backend.sendPressureOrders(orders),
    onSuccess: () => qc.invalidateQueries({ queryKey: pk.orders(teamId) }),
  })
}

export function useCancelPressureOrder(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => backend.cancelPressureOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: pk.orders(teamId) }),
  })
}

export interface CompleteOrderInput {
  teamId: string
  orderId: string
  revision: SetupRevisionInput
}

/**
 * Mechanik natlakoval – okamžite v rozhraní, odoslanie aj offline
 * (mutationFn v main.tsx, rovnaká fronta ako setup).
 */
export function useCompletePressureOrder() {
  const qc = useQueryClient()
  const p = useProfile().data
  return useMutation({
    mutationKey: COMPLETE_ORDER_KEY,
    onMutate: async (input: CompleteOrderInput) => {
      const me = p ? { id: p.id, name: p.name, avatarUrl: p.avatarUrl } : null
      await qc.cancelQueries({ queryKey: pk.orders(input.teamId) })
      qc.setQueryData<PressureOrder[]>(pk.orders(input.teamId), (cur) =>
        cur?.map((o) =>
          o.id === input.orderId ? { ...o, status: 'done', doneBy: me, doneAt: new Date().toISOString() } : o,
        ),
      )
      qc.setQueryData<SetupRevision[]>(qk.setup(input.revision.kartId), (cur) => [
        { ...input.revision, author: me, pending: true },
        ...(cur ?? []),
      ])
    },
  })
}
