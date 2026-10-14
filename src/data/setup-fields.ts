// Štandardné položky setupu. Kľúče sa ukladajú do databázy – NEMENIŤ existujúce,
// iba pridávať nové. Vlastné položky tímu sa pridávajú v aplikácii (setup_fields).

import { fromCanonical, toCanonical, UNIT_LABEL, UNIT_OPTIONS, type UnitKind, type UnitPrefs } from '@/lib/units'

export type SetupGroup = 'tires' | 'gearing' | 'carb' | 'geometry' | 'dimensions' | 'other'

/**
 * Jednotka položky. Prepočítavané druhy (pressure, length…) sa zobrazujú podľa
 * nastavení používateľa, ostatné sú pevné.
 */
export type FieldUnit = UnitKind | 'deg' | 'turns' | 'teeth' | 'none' | 'text'

export interface SetupField {
  key: string
  group: SetupGroup
  unit: FieldUnit
  /** Krok tlačidiel +/− v kanonickej jednotke. */
  step: number
  /** Preklad názvu (štandardné položky) alebo pevný názov (vlastné položky). */
  labelKey?: string
  label?: string
  custom?: boolean
}

export const GROUP_ORDER: SetupGroup[] = ['tires', 'gearing', 'carb', 'geometry', 'dimensions', 'other']

export const TIRE_KEYS = ['tire_fl', 'tire_fr', 'tire_rl', 'tire_rr'] as const

export const STANDARD_FIELDS: SetupField[] = [
  { key: 'tire_fl', group: 'tires', unit: 'pressure', step: 0.01, labelKey: 'home.tires.fl' },
  { key: 'tire_fr', group: 'tires', unit: 'pressure', step: 0.01, labelKey: 'home.tires.fr' },
  { key: 'tire_rl', group: 'tires', unit: 'pressure', step: 0.01, labelKey: 'home.tires.rl' },
  { key: 'tire_rr', group: 'tires', unit: 'pressure', step: 0.01, labelKey: 'home.tires.rr' },

  { key: 'sprocket_front', group: 'gearing', unit: 'teeth', step: 1, labelKey: 'setup.field.sprocket_front' },
  { key: 'sprocket_rear', group: 'gearing', unit: 'teeth', step: 1, labelKey: 'setup.field.sprocket_rear' },

  { key: 'carb_low', group: 'carb', unit: 'turns', step: 0.125, labelKey: 'setup.field.carb_low' },
  { key: 'carb_high', group: 'carb', unit: 'turns', step: 0.125, labelKey: 'setup.field.carb_high' },

  { key: 'camber_left', group: 'geometry', unit: 'deg', step: 0.25, labelKey: 'setup.field.camber_left' },
  { key: 'camber_right', group: 'geometry', unit: 'deg', step: 0.25, labelKey: 'setup.field.camber_right' },
  { key: 'caster', group: 'geometry', unit: 'deg', step: 0.5, labelKey: 'setup.field.caster' },
  { key: 'toe', group: 'geometry', unit: 'length', step: 0.5, labelKey: 'setup.field.toe' },

  { key: 'track_front', group: 'dimensions', unit: 'length', step: 5, labelKey: 'setup.field.track_front' },
  { key: 'track_rear', group: 'dimensions', unit: 'length', step: 5, labelKey: 'setup.field.track_rear' },
  { key: 'height_front', group: 'dimensions', unit: 'length', step: 1, labelKey: 'setup.field.height_front' },
  { key: 'height_rear', group: 'dimensions', unit: 'length', step: 1, labelKey: 'setup.field.height_rear' },
]

/** Prevodový pomer z pastorka a rozety (nevkladá sa, počíta sa). */
export function gearRatio(values: SetupValues): number | null {
  const f = values.sprocket_front
  const r = values.sprocket_rear
  return typeof f === 'number' && typeof r === 'number' && f > 0 ? r / f : null
}

export type SetupValue = number | string | null
export type SetupValues = Record<string, SetupValue>

