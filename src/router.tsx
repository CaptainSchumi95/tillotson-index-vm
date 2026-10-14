import { useEffect } from 'react'
import { createRootRoute, createRoute, createRouter, Navigate, Outlet } from '@tanstack/react-router'
import { useAuth } from '@/auth/AuthProvider'
import { FullScreenLoader } from '@/components/ui/Spinner'
import { useCurrentTeam, useProfile } from '@/data/queries'
import { setLanguage } from '@/i18n'
import { applyTeamColor, applyThemeMode, syncThemeColorMeta } from '@/lib/theme'
import { AppShell } from '@/layout/AppShell'
import { AboutPage } from '@/pages/AboutPage'
import { CreateTeamPage } from '@/pages/CreateTeamPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { SetupPage, TracksPage, WeekendPage } from '@/pages/PlaceholderPages'
import { SelectPage } from '@/pages/SelectPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TeamAppearancePage } from '@/pages/TeamAppearancePage'
import { TeamPage } from '@/pages/TeamPage'
import { useWorkspace } from '@/state/workspace'

/** Prenesie farbu tímu, tému a jazyk profilu do celej aplikácie. */
function Appearance() {
  const { team, teams } = useCurrentTeam()
  const profile = useProfile()
  const theme = useWorkspace((s) => s.theme)
  const color = team?.color ?? (teams.data?.length === 1 ? teams.data[0].color : null)

  useEffect(() => applyTeamColor(color), [color])
  useEffect(() => applyThemeMode(theme), [theme])
  useEffect(() => {
    if (profile.data) setLanguage(profile.data.locale)
  }, [profile.data])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', syncThemeColorMeta)
    return () => mq.removeEventListener('change', syncThemeColorMeta)
  }, [])

  return null
}

function Root() {
  const { state } = useAuth()
  if (state.status === 'loading') return <FullScreenLoader />
  if (state.status === 'signedOut') return <LoginPage />
  return (
    <>
      <Appearance />
      <Outlet />
    </>
  )
}

const rootRoute = createRootRoute({ component: Root })

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: function Index() {
    const last = useWorkspace((s) => s.lastSection)
    return <Navigate to={last || '/home'} replace />
  },
})

const welcomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/welcome',
  component: () => <CreateTeamPage first />,
})

const newTeamRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/teams/new',
  component: () => <CreateTeamPage />,
})

const selectRoute = createRoute({ getParentRoute: () => rootRoute, path: '/select', component: SelectPage })

const shellRoute = createRoute({ getParentRoute: () => rootRoute, id: 'shell', component: AppShell })

const page = (path: string, component: () => React.ReactNode) =>
  createRoute({ getParentRoute: () => shellRoute, path, component })

const routeTree = rootRoute.addChildren([
  indexRoute,
  welcomeRoute,
  newTeamRoute,
  selectRoute,
  shellRoute.addChildren([
    page('/home', HomePage),
    page('/weekend', WeekendPage),
    page('/setup', SetupPage),
    page('/tracks', TracksPage),
    page('/team', TeamPage),
    page('/team/appearance', TeamAppearancePage),
    page('/settings', SettingsPage),
    page('/about', AboutPage),
  ]),
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultNotFoundComponent: () => <Navigate to="/" replace />,
  scrollRestoration: true,
})
