import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { BarChart3, Check, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PressureGrid, useUnitPrefs } from '@/components/setup/SetupView'
import { Stepper } from '@/components/setup/Stepper'
import { KartMultiSelect } from '@/components/team/pickers'
import { Button } from '@/components/ui/Button'
import { Badge, Card, Section } from '@/components/ui/Card'
import { KartPlate } from '@/components/ui/Identity'
import { PageHeader } from '@/components/ui/PageHeader'
import { Segmented } from '@/components/ui/Segmented'
import { FullScreenLoader } from '@/components/ui/Spinner'
import { isActive, useEvents } from '@/data/events'
import { lastOrderFor, usePressureOrders, usePressureSamples, useSendPressureOrders } from '@/data/pressures'
import { safe, useCan, useCurrentTeam, useKarts } from '@/data/queries'
import {
  displayDecimals,
  displayStep,
  formatField,
  fromDisplay,
  PRESSURE_FIELD,
  TEMP_FIELD,
  toDisplay,
  type SetupField,
} from '@/data/setup-fields'
import type { Kart, PressureOrderInput } from '@/data/types'
import { cn } from '@/lib/cn'
import {
  averageTireTemp,
  recommend,
  TIRES,
  weakestSource,
  type Conditions,
  type Tire,
  type TireRecommendation,
} from '@/lib/pressure'
import { relativeTime } from '@/lib/time'
import { useWorkspace } from '@/state/workspace'

type Mode = 'each' | 'same'
type Values = Record<Tire, number>

const tireKey = (t: Tire) => `tire_${t}`

/** Krokovač hodnoty v jednotke používateľa (tlak / teplota), ukladá v kanonickej. */
function UnitStepper({
  field,
  value,
  onChange,
  label,
  layout,
}: {
  field: SetupField
  value: number
  onChange: (v: number) => void
  label: string
  layout?: 'row' | 'stack'
}) {
  const prefs = useUnitPrefs()
  return (
    <Stepper
      label={label}
      value={toDisplay(field, value, prefs)}
      onChange={(v) => v != null && onChange(fromDisplay(field, v, prefs))}
      step={displayStep(field, prefs)}
      decimals={displayDecimals(field, prefs)}
      layout={layout}
    />
  )
}

/** Riadok podmienky: popis vľavo, krokovač vpravo. */
function ConditionRow({ label, hint, unit, children }: { label: string; hint?: string; unit: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block max-w-[28ch] text-[0.82rem] leading-snug text-ink-3">{hint}</span>}
      </span>
      <span className="flex items-center gap-2">
        {children}
        <span className="w-8 text-[0.85rem] text-ink-3">{unit}</span>
      </span>
    </div>
  )
}

