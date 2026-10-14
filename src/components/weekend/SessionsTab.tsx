import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronRight, CloudRain, CloudUpload, Droplets, Plus, Sun, Timer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Badge, Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { previousSession, useSessions } from '@/data/sessions'
import type { Session, TrackCondition } from '@/data/types'
import { cn } from '@/lib/cn'
import { formatDelta, formatLapTime } from '@/lib/laptime'
import { weekdayTime } from '@/lib/time'

export const CONDITION_ICON: Record<TrackCondition, typeof Sun> = { dry: Sun, damp: Droplets, wet: CloudRain }

/** Rozdiel najlepšieho kola oproti predchádzajúcej jazde (ms), alebo null. */
export function lapDelta(session: Session, prev: Session | null) {
  return session.bestLapMs != null && prev?.bestLapMs != null ? session.bestLapMs - prev.bestLapMs : null
}

/** Štítok rozdielu času: zelený = rýchlejšie, červený = pomalšie. */
export function DeltaBadge({ delta, size = 'md' }: { delta: number | null; size?: 'md' | 'lg' }) {
  const { i18n } = useTranslation()
  if (delta == null) return null
  return (
    <span
      className={cn(
        'display tnum inline-flex items-center rounded-full',
        size === 'lg' ? 'px-3 py-1 text-[1.05rem]' : 'px-2 py-0.5 text-[0.82rem]',
        delta < 0 ? 'bg-success/12 text-success' : delta > 0 ? 'bg-danger/10 text-danger' : 'bg-sunken text-ink-2',
      )}
    >
      {formatDelta(delta, i18n.language)}
    </span>
  )
}

/** Jazdy motokáry v udalosti, najnovšia hore. */
export function SessionsTab({ eventId, kartId, canEdit }: { eventId: string; kartId: string; canEdit: boolean }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const sessions = useSessions(kartId)
  const list = (sessions.data ?? []).filter((s) => s.eventId === eventId)
  const add = () => void navigate({ to: '/weekend/$eventId/sessions/new', params: { eventId }, search: { kart: kartId } })

  return (
    <div className="space-y-4">
      {canEdit && (
        <Button block size="lg" icon={<Plus className="size-5" />} onClick={add}>
          {t('weekend.session.add')}
        </Button>
      )}

      {list.length === 0 ? (
        <Card>
          <EmptyState icon={<Timer className="size-7" />} title={t('weekend.session.empty')} body={t('weekend.session.emptyHint')} />
        </Card>
      ) : (
        <ol className="space-y-3">
          {list.map((s, i) => {
            const prev = previousSession(sessions.data, s)
            const Icon = s.trackCondition ? CONDITION_ICON[s.trackCondition] : null
            return (
              <li key={s.id}>
                <Link
                  to="/weekend/$eventId/sessions/$sessionId"
                  params={{ eventId, sessionId: s.id }}
                  search={{ kart: kartId }}
                  className="block rounded-[22px]"
                >
                  <Card className="flex items-center gap-4 p-4 transition-colors hover:border-line-strong sm:p-5">
                    <span className="display tnum grid size-11 shrink-0 place-items-center rounded-[13px] bg-sunken text-[1.05rem] text-ink-2">
                      {list.length - i}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{s.label || t('weekend.session.title')}</span>
                      <span className="flex items-center gap-1.5 text-[0.85rem] text-ink-3">
                        {Icon && <Icon className="size-3.5 shrink-0" />}
                        <span className="truncate">
                          {[weekdayTime(s.recordedAt, i18n.language), s.laps != null && t('weekend.session.lapsShort', { count: s.laps })]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="display tnum text-[1.3rem]">{formatLapTime(s.bestLapMs, i18n.language)}</span>
                      {s.pending ? (
                        <Badge tone="accent">
                          <CloudUpload className="size-3.5" />
                        </Badge>
                      ) : (
                        <DeltaBadge delta={lapDelta(s, prev)} />
                      )}
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-ink-3" />
                  </Card>
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
