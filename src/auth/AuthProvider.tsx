import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { backend } from '@/data'
import type { AuthUser } from '@/data/backend'
import { useWorkspace } from '@/state/workspace'

type AuthState = { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; user: AuthUser }

interface AuthContextValue {
  state: AuthState
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const qc = useQueryClient()

  useEffect(() => {
    let alive = true
    let acceptedFor: string | null = null

    async function apply(user: AuthUser | null) {
      if (!alive) return
      if (!user) {
        setState({ status: 'signedOut' })
        return
      }
      if (acceptedFor !== user.id) {
        acceptedFor = user.id
        try {
          await backend.afterSignIn()
        } catch {
          /* pozvánky sa skúsia prijať pri ďalšom prihlásení */
        }
      }
      if (alive) setState({ status: 'signedIn', user })
    }

    void backend.getUser().then(apply)
    const off = backend.onAuthChange((u) => void apply(u))
    return () => {
      alive = false
      off()
    }
  }, [])

  const value: AuthContextValue = {
    state,
    signIn: () => backend.signIn(),
    signOut: async () => {
      await backend.signOut()
      useWorkspace.getState().reset()
      qc.clear()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
