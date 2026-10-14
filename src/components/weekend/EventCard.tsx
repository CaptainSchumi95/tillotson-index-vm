import { Link } from '@tanstack/react-router'
import { ChevronRight, Flag, MapPin, Timer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { KartPlate } from '@/components/ui/Identity'
import { isActive } from '@/data/events'
import type { Kart, TeamEvent } from '@/data/types'
import { cn } from '@/lib/cn'
import { dateRange } from '@/lib/time'

/** Karta udalosti v zozname – preteky majú vlajku, tréning stopky. */
export function EventCard({ event, karts, muted }: { event: TeamEvent; karts: Kart[]; muted?: boolean }) {
  const { t, i18n } = useTranslation()
  const live = isActive(event)
  const plates = event.karts.map((k) => karts.find((x) => x.id === k.kartId)).filter((k): k is Kart => !!k)

  return (
    <Link
      to="/weekend/$eventId"
      params={{ eventId: event.id }}
      className={cn(
        'group block rounded-[22px] border bg-surface p-4 shadow-card transition-colors hover:border-line-strong sm:p-5',
        live ? 'border-accent shadow-[0_0_0_1px_var(--accent)]' : 'border-line',
        muted && 'opacity-75',
      )}
    >
      <div className="flex items-start gap-4">
        <span
          className={cn(
            'grid size-12 shrink-0 place-items-center rounded-[14px]',
            event.kind === 'race' ? 'bg-accent text-on-accent' : 'bg-sunken text-ink-2',
          )}
        >
          {event.kind === 'race' ? <Flag className="size-6" /> : <Timer className="size-6" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="eyebrow">{t(`weekend.kind.${event.kind}`)}</span>
            {live && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2 py-0.5 text-[0.7rem] font-bold tracking-wide text-on-accent uppercase">
                <span className="size-1.5 animate-pulse rounded-full bg-current" />
                {t('weekend.live')}
              </span>
            )}
          </div>
          <div className="mt-1 truncate text-[1.1rem] font-semibold">{event.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[0.9rem] text-ink-3">
            <span>{dateRange(event.dateFrom, event.dateTo, i18n.language)}</span>
            {event.trackName && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {event.trackName}
              </span>
            )}
          </div>
          {plates.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {plates.map((k) => (
                <KartPlate key={k.id} number={k.number} size="sm" />
              ))}
            </div>
          )}
        </div>
        <ChevronRight className="mt-3 size-5 shrink-0 text-ink-3" />
      </div>
    </Link>
  )
}
