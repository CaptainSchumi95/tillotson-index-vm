import type { CSSProperties } from 'react'
import { onColor, teamPalette } from './color'

export type ThemeMode = 'system' | 'light' | 'dark'

const BRAND = '#1d56e9'

export function applyTeamColor(color: string | null | undefined) {
  const p = teamPalette(color ?? BRAND)
  const s = document.documentElement.style
  s.setProperty('--team-light', p.light)
  s.setProperty('--team-light-on', p.lightOn)
  s.setProperty('--team-light-ink', p.lightInk)
  s.setProperty('--team-dark', p.dark)
  s.setProperty('--team-dark-on', p.darkOn)
  s.setProperty('--team-dark-ink', p.darkInk)
}

export function applyThemeMode(mode: ThemeMode) {
  const root = document.documentElement
  if (mode === 'system') delete root.dataset.theme
  else root.dataset.theme = mode
  syncThemeColorMeta()
}

/** Farba stavového riadku mobilu podľa aktuálneho pozadia. */
export function syncThemeColorMeta() {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || '#f2f3f5')
}

/** Lokálne prefarbenie (napr. náhľad) bez zmeny témy celej aplikácie. */
export function accentVars(color: string): CSSProperties {
  return {
    ['--accent' as string]: color,
    ['--on-accent' as string]: onColor(color),
    ['--accent-soft' as string]: `color-mix(in oklab, ${color} 13%, var(--surface))`,
    // Odvodené prechody sa musia prepočítať aj tu – inak by ostali vo farbe aktuálneho tímu.
    ['--accent-hi' as string]: `color-mix(in oklab, ${color} 74%, white)`,
    ['--accent-lo' as string]: `color-mix(in oklab, ${color} 80%, black)`,
    ['--accent-glow' as string]: `color-mix(in oklab, ${color} 42%, transparent)`,
    ['--accent-fill' as string]: 'linear-gradient(140deg, var(--accent-hi) 0%, var(--accent) 50%, var(--accent-lo) 100%)',
    ['--accent-tonal' as string]:
      'linear-gradient(140deg, color-mix(in oklab, var(--accent) 22%, var(--surface)), var(--accent-soft) 70%)',
  }
}
