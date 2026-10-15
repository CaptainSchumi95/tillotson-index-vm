// Výpočet tlakov pre Inžiniera.
//
// Princíp (plynový zákon pri stálom objeme): p_abs / T = konšt.
//   p_tepla_abs / T_tepla = p_studena_abs / T_studena
// Z každej jazdy vieme tlak za studena (štart), za tepla (koniec) a teplotu vzduchu
// (pneumatika na štarte ≈ teplota vzduchu). Z toho vypočítame „efektívnu teplotu“
// pneumatiky počas jazdy – ako veľmi ju konkrétny jazdec a motokára zohrejú.
// Tú sa učíme v závislosti od teploty trate (lineárna regresia) a pre nové podmienky
// spätne vypočítame tlak za studena tak, aby za tepla vyšiel cieľový tlak.

export const P_ATM = 1.01325 // bar
const K = 273.15

export const TIRES = ['fl', 'fr', 'rl', 'rr'] as const
export type Tire = (typeof TIRES)[number]

export interface TireReading {
  /** tlak za studena pred jazdou (bar) */
  cold: number | null
  /** tlak za tepla po jazde (bar) */
  hot: number | null
  /** teplota pneumatiky po jazde (°C) */
  temp: number | null
}

export interface PressureSample {
  kartId: string
  airTemp: number | null
  trackTemp: number | null
  tires: Partial<Record<Tire, TireReading>>
}

/** Efektívna teplota pneumatiky počas jazdy (°C) zo studeného a teplého tlaku. */
export function effectiveTemp(cold: number, hot: number, airTemp: number): number | null {
  if (cold <= 0 || hot <= 0) return null
  return (airTemp + K) * ((hot + P_ATM) / (cold + P_ATM)) - K
}

/** Tlak za studena, pri ktorom pri danej efektívnej teplote vyjde cieľový tlak za tepla. */
export function coldForTarget(targetHot: number, airTemp: number, effTemp: number): number {
  return ((targetHot + P_ATM) * (airTemp + K)) / (effTemp + K) - P_ATM
}

/** Najmenšie štvorce y = a + b·x. */
function regression(points: { x: number; y: number }[]) {
  const n = points.length
  const mx = points.reduce((s, p) => s + p.x, 0) / n
  const my = points.reduce((s, p) => s + p.y, 0) / n
  const sxx = points.reduce((s, p) => s + (p.x - mx) ** 2, 0)
  const sxy = points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0)
  const b = sxx > 0 ? sxy / sxx : 0
  return { a: my - b * mx, b }
}

export type Source = 'model' | 'average' | 'physics'

export interface TireRecommendation {
  /** odporúčaný tlak za studena (bar, zaokrúhlený na 0,01) */
  cold: number
  /** očakávaný nárast tlaku počas jazdy (bar) */
  growth: number
  /** použitá efektívna teplota pneumatiky (°C) */
  effTemp: number
  source: Source
  /** počet jázd, z ktorých sa vychádzalo */
  samples: number
}

/** Body (teplota trate, efektívna teplota) pre jedno koleso z nameraných jázd. */
export function tirePoints(samples: PressureSample[], tire: Tire) {
  const out: { track: number | null; eff: number }[] = []
  for (const s of samples) {
    const r = s.tires[tire]
    if (s.airTemp == null || r?.cold == null || r.hot == null) continue
    const eff = effectiveTemp(r.cold, r.hot, s.airTemp)
    if (eff != null && eff > -20 && eff < 150) out.push({ track: s.trackTemp, eff })
  }
  return out
}

/**
 * Odhad efektívnej teploty pre koleso:
 * - model: ≥ 3 jazdy s rôznou teplotou trate (rozptyl ≥ 3 °C) → regresia podľa trate,
 * - average: aspoň 1 jazda → priemer,
 * - physics: bez dát → zadaná / nameraná teplota pneumatiky.
 */
export function predictEffTemp(
  points: { track: number | null; eff: number }[],
  trackTemp: number,
  fallbackTireTemp: number,
): { effTemp: number; source: Source; samples: number } {
  const withTrack = points.filter((p): p is { track: number; eff: number } => p.track != null)
  const tracks = withTrack.map((p) => p.track)
  if (withTrack.length >= 3 && Math.max(...tracks) - Math.min(...tracks) >= 3) {
    const { a, b } = regression(withTrack.map((p) => ({ x: p.track, y: p.eff })))
    // Fyzikálne rozumný sklon: pneumatika s teplejšou traťou nechladne a nerastie extrémne.
    const slope = Math.min(Math.max(b, 0), 3)
    const mx = tracks.reduce((s, x) => s + x, 0) / tracks.length
    const my = a + b * mx
    return { effTemp: my + slope * (trackTemp - mx), source: 'model', samples: withTrack.length }
  }
  if (points.length > 0) {
    return { effTemp: points.reduce((s, p) => s + p.eff, 0) / points.length, source: 'average', samples: points.length }
  }
  return { effTemp: fallbackTireTemp, source: 'physics', samples: 0 }
}

export interface Conditions {
  targetHot: number
  airTemp: number
  trackTemp: number
  /** očakávaná teplota pneumatík – použije sa, keď nie sú dáta z jázd */
  tireTemp: number
}

const round2 = (v: number) => Math.round(v * 100) / 100

/** Odporúčané tlaky za studena pre všetky 4 kolesá z nameraných jázd (jednej motokáry alebo celého tímu). */
export function recommend(samples: PressureSample[], c: Conditions): Record<Tire, TireRecommendation> {
  const out = {} as Record<Tire, TireRecommendation>
  for (const tire of TIRES) {
    const { effTemp, source, samples: n } = predictEffTemp(tirePoints(samples, tire), c.trackTemp, c.tireTemp)
    const cold = round2(coldForTarget(c.targetHot, c.airTemp, effTemp))
    out[tire] = { cold, growth: round2(c.targetHot - cold), effTemp, source, samples: n }
  }
  return out
}

/** Priemerná nameraná teplota pneumatík (°C) – predvyplnenie odhadu pre výpočet bez dát. */
export function averageTireTemp(samples: PressureSample[]): number | null {
  const temps = samples.flatMap((s) => TIRES.map((t) => s.tires[t]?.temp).filter((v): v is number => v != null))
  return temps.length ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length) : null
}

/** Najslabší zdroj zo 4 kolies – na zobrazenie spoľahlivosti celej motokáry. */
export function weakestSource(rec: Record<Tire, TireRecommendation>): { source: Source; samples: number } {
  const order: Source[] = ['physics', 'average', 'model']
  const worst = TIRES.map((t) => rec[t]).sort((a, b) => order.indexOf(a.source) - order.indexOf(b.source))[0]
  return { source: worst.source, samples: Math.min(...TIRES.map((t) => rec[t].samples)) }
}
