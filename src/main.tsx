import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { RouterProvider } from '@tanstack/react-router'
import { del, get, set } from 'idb-keyval'
import { AuthProvider } from '@/auth/AuthProvider'
import { backend } from '@/data'
import { qk, SAVE_NOTE_KEY, SAVE_SERVICE_KEY, SAVE_SETUP_KEY } from '@/data/queries'
import { ek, SET_ROUND_KEY, TOGGLE_CHECK_KEY, type RoundInput } from '@/data/events'
import type { CheckInput, KartNoteInput, ServiceEntryInput, SetupRevisionInput } from '@/data/types'
import { QUERY_CACHE_KEY, QUERY_CACHE_SCHEMA } from '@/lib/cache'
import { router } from '@/router'
import '@/i18n'
import './index.css'

// Dáta sa držia v IndexedDB, aby aplikácia fungovala aj pri slabom signále na trati.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24 * 7,
      retry: 2,
    },
    mutations: { networkMode: 'offlineFirst' },
  },
})

// Uloženie setupu na trati: bez signálu počká vo fronte (aj po zatvorení aplikácie)
// a odošle sa, keď sa zariadenie pripojí. Uloženie je idempotentné (id revízie).
// Rovnako poznámky jazdca a servisné záznamy.
const offline = { networkMode: 'online' as const, retry: 6, retryDelay: (n: number) => Math.min(1000 * 2 ** n, 30_000) }

queryClient.setMutationDefaults(SAVE_SETUP_KEY, {
  ...offline,
  mutationFn: (input: SetupRevisionInput) => backend.saveSetupRevision(input),
  onSettled: (_d, _e, input: SetupRevisionInput) => queryClient.invalidateQueries({ queryKey: qk.setup(input.kartId) }),
})
queryClient.setMutationDefaults(SAVE_NOTE_KEY, {
  ...offline,
  mutationFn: (input: KartNoteInput) => backend.saveNote(input),
  onSettled: (_d, _e, input: KartNoteInput) => queryClient.invalidateQueries({ queryKey: qk.notes(input.kartId) }),
})
// Checklist: odškrtnutia sa odošlú v poradí, v akom ich mechanik urobil (scope).
queryClient.setMutationDefaults(TOGGLE_CHECK_KEY, {
  ...offline,
  scope: { id: 'checklist' },
  mutationFn: (input: CheckInput) => backend.setCheck(input),
  onSettled: (_d, _e, input: CheckInput) =>
    queryClient.invalidateQueries({ queryKey: ek.checks(input.eventId, input.kartId) }),
})
queryClient.setMutationDefaults(SET_ROUND_KEY, {
  ...offline,
  scope: { id: 'checklist' },
  mutationFn: (input: RoundInput) => backend.setRound(input.eventId, input.kartId, input.round),
  onSettled: (_d, _e, input: RoundInput) => queryClient.invalidateQueries({ queryKey: ek.events(input.teamId) }),
})
queryClient.setMutationDefaults(SAVE_SERVICE_KEY, {
  ...offline,
  mutationFn: (input: ServiceEntryInput) => backend.saveService(input),
  onSettled: (_d, _e, input: ServiceEntryInput) => queryClient.invalidateQueries({ queryKey: qk.service(input.kartId) }),
})

const persister = createAsyncStoragePersister({
  storage: { getItem: get, setItem: set, removeItem: del },
  key: QUERY_CACHE_KEY,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7, buster: `${__APP_VERSION__}/${QUERY_CACHE_SCHEMA}` }}
      onSuccess={() => void queryClient.resumePausedMutations()}
    >
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
)
