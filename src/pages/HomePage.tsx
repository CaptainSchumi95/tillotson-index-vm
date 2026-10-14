import { Link, useNavigate } from '@tanstack/react-router'
import { CalendarPlus, ChevronDown, ChevronRight, ClipboardCheck, NotebookPen, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Badge, Card, Section } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { KartPlate, TeamBadge } from '@/components/ui/Identity'
import { ListGroup, ListRow, RowIcon } from '@/components/ui/ListRow'
import { useCan, useCurrentKart, useCurrentTeam, useProfile } from '@/data/queries'
import { cn } from '@/lib/cn'
import { DEFAULT_UNITS, formatValue } from '@/lib/units'
import { useUi } from '@/state/ui'

export function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { team } = useCurrentTeam()
  const { kart } = useCurrentKart()
  const can = useCan()
  const setContextOpen = useUi((s) => s.setContextOpen)

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

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-6">
        {/* Aktuálna udalosť */}
        <Section title={t('home.current')} className="lg:col-span-2">
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
        </Section>

        {can('setup.view') && <PressuresCard />}

        <Section title={t('home.checklist')} className="flex flex-col">
          <Card className="flex flex-1 items-center gap-4 p-4 sm:p-5 lg:flex-col lg:justify-center lg:text-center">
            <ProgressRing value={0} />
            <span className="min-w-0">
              <span className="display tnum block text-[1.25rem]">0 / 0</span>
              <span className="block text-[0.9rem] text-ink-3">{t('home.checklistEmpty')}</span>
            </span>
          </Card>
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
              trailing={<Badge>{t('common.soon')}</Badge>}
              chevron={false}
            />
            <ListRow
              leading={
                <RowIcon>
                  <Wrench className="size-5" />
                </RowIcon>
              }
              title={t('home.serviceBook')}
              trailing={<Badge>{t('common.soon')}</Badge>}
              chevron={false}
            />
          </ListGroup>
        </Section>
      </div>
    </div>
  )
}

const TIRES = ['fl', 'fr', 'rl', 'rr'] as const

/** Tlaky v rozložení ako na motokáre: predok hore, zadok dole. */
function PressuresCard() {
  const { t, i18n } = useTranslation()
  const profile = useProfile()
  const prefs = profile.data?.unitPrefs ?? DEFAULT_UNITS
  // Hodnoty pribudnú vo fáze Setup.
  const values: Record<(typeof TIRES)[number], number | null> = { fl: null, fr: null, rl: null, rr: null }
  const unit = formatValue('pressure', null, prefs, i18n.language).unit

  return (
    <Section title={t('home.pressures')} action={<span className="eyebrow">{unit}</span>} className="flex flex-col">
      <Link to="/setup" className="block flex-1 rounded-[22px]">
        <Card className="h-full p-3 transition-colors hover:border-line-strong">
          <div className="grid grid-cols-[1fr_64px_1fr] grid-rows-2 gap-y-3">
            {TIRES.map((tire, i) => {
              const f = formatValue('pressure', values[tire], prefs, i18n.language)
              return (
                <div
                  key={tire}
                  className={cn(
                    'rounded-[16px] bg-surface-2 px-4 py-3',
                    i % 2 === 0 ? 'col-start-1' : 'col-start-3 text-right',
                    i < 2 ? 'row-start-1' : 'row-start-2',
                  )}
                >
                  <div className="text-[0.78rem] font-medium text-ink-3">{t(`home.tires.${tire}`)}</div>
                  <div className={cn('display tnum mt-1 text-[1.75rem]', values[tire] == null && 'text-ink-3/60')}>{f.value}</div>
                </div>
              )
            })}
            {/* štylizovaný podvozok */}
            <div aria-hidden className="relative col-start-2 row-span-2 row-start-1">
              <div className="absolute inset-x-0 top-1/4 h-[2px] -translate-y-1/2 bg-line-strong" />
              <div className="absolute inset-x-0 top-3/4 h-[2px] -translate-y-1/2 bg-line-strong" />
              <div className="absolute inset-y-[12%] left-1/2 w-6 -translate-x-1/2 rounded-[10px] border-2 border-line-strong bg-surface" />
              <div className="absolute top-[40%] left-1/2 size-3 -translate-x-1/2 rounded-full border-2 border-line-strong bg-surface" />
            </div>
          </div>
        </Card>
      </Link>
    </Section>
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