/** Výpočet a odoslanie tlakov (/pressures) – iba pre rolu s oprávnením pressure.engineer. */
export function PressuresPage() {
  const { t, i18n } = useTranslation()
  const { team } = useCurrentTeam()
  const can = useCan()
  const prefs = useUnitPrefs()
  const karts = useKarts(team?.id)
  const samples = usePressureSamples(team?.id)
  const orders = usePressureOrders(team?.id)
  const events = useEvents(team?.id)
  const send = useSendPressureOrders(team?.id ?? '')
  const targetHot = useWorkspace((s) => s.targetHot)
  const setTargetHot = useWorkspace((s) => s.setTargetHot)

  const [air, setAir] = useState(20)
  const [track, setTrack] = useState(30)
  const [tireTemp, setTireTemp] = useState(50)
  const [initialized, setInitialized] = useState(false)
  const [mode, setMode] = useState<Mode>('each')
  const [overrides, setOverrides] = useState<Record<string, Partial<Values>>>({})
  const [selected, setSelected] = useState<string[] | null>(null)
  const [note, setNote] = useState('')
  const [sentFor, setSentFor] = useState<string[]>([])

  // Predvyplnenie podmienok z poslednej jazdy s meraním.
  useEffect(() => {
    if (initialized || !samples.data) return
    const last = samples.data.find((s) => s.airTemp != null && s.trackTemp != null)
    if (last) {
      setAir(last.airTemp!)
      setTrack(last.trackTemp!)
    }
    const avg = averageTireTemp(samples.data)
    if (avg != null) setTireTemp(avg)
    setInitialized(true)
  }, [samples.data, initialized])

  const cond: Conditions = { targetHot, airTemp: air, trackTemp: track, tireTemp }

  // Pri zmene podmienok sa ručné úpravy zahodia – platí nový výpočet.
  useEffect(() => {
    setOverrides({})
    setSentFor([])
  }, [targetHot, air, track, tireTemp])

  const allKarts = karts.data ?? []
  const chosen = selected ?? allKarts.map((k) => k.id)

  const recs = useMemo(() => {
    const out: Record<string, Record<Tire, TireRecommendation>> = {}
    for (const k of allKarts) out[k.id] = recommend((samples.data ?? []).filter((s) => s.kartId === k.id), cond)
    out._all = recommend(samples.data ?? [], cond)
    return out
  }, [allKarts, samples.data, targetHot, air, track, tireTemp])

  if (!team || !can('pressure.engineer')) return null
  if (karts.isPending || samples.isPending) return <FullScreenLoader />

  const activeEvent = events.data?.find((e) => isActive(e)) ?? null
  const valuesFor = (key: string): Values =>
    Object.fromEntries(TIRES.map((tire) => [tire, overrides[key]?.[tire] ?? recs[key][tire].cold])) as Values
  const setValue = (key: string, tire: Tire, v: number) =>
    setOverrides((cur) => ({ ...cur, [key]: { ...cur[key], [tire]: Math.round(v * 100) / 100 } }))

  const toOrder = (kartId: string, values: Values): PressureOrderInput => ({
    kartId,
    eventId: activeEvent?.id ?? null,
    values: Object.fromEntries(TIRES.map((tire) => [tireKey(tire), values[tire]])),
    targetHot,
    airTemp: air,
    trackTemp: track,
    note: note.trim(),
  })

  async function sendTo(kartIds: string[]) {
    if (kartIds.length === 0) return
    const list = kartIds.map((id) => toOrder(id, mode === 'same' ? valuesFor('_all') : valuesFor(id)))
    const r = await safe(send.mutateAsync(list))
    if (r.ok) setSentFor((cur) => [...new Set([...cur, ...kartIds])])
  }

  const toggle = (id: string) =>
    setSelected(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id])

  const sourceBadge = (rec: Record<Tire, TireRecommendation>) => {
    const { source, samples: n } = weakestSource(rec)
    return (
      <Badge tone={source === 'model' ? 'accent' : 'neutral'}>{t(`pressures.source.${source}`, { count: n })}</Badge>
    )
  }

  const growthText = (rec: Record<Tire, TireRecommendation>) => {
    const avg = TIRES.reduce((s, tire) => s + rec[tire].growth, 0) / TIRES.length
    return t('pressures.growth', { value: formatField(PRESSURE_FIELD, avg, prefs, i18n.language) })
  }

  const grid = (key: string) => (
    <PressureGrid
      values={Object.fromEntries(TIRES.map((tire) => [tireKey(tire), valuesFor(key)[tire]]))}
      highlight={TIRES.filter((tire) => overrides[key]?.[tire] != null).map(tireKey)}
      renderTire={(f) => {
        const tire = f.key.replace('tire_', '') as Tire
        return (
          <UnitStepper
            field={PRESSURE_FIELD}
            label={t(`home.tires.${tire}`)}
            value={valuesFor(key)[tire]}
            onChange={(v) => setValue(key, tire, v)}
            layout="stack"
          />
        )
      }}
    />
  )

  const statusLine = (kart: Kart) => {
    const o = lastOrderFor(orders.data, kart.id)
    if (!o) return null
    return (
      <span className={cn('text-[0.82rem]', o.status === 'done' ? 'text-success' : 'text-accent-ink')}>
        {o.status === 'done'
          ? t('pressures.status.done', {
              name: o.doneBy?.name ?? '',
              when: relativeTime(o.doneAt ?? o.createdAt, i18n.language, t('time.justNow')),
            })
          : t('pressures.status.pending', { when: relativeTime(o.createdAt, i18n.language, t('time.justNow')) })}
      </span>
    )
  }

  const unitP = prefs.pressure
  const unitT = prefs.temperature === 'f' ? '°F' : '°C'

  return (
    <>
      <PageHeader back title={t('pressures.title')} />
      <p className="-mt-2 mb-8 max-w-[60ch] leading-relaxed text-ink-2">{t('pressures.intro')}</p>

      <div className="space-y-8 pb-28 lg:pb-0">
        <Section title={t('pressures.conditions')}>
          <Card className="divide-y divide-line">
            <ConditionRow label={t('pressures.targetHot')} hint={t('pressures.targetHotHint')} unit={unitP}>
              <UnitStepper field={PRESSURE_FIELD} label={t('pressures.targetHot')} value={targetHot} onChange={setTargetHot} />
            </ConditionRow>
            <ConditionRow label={t('pressures.airTemp')} unit={unitT}>
              <UnitStepper field={TEMP_FIELD} label={t('pressures.airTemp')} value={air} onChange={setAir} />
            </ConditionRow>
            <ConditionRow label={t('pressures.trackTemp')} unit={unitT}>
              <UnitStepper field={TEMP_FIELD} label={t('pressures.trackTemp')} value={track} onChange={setTrack} />
            </ConditionRow>
            <ConditionRow label={t('pressures.tireTemp')} hint={t('pressures.tireTempHint')} unit={unitT}>
              <UnitStepper field={TEMP_FIELD} label={t('pressures.tireTemp')} value={tireTemp} onChange={setTireTemp} />
            </ConditionRow>
          </Card>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            placeholder={t('pressures.notePlaceholder')}
            aria-label={t('pressures.note')}
            className="h-[52px] w-full rounded-[14px] border border-line-strong bg-surface px-4 outline-none placeholder:text-ink-3 focus:border-accent"
          />
        </Section>

        <Segmented<Mode>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'each', label: t('pressures.mode.each') },
            { value: 'same', label: t('pressures.mode.same') },
          ]}
        />

        {allKarts.length === 0 && <Card className="p-6 text-center text-ink-3">{t('pressures.noKarts')}</Card>}

        {mode === 'each' ? (
          <div className="space-y-4">
            {allKarts.map((k) => {
              const on = chosen.includes(k.id)
              return (
                <Card key={k.id} className={cn('overflow-hidden transition-opacity', !on && 'opacity-60')}>
                  <div className="flex items-center gap-3 p-4">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      aria-label={k.driverName || k.number}
                      onClick={() => toggle(k.id)}
                      className={cn(
                        'grid size-7 shrink-0 place-items-center rounded-[9px] border-2 transition-colors',
                        on ? 'border-accent bg-accent-fill text-on-accent' : 'border-line-strong',
                      )}
                    >
                      {on && <Check className="size-4" strokeWidth={3} />}
                    </button>
                    <KartPlate number={k.number} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{k.driverName || '—'}</span>
                      {statusLine(k)}
                    </span>
                    {sourceBadge(recs[k.id])}
                  </div>
                  <div className="px-2 sm:px-3">{grid(k.id)}</div>
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <span className="text-[0.85rem] text-ink-3">{growthText(recs[k.id])}</span>
                    <span className="flex gap-2">
                      <Link
                        to="/pressures/$kartId"
                        params={{ kartId: k.id }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-[11px] px-3 text-[0.9rem] font-semibold text-accent-ink hover:bg-accent-soft"
                      >
                        <BarChart3 className="size-4" />
                        {t('pressures.stats')}
                      </Link>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={sentFor.includes(k.id) ? <Check className="size-4" /> : <Send className="size-4" />}
                        loading={send.isPending}
                        onClick={() => void sendTo([k.id])}
                      >
                        {sentFor.includes(k.id) ? t('pressures.sent') : t('pressures.send')}
                      </Button>
                    </span>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 p-4">
                <span className="text-[0.9rem] leading-snug text-ink-2">{t('pressures.sameHint')}</span>
                {sourceBadge(recs._all)}
              </div>
              <div className="px-2 sm:px-3">{grid('_all')}</div>
              <div className="px-4 py-3 text-[0.85rem] text-ink-3">{growthText(recs._all)}</div>
            </Card>
            <KartMultiSelect karts={allKarts} value={chosen} onChange={setSelected} />
          </div>
        )}

        {send.isError && <p className="text-danger">{t('common.error')}</p>}

        <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface/92 px-4 py-3 backdrop-blur-xl lg:sticky lg:bottom-6 lg:rounded-[22px] lg:border lg:p-3 lg:shadow-float">
          <div className="mx-auto max-w-[880px]">
            <Button
              block
              size="lg"
              icon={<Send className="size-5" />}
              disabled={chosen.length === 0}
              loading={send.isPending}
              onClick={() => void sendTo(chosen)}
            >
              {t('pressures.sendSelected', { count: chosen.length })}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
