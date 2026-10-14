import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { RouterProvider } from '@tanstack/react-router'
import { del, get, set } from 'idb-keyval'
import { AuthProvider } from '@/auth/AuthProvider'
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

const persister = createAsyncStoragePersister({
  storage: { getItem: get, setItem: set, removeItem: del },
  key: QUERY_CACHE_KEY,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7, buster: `${__APP_VERSION__}/${QUERY_CACHE_SCHEMA}` }}
    >
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
)
