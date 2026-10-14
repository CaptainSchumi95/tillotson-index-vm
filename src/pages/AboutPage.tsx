import { useTranslation } from 'react-i18next'
import { TiWordmark, VilimWordmark } from '@/components/ui/Brand'
import { Card } from '@/components/ui/Card'
import { ListGroup, ListRow } from '@/components/ui/ListRow'
import { PageHeader } from '@/components/ui/PageHeader'

export function AboutPage() {
  const { t } = useTranslation()
  return (
    <>
      <PageHeader back title={t('about.title')} />

      <div className="space-y-4">
        <div className="bg-brand-gradient relative overflow-hidden rounded-[26px] px-6 pt-12 pb-8 text-white">
          <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.18),transparent)]" />
          <TiWordmark className="relative h-24 sm:h-28" />
          <div className="relative mt-8 text-[0.88rem] text-white/70">{t('about.version', { version: __APP_VERSION__ })}</div>
        </div>

        <Card className="p-6">
          <p className="text-[1.02rem] leading-relaxed text-ink-2">{t('about.body')}</p>
        </Card>

        <Card className="flex flex-col items-center gap-5 px-6 py-9">
          <span className="eyebrow">{t('about.developedBy')}</span>
          <VilimWordmark className="h-14 text-vilim" />
        </Card>

        <ListGroup>
          <ListRow title={t('privacy.title')} to="/privacy" />
        </ListGroup>
      </div>
    </>
  )
}
