import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { backend } from '.'
import { useProfile } from './queries'
import type { ChatChannel, ChatMessage, MessageInput } from './types'

export const ck = {
  overview: (teamId: string) => ['chat', 'overview', teamId] as const,
  messages: (channelId: string) => ['chat', 'messages', channelId] as const,
}

export const SEND_MESSAGE_KEY = ['chat', 'send'] as const

/** Konverzácie aktuálneho tímu (poistka obnovy, ak by výpadok zastavil živé doručovanie). */
export function useChatOverview(teamId: string | undefined) {
  return useQuery({
    queryKey: ck.overview(teamId ?? ''),
    queryFn: () => backend.chatOverview(teamId!),
    enabled: !!teamId,
    refetchInterval: 30_000,
  })
}

export function useMessages(channelId: string | undefined) {
  return useQuery({
    queryKey: ck.messages(channelId ?? ''),
    queryFn: () => backend.listMessages(channelId!),
    enabled: !!channelId,
    refetchInterval: 20_000,
  })
}

/** Súčet neprečítaných správ – odznak pri ikone správ. */
export function useUnreadTotal(teamId: string | undefined) {
  const overview = useChatOverview(teamId)
  return (overview.data ?? []).reduce((s, c) => s + c.unread, 0)
}

/**
 * Živé doručovanie nových správ pre aktuálny tím. Pri prepnutí tímu sa odber
 * zruší a začne nový – správy iného tímu sa sem nedostanú.
 */
export function useChatLive(teamId: string | undefined) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!teamId) return
    return backend.subscribeChat(
      teamId,
      (m) => {
        qc.setQueryData<ChatMessage[]>(ck.messages(m.channelId), (cur) =>
          cur ? [...cur.filter((x) => x.id !== m.id), m] : cur,
        )
        void qc.invalidateQueries({ queryKey: ck.overview(teamId) })
      },
      (channelId) => {
        void qc.invalidateQueries({ queryKey: ck.messages(channelId) })
        void qc.invalidateQueries({ queryKey: ck.overview(teamId) })
      },
    )
  }, [teamId, qc])
}

/** Odoslanie – okamžite v konverzácii, pri slabom signáli počká (mutationFn v main.tsx). */
export function useSendMessage() {
  const qc = useQueryClient()
  const me = useProfile().data
  return useMutation({
    mutationKey: SEND_MESSAGE_KEY,
    onMutate: async (input: MessageInput) => {
      await qc.cancelQueries({ queryKey: ck.messages(input.channelId) })
      const optimistic: ChatMessage = {
        id: input.id,
        channelId: input.channelId,
        authorId: me?.id ?? null,
        body: input.body,
        createdAt: input.createdAt,
        replyTo: input.replyTo,
        editedAt: null,
        reactions: [],
        pending: true,
      }
      qc.setQueryData<ChatMessage[]>(ck.messages(input.channelId), (cur = []) => [...cur, optimistic])
      qc.setQueryData<ChatChannel[]>(ck.overview(input.teamId), (cur) =>
        cur?.map((c) =>
          c.id === input.channelId ? { ...c, lastBody: input.body, lastAt: input.createdAt, lastAuthorId: me?.id ?? null } : c,
        ),
      )
    },
  })
}

export function useDeleteMessage(teamId: string, channelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => backend.deleteMessage(id),
    onMutate: (id) => qc.setQueryData<ChatMessage[]>(ck.messages(channelId), (cur) => cur?.filter((m) => m.id !== id)),
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ck.messages(channelId) }),
        qc.invalidateQueries({ queryKey: ck.overview(teamId) }),
      ]),
  })
}

/** Označí konverzáciu ako prečítanú (odznak zmizne hneď). */
export function useMarkRead(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (channelId: string) => backend.markRead(channelId),
    onMutate: (channelId) =>
      qc.setQueryData<ChatChannel[]>(ck.overview(teamId), (cur) => cur?.map((c) => (c.id === channelId ? { ...c, unread: 0 } : c))),
  })
}

export function useOpenDirect(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (profileId: string) => backend.openDirect(teamId, profileId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ck.overview(teamId) }),
  })
}

export function useUpdatePosters(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ channelId, roleIds, profileIds }: { channelId: string; roleIds: string[]; profileIds: string[] }) =>
      backend.updatePosters(channelId, roleIds, profileIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ck.overview(teamId) }),
  })
}

/** Úprava vlastnej správy – okamžite v konverzácii. */
export function useEditMessage(channelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => backend.editMessage(id, body),
    onMutate: ({ id, body }) =>
      qc.setQueryData<ChatMessage[]>(ck.messages(channelId), (cur) =>
        cur?.map((m) => (m.id === id ? { ...m, body, editedAt: new Date().toISOString() } : m)),
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: ck.messages(channelId) }),
  })
}

/** Pridanie / odobratie reakcie – okamžite v konverzácii. */
export function useToggleReaction(channelId: string) {
  const qc = useQueryClient()
  const me = useProfile().data?.id ?? ''
  return useMutation({
    mutationFn: ({ messageId, emoji, on }: { messageId: string; emoji: string; on: boolean }) =>
      backend.toggleReaction(messageId, emoji, on),
    onMutate: ({ messageId, emoji, on }) =>
      qc.setQueryData<ChatMessage[]>(ck.messages(channelId), (cur) =>
        cur?.map((m) => {
          if (m.id !== messageId) return m
          const rest = m.reactions.map((r) => (r.emoji === emoji ? { ...r, profileIds: r.profileIds.filter((x) => x !== me) } : r))
          const withMine = on
            ? rest.some((r) => r.emoji === emoji)
              ? rest.map((r) => (r.emoji === emoji ? { ...r, profileIds: [...r.profileIds, me] } : r))
              : [...rest, { emoji, profileIds: [me] }]
            : rest
          return { ...m, reactions: withMine.filter((r) => r.profileIds.length > 0) }
        }),
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: ck.messages(channelId) }),
  })
}
