import { Flag, Route as RouteIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'

// Sekcie, ktoré pribudnú v ďalších fázach. Zatiaľ vysvetľujú, čo v nich bude.

export function WeekendPage() {
  const { t } = useTranslation()
  return (
    <>
      <PageHeader title={t('weekend.title')} />
      <Card>
        <EmptyState
          icon={<Flag className="size-7" />}
          tag={<Badge tone="accent">{t('phase.soon')}</Badge>}
          title={t('weekend.emptyTitle')}
          body={t('weekend.emptyBody')}
        />
      </Card>
    </>
  )
}

export function TracksPage() {
  const { t } = useTranslation()
  return (
    <>
      <PageHeader title={t('tracks.title')} />
      <Card>
        <EmptyState
          icon={<RouteIcon className="size-7" />}
          tag={<Badge tone="accent">{t('phase.soon')}</Badge>}
          title={t('tracks.emptyTitle')}
          body={t('tracks.emptyBody')}
        />
      </Card>
    </>
  )
}
