import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { TiMark, VilimCredit } from '@/components/ui/Brand'
import { Card } from '@/components/ui/Card'

/** Verejná stránka – dostupná bez prihlásenia (požiadavka Googlu na zverejnenie aplikácie). */
export function PrivacyPage() {
  const { t } = useTranslation()
  const sections = t('privacy.sections', { returnObjects: true }) as { title: string; body: string }[]

  return (
    <div className="min-h-dvh">
      <div className="mx-auto w-full max-w-[680px] px-5 pt-[calc(env(safe-area-inset-top)+28px)] pb-14 sm:pt-16">
        <div className="mb-8 flex items-center justify-between">
          <Link
            to="/"
            className="-ml-2 inline-flex h-10 items-center gap-0.5 rounded-full pr-3 pl-1 font-medium text-accent-ink hover:bg-accent-soft"
          >
            <ChevronLeft className="size-5" />
            {t('app.name')}
          </Link>
          <TiMark className="h-7 text-brand" />
        </div>

        <h1 className="display text-[2rem]">{t('privacy.title')}</h1>
        <p className="mt-3 text-[0.9rem] text-ink-3">{t('privacy.updated')}</p>
        <p className="mt-6 text-[1.05rem] leading-relaxed text-ink-2">{t('privacy.intro')}</p>

        <div className="mt-8 space-y-3">
          {sections.map((s) => (
            <Card key={s.title} className="p-5 sm:p-6">
              <h2 className="text-[1.05rem] font-semibold">{s.title}</h2>
              <p className="mt-2 leading-relaxed text-ink-2">{s.body}</p>
            </Card>
          ))}
        </div>

        <div className="mt-12 flex justify-center text-ink-3">
          <VilimCredit />
        </div>
      </div>
    </div>
  )
}
