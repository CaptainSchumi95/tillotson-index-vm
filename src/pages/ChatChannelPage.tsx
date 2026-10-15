import { Fragment, useEffect, useRef, useState } from 'react'
import { Link, useParams, useRouter } from '@tanstack/react-router'
import { ArrowUp, ChevronLeft, Lock, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useChannelInfo } from '@/components/chat/chatHelpers'
import { Card } from '@/components/ui/Card'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { Avatar } from '@/components/ui/Identity'
import { FullScreenLoader } from '@/components/ui/Spinner'
import { useChatOverview, useDeleteMessage, useMarkRead, useMessages, useSendMessage } from '@/data/chat'
import { useCan, useCurrentTeam, useProfile } from '@/data/queries'
import type { ChatMessage } from '@/data/types'
import { cn } from '@/lib/cn'

const GROUP_MS = 5 * 60_000

function dayKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** Konverzácia (/chat/$channelId). */
export function ChatChannelPage() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const { channelId } = useParams({ strict: false }) as { channelId: string }
  const { team } = useCurrentTeam()
  const can = useCan()
  const me = useProfile().data
  const overview = useChatOverview(team?.id)
  const messages = useMessages(channelId)
  const send = useSendMessage()
  const markRead = useMarkRead(team?.id ?? '')
  const del = useDeleteMessage(team?.id ?? '', channelId)
  const info = useChannelInfo()
  const [text, setText] = useState('')
  const [toDelete, setToDelete] = useState<ChatMessage | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const channel = overview.data?.find((c) => c.id === channelId)
  const list = messages.data ?? []
  const lastId = list.at(-1)?.id

  // Pri otvorení a pri každej novej správe: dole + označiť ako prečítané.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
    if (channel && channel.unread > 0) markRead.mutate(channelId)
  }, [lastId, channel?.unread])

  useEffect(() => {
    if (channel) void markRead.mutate(channelId)
  }, [channelId, !!channel])

  // Pole na písanie sa zväčšuje s textom (max ~5 riadkov).
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }, [text])

  if (overview.isPending || messages.isPending) return <FullScreenLoader />
  // Konverzácia iného tímu (napr. po prepnutí tímu) sa tu neotvorí.
  if (!team || !channel) return null

  const isBoard = channel.kind === 'announcements'

  function submit() {
    const body = text.trim()
    if (!body || !team) return
    send.mutate({ id: crypto.randomUUID(), teamId: team.id, channelId, body, createdAt: new Date().toISOString() })
    setText('')
    inputRef.current?.focus()
  }

  const canDelete = (m: ChatMessage) => !m.pending && (m.authorId === me?.id || can('team.manage'))
  const time = (iso: string) => new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
  const dayLabel = (iso: string) => {
    const d = new Date(iso)
    const today = new Date()
    const yesterday = new Date(Date.now() - 86_400_000)
    if (dayKey(iso) === dayKey(today.toISOString())) return t('chat.today')
    if (dayKey(iso) === dayKey(yesterday.toISOString())) return t('chat.yesterday')
    return new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
  }

  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col lg:min-h-[calc(100dvh-64px)]">
      {/* Hlavička konverzácie */}
      <header className="sticky top-16 z-20 -mx-4 mb-2 flex items-center gap-3 border-b border-line bg-bg/90 px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10">
        <button
          type="button"
          onClick={() => router.history.back()}
          aria-label={t('common.back')}
          className="-ml-2 grid size-10 shrink-0 place-items-center rounded-full text-accent-ink hover:bg-accent-soft"
        >
          <ChevronLeft className="size-6" />
        </button>
        {info.icon(channel)}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold leading-tight">{info.title(channel)}</span>
          <span className="block truncate text-[0.82rem] text-ink-3">
            {channel.kind === 'announcements' ? t('chat.announcementsHint') : channel.kind === 'team' ? t('chat.teamHint') : ''}
          </span>
        </span>
        {isBoard && can('team.manage') && (
          <Link
            to="/chat/$channelId/settings"
            params={{ channelId }}
            aria-label={t('chat.settings')}
            className="grid size-10 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-sunken"
          >
            <Settings className="size-5" />
          </Link>
        )}
      </header>

      {/* Správy */}
      <div className="flex-1 space-y-1 pb-4">
        {list.length === 0 && (
          <p className="py-16 text-center text-ink-3">
            {isBoard ? t('chat.noMessagesAnnouncements') : t('chat.noMessages')}
          </p>
        )}
        {list.map((m, i) => {
          const prev = list[i - 1]
          const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt)
          const grouped =
            !newDay && !isBoard && prev.authorId === m.authorId &&
            new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_MS
          const mine = m.authorId === me?.id
          const author = info.memberOf(m.authorId)
          const name = mine ? t('chat.you') : author?.profile.name || t('chat.unknown')

          return (
            <Fragment key={m.id}>
              {newDay && (
                <div className="flex justify-center py-3">
                  <span className="rounded-full bg-sunken px-3 py-1 text-[0.75rem] font-semibold text-ink-2 first-letter:uppercase">
                    {dayLabel(m.createdAt)}
                  </span>
                </div>
              )}

              {isBoard ? (
                // Nástenka: oznam ako karta
                <Card
                  className={cn('mb-3 p-4', canDelete(m) && 'cursor-pointer')}
                  onClick={canDelete(m) ? () => setToDelete(m) : undefined}
                >
                  <div className="mb-2 flex items-center gap-2.5">
                    <Avatar name={author?.profile.name || '?'} url={author?.profile.avatarUrl} size="sm" />
                    <span className="min-w-0 flex-1 truncate font-semibold">{name}</span>
                    <span className="text-[0.78rem] text-ink-3">{m.pending ? t('chat.sending') : time(m.createdAt)}</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{m.body}</p>
                </Card>
              ) : (
                // Skupina a priame správy: bubliny
                <div className={cn('flex items-end gap-2', mine ? 'justify-end' : 'justify-start', !grouped && 'pt-2')}>
                  {!mine && (
                    <span className="w-8 shrink-0">
                      {!grouped && <Avatar name={author?.profile.name || '?'} url={author?.profile.avatarUrl} size="sm" />}
                    </span>
                  )}
                  <div className={cn('flex max-w-[78%] flex-col', mine ? 'items-end' : 'items-start')}>
                    {!grouped && !mine && channel.kind === 'team' && (
                      <span className="mb-0.5 px-3 text-[0.78rem] font-semibold text-ink-2">{name}</span>
                    )}
                    <button
                      type="button"
                      disabled={!canDelete(m)}
                      onClick={() => setToDelete(m)}
                      className={cn(
                        'rounded-[20px] px-4 py-2.5 text-left leading-snug break-words whitespace-pre-wrap',
                        mine ? 'rounded-br-[6px] bg-accent text-on-accent' : 'rounded-bl-[6px] border border-line bg-surface',
                        m.pending && 'opacity-60',
                      )}
                    >
                      {m.body}
                    </button>
                    {(!list[i + 1] || list[i + 1].authorId !== m.authorId) && (
                      <span className="mt-1 px-2 text-[0.72rem] text-ink-3">{m.pending ? t('chat.sending') : time(m.createdAt)}</span>
                    )}
                  </div>
                </div>
              )}
            </Fragment>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Písanie – vždy dole */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-line bg-bg/92 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10 lg:pb-6">
        {channel.canPost ? (
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 4000))}
              onKeyDown={(e) => {
                // Na počítači Enter odošle, Shift+Enter nový riadok.
                if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(pointer: fine)').matches) {
                  e.preventDefault()
                  submit()
                }
              }}
              placeholder={isBoard ? t('chat.placeholderAnnouncements') : t('chat.placeholder')}
              aria-label={t('chat.placeholder')}
              className="max-h-[140px] min-h-[48px] flex-1 resize-none rounded-[24px] border border-line-strong bg-surface px-4 py-3 leading-snug outline-none placeholder:text-ink-3 focus:border-accent"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!text.trim()}
              aria-label={t('chat.send')}
              className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-on-accent transition-[opacity,transform] active:scale-95 disabled:opacity-35"
            >
              <ArrowUp className="size-6" strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-[16px] bg-sunken px-4 py-3 text-[0.9rem] text-ink-2">
            <Lock className="size-4 shrink-0" />
            {t('chat.readOnly')}
          </div>
        )}
      </div>

      <ConfirmSheet
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t('chat.deleteMessage')}
        body={toDelete ? `„${toDelete.body.slice(0, 120)}“ – ${t('chat.deleteConfirm')}` : ''}
        confirmLabel={t('chat.deleteMessage')}
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete.id)
          setToDelete(null)
        }}
      />
    </div>
  )
}
