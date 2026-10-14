import type { Backend } from './backend'
import { createDemoBackend } from './demo-backend'
import { createSupabaseBackend } from './supabase-backend'

const env = import.meta.env
// VITE_* pri lokálnom vývoji, NEXT_PUBLIC_* z integrácie Supabase vo Verceli.
const url = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

/** Bez prístupových údajov k Supabase beží aplikácia v ukážkovom režime. */
export const backend: Backend = url && key ? createSupabaseBackend(url, key) : createDemoBackend()

export const isDemo = backend.kind === 'demo'
