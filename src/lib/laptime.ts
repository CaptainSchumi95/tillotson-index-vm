// Časy kôl: ukladajú sa v milisekundách, zadávajú a zobrazujú ako „54,321“ alebo „1:02,345“.

/** Prečíta čas kola: „54.321“, „54,321“, „1:02.345“, „1:02,3“. Vráti ms alebo null. */
export function parseLapTime(text: string): number | null {
  const t = text.trim().replace(',', '.')
  if (!t) return null
  const m = /^(?:(\d{1,2}):)?(\d{1,3})(?:\.(\d{1,3}))?$/.exec(t)
  if (!m) return null
  const min = m[1] ? Number(m[1]) : 0
  const sec = Number(m[2])
  if (m[1] && sec >= 60) return null
  const frac = m[3] ? Number(m[3].padEnd(3, '0')) : 0
  const ms = (min * 60 + sec) * 1000 + frac
  return ms >= 1000 && ms <= 3_600_000 ? ms : null
}

function sep(locale: string) {
  return new Intl.NumberFormat(locale).format(1.5).charAt(1)
}

/** „54,321“ alebo „1:02,345“. */
export function formatLapTime(ms: number | null | undefined, locale: string): string {
  if (ms == null) return '—'
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  const frac = String(ms % 1000).padStart(3, '0')
  const s = min > 0 ? `${min}:${String(sec).padStart(2, '0')}` : String(sec)
  return `${s}${sep(locale)}${frac}`
}

/** Rozdiel: „−0,412“ (rýchlejšie) alebo „+0,128“. */
export function formatDelta(ms: number, locale: string): string {
  const sign = ms < 0 ? '−' : ms > 0 ? '+' : '±'
  const abs = Math.abs(ms)
  return `${sign}${formatLapTime(abs, locale)}`
}
