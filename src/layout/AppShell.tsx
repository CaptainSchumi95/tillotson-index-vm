import { useEffect } from 'react'
import { Link, Navigate, Outlet, useRouterState } from '@tanstack/react-router'
import { ChevronDown, MessageCircle, Flag, House, Route as RouteIcon, SlidersHorizontal, Users, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ContextSheet } from '@/components/ContextSheet'
import { ChatButton, UnreadBadge } from '@/components/chat/chatHelpers'
import { useChatLive, useUnreadTotal } from '@/data/chat'
import { TiMark, TiWordmark, VilimCredit } from '@/components/ui/Brand'
import { Avatar, KartPlate, TeamBadge } from '@/components/ui/Identity'
import { FullScreenLoader } from '@/components/ui/Spinner'
import { useCurrentKart, useCurrentTeam, useProfile } from '@/data/queries'
import { cn } from '@/lib/cn'
import { useUi } from '@/state/ui'
import { useWorkspace } from '@/state/workspace'
import { StatusToasts } from './StatusToasts'

export const NAV: { to: string; key: 'home' | 'weekend' | 'setup' | 'tracks' | 'team'; icon: LucideIcon }[] = [
  { to: '/home', key: 'home', icon: House },
  { to: '/weekend', key: 'weekend', icon: Flag },
  { to: '/setup', key: 'setup', icon: SlidersHorizontal },
  { to: '/tracks', key: 'tracks', icon: RouteIcon },
  { to: '/team', key: 'team', icon: Users },
]

/**
 * Hlavné rozloženie po výbere tímu.
 * Ak tím alebo motokára nie sú vybrané, presmeruje na výber.
 */
export function AppShell() {
  const { team, teams } = useCurrentTeam()
  const { karts } = useCurrentKart()
  const teamId = useWorkspace((s) => s.teamId)
  const kartByTeam = useWorkspace((s) => s.kartByTeam)
  const selectTeam = useWorkspace((s) => s.selectTeam)
  const setLastSection = useWorkspace((s) => s.setLastSection)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    if (NAV.some((n) => pathname === n.to)) setLastSection(pathname)
  }, [pathname, setLastSection])

  // Jediný tím vyberieme automaticky.
  const onlyTeam = teams.data?.length === 1 ? teams.data[0] : null
  useEffect(() => {
    if (onlyTeam && teamId !== onlyTeam.id) selectTeam(onlyTeam.id)
  }, [onlyTeam, teamId, selectTeam])

  if (teams.isPending) return <FullScreenLoader />
  if (teams.data && teams.data.length === 0) return <Navigate to="/welcome" />
  if (!team) return onlyTeam ? <FullScreenLoader /> : <Navigate to="/select" />
  if (karts.isPending) return <FullScreenLoader />

  // Motokára ešte nebola vybraná (undefined) alebo už neexistuje → výber.
  const chosen = kartByTeam[team.id]
  const kartMissing = chosen !== undefined && chosen !== null && !karts.data?.some((k) => k.id === chosen)
  if (chosen === undefined || kartMissing) return <Navigate to="/select" />

  return <Shell />
}

/** Otvorená konverzácia – bez spodnej navigácie, pole na písanie je úplne dole. */
const CONVERSATION = /^\/chat\/[^/]+$/

function Shell() {
  const contextOpen = useUi((s) => s.contextOpen)
  const setContextOpen = useUi((s) => s.setContextOpen)
  const { team } = useCurrentTeam()
  const inConversation = useRouterState({ select: (s) => CONVERSATION.test(s.location.pathname) })
  // Nové správy naživo pre aktuálny tím (odznak pri ikone správ).
  useChatLive(team?.id)
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[280px_1fr]">
      <Sidebar onSwitch={() => setContextOpen(true)} />
      <div className="min-w-0">
        <TopBar onSwitch={() => setContextOpen(true)} />
        <main
          className={cn(
            'mx-auto w-full max-w-[880px] px-4 pt-3 sm:px-6 lg:px-10',
            inConversation ? 'pb-0 lg:pt-0' : 'pb-[calc(96px+env(safe-area-inset-bottom))] lg:pt-8 lg:pb-16',
          )}
        >
          <Outlet />
        </main>
      </div>
      {!inConversation && <BottomNav />}
      <StatusToasts />
      <ContextSheet open={contextOpen} onOpenChange={setContextOpen} />
    </div>
  )
}

