import type { ReactNode } from 'react'
import { useRouter } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** Nadpis stránky. S `back` sa zobrazí šípka späť (podstránky). */
export function PageHeader({
  title,
  eyebrow,
  back,
  action,
}: {
  title: ReactNode
  eyebrow?: ReactNode
  back?: boolean
  action?: ReactNode
}) {
  const router = useRouter()
  const { t } = useTranslation()
  return (
    <header className="mb-6 pt-2 lg:mb-8 lg:pt-4">
      {back && (
        <button
          type="button"
          onClick={() => router.history.back()}
          className="-ml-2 mb-3 inline-flex h-10 items-center gap-0.5 rounded-full pr-3 pl-1 font-medium text-accent-ink hover:bg-accent-soft"
        >
          <ChevronLeft className="size-5" />
          {t('common.back')}
        </button>
      )}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
          <h1 className="display text-[2rem] lg:text-[2.4rem]">{title}</h1>
        </div>
        {action}
      </div>
    </header>
  )
}
