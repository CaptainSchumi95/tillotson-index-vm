import { Link } from '@tanstack/react-router'
import { Megaphone, MessageCircle, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Avatar } from '@/components/ui/Identity'
import { useCurrentTeam, useMembers } from '@/data/queries'
import { useUnreadTotal } from '@/data/chat'
import type { ChatChannel, Member } from '@/data/types'
import { cn } from '@/lib/cn'

/** Názov a ikona konverzácie: nástenka, skupina alebo meno druhého človeka. */
export function useChannelInfo() {
  const { t } = useTranslation()
  const { team } = useCurrentTeam()
  const members = useMembers(team?.id)
  const memberOf = (profileId: string | null): Member | undefined =>
    members.data?.find((m) => m.profile.id === profileId)

  return {
    memberOf,
    title: (c: Pick<ChatChannel, 'kind' | 'otherId'>) =>
      c.kind === 'announcements'
        ? t('chat.announcements')
        : c.kind === 'team'
          ? t('chat.team')
          : memberOf(c.otherId)?.profile.name || t('chat.unknown'),
    icon: (c: Pick<ChatChannel, 'kind' | 'otherId'>, size: 'md' | 'lg' = 'md') => {
      if (c.kind === 'direct') {
        const m = memberOf(c.otherId)
        return <Avatar name={m?.profile.name || '?'} url={m?.profile.avatarUrl} size={size === 'lg' ? 'lg' : 'md'} />
      }
      const Icon = c.kind === 'announcements' ? Megaphone : Users
      return (
        <span
          className={cn(
            'grid shrink-0 place-items-center rounded-[13px]',
            size === 'lg' ? 'size-16 rounded-[18px]' : 'size-10',
            c.kind === 'announcements' ? 'bg-accent text-on-accent' : 'bg-accent-soft text-accent-ink',
          )}
        >
          <Icon className={size === 'lg' ? 'size-7' : 'size-5'} />
        </span>
      )
    },
  }
}

/** Odznak počtu neprečítaných. */
export function UnreadBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      className={cn(
        'display tnum grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1.5 text-[0.7rem] text-white',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

/** Ikona správ v hornej lište – vľavo od profilovky. */
export function ChatButton() {
  const { t } = useTranslation()
  const { team } = useCurrentTeam()
  const unread = useUnreadTotal(team?.id)
  return (
    <Link
      to="/chat"
      aria-label={t('chat.open')}
      className="relative grid size-11 shrink-0 place-items-center rounded-full text-ink-2 transition-colors hover:bg-sunken"
      activeProps={{ className: 'bg-accent-soft text-accent-ink' }}
    >
      <MessageCircle className="size-6" strokeWidth={2} />
      <UnreadBadge count={unread} className="absolute -top-0.5 -right-0.5 ring-2 ring-bg" />
    </Link>
  )
}
