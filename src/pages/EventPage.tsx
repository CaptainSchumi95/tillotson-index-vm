import { useState } from 'react'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { MapPin, Pencil, StickyNote } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ChecklistView } from '@/components/weekend/ChecklistView'
import { ScheduleView } from '@/components/weekend/ScheduleView'
import { SessionsTab } from '@/components/weekend/SessionsTab'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { KartPlate } from '@/components/ui/Identity'
import { PageHeader } from '@/components/ui/PageHeader'
import { Segmented } from '@/components/ui/Segmented'
import { FullScreenLoader } from '@/components/ui/Spinner'
import { isActive, useEvents } from '@/data/events'
import { useCan, useCurrentKart, useCurrentTeam, useKarts } from '@/data/queries'
import type { Kart } from '@/data/types'
import { cn } from '@/lib/cn'
import { dateRange } from '@/lib/time'

type Tab = 'program' | 'checklist' | 'sessions'

/** Detail udalosti: program a checklist motokár (/weekend/$eventId). */
export function EventPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { eventId } = useParams({ strict: false }) as { eventId: string }
  const { team } = useCurrentTeam()
  const { kart: currentKart } = useCurrentKart()
  const events = useEvents(team?.id)
  const karts = useKarts(team?.id)
  const can = useCan()
  const search = useSearch({ strict: false }) as { tab?: Tab }
  const [tab, setTab] = useState<Tab>(search.tab ?? 'program')
  const [pickedKart, setPickedKart] = useState<string | null>(null)

  if (events.isPending) return <FullScreenLoader />
  const event = events.data?.find((e) => e.id === eventId)
  if (!team || !event) return null

  // Motokáry udalosti, ku ktorým má človek prístup (RLS vráti iba tie).
  const eventKarts = event.karts
    .map((k) => karts.data?.find((x) => x.id === k.kartId))
    .filter((k): k is Kart => !!k)
  const defaultKart = eventKarts.find((k) => k.id === currentKart?.id) ?? eventKarts[0]
  const kart = eventKarts.find((k) => k.id === pickedKart) ?? defaultKart
  const live = isActive(event)

  return (
    <>
      <PageHeader
        back
        eyebrow={
          <span className="flex items-center gap-2">
            {t(`weekend.kind.${event.kind}`)}
            {live && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2 py-0.5 text-[0.68rem] font-bold text-on-accent">
                <span className="size-1.5 animate-pulse rounded-full bg-current" />
                {t('weekend.live')}
              </span>
            )}
          </span>
        }
        title={event.name}
        action={
          can('event.manage') && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Pencil className="size-4" />}
              onClick={() => void navigate({ to: '/weekend/$eventId/edit', params: { eventId: event.id } })}
            >
              {t('common.edit')}
            </Button>
          )
        }
      />

      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-ink-2">
        <span className="font-medium">{dateRange(event.dateFrom, event.dateTo, i18n.language)}</span>
        {event.trackName && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 text-ink-3" />
            {event.trackName}
          </span>
        )}
      </div>

      {event.notes && (
        <Card className="mb-6 flex gap-3 p-4">
          <StickyNote className="mt-0.5 size-5 shrink-0 text-ink-3" />
          <p className="leading-relaxed whitespace-pre-wrap text-ink-2">{event.notes}</p>
        </Card>
      )}

      <Segmented<Tab>
        className="mb-6"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'program', label: t('weekend.tabs.program') },
          { value: 'checklist', label: t('weekend.tabs.checklist') },
          { value: 'sessions', label: t('weekend.tabs.sessions') },
        ]}
      />

      {tab === 'program' && <ScheduleView event={event} canManage={can('event.manage')} />}

      {tab !== 'program' &&
        (kart ? (
          <>
            {eventKarts.length > 1 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {eventKarts.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setPickedKart(k.id)}
                    className={cn(
                      'flex h-12 items-center gap-2.5 rounded-[14px] border py-1.5 pr-4 pl-1.5 transition-colors',
                      k.id === kart.id ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface',
                    )}
                  >
                    <KartPlate number={k.number} size="sm" muted={k.id !== kart.id} />
                    <span className={cn('font-medium', k.id !== kart.id && 'text-ink-2')}>{k.driverName || k.number}</span>
                  </button>
                ))}
              </div>
            )}
            {tab === 'checklist' ? (
              <ChecklistView
                key={kart.id}
                teamId={team.id}
                event={event}
                kartId={kart.id}
                canEdit={can('checklist.edit')}
                canManageTemplate={can('team.manage')}
              />
            ) : (
              <SessionsTab eventId={event.id} kartId={kart.id} canEdit={can('session.edit')} />
            )}
          </>
        ) : (
          <Card className="p-5 text-center text-ink-3">{t('weekend.noKartHere')}</Card>
        ))}
    </>
  )
}
