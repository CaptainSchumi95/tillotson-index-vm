import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRoleName } from '@/components/team/pickers'
import { Avatar } from '@/components/ui/Identity'
import { ListGroup, ListRow } from '@/components/ui/ListRow'
import { Sheet } from '@/components/ui/Sheet'
import { useChatOverview, useOpenDirect } from '@/data/chat'
import { safe, useCurrentTeam, useMembers, useProfile } from '@/data/queries'
import type { ChatChannel } from '@/data/types'
import { cn } from '@/lib/cn'
import { relativeTime } from '@/lib/time'
import { UnreadBadge, useChannelInfo } from './chatHelpers'
import { plainText } from './Markdown'

/** Zoznam konverzácií tímu v štýle Discordu: kanály + priame správy. */
export function ChannelList({ activeId, onOpen }: { activeId: string | null; onOpen: (id: string) => void }) {
  const { t, i18n } = useTranslation()
  const { team } = useCurrentTeam()
  const me = useProfile().data
  const overview = useChatOverview(team?.id)
  const members = useMembers(team?.id)
  const openDirect = useOpenDirect(team?.id ?? '')
  const info = useChannelInfo()
  const roleName = useRoleName()
  const [picking, setPicking] = useState(false)

  const list = overview.data ?? []
  const channels = (['announcements', 'team'] as const)
    .map((k) => list.find((c) => c.kind === k))
    .filter((c): c is ChatChannel => !!c)
  const directs = list.filter((c) => c.kind === 'direct').sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? ''))
  const others = (members.data ?? []).filter((m) => m.profile.id !== me?.id)

  async function startDirect(profileId: string) {
    const r = await safe(openDirect.mutateAsync(profileId))
    if (!r.ok) return
    setPicking(false)
    onOpen(r.value)
  }

  const preview = (c: ChatChannel) => {
    if (!c.lastBody) return c.kind === 'announcements' ? t('chat.announcementsHint') : c.kind === 'team' ? t('chat.teamHint') : ''
    const who =
      c.lastAuthorId === me?.id ? t('chat.you') : c.kind === 'direct' ? null : info.memberOf(c.lastAuthorId)?.profile.name.split(' ')[0]
    return (who ? `${who}: ` : '') + plainText(c.lastBody)
  }

  const item = (c: ChatChannel) => {
    const active = c.id === activeId
    const unread = c.unread > 0
    return (
      <button
        key={c.id}
        type="button"
        onClick={() => onOpen(c.id)}
        className={cn(
          'flex w-full items-center gap-3 rounded-[14px] px-2.5 py-2 text-left transition-colors',
          active ? 'bg-accent-soft' : 'hover:bg-sunken',
        )}
      >
        {info.icon(c)}
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className={cn('min-w-0 flex-1 truncate', unread || active ? 'font-bold text-ink' : 'font-medium text-ink-2')}>
              {info.title(c)}
            </span>
            {c.lastAt && <span className="shrink-0 text-[0.72rem] text-ink-3">{relativeTime(c.lastAt, i18n.language, t('time.justNow'))}</span>}
          </span>
          <span className="flex items-center gap-2">
            <span className={cn('min-w-0 flex-1 truncate text-[0.85rem]', unread ? 'font-medium text-ink-2' : 'text-ink-3')}>
              {preview(c)}
            </span>
            <UnreadBadge count={c.unread} />
          </span>
        </span>
      </button>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow mb-1.5 px-2.5">{t('chat.channels')}</div>
        <div className="space-y-0.5">{channels.map(item)}</div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between px-2.5">
          <span className="eyebrow">{t('chat.direct')}</span>
          {others.length > 0 && (
            <button
              type="button"
              onClick={() => setPicking(true)}
              aria-label={t('chat.newMessage')}
              title={t('chat.newMessage')}
              className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-sunken hover:text-ink"
            >
              <Plus className="size-5" />
            </button>
          )}
        </div>
        <div className="space-y-0.5">
          {directs.map(item)}
          {directs.length === 0 && <p className="px-2.5 py-2 text-[0.88rem] text-ink-3">{t('chat.noDirect')}</p>}
        </div>
      </div>

      <Sheet open={picking} onOpenChange={setPicking} title={t('chat.newMessage')} description={t('chat.newMessageHint')}>
        <ListGroup>
          {others.map((m) => (
            <ListRow
              key={m.membershipId}
              leading={<Avatar name={m.profile.name || m.profile.email} url={m.profile.avatarUrl} />}
              title={m.profile.name || m.profile.email}
              subtitle={roleName(m.role)}
              onClick={() => void startDirect(m.profile.id)}
            />
          ))}
        </ListGroup>
      </Sheet>
    </div>
  )
}
