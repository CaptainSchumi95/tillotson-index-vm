/** „pred 2 h“, „včera“… podľa jazyka. */
export function relativeTime(iso: string, locale: string, justNow: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000
  const abs = Math.abs(diff)
  if (abs < 60) return justNow
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), 'day')
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
}

/** Presný dátum a čas – napr. do histórie. */
export function dateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  )
}

/** „dnes“, „včera“, „pred 5 dňami“ pre dátum RRRR-MM-DD. */
export function relativeDay(date: string, locale: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const then = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((then.getTime() - today.getTime()) / 86_400_000)
  if (Math.abs(days) > 60)
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(then)
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(days, 'day')
}

/** Dnešný dátum RRRR-MM-DD v miestnom čase. */
export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseDay(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** „14. – 15. okt.“ alebo „14. okt.“ (jeden deň). */
export function dateRange(from: string, to: string, locale: string): string {
  const f = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
  return from === to ? f.format(parseDay(from)) : f.formatRange(parseDay(from), parseDay(to))
}

/** „sobota 14. októbra“ – nadpis dňa v harmonograme. */
export function weekdayDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(parseDay(date))
}

/** Všetky dni od–do (vrátane). */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = []
  const d = parseDay(from)
  const end = parseDay(to)
  while (d <= end && out.length < 31) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    d.setDate(d.getDate() + 1)
  }
  return out
}

/** Aktuálny čas HH:MM. */
export function nowTime(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** „st 15:08“ – krátky deň a čas (napr. jazdy v rámci víkendu). */
export function weekdayTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}
