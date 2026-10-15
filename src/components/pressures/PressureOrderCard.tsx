import { Check, Gauge } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PressureGrid, useUnitPrefs } from '@/components/setup/SetupView'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { pendingOrderFor, useCompletePressureOrder, usePressureOrders } from '@/data/pressures'
import { useCan, useSetupRevisions } from '@/data/queries'
import { PRESSURE_FIELD, TEMP_FIELD, formatField } from '@/data/setup-fields'
import { relativeTime } from '@/lib/time'

/**
 * Príkaz od inžiniera pre motokáru – mechanik natlakuje a potvrdí.
 * Až potvrdenie zapíše tlaky do setupu (setup ostáva skutočný stav motokáry).
 */
export function PressureOrderCard({ teamId, kartId }: { teamId: string; kartId: string }) {
  const { t, i18n } = useTranslation()
  const can = useCan()
  const prefs = useUnitPrefs()
  const orders = usePressureOrders(teamId)
  const revisions = useSetupRevisions(kartId)
  const complete = useCompletePressureOrder()
  const order = pendingOrderFor(orders.data, kartId)

  if (!order) return null
  const canDo = can('setup.edit')
  const fmtP = (v: number | null) => formatField(PRESSURE_FIELD, v, prefs, i18n.language)
  const fmtT = (v: number | null) => formatField(TEMP_FIELD, v, prefs, i18n.language)
  const unitT = prefs.temperature === 'f' ? '°F' : '°C'

  function done() {
    if (!order) return
    const current = revisions.data?.[0]?.values ?? {}
    complete.mutate({
      teamId,
      orderId: order.id,
      revision: {
        id: crypto.randomUUID(),
        kartId,
        values: { ...current, ...order.values },
        note: [t('pressures.order.doneNote'), order.note].filter(Boolean).join(' – '),
        recordedAt: new Date().toISOString(),
      },
    })
  }

  return (
    <Card className="overflow-hidden border-accent shadow-[0_0_0_1px_var(--accent)]">
      <div className="flex items-center gap-3 bg-accent px-4 py-3 text-on-accent sm:px-5">
        <Gauge className="size-5 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{t('pressures.order.title')}</span>
          <span className="block text-[0.82rem] opacity-80">
            {t('pressures.order.from', {
              name: order.createdBy?.name ?? t('setup.unknownAuthor'),
              when: relativeTime(order.createdAt, i18n.language, t('time.justNow')),
            })}
          </span>
        </span>
      </div>
      <div className="space-y-3 p-3 sm:p-4">
        <PressureGrid values={order.values} />
        {(order.airTemp != null || order.trackTemp != null) && (
          <p className="px-1 text-[0.85rem] text-ink-3">
            {t('pressures.order.conditions', {
              air: `${fmtT(order.airTemp)} ${unitT}`,
              track: `${fmtT(order.trackTemp)} ${unitT}`,
              target: `${fmtP(order.targetHot)} ${prefs.pressure}`,
            })}
          </p>
        )}
        {order.note && <p className="px-1 leading-relaxed">{order.note}</p>}
        {canDo ? (
          <Button block size="lg" icon={<Check className="size-5" />} onClick={done}>
            {t('pressures.order.done')}
          </Button>
        ) : (
          <p className="px-1 text-[0.85rem] text-ink-3">{t('pressures.order.viewOnly')}</p>
        )}
      </div>
    </Card>
  )
}
