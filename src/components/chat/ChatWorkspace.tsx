import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ChevronLeft, Lock, MessagesSquare, Settings, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PushPrompt } from '@/components/PushPrompt'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { TeamBadge } from '@/components/ui/Identity'
import {
  useChatOverview,
  useDeleteMessage,
  useEditMessage,
  useMarkRead,
  useMessages,
  useSendMessage,
  useToggleReaction,
} from '@/data/chat'
import { useCan, useCurrentTeam, useProfile } from '@/data/queries'
import type { ChatMessage } from '@/data/types'
import { cn } from '@/lib/cn'
import { useWorkspace } from '@/state/workspace'
import { ChannelList } from './ChannelList'
import { useChannelInfo } from './chatHelpers'
import { Composer, type ComposerHandle } from './Composer'
import { MessageActions } from './MessageActions'
import { MessageRow } from './MessageRow'

const GROUP_MS = 7 * 60_000

/** Výška viditeľnej časti obrazovky – na mobile sa zmenší o klávesnicu. */
function useVisualViewport() {
  const [vv, setVv] = useState(() => ({ height: window.visualViewport?.height ?? window.innerHeight, top: 0 }))
  useEffect(() => {
    const v = window.visualViewport
    if (!v) return
    const update = () => setVv({ height: v.height, top: v.offsetTop })
    v.addEventListener('resize', update)
    v.addEventListener('scroll', update)
    return () => {
      v.removeEventListener('resize', update)
      v.removeEventListener('scroll', update)
    }
  }, [])
  return vv
}

function dayKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/**
 * Prostredie správ – samostatné, na celú obrazovku (ako Discord).
 * Mobil: zoznam alebo konverzácia. Počítač: zoznam vľavo, konverzácia vpravo.
 */
export function ChatWorkspace({ activeId }: { activeId: string | null }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { team, teams } = useCurrentTeam()
  const selectTeam = useWorkspace((s) => s.selectTeam)
  const lastSection = useWorkspace((s) => s.lastSection)
  const search = useSearch({ strict: false }) as { team?: string }
  const vv = useVisualViewport()

  // Odkaz z upozornenia môže patriť inému tímu – prepneme naň (ak v ňom človek je).
  useEffect(() => {
    if (search.team && search.team !== team?.id && teams.data?.some((x) => x.id === search.team)) selectTeam(search.team)
  }, [search.team, team?.id, teams.data, selectTeam])

  if (!team) return null
  const open = (id: string) => void navigate({ to: '/chat/$channelId', params: { channelId: id } })

  return (
    <div
      className="fixed inset-x-0 top-0 z-40 flex bg-surface lg:left-[280px]"
      style={{ height: vv.height, transform: `translateY(${vv.top}px)` }}
    >
      {/* Zoznam konverzácií */}
      <aside
        className={cn(
          'flex w-full flex-col border-line bg-surface-2 lg:w-[340px] lg:shrink-0 lg:border-r',
          activeId && 'hidden lg:flex',
        )}
      >
        <header className="flex min-h-[64px] items-center gap-3 border-b border-line px-4 pt-[calc(10px+env(safe-area-inset-top))] pb-2.5">
          <TeamBadge name={team.name} color={team.color} iconUrl={team.iconUrl} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="display block text-[1.15rem]">{t('chat.title')}</span>
            <span className="block truncate text-[0.8rem] text-ink-3">{team.name}</span>
          </span>
          <button
            type="button"
            aria-label={t('chat.close')}
            onClick={() => void navigate({ to: lastSection || '/home' })}
            className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-sunken lg:hidden"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-2 py-4">
          <PushPrompt compact className="mx-1" />
          <ChannelList activeId={activeId} onOpen={open} />
        </div>
      </aside>

      {/* Konverzácia */}
      {activeId ? (
        <Conversation key={activeId} channelId={activeId} teamId={team.id} />
      ) : (
        <div className="hidden flex-1 flex-col items-center justify-center gap-3 text-ink-3 lg:flex">
          <MessagesSquare className="size-10" />
          {t('chat.pickChannel')}
        </div>
      )}
    </div>
  )
}

