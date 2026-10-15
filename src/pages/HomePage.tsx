import { Link, useNavigate } from '@tanstack/react-router'
import { CalendarPlus, ChevronDown, ChevronRight, ClipboardCheck, Flag, NotebookPen, Timer, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Card, Section } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { KartPlate, TeamBadge } from '@/components/ui/Identity'
import { ListGroup, ListRow, RowIcon } from '@/components/ui/ListRow'
import { PressureGrid, useUnitPrefs } from '@/components/setup/SetupView'
import { useCan, useCurrentKart, useCurrentTeam, useNotes, useService, useSetupRevisions } from '@/data/queries'
import { currentEventFor, isActive, nextScheduleItem, useEvents, useSchedule } from '@/data/events'
import { useChecklistProgress } from '@/components/weekend/ChecklistView'
import { EngineerEntry } from '@/components/pressures/EngineerEntry'
import { PressureOrderCard } from '@/components/pressures/PressureOrderCard'
import { PushPrompt } from '@/components/PushPrompt'
import { lastOilInfo, useHoursFormat } from '@/pages/ServicePage'
import type { TeamEvent } from '@/data/types'
import { cn } from '@/lib/cn'
import { dateRange, nowTime, relativeDay, todayIso } from '@/lib/time'
import { unitLabel } from '@/data/setup-fields'
import { useUi } from '@/state/ui'

export function HomePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { team } = useCurrentTeam()
  const { kart } = useCurrentKart()
  const can = useCan()
  const setContextOpen = useUi((s) => s.setContextOpen)
  const notes = useNotes(kart?.id)
  const service = useService(kart?.id)
  const latestNote = notes.data?.[0]
  const { last: lastOil, next: nextOil } = lastOilInfo(service.data)
  const fmtHours = useHoursFormat()
  const events = useEvents(can('event.view') ? team?.id : undefined)
  const event = currentEventFor(events.data, kart?.id)

  if (!team) return null

  if (!kart)
    return (
      <Card className="mt-4">
        <EmptyState
          icon={<span className="display text-[1.4rem]">#</span>}
          title={t('home.noKartTitle')}
          body={t('home.noKartHint')}
          action={
            <Button size="lg" onClick={() => void navigate({ to: '/select' })}>
              {t('context.chooseKart')}
            </Button>
          }
        />
      </Card>
    )

  return (
    <div className="space-y-8">
      {/* Kto a čo – ťuknutím sa prepne motokára */}
      <button
        type="button"
        onClick={() => setContextOpen(true)}
        className="animate-rise group -mx-2 flex w-[calc(100%+16px)] items-center gap-5 rounded-[28px] p-2 text-left transition-colors hover:bg-surface/60"
      >
        <KartPlate number={kart.number} size="xl" />
        <span className="min-w-0 flex-1">
          <span className="eyebrow mb-2 block">{t('context.driver')}</span>
          <span className="display block truncate text-[2rem] lg:text-[2.4rem]">{kart.driverName || '—'}</span>
          <span className="mt-2.5 flex items-center gap-2 text-[0.92rem] text-ink-2">
            <TeamBadge name={team.name} color={team.color} iconUrl={team.iconUrl} size="sm" className="size-5! rounded-[6px]! text-[0.5rem]!" />
            <span className="truncate">{team.name}</span>
          </span>
        </span>
        <span className="hidden shrink-0 items-center gap-1 rounded-full px-3 py-2 text-[0.9rem] font-semibold text-accent-ink group-hover:bg-accent-soft sm:flex">
          {t('context.switch')}
          <ChevronDown className="size-4" />
        </span>
      </button>

      <PushPrompt />

      {can('setup.view') && <PressureOrderCard teamId={team.id} kartId={kart.id} />}

      {can('pressure.engineer') && <EngineerEntry />}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6">
        {/* Aktuálna udalosť */}
        <Section title={t('home.current')} className="lg:col-span-2">
          <CurrentEventCard event={event} />
        </Section>

        {can('setup.view') && <PressuresCard kartId={kart.id} />}

        <Section title={t('home.checklist')} className="flex flex-col">
          <ChecklistCard teamId={team.id} event={event} kartId={kart.id} />
        </Section>

        <Section className="lg:col-span-2">
          <ListGroup>
            <ListRow
              leading={
                <RowIcon>
                  <NotebookPen className="size-5" />
                </RowIcon>
              }
              title={t('home.driverNotes')}
              subtitle={latestNote ? `„${latestNote.text}“` : t('notes.empty')}
              to="/notes"
            />
            <ListRow
              leading={
                <RowIcon>
                  <Wrench className="size-5" />
                </RowIcon>
              }
              title={t('home.serviceBook')}
              subtitle={
                lastOil
                  ? lastOil.engineHours != null && nextOil != null
                    ? t('service.lastOilHours', { hours: fmtHours(lastOil.engineHours), next: fmtHours(nextOil) })
                    : t('service.lastOil', { when: relativeDay(lastOil.performedOn, i18n.language) })
                  : t('service.lastOilNever')
              }
              to="/service"
            />
          </ListGroup>
        </Section>
      </div>
    </div>
  )
}

