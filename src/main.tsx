import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { RouterProvider } from '@tanstack/react-router'
import { del, get, set } from 'idb-keyval'
import { AuthProvider } from '@/auth/AuthProvider'
import { backend } from '@/data'
import { qk, SAVE_SETUP_KEY } from '@/data/queries'
import type { SetupRevisionInput } from '@/data/types'
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
queryClient.setMutationDefaults(SAVE_SETUP_KEY, {
  mutationFn: (input: SetupRevisionInput) => backend.saveSetupRevision(input),
  networkMode: 'online',
  retry: 6,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
  onSettled: (_data, _error, input: SetupRevisionInput) =>
    queryClient.invalidateQueries({ queryKey: qk.setup(input.kartId) }),
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
