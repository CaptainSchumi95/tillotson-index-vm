// Plagáty tratí (ako vo FIA WEC+): štýl a farby podľa krajiny, ručne vyladené pre známe trate.

export type PosterStyle = 'stripes' | 'sweep' | 'bolt' | 'rings' | 'waves' | 'fan' | 'ribbon'

export interface PosterDesign {
  style: PosterStyle
  bg: string
  /** Farby motívu (2–3). */
  colors: [string, string, string]
  /** Farba názvu trate. */
  ink: string
  seed: number
  country: string
  city: string
}

/** Farby vlajok – sýte odtiene, ktoré na plagáte dobre fungujú. */
const FLAGS: Record<string, string[]> = {
  SK: ['#0b4ea2', '#ee1c25', '#ffffff'],
  CZ: ['#11457e', '#d7141a', '#ffffff'],
  HU: ['#ce2939', '#477050', '#ffffff'],
  AT: ['#ed2939', '#ffffff', '#1d1d1b'],
  DE: ['#1d1d1b', '#dd0000', '#ffce00'],
  IT: ['#009246', '#ce2b37', '#ffffff'],
  PL: ['#dc143c', '#ffffff', '#1d1d1b'],
  SI: ['#005da4', '#ed1c24', '#ffffff'],
  HR: ['#171796', '#ff0000', '#ffffff'],
  FR: ['#0055a4', '#ef4135', '#ffffff'],
  ES: ['#aa151b', '#f1bf00', '#ffffff'],
  PT: ['#006600', '#ff0000', '#ffcc00'],
  BE: ['#1d1d1b', '#fdda24', '#ef3340'],
  NL: ['#21468b', '#ae1c28', '#ff7f00'],
  GB: ['#012169', '#c8102e', '#ffffff'],
  UK: ['#012169', '#c8102e', '#ffffff'],
  IE: ['#169b62', '#ff883e', '#ffffff'],
  CH: ['#da291c', '#ffffff', '#1d1d1b'],
  SE: ['#006aa7', '#fecc00', '#ffffff'],
  DK: ['#c60c30', '#ffffff', '#1d1d1b'],
  FI: ['#002f6c', '#ffffff', '#7fb0e6'],
  NO: ['#ba0c2f', '#00205b', '#ffffff'],
  RO: ['#002b7f', '#fcd116', '#ce1126'],
  BG: ['#00966e', '#d62612', '#ffffff'],
  RS: ['#c6363c', '#0c4076', '#ffffff'],
  UA: ['#0057b7', '#ffd700', '#ffffff'],
  LT: ['#fdb913', '#006a44', '#c1272d'],
  LV: ['#9e3039', '#ffffff', '#1d1d1b'],
  EE: ['#0072ce', '#1d1d1b', '#ffffff'],
  GR: ['#0d5eaf', '#ffffff', '#7fb0e6'],
  TR: ['#e30a17', '#ffffff', '#1d1d1b'],
  US: ['#0a3161', '#b31942', '#ffffff'],
  BR: ['#009c3b', '#ffdf00', '#002776'],
  JP: ['#bc002d', '#ffffff', '#1d1d1b'],
  AE: ['#00732f', '#ff0000', '#ffffff'],
  BH: ['#ce1126', '#ffffff', '#1d1d1b'],
}

const BRAND = ['#1d56e9', '#132440', '#ffffff']

/** Ručne navrhnuté plagáty pre trate v aplikácii (kľúč = názov bez diakritiky, malými). */
const PRESETS: Record<string, Partial<PosterDesign>> = {
  'slovakia ring': { style: 'sweep', bg: '#0a3a8c', colors: ['#ffffff', '#ee1c25', '#0a3a8c'], ink: '#ffffff' },
  'kakucs ring': { style: 'stripes', bg: '#f3eee3', colors: ['#ce2939', '#477050', '#1e2a24'], ink: '#ce2939' },
  'autodrom vysoke myto': { style: 'bolt', bg: '#0e3a6e', colors: ['#d7141a', '#ffffff', '#6fa3dd'], ink: '#ffffff' },
}

const STYLES: PosterStyle[] = ['stripes', 'sweep', 'bolt', 'rings', 'waves', 'fan', 'ribbon']

export function normalizeName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Deterministická „náhoda“ – plagát danej trate vyzerá vždy rovnako. */
export function seeded(seed: number) {
  let a = seed || 1
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** „Orechová Potôň, SK“ → mesto a kód krajiny. */
function splitLocation(location: string) {
  const parts = location.split(',').map((x) => x.trim()).filter(Boolean)
  const last = parts.at(-1) ?? ''
  const country = /^[A-Za-z]{2}$/.test(last) ? last.toUpperCase() : ''
  const city = (country ? parts.slice(0, -1) : parts).join(', ')
  return { country, city }
}

const isLight = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 170
}

export function posterDesign(track: { name: string; location: string }): PosterDesign {
  const key = normalizeName(track.name)
  const seed = hash(key)
  const { country, city } = splitLocation(track.location)
  const preset = PRESETS[key]

  const flag = FLAGS[country] ?? BRAND
  const strong = flag.filter((c) => !isLight(c))
  const light = seed % 3 === 0
  // Svetlý (krémový) alebo sýty podklad – striedajú sa, aby knižnica pôsobila pestro.
  const bg = light ? '#f3eee3' : (strong[0] ?? '#132440')
  const rest = flag.filter((c) => c !== bg && !(light && isLight(c)))
  const colors = [rest[0] ?? '#ffffff', rest[1] ?? rest[0] ?? '#ffffff', rest[2] ?? (light ? '#1d1d1b' : '#ffffff')] as [string, string, string]

  return {
    style: STYLES[seed % STYLES.length],
    bg,
    colors,
    ink: light ? (strong[0] ?? '#1d1d1b') : '#ffffff',
    seed,
    country,
    city,
    ...preset,
  }
}

/** Rozdelí názov do riadkov plagátu (max. 3, krátke slová sa spoja). */
export function posterLines(name: string, maxChars = 10) {
  const words = name.toLocaleUpperCase('sk').split(/\s+/).filter(Boolean)
  const lines: string[] = []
  for (const w of words) {
    const last = lines.at(-1)
    if (last && (last + ' ' + w).length <= maxChars) lines[lines.length - 1] = last + ' ' + w
    else lines.push(w)
  }
  while (lines.length > 3) {
    const tail = lines.pop()!
    lines[lines.length - 1] += ' ' + tail
  }
  return lines.length ? lines : ['—']
}
