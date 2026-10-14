import { EyeOff, Flag, Route as RouteIcon, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { useCan } from '@/data/queries'

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

export function SetupPage() {
  const { t } = useTranslation()
  const can = useCan()
  return (
    <>
      <PageHeader title={t('setup.title')} />
      <Card>
        {can('setup.view') ? (
          <EmptyState
            icon={<SlidersHorizontal className="size-7" />}
            tag={<Badge tone="accent">{t('phase.soon')}</Badge>}
            title={t('setup.emptyTitle')}
            body={t('setup.emptyBody')}
          />
        ) : (
          <EmptyState icon={<EyeOff className="size-7" />} title={t('setup.title')} body={t('setup.hidden')} />
        )}
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
