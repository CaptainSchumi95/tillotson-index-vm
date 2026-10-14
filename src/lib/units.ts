// Hodnoty sa ukladajú v kanonickej jednotke (bar, °C, mm, kg).
// Prevod prebieha iba pri zobrazení a pri zadávaní.

export const UNIT_OPTIONS = {
  pressure: ['bar', 'psi'],
  temperature: ['c', 'f'],
  length: ['mm', 'in'],
  weight: ['kg', 'lb'],
} as const

export type UnitKind = keyof typeof UNIT_OPTIONS
export type UnitPrefs = { [K in UnitKind]: (typeof UNIT_OPTIONS)[K][number] }

export const DEFAULT_UNITS: UnitPrefs = {
  pressure: 'bar',
  temperature: 'c',
  length: 'mm',
  weight: 'kg',
}

export const UNIT_LABEL: Record<string, string> = {
  bar: 'bar',
  psi: 'psi',
  c: '°C',
  f: '°F',
  mm: 'mm',
  in: 'in',
  kg: 'kg',
  lb: 'lb',
}

const PSI_PER_BAR = 14.5037738
const MM_PER_IN = 25.4
const LB_PER_KG = 2.20462262

const DECIMALS: Record<string, number> = { bar: 2, psi: 1, c: 1, f: 1, mm: 1, in: 2, kg: 1, lb: 1 }

export function fromCanonical(kind: UnitKind, value: number, unit: string): number {
  switch (kind) {
    case 'pressure':
      return unit === 'psi' ? value * PSI_PER_BAR : value
    case 'temperature':
      return unit === 'f' ? value * 1.8 + 32 : value
    case 'length':
      return unit === 'in' ? value / MM_PER_IN : value
    case 'weight':
      return unit === 'lb' ? value * LB_PER_KG : value
  }
}

export function toCanonical(kind: UnitKind, value: number, unit: string): number {
  switch (kind) {
    case 'pressure':
      return unit === 'psi' ? value / PSI_PER_BAR : value
    case 'temperature':
      return unit === 'f' ? (value - 32) / 1.8 : value
    case 'length':
      return unit === 'in' ? value * MM_PER_IN : value
    case 'weight':
      return unit === 'lb' ? value / LB_PER_KG : value
  }
}

export function formatValue(kind: UnitKind, canonical: number | null | undefined, prefs: UnitPrefs, locale: string) {
  const unit = prefs[kind]
  if (canonical == null || Number.isNaN(canonical)) return { value: '—', unit: UNIT_LABEL[unit] }
  const d = DECIMALS[unit] ?? 1
  const value = new Intl.NumberFormat(locale, { minimumFractionDigits: d, maximumFractionDigits: d }).format(
    fromCanonical(kind, canonical, unit),
  )
  return { value, unit: UNIT_LABEL[unit] }
}

export function normalizeUnitPrefs(raw: unknown): UnitPrefs {
  const out = { ...DEFAULT_UNITS }
  if (raw && typeof raw === 'object') {
    for (const kind of Object.keys(UNIT_OPTIONS) as UnitKind[]) {
      const v = (raw as Record<string, unknown>)[kind]
      if ((UNIT_OPTIONS[kind] as readonly string[]).includes(v as string)) (out as Record<string, string>)[kind] = v as string
    }
  }
  return out
}
