import { useState, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { SquarePen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UnreadBadge, useChannelInfo } from '@/components/chat/chatHelpers'
import { useRoleName } from '@/components/team/pickers'
import { Button } from '@/components/ui/Button'
import { Card, Section } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Identity'
import { ListGroup, ListRow } from '@/components/ui/ListRow'
import { PageHeader } from '@/components/ui/PageHeader'
import { Sheet } from '@/components/ui/Sheet'
import { FullScreenLoader } from '@/components/ui/Spinner'
import { useChatOverview, useOpenDirect } from '@/data/chat'
import { safe, useCurrentTeam, useMembers, useProfile } from '@/data/queries'
import type { ChatChannel } from '@/data/types'
import { cn } from '@/lib/cn'
import { relativeTime } from '@/lib/time'

/** Prehľad správ tímu: nástenka, tímová skupina a priame správy (/chat). */
export function ChatPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { team } = useCurrentTeam()
  const profile = useProfile()
  const overview = useChatOverview(team?.id)
  const members = useMembers(team?.id)
  const openDirect = useOpenDirect(team?.id ?? '')
  const info = useChannelInfo()
  const roleName = useRoleName()
  const [picking, setPicking] = useState(false)

  if (!team) return null
  if (overview.isPending) return <FullScreenLoader />

  const list = overview.data ?? []
  const announcements = list.find((c) => c.kind === 'announcements')
  const teamChannel = list.find((c) => c.kind === 'team')
  const directs = list
    .filter((c) => c.kind === 'direct')
    .sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? ''))
  const others = (members.data ?? []).filter((m) => m.profile.id !== profile.data?.id)

  const open = (id: string) => void navigate({ to: '/chat/$channelId', params: { channelId: id } })

  async function startDirect(profileId: string) {
    const r = await safe(openDirect.mutateAsync(profileId))
    if (!r.ok) return
    setPicking(false)
    open(r.value)
  }

  const preview = (c: ChatChannel, fallback: ReactNode) => {
    if (!c.lastBody) return fallback
    const who =
      c.lastAuthorId === profile.data?.id
        ? t('chat.you')
        : c.kind === 'direct'
          ? null
          : info.memberOf(c.lastAuthorId)?.profile.name.split(' ')[0]
    return (who ? `${who}: ` : '') + c.lastBody
  }

  const row = (c: ChatChannel, fallback: ReactNode) => (
    <ListRow
      key={c.id}
      leading={info.icon(c)}
      title={<span className={cn(c.unread > 0 && 'font-bold')}>{info.title(c)}</span>}
      subtitle={<span className={cn(c.unread > 0 && 'font-medium text-ink-2')}>{preview(c, fallback)}</span>}
      trailing={
        <span className="flex flex-col items-end gap-1">
          {c.lastAt && <span className="text-[0.75rem]">{relativeTime(c.lastAt, i18n.language, t('time.justNow'))}</span>}
          <UnreadBadge count={c.unread} />
        </span>
      }
      chevron={false}
      onClick={() => open(c.id)}
    />
  )

  return (
    <>
      <PageHeader
        title={t('chat.title')}
        action={
          others.length > 0 && (
            <Button icon={<SquarePen className="size-4" />} onClick={() => setPicking(true)}>
              {t('chat.newMessage')}
            </Button>
          )
        }
      />

      <div className="space-y-8">
        <ListGroup>
          {announcements && row(announcements, t('chat.announcementsHint'))}
          {teamChannel && row(teamChannel, t('chat.teamHint'))}
        </ListGroup>

        <Section title={t('chat.direct')}>
          {directs.length > 0 ? (
            <ListGroup>{directs.map((c) => row(c, ''))}</ListGroup>
          ) : (
            <Card className="p-5 text-center text-ink-3">{t('chat.noDirect')}</Card>
          )}
        </Section>
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
    </>
  )
}