/** Kľúče, ktorých hodnota sa medzi dvoma stavmi líši. */
export function changedKeys(before: SetupValues, after: SetupValues): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  return [...keys].filter((k) => (before[k] ?? null) !== (after[k] ?? null))
}

// ───────────── Zobrazenie a zadávanie ─────────────

const CONVERTIBLE = Object.keys(UNIT_OPTIONS) as UnitKind[]

function isConvertible(unit: FieldUnit): unit is UnitKind {
  return (CONVERTIBLE as string[]).includes(unit)
}

/** Jednotky, ktoré si môže zvoliť tím pri vlastnej položke. */
export const CUSTOM_FIELD_UNITS: FieldUnit[] = ['none', 'text', 'pressure', 'length', 'deg', 'turns', 'teeth', 'temperature', 'weight']

const FIXED_LABEL: Record<string, string> = { deg: '°', turns: 'ot.', teeth: 'z.', none: '', text: '' }

const DISPLAY_DECIMALS: Record<string, [min: number, max: number]> = {
  bar: [2, 2],
  psi: [1, 1],
  mm: [0, 1],
  in: [2, 3],
  c: [0, 1],
  f: [0, 1],
  kg: [0, 1],
  lb: [0, 1],
  deg: [0, 2],
  turns: [0, 3],
  teeth: [0, 0],
  none: [0, 2],
}

/** Jednotka, v ktorej položku vidí tento používateľ (napr. 'psi'). */
export function displayUnit(field: Pick<SetupField, 'unit'>, prefs: UnitPrefs): string {
  return isConvertible(field.unit) ? prefs[field.unit] : field.unit
}

export function unitLabel(field: Pick<SetupField, 'unit'>, prefs: UnitPrefs): string {
  const u = displayUnit(field, prefs)
  return UNIT_LABEL[u] ?? FIXED_LABEL[u] ?? ''
}

/** Hodnota v jednotke používateľa (číslo), alebo null. */
export function toDisplay(field: SetupField, value: SetupValue, prefs: UnitPrefs): number | null {
  if (typeof value !== 'number') return null
  return isConvertible(field.unit) ? fromCanonical(field.unit, value, prefs[field.unit]) : value
}

/** Z jednotky používateľa späť do kanonickej (zaokrúhlené, aby sa nehromadili chyby). */
export function fromDisplay(field: SetupField, value: number, prefs: UnitPrefs): number {
  const c = isConvertible(field.unit) ? toCanonical(field.unit, value, prefs[field.unit]) : value
  return Math.round(c * 10000) / 10000
}

export function formatField(field: SetupField, value: SetupValue, prefs: UnitPrefs, locale: string): string {
  if (field.unit === 'text') return typeof value === 'string' && value ? value : '—'
  const v = toDisplay(field, value, prefs)
  if (v == null) return '—'
  const [min, max] = DISPLAY_DECIMALS[displayUnit(field, prefs)] ?? [0, 2]
  return new Intl.NumberFormat(locale, { minimumFractionDigits: min, maximumFractionDigits: max }).format(v)
}

/** Krok +/− v jednotke používateľa. */
export function displayStep(field: SetupField, prefs: UnitPrefs): number {
  const u = displayUnit(field, prefs)
  if (u === 'psi') return 0.1
  if (u === 'in') return field.step < 1 ? 0.01 : 0.05
  if (u === 'f') return 1
  if (u === 'lb') return 0.5
  return field.step
}

/** Prečíta číslo zo vstupu (akceptuje desatinnú čiarku aj bodku). */
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(/\s/g, '').replace(',', '.')
  if (t === '' || t === '-' || t === '.') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/** Počet desatinných miest [min, max] v jednotke používateľa (bar → vždy 2: „0,90“). */
export function displayDecimals(field: SetupField, prefs: UnitPrefs): [min: number, max: number] {
  return DISPLAY_DECIMALS[displayUnit(field, prefs)] ?? [0, 2]
}