/** Tlaky z aktuálneho setupu – ťuknutím do sekcie Setup. */
function PressuresCard({ kartId }: { kartId: string }) {
  const { t } = useTranslation()
  const prefs = useUnitPrefs()
  const revisions = useSetupRevisions(kartId)
  const current = revisions.data?.[0]
  const unit = unitLabel({ unit: 'pressure' }, prefs)

  return (
    <Section title={t('home.pressures')} action={<span className="eyebrow">{unit}</span>} className="flex flex-col">
      <Link to="/setup" className="block flex-1 rounded-[22px]">
        <Card className="h-full p-3 transition-colors hover:border-line-strong">
          <PressureGrid values={current?.values ?? {}} />
        </Card>
      </Link>
    </Section>
  )
}

/** Aktuálna alebo najbližšia udalosť motokáry s ďalším bodom programu. */
function CurrentEventCard({ event }: { event: TeamEvent | null }) {
  const { t, i18n } = useTranslation()
  const schedule = useSchedule(event?.id)

  if (!event)
    return (
      <Link to="/weekend" className="block rounded-[22px]">
        <Card className="flex items-center gap-4 p-4 transition-colors hover:border-line-strong sm:p-5">
          <RowIcon tone="accent">
            <CalendarPlus className="size-5" />
          </RowIcon>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t('home.noEvent')}</span>
            <span className="block text-[0.9rem] text-ink-3">{t('home.noEventHint')}</span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-ink-3" />
        </Card>
      </Link>
    )

  const live = isActive(event)
  const today = todayIso()
  const now = nowTime()
  const next = live ? nextScheduleItem(schedule.data, today, now) : undefined

  return (
    <Link to="/weekend/$eventId" params={{ eventId: event.id }} className="block rounded-[22px]">
      <Card
        className={cn(
          'overflow-hidden transition-colors hover:border-line-strong',
          live && 'border-accent shadow-[0_0_0_1px_var(--accent)]',
        )}
      >
        <div className="flex items-center gap-4 p-4 sm:p-5">
          <span
            className={cn(
              'grid size-12 shrink-0 place-items-center rounded-[14px]',
              event.kind === 'race' ? 'bg-accent text-on-accent' : 'bg-sunken text-ink-2',
            )}
          >
            {event.kind === 'race' ? <Flag className="size-6" /> : <Timer className="size-6" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="eyebrow">{t(`weekend.kind.${event.kind}`)}</span>
              {live && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2 py-0.5 text-[0.68rem] font-bold text-on-accent uppercase">
                  <span className="size-1.5 animate-pulse rounded-full bg-current" />
                  {t('weekend.live')}
                </span>
              )}
            </span>
            <span className="mt-0.5 block truncate text-[1.05rem] font-semibold">{event.name}</span>
            <span className="block truncate text-[0.88rem] text-ink-3">
              {[dateRange(event.dateFrom, event.dateTo, i18n.language), event.trackName].filter(Boolean).join(' · ')}
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-ink-3" />
        </div>
        {next && (
          <div className="flex items-center gap-3 border-t border-line bg-accent-soft px-4 py-3 sm:px-5">
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-[0.7rem] font-bold tracking-wide text-on-accent uppercase">
              {t('weekend.schedule.next')}
            </span>
            <span className="display tnum text-[1.05rem]">{next.time}</span>
            <span className="min-w-0 truncate font-medium">{next.title}</span>
          </div>
        )}
      </Card>
    </Link>
  )
}

/** Postup checklistu motokáry v aktuálnej udalosti. */
function ChecklistCard({ teamId, event, kartId }: { teamId: string; event: TeamEvent | null; kartId: string }) {
  const { t } = useTranslation()
  const progress = useChecklistProgress(teamId, event, kartId)
  const value = progress.total ? progress.done / progress.total : 0

  const body = (
    <Card className="flex h-full flex-1 items-center gap-4 p-4 transition-colors hover:border-line-strong sm:p-5 lg:flex-col lg:justify-center lg:text-center">
      <ProgressRing value={value} />
      <span className="min-w-0">
        <span className="display tnum block text-[1.25rem]">
          {progress.done} / {progress.total}
        </span>
        <span className="block text-[0.9rem] text-ink-3">
          {event ? t('weekend.checklist.round', { round: progress.round }) : t('home.checklistEmpty')}
        </span>
      </span>
    </Card>
  )

  if (!event) return body
  return (
    <Link
      to="/weekend/$eventId"
      params={{ eventId: event.id }}
      search={{ tab: 'checklist' }}
      className="flex flex-1 rounded-[22px]"
    >
      {body}
    </Link>
  )
}

function ProgressRing({ value }: { value: number }) {
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <div className="relative grid size-14 shrink-0 place-items-center">
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--sunken)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value)}
        />
      </svg>
      <ClipboardCheck className="size-5 text-ink-3" />
    </div>
  )
}
