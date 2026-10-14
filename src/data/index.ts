import type { Backend } from './backend'
import { createDemoBackend } from './demo-backend'
import { createSupabaseBackend } from './supabase-backend'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Bez prístupových údajov k Supabase beží aplikácia v ukážkovom režime. */
export const backend: Backend = url && key ? createSupabaseBackend(url, key) : createDemoBackend()

export const isDemo = backend.kind === 'demo'