function Conversation({ channelId, teamId }: { channelId: string; teamId: string }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const can = useCan()
  const me = useProfile().data
  const overview = useChatOverview(teamId)
  const messages = useMessages(channelId)
  const send = useSendMessage()
  const edit = useEditMessage(channelId)
  const react = useToggleReaction(channelId)
  const markRead = useMarkRead(teamId)
  const del = useDeleteMessage(teamId, channelId)
  const info = useChannelInfo()
  const scroller = useRef<HTMLDivElement>(null)
  const composer = useRef<ComposerHandle>(null)
  const pinned = useRef(true)
  const [actionsFor, setActionsFor] = useState<ChatMessage | null>(null)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [editing, setEditing] = useState<ChatMessage | null>(null)
  const [toDelete, setToDelete] = useState<ChatMessage | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const channel = overview.data?.find((c) => c.id === channelId)
  const list = messages.data ?? []
  const byId = useMemo(() => new Map(list.map((m) => [m.id, m])), [list])
  const lastId = list.at(-1)?.id
  const myId = me?.id ?? ''

  // Nová správa: ak bol človek dole (alebo ju poslal sám), ostane dole.
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const last = list.at(-1)
    if (pinned.current || last?.authorId === myId) el.scrollTop = el.scrollHeight
  }, [lastId, list.length])

  // Otvorenie a výška klávesnice: držať koniec konverzácie.
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      if (pinned.current) el.scrollTop = el.scrollHeight
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [messages.isPending])

  useEffect(() => {
    if (channel && channel.unread > 0) markRead.mutate(channelId)
  }, [channelId, channel?.unread, lastId])

  if (!channel) return <div className="flex-1" />

  const isBoard = channel.kind === 'announcements'
  const nameOf = (profileId: string | null) =>
    profileId === myId ? t('chat.you') : info.memberOf(profileId)?.profile.name || t('chat.unknown')
  const canDelete = (m: ChatMessage) => !m.pending && (m.authorId === myId || can('team.manage'))

  const toggleReact = (m: ChatMessage, emoji: string) => {
    if (m.pending) return
    const on = !m.reactions.find((r) => r.emoji === emoji)?.profileIds.includes(myId)
    react.mutate({ messageId: m.id, emoji, on })
  }

  const startReply = (m: ChatMessage) => {
    setEditing(null)
    setReplyTo(m)
    composer.current?.focus()
  }

  const startEdit = (m: ChatMessage) => {
    setReplyTo(null)
    setEditing(m)
    composer.current?.setText(m.body)
  }

  const jump = (id: string) => {
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setFlash(id)
    setTimeout(() => setFlash(null), 1600)
  }

  const onSend = (body: string) => {
    if (editing) {
      if (body !== editing.body) edit.mutate({ id: editing.id, body })
      setEditing(null)
      return
    }
    pinned.current = true
    send.mutate({
      id: crypto.randomUUID(),
      teamId,
      channelId,
      body,
      createdAt: new Date().toISOString(),
      replyTo: replyTo?.id ?? null,
    })
    setReplyTo(null)
  }

  const dayLabel = (iso: string) => {
    if (dayKey(iso) === dayKey(new Date().toISOString())) return t('chat.today')
    if (dayKey(iso) === dayKey(new Date(Date.now() - 86_400_000).toISOString())) return t('chat.yesterday')
    return new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso))
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-surface">
      <header className="flex min-h-[64px] items-center gap-3 border-b border-line px-3 pt-[calc(10px+env(safe-area-inset-top))] pb-2.5 lg:px-5">
        <button
          type="button"
          onClick={() => void navigate({ to: '/chat' })}
          aria-label={t('common.back')}
          className="grid size-10 shrink-0 place-items-center rounded-full text-accent-ink hover:bg-accent-soft lg:hidden"
        >
          <ChevronLeft className="size-6" />
        </button>
        {info.icon(channel)}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold leading-tight">{info.title(channel)}</span>
          <span className="block truncate text-[0.8rem] text-ink-3">
            {isBoard ? t('chat.announcementsHint') : channel.kind === 'team' ? t('chat.teamHint') : t('chat.direct')}
          </span>
        </span>
        {isBoard && can('team.manage') && (
          <Link
            to="/chat/$channelId/settings"
            params={{ channelId }}
            aria-label={t('chat.settings')}
            title={t('chat.settings')}
            className="grid size-10 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-sunken"
          >
            <Settings className="size-5" />
          </Link>
        )}
      </header>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-2 pb-4 lg:px-6"
      >
        {!messages.isPending && list.length === 0 && (
          <p className="py-16 text-center text-ink-3">{isBoard ? t('chat.noMessagesAnnouncements') : t('chat.noMessages')}</p>
        )}
        {list.map((m, i) => {
          const prev = list[i - 1]
          const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt)
          const grouped =
            !newDay &&
            !!prev &&
            prev.authorId === m.authorId &&
            new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_MS
          const replied = m.replyTo ? (byId.get(m.replyTo) ?? null) : undefined
          return (
            <div key={m.id}>
              {newDay && (
                <div className="my-4 flex items-center gap-3 text-[0.75rem] font-semibold text-ink-3">
                  <span className="h-px flex-1 bg-line" />
                  <span className="first-letter:uppercase">{dayLabel(m.createdAt)}</span>
                  <span className="h-px flex-1 bg-line" />
                </div>
              )}
              <MessageRow
                message={m}
                author={info.memberOf(m.authorId)}
                mine={m.authorId === myId}
                me={myId}
                grouped={grouped}
                replied={replied}
                repliedAuthor={replied ? nameOf(replied.authorId) : ''}
                highlight={flash === m.id}
                onActions={setActionsFor}
                onReact={toggleReact}
                onReply={startReply}
                onJump={jump}
                memberName={(id) => nameOf(id)}
              />
            </div>
          )
        })}
      </div>

      <div className="border-t border-line bg-surface px-3 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] lg:px-5 lg:pb-4">
        {channel.canPost ? (
          <Composer
            ref={composer}
            placeholder={isBoard ? t('chat.placeholderAnnouncements') : t('chat.placeholder')}
            onSend={onSend}
            replyTo={replyTo ? { name: nameOf(replyTo.authorId), body: replyTo.body } : null}
            editing={!!editing}
            onCancelContext={() => {
              setReplyTo(null)
              setEditing(null)
            }}
          />
        ) : (
          <div className="flex items-center gap-3 rounded-[16px] bg-sunken px-4 py-3 text-[0.9rem] text-ink-2">
            <Lock className="size-4 shrink-0" />
            {t('chat.readOnly')}
          </div>
        )}
      </div>

      <MessageActions
        message={actionsFor}
        canEdit={!!actionsFor && actionsFor.authorId === myId && channel.canPost}
        canDelete={!!actionsFor && canDelete(actionsFor)}
        myReactions={actionsFor?.reactions.filter((r) => r.profileIds.includes(myId)).map((r) => r.emoji) ?? []}
        onClose={() => setActionsFor(null)}
        onReact={(emoji) => actionsFor && toggleReact(actionsFor, emoji)}
        onReply={() => actionsFor && channel.canPost && startReply(actionsFor)}
        onEdit={() => actionsFor && startEdit(actionsFor)}
        onDelete={() => setToDelete(actionsFor)}
      />

      <ConfirmSheet
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t('chat.deleteMessage')}
        body={t('chat.deleteConfirm')}
        confirmLabel={t('chat.deleteMessage')}
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete.id)
          setToDelete(null)
        }}
      />
    </section>
  )
}
