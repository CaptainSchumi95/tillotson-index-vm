import type { Permission } from './types'

/** Oprávnenia zoskupené tak, ako sa zobrazujú v editore rolí. */
export const PERMISSION_GROUPS: { key: 'team' | 'setup' | 'weekend' | 'tracks' | 'kart'; permissions: Permission[] }[] = [
  { key: 'team', permissions: ['team.manage', 'kart.all'] },
  { key: 'setup', permissions: ['setup.view', 'setup.edit', 'pressure.engineer'] },
  { key: 'weekend', permissions: ['event.view', 'event.manage', 'session.edit', 'session.feedback', 'checklist.edit'] },
  { key: 'tracks', permissions: ['track.view', 'track.manage', 'track.apply'] },
  { key: 'kart', permissions: ['service.edit', 'notes.edit'] },
]

/** Čo oprávnenie nevyhnutne potrebuje (meniť setup bez toho, aby ho človek videl, nedáva zmysel). */
const REQUIRES: Partial<Record<Permission, Permission[]>> = {
  'setup.edit': ['setup.view'],
  'pressure.engineer': ['setup.view'],
  'event.manage': ['event.view'],
  'session.edit': ['event.view'],
  'session.feedback': ['event.view'],
  'checklist.edit': ['event.view'],
  'track.manage': ['track.view'],
  'track.apply': ['track.view', 'setup.edit'],
}

/** Zapne/vypne oprávnenie aj so závislosťami: zapnutie pridá potrebné, vypnutie odoberie závislé. */
export function togglePermission(current: Permission[], perm: Permission, on: boolean): Permission[] {
  const set = new Set(current)
  if (on) {
    const add = (p: Permission) => {
      set.add(p)
      REQUIRES[p]?.forEach(add)
    }
    add(perm)
  } else {
    const remove = (p: Permission) => {
      set.delete(p)
      for (const [dependent, reqs] of Object.entries(REQUIRES) as [Permission, Permission[]][]) {
        if (reqs.includes(p) && set.has(dependent)) remove(dependent)
      }
    }
    remove(perm)
  }
  return PERMISSION_GROUPS.flatMap((g) => g.permissions).filter((p) => set.has(p))
}
