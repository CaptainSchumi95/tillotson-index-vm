import { useEffect } from 'react'
import { createRootRoute, createRoute, createRouter, Navigate, Outlet, useRouterState } from '@tanstack/react-router'
import { useAuth } from '@/auth/AuthProvider'
import { CrashScreen } from '@/components/CrashScreen'
import { FullScreenLoader } from '@/components/ui/Spinner'
import { useCurrentTeam, useProfile } from '@/data/queries'
import { setLanguage } from '@/i18n'
import { applyTeamColor, applyThemeMode, syncThemeColorMeta } from '@/lib/theme'
import { AppShell } from '@/layout/AppShell'
import { AboutPage } from '@/pages/AboutPage'
import { CreateTeamPage } from '@/pages/CreateTeamPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { NotesPage } from '@/pages/NotesPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { PressureStatsPage } from '@/pages/PressureStatsPage'
import { PressuresPage } from '@/pages/PressuresPage'
import { ServicePage } from '@/pages/ServicePage'
import { SessionEditPage } from '@/pages/SessionEditPage'
import { SessionPage } from '@/pages/SessionPage'
import { TrackPage } from '@/pages/TrackPage'
import { TracksPage } from '@/pages/TracksPage'
import { TrackSetupEditPage, TrackSetupPage } from '@/pages/TrackSetupPage'
import { RoleEditorPage } from '@/pages/RoleEditorPage'
import { RolesPage } from '@/pages/RolesPage'
import { ChecklistTemplatePage } from '@/pages/ChecklistTemplatePage'
import { EventEditPage } from '@/pages/EventEditPage'
import { EventPage } from '@/pages/EventPage'
import { WeekendPage } from '@/pages/WeekendPage'
import { SetupEditPage, VariantEditPage } from '@/pages/SetupEditPage'
import { SetupFieldsPage } from '@/pages/SetupFieldsPage'
import { SetupPage } from '@/pages/SetupPage'
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
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // Verejná stránka – dostupná aj bez prihlásenia (požiadavka Googlu).
  if (pathname === '/privacy') return <PrivacyPage />
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

const privacyRoute = createRoute({ getParentRoute: () => rootRoute, path: '/privacy', component: PrivacyPage })

const selectRoute = createRoute({ getParentRoute: () => rootRoute, path: '/select', component: SelectPage })

const shellRoute = createRoute({ getParentRoute: () => rootRoute, id: 'shell', component: AppShell })

const page = (path: string, component: () => React.ReactNode) =>
  createRoute({ getParentRoute: () => shellRoute, path, component })

const routeTree = rootRoute.addChildren([
  indexRoute,
  welcomeRoute,
  newTeamRoute,
  selectRoute,
  privacyRoute,
  shellRoute.addChildren([
    page('/home', HomePage),
    page('/notes', NotesPage),
    page('/service', ServicePage),
    page('/weekend', WeekendPage),
    page('/weekend/new', EventEditPage),
    createRoute({
      getParentRoute: () => shellRoute,
      path: '/weekend/$eventId',
      component: EventPage,
      validateSearch: (s: Record<string, unknown>): { tab?: 'checklist' | 'sessions' } =>
        s.tab === 'checklist' || s.tab === 'sessions' ? { tab: s.tab } : {},
    }),
    page('/weekend/$eventId/edit', EventEditPage),
    // Jazdy – motokára sa posiela v adrese (?kart=…)
    ...(
      [
        ['/weekend/$eventId/sessions/new', SessionEditPage],
        ['/weekend/$eventId/sessions/$sessionId', SessionPage],
        ['/weekend/$eventId/sessions/$sessionId/edit', SessionEditPage],
      ] as const
    ).map(([path, component]) =>
      createRoute({
        getParentRoute: () => shellRoute,
        path,
        component,
        validateSearch: (s: Record<string, unknown>): { kart?: string } => (typeof s.kart === 'string' ? { kart: s.kart } : {}),
      }),
    ),
    page('/team/checklist', ChecklistTemplatePage),
    page('/setup', SetupPage),
    page('/pressures', PressuresPage),
    page('/pressures/$kartId', PressureStatsPage),
    page('/setup/edit', SetupEditPage),
    page('/setup/fields', SetupFieldsPage),
    page('/setup/variants/$variantId', VariantEditPage),
    page('/tracks', TracksPage),
    page('/tracks/$trackId', TrackPage),
    createRoute({
      getParentRoute: () => shellRoute,
      path: '/tracks/$trackId/setups/new',
      component: TrackSetupEditPage,
      validateSearch: (s: Record<string, unknown>): { from?: 'kart' | 'blank' } =>
        s.from === 'kart' || s.from === 'blank' ? { from: s.from } : {},
    }),
    page('/tracks/$trackId/setups/$setupId', TrackSetupPage),
    page('/tracks/$trackId/setups/$setupId/edit', TrackSetupEditPage),
    page('/team', TeamPage),
    page('/team/appearance', TeamAppearancePage),
    page('/team/roles', RolesPage),
    page('/team/roles/$roleId', RoleEditorPage),
    page('/settings', SettingsPage),
    page('/about', AboutPage),
  ]),
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultNotFoundComponent: () => <Navigate to="/" replace />,
  defaultErrorComponent: ({ error }) => <CrashScreen error={error} />,
  scrollRestoration: true,
})
