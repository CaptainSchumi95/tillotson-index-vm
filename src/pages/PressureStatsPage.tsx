import { useParams } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useUnitPrefs } from '@/components/setup/SetupView'
import { Card, Section } from '@/components/ui/Card'
import { KartPlate } from '@/components/ui/Identity'
import { PageHeader } from '@/components/ui/PageHeader'
import { FullScreenLoader } from '@/components/ui/Spinner'
import { usePressureSamples } from '@/data/pressures'
import { useCan, useCurrentTeam, useKarts } from '@/data/queries'
import { formatField, PRESSURE_FIELD, TEMP_FIELD } from '@/data/setup-fields'
import { cn } from '@/lib/cn'
import { coldForTarget, predictEffTemp, tirePoints, TIRES } from '@/lib/pressure'
import { dateTime } from '@/lib/time'
import { useWorkspace } from '@/state/workspace'

/** Štatistika tlakov motokáry: model ohrevu a namerané jazdy (/pressures/$kartId). */
export function PressureStatsPage() {
  const { t, i18n } = useTranslation()
  const { kartId } = useParams({ strict: false }) as { kartId: string }
  const { team } = useCurrentTeam()
  const can = useCan()
  const prefs = useUnitPrefs()
  const karts = useKarts(team?.id)
  const samples = usePressureSamples(team?.id)
  const targetHot = useWorkspace((s) => s.targetHot)

  if (!team || !can('pressure.engineer')) return null
  if (samples.isPending) return <FullScreenLoader />
  const kart = karts.data?.find((k) => k.id === kartId)
  const list = (samples.data ?? []).filter((s) => s.kartId === kartId)

  const p = (v: number | null | undefined) => formatField(PRESSURE_FIELD, v ?? null, prefs, i18n.language)
  const temp = (v: number | null | undefined) =>
    `${formatField(TEMP_FIELD, v ?? null, prefs, i18n.language)} ${prefs.temperature === 'f' ? '°F' : '°C'}`

  // Tlak za studena pri vzduchu 20 °C pre rôzne teploty trate – „ako sa motokára správa“.
  const tracks = [20, 30, 40]

  return (
    <>
      <PageHeader back title={t('pressures.statsTitle')} action={kart && <KartPlate number={kart.number} />} />

      {list.length === 0 ? (
        <Card className="p-6 text-center leading-relaxed text-ink-3">{t('pressures.statsEmpty')}</Card>
      ) : (
        <div className="space-y-8">
          <Section title={t('pressures.statsModel')}>
            <div className="space-y-3">
              {tracks.map((tr) => (
                <Card key={tr} className="overflow-hidden">
                  <div className="border-b border-line bg-surface-2 px-4 py-2.5 font-semibold">
                    {t('pressures.trackTemp')} {temp(tr)}
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
                    {TIRES.map((tire) => {
                      const pred = predictEffTemp(tirePoints(list, tire), tr, 50)
                      const cold = coldForTarget(targetHot, 20, pred.effTemp)
                      return (
                        <div key={tire} className="bg-surface px-4 py-3">
                          <div className="text-[0.78rem] text-ink-3">{t(`home.tires.${tire}`)}</div>
                          <div className="display tnum text-[1.3rem]">{p(cold)}</div>
                          <div className="text-[0.78rem] text-ink-3">{t('pressures.effTemp', { value: temp(pred.effTemp) })}</div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              ))}
            </div>
            <p className="px-1 text-[0.82rem] leading-relaxed text-ink-3">
              {t('pressures.statsModelHint', { air: temp(20), target: `${p(targetHot)} ${prefs.pressure}` })}
            </p>
          </Section>

          <Section title={t('weekend.tabs.sessions')}>
            <div className="space-y-3">
              {list.map((s) => (
                <Card key={s.sessionId} className="p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold">{s.label || t('weekend.session.title')}</span>
                    <span className="text-[0.85rem] text-ink-3">{s.recordedAt && dateTime(s.recordedAt, i18n.language)}</span>
                  </div>
                  <div className="mt-1 text-[0.85rem] text-ink-3">
                    {t('pressures.reading.airTemp')} {temp(s.airTemp)} · {t('pressures.reading.trackTemp')} {temp(s.trackTemp)}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {TIRES.map((tire) => {
                      const r = s.tires[tire]
                      const growth = r?.cold != null && r.hot != null ? r.hot - r.cold : null
                      return (
                        <div key={tire} className="rounded-[12px] bg-surface-2 px-3 py-2">
                          <div className="text-[0.75rem] text-ink-3">{t(`home.tires.${tire}`)}</div>
                          <div className="tnum text-[0.95rem]">
                            {p(r?.cold)} → <span className="font-semibold">{p(r?.hot)}</span>
                          </div>
                          <div className={cn('tnum text-[0.78rem]', growth != null ? 'text-accent-ink' : 'text-ink-3')}>
                            {growth != null ? `+${p(growth)}` : '—'}
                            {r?.temp != null && <span className="text-ink-3"> · {temp(r.temp)}</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              ))}
            </div>
          </Section>
        </div>
      )}
    </>
  )
}
