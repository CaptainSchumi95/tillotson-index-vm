import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeMode } from '@/lib/theme'

/** Pamätá si posledný tím, motokáru a sekciu – návrat k rozrobenej práci. */
interface WorkspaceState {
  teamId: string | null
  /** Posledná motokára pre každý tím zvlášť. */
  kartByTeam: Record<string, string | null>
  lastSection: string
  theme: ThemeMode
  selectTeam: (teamId: string) => void
  selectKart: (teamId: string, kartId: string | null) => void
  setLastSection: (path: string) => void
  setTheme: (mode: ThemeMode) => void
  reset: () => void
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set) => ({
      teamId: null,
      kartByTeam: {},
      lastSection: '/home',
      theme: 'system',
      selectTeam: (teamId) => set({ teamId }),
      selectKart: (teamId, kartId) => set((s) => ({ kartByTeam: { ...s.kartByTeam, [teamId]: kartId } })),
      setLastSection: (lastSection) => set({ lastSection }),
      setTheme: (theme) => set({ theme }),
      reset: () => set({ teamId: null, kartByTeam: {}, lastSection: '/home' }),
    }),
    { name: 'ti-workspace' },
  ),
)
