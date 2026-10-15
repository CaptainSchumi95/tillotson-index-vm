import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUnitPrefs } from '@/components/setup/SetupView'
import { Card } from '@/components/ui/Card'
import { formatField, fromDisplay, parseNumber, PRESSURE_FIELD, TEMP_FIELD } from '@/data/setup-fields'
import type { SessionPressures } from '@/data/types'
import { cn } from '@/lib/cn'
import { TIRES, type Tire, type TireReading } from '@/lib/pressure'

const EMPTY: TireReading = { cold: null, hot: null, temp: null }

/** Malé číselné pole v jednotke používateľa (ukladá kanonickú hodnotu). */
function NumCell({
  value,
  onChange,
  kind,
  label,
}: {
  value: number | null
  onChange: (v: number | null) => void
  kind: 'pressure' | 'temp'
  label: string
}) {
  const { i18n } = useTranslation()
  const prefs = useUnitPrefs()
  const field = kind === 'pressure' ? PRESSURE_FIELD : TEMP_FIELD
  const fmt = (v: number | null) => (v == null ? '' : formatField(field, v, prefs, i18n.language))
  const [text, setText] = useState(fmt(value))
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (!focused) setText(fmt(value))
  }, [value, focused])

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={label}
      value={text}
      placeholder="—"
      onFocus={(e) => {
        setFocused(true)
        e.target.select()
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setText(e.target.value)
        const n = parseNumber(e.target.value)
        onChange(n == null ? null : fromDisplay(field, n, prefs))
      }}
      className="tnum h-11 w-full min-w-0 rounded-[11px] border border-line-strong bg-surface px-2 text-center font-semibold outline-none placeholder:font-normal placeholder:text-ink-3/50 focus:border-accent"
    />
  )
}

/** Zápis tlakov a teplôt pri jazde: studený (pred), teplý (po), teplota gumy + vzduch a trať. */
export function PressureReadingsEditor({
  value,
  onChange,
}: {
  value: SessionPressures
  onChange: (v: SessionPressures) => void
}) {
  const { t, i18n } = useTranslation()
  const prefs = useUnitPrefs()
  const unitT = prefs.temperature === 'f' ? '°F' : '°C'
  const setTire = (tire: Tire, patch: Partial<TireReading>) =>
    onChange({ ...value, tires: { ...value.tires, [tire]: { ...EMPTY, ...value.tires[tire], ...patch } } })

  return (
    <div className="space-y-3">
      <Card className="grid grid-cols-2 gap-3 p-3">
        {(['airTemp', 'trackTemp'] as const).map((k) => (
          <label key={k} className="space-y-1">
            <span className="block px-1 text-[0.82rem] font-semibold text-ink-2">
              {t(`pressures.reading.${k}`)} ({unitT})
            </span>
            <NumCell kind="temp" label={t(`pressures.reading.${k}`)} value={value[k]} onChange={(v) => onChange({ ...value, [k]: v })} />
          </label>
        ))}
      </Card>

      <Card className="overflow-hidden">
        <div className="eyebrow grid grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))] gap-2 bg-surface-2 px-3 py-2">
          <span />
          <span className="text-center">{t('pressures.reading.cold')}</span>
          <span className="text-center">{t('pressures.reading.hot')}</span>
          <span className="text-center">
            {t('pressures.reading.temp')} {unitT}
          </span>
        </div>
        <div className="divide-y divide-line">
          {TIRES.map((tire) => {
            const r = { ...EMPTY, ...value.tires[tire] }
            const growth = r.cold != null && r.hot != null ? r.hot - r.cold : null
            return (
              <div key={tire} className="grid grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))] items-center gap-2 px-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-[0.88rem] font-medium">{t(`home.tires.${tire}`)}</span>
                  <span className={cn('tnum block text-[0.75rem]', growth != null ? 'text-accent-ink' : 'text-ink-3/60')}>
                    {growth != null ? `+${formatField(PRESSURE_FIELD, growth, prefs, i18n.language)}` : prefs.pressure}
                  </span>
                </span>
                <NumCell kind="pressure" label={`${t(`home.tires.${tire}`)} ${t('pressures.reading.cold')}`} value={r.cold} onChange={(v) => setTire(tire, { cold: v })} />
                <NumCell kind="pressure" label={`${t(`home.tires.${tire}`)} ${t('pressures.reading.hot')}`} value={r.hot} onChange={(v) => setTire(tire, { hot: v })} />
                <NumCell kind="temp" label={`${t(`home.tires.${tire}`)} ${t('pressures.reading.temp')}`} value={r.temp} onChange={(v) => setTire(tire, { temp: v })} />
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

/** Či zápis obsahuje aspoň jednu hodnotu (prázdny sa neukladá). */
export function hasReadings(p: SessionPressures) {
  return p.airTemp != null || p.trackTemp != null || TIRES.some((t) => {
    const r = p.tires[t]
    return r?.cold != null || r?.hot != null || r?.temp != null
  })
}

/** Zobrazenie meraní v detaile jazdy. */
export function PressureReadingsView({ value }: { value: SessionPressures }) {
  const { t, i18n } = useTranslation()
  const prefs = useUnitPrefs()
  const p = (v: number | null | undefined) => formatField(PRESSURE_FIELD, v ?? null, prefs, i18n.language)
  const temp = (v: number | null | undefined) => formatField(TEMP_FIELD, v ?? null, prefs, i18n.language)
  const unitT = prefs.temperature === 'f' ? '°F' : '°C'
  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 text-[0.88rem] text-ink-2">
        {t('pressures.reading.airTemp')} <span className="font-semibold">{temp(value.airTemp)} {unitT}</span> ·{' '}
        {t('pressures.reading.trackTemp')} <span className="font-semibold">{temp(value.trackTemp)} {unitT}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-line p-3 sm:grid-cols-4">
        {TIRES.map((tire) => {
          const r = value.tires[tire]
          const growth = r?.cold != null && r.hot != null ? r.hot - r.cold : null
          return (
            <div key={tire} className="rounded-[12px] bg-surface-2 px-3 py-2">
              <div className="text-[0.75rem] text-ink-3">{t(`home.tires.${tire}`)}</div>
              <div className="tnum">
                {p(r?.cold)} → <span className="font-semibold">{p(r?.hot)}</span>
              </div>
              <div className="tnum text-[0.78rem] text-ink-3">
                {growth != null && <span className="text-accent-ink">+{p(growth)} </span>}
                {r?.temp != null && `· ${temp(r.temp)} ${unitT}`}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
