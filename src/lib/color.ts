// Výpočty kontrastu, aby farba tímu fungovala v svetlom aj tmavom režime.

type RGB = [number, number, number]

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
}

function luminance([r, g, b]: RGB): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function contrast(a: string, b: string): number {
  const la = luminance(hexToRgb(a))
  const lb = luminance(hexToRgb(b))
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

function toHsl([r, g, b]: RGB): [number, number, number] {
  const [R, G, B] = [r / 255, g / 255, b / 255]
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4
  return [h / 6, s, l]
}

function fromHsl([h, s, l]: [number, number, number]): string {
  if (s === 0) return rgbToHex([l * 255, l * 255, l * 255])
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const f = (t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return rgbToHex([f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255])
}

/**
 * Mení svetlosť (odtieň a sýtosť zostávajú), kým farba nedosiahne
 * požadovaný kontrast voči pozadiu – farba tímu tak nezošedne.
 */
function ensureContrast(color: string, bg: string, target: number, direction: 'lighter' | 'darker'): string {
  const [h, s, l0] = toHsl(hexToRgb(color))
  let c = color
  for (let l = l0; contrast(c, bg) < target && l >= 0 && l <= 1; l += direction === 'lighter' ? 0.02 : -0.02) {
    c = fromHsl([h, s, Math.min(1, Math.max(0, l))])
  }
  return c
}

/** Čitateľná farba textu na plnej farbe. */
export function onColor(fill: string): string {
  return contrast(fill, '#ffffff') >= contrast(fill, '#0d1524') ? '#ffffff' : '#0d1524'
}

export interface TeamPalette {
  light: string
  lightOn: string
  lightInk: string
  dark: string
  darkOn: string
  darkInk: string
}

const LIGHT_BG = '#ffffff'
const DARK_BG = '#141a24'

export function teamPalette(color: string): TeamPalette {
  // Plocha: v tmavom režime nesmie splynúť s pozadím.
  const dark = ensureContrast(color, DARK_BG, 2.4, 'lighter')
  return {
    light: color,
    lightOn: onColor(color),
    lightInk: ensureContrast(color, LIGHT_BG, 4.5, 'darker'),
    dark,
    darkOn: onColor(dark),
    darkInk: ensureContrast(color, DARK_BG, 4.5, 'lighter'),
  }
}

/** Vybrané farby pre tímy – sýte, dobre rozlíšiteľné aj na slnku. */
export const TEAM_COLORS = [
  '#1d56e9', '#132440', '#0891b2', '#0f766e',
  '#15803d', '#65a30d', '#ca8a04', '#ea580c',
  '#dc2626', '#be185d', '#7c3aed', '#27272a',
]

/** Hex kód z textu: „E30613“, „#e30613“, „#e06“ → „#e30613“ (inak null). */
export function normalizeHex(input: string): string | null {
  let s = input.trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{3}$/.test(s)) s = s.replace(/./g, (c) => c + c)
  return /^[0-9a-f]{6}$/.test(s) ? '#' + s : null
}

export type CMYK = [number, number, number, number]

/** CMYK v percentách (0–100) – len orientačne, tlač má vlastné profily. */
export function rgbToCmyk([r, g, b]: RGB): CMYK {
  const k = 1 - Math.max(r, g, b) / 255
  if (k >= 1) return [0, 0, 0, 100]
  const f = (c: number) => Math.round(((1 - c / 255 - k) / (1 - k)) * 100)
  return [f(r), f(g), f(b), Math.round(k * 100)]
}

export function cmykToRgb([c, m, y, k]: CMYK): RGB {
  const f = (v: number) => Math.round(255 * (1 - v / 100) * (1 - k / 100))
  return [f(c), f(m), f(y)]
}

/** HSV: odtieň 0–360, sýtosť a jas 0–1 (pre plochu výberu farby). */
export function rgbToHsv([r, g, b]: RGB): [number, number, number] {
  const [R, G, B] = [r / 255, g / 255, b / 255]
  const max = Math.max(R, G, B)
  const d = max - Math.min(R, G, B)
  let h = 0
  if (d) h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4
  return [(h * 60 + 360) % 360, max ? d / max : 0, max]
}

export function hsvToRgb([h, s, v]: [number, number, number]): RGB {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))))
  }
  return [f(5), f(3), f(1)]
}

/**
 * Hlavné farby obrázka (napr. loga) – najčastejšie farby, sýte majú prednosť
 * pred bielou, čiernou a sivou. Vráti hex kódy, najvýraznejšie prvé.
 */
export function dominantColors(data: Uint8ClampedArray, count = 6): string[] {
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>()
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 160) continue
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4)
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 }
    bucket.r += data[i]
    bucket.g += data[i + 1]
    bucket.b += data[i + 2]
    bucket.n++
    buckets.set(key, bucket)
  }
  // Prechodové odtiene na hranách (napr. ružová medzi červenou a bielou) majú len pár pixelov.
  const total = [...buckets.values()].reduce((sum, x) => sum + x.n, 0)
  const ranked = [...buckets.values()]
    .filter((x) => x.n >= total * 0.006)
    .map((x) => {
      const rgb: RGB = [x.r / x.n, x.g / x.n, x.b / x.n]
      const [, s, v] = rgbToHsv(rgb)
      return { rgb, score: x.n * (0.25 + s * Math.min(1, v * 1.6)) }
    })
    .sort((a, b) => b.score - a.score)
  const out: RGB[] = []
  for (const c of ranked) {
    if (out.every((o) => Math.hypot(o[0] - c.rgb[0], o[1] - c.rgb[1], o[2] - c.rgb[2]) > 48)) out.push(c.rgb)
    if (out.length >= count) break
  }
  return out.map(rgbToHex)
}
