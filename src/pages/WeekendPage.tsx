import { useNavigate } from '@tanstack/react-router'
import { CalendarPlus, Flag, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EventCard } from '@/components/weekend/EventCard'
import { Button } from '@/components/ui/Button'
import { Card, Section } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { FullScreenLoader } from '@/components/ui/Spinner'
import { isUpcoming, useEvents } from '@/data/events'
import { useCan, useCurrentTeam, useKarts } from '@/data/queries'

/** Zoznam pretekov a tréningov (/weekend). */
export function WeekendPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { team } = useCurrentTeam()
  const events = useEvents(team?.id)
  const karts = useKarts(team?.id)
  const can = useCan()

  if (!can('event.view'))
    return (
      <>
        <PageHeader title={t('weekend.title')} />
        <Card>
          <EmptyState icon={<Flag className="size-7" />} title={t('weekend.title')} body={t('setup.hidden')} />
        </Card>
      </>
    )
  if (events.isPending) return <FullScreenLoader />

  const canManage = can('event.manage')
  const all = events.data ?? []
  const upcoming = all.filter((e) => isUpcoming(e)).sort((a, b) => a.dateFrom.localeCompare(b.dateFrom))
  const past = all.filter((e) => !isUpcoming(e))
  const create = () => void navigate({ to: '/weekend/new' })

  return (
    <>
      <PageHeader
        title={t('weekend.title')}
        action={
          canManage && (
            <Button icon={<Plus className="size-4" />} onClick={create}>
              {t('weekend.new')}
            </Button>
          )
        }
      />

      {all.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarPlus className="size-7" />}
            title={t('weekend.emptyTitle')}
            body={canManage ? t('weekend.emptyBody') : t('weekend.emptyMember')}
            action={
              canManage && (
                <Button size="lg" icon={<Plus className="size-5" />} onClick={create}>
                  {t('weekend.new')}
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <Section title={t('weekend.upcoming')}>
              <div className="space-y-3">
                {upcoming.map((e) => (
                  <EventCard key={e.id} event={e} karts={karts.data ?? []} />
                ))}
              </div>
            </Section>
          )}
          {past.length > 0 && (
            <Section title={t('weekend.past')}>
              <div className="space-y-3">
                {past.map((e) => (
                  <EventCard key={e.id} event={e} karts={karts.data ?? []} muted />
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </>
  )
}