function ContextButton({ onClick, compact }: { onClick: () => void; compact?: boolean }) {
  const { t } = useTranslation()
  const { team } = useCurrentTeam()
  const { kart } = useCurrentKart()
  if (!team) return null
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex min-w-0 items-center gap-3 text-left transition-colors',
        compact ? '-ml-1.5 rounded-[16px] py-1.5 pr-2.5 pl-1.5 hover:bg-sunken' : 'w-full rounded-[18px] border border-line bg-surface-2 p-3 hover:border-line-strong',
      )}
    >
      {kart ? <KartPlate number={kart.number} size="md" /> : <TeamBadge name={team.name} color={team.color} iconUrl={team.iconUrl} />}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold leading-tight">
          {kart ? kart.driverName || `${t('context.kart')} ${kart.number}` : t('context.noKart')}
        </span>
        <span className="block truncate text-[0.85rem] leading-tight text-ink-3">{team.name}</span>
      </span>
      <ChevronDown className="size-4.5 shrink-0 text-ink-3 transition-transform group-active:translate-y-0.5" />
    </button>
  )
}

function TopBar({ onSwitch }: { onSwitch: () => void }) {
  const profile = useProfile()
  // Na Domove je motokára veľká priamo na stránke, v lište stačí logo.
  const onHome = useRouterState({ select: (s) => s.location.pathname === '/home' })
  return (
    <div className="safe-top sticky top-0 z-30 border-b border-transparent bg-bg/85 backdrop-blur-xl lg:hidden">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        {onHome ? <TiMark className="h-7 text-brand" /> : <ContextButton onClick={onSwitch} compact />}
        <span className="flex shrink-0 items-center gap-1.5">
          <ChatButton />
          <Link to="/settings" aria-label="Profil" className="shrink-0 rounded-full">
            <Avatar name={profile.data?.name ?? ''} url={profile.data?.avatarUrl} size="md" />
          </Link>
        </span>
      </div>
    </div>
  )
}

function Sidebar({ onSwitch }: { onSwitch: () => void }) {
  const { t } = useTranslation()
  const profile = useProfile()
  const { team } = useCurrentTeam()
  const unread = useUnreadTotal(team?.id)
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface px-5 py-7 lg:flex">
      <Link to="/home" className="mb-8 block px-2 text-ink">
        <TiWordmark className="h-11" />
      </Link>
      <ContextButton onClick={onSwitch} />
      <nav className="mt-6 space-y-1">
        {NAV.map(({ to, key, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex h-12 items-center gap-3.5 rounded-[14px] px-3.5 font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            activeProps={{ className: 'bg-accent-soft! text-accent-ink!' }}
          >
            <Icon className="size-[22px]" strokeWidth={2} />
            {t(`nav.${key}`)}
          </Link>
        ))}
        <Link
          to="/chat"
          className="flex h-12 items-center gap-3.5 rounded-[14px] px-3.5 font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          activeProps={{ className: 'bg-accent-soft! text-accent-ink!' }}
        >
          <MessageCircle className="size-[22px]" strokeWidth={2} />
          <span className="flex-1">{t('chat.title')}</span>
          <UnreadBadge count={unread} />
        </Link>
      </nav>
      <div className="mt-auto space-y-5">
        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-[16px] p-2 transition-colors hover:bg-surface-2"
          activeProps={{ className: 'bg-surface-2' }}
        >
          <Avatar name={profile.data?.name ?? ''} url={profile.data?.avatarUrl} />
          <span className="min-w-0">
            <span className="block truncate font-semibold leading-tight">{profile.data?.name}</span>
            <span className="block truncate text-[0.85rem] text-ink-3">{t('settings.title')}</span>
          </span>
        </Link>
        <VilimCredit className="px-2 text-ink-3" />
      </div>
    </aside>
  )
}

function BottomNav() {
  const { t } = useTranslation()
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/92 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid h-[68px] max-w-[560px] grid-cols-5 px-1">
        {NAV.map(({ to, key, icon: Icon }) => (
          <Link key={to} to={to} className="group flex flex-col items-center justify-center gap-1 text-ink-3">
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'grid h-8 w-14 place-items-center rounded-full transition-all duration-200',
                    isActive ? 'bg-accent-soft text-accent-ink' : 'group-active:bg-sunken',
                  )}
                >
                  <Icon className="size-[22px]" strokeWidth={isActive ? 2.3 : 1.9} />
                </span>
                <span className={cn('text-[0.72rem] font-semibold leading-none', isActive && 'text-ink')}>
                  {t(`nav.${key}`)}
                </span>
              </>
            )}
          </Link>
        ))}
      </div>
    </nav>
  )
}
