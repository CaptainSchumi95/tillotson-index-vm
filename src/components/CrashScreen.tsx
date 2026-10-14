import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { resetLocalCache } from '@/lib/cache'
import { TiMark } from './ui/Brand'
import { Button } from './ui/Button'

/** Zobrazí sa namiesto technickej chyby. Tlačidlo zahodí lokálnu cache a načíta aplikáciu znova. */
export function CrashScreen({ error }: { error?: unknown }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const detail = error instanceof Error ? error.message : null

  return (
    <div className="grid min-h-dvh place-items-center px-6 py-12">
      <div className="w-full max-w-[400px] text-center">
        <TiMark className="mx-auto mb-10 h-9 text-brand" />
        <h1 className="display text-[1.8rem]">{t('crash.title')}</h1>
        <p className="mt-4 leading-relaxed text-ink-2">{t('crash.body')}</p>
        <Button
          size="lg"
          block
          className="mt-8"
          loading={busy}
          icon={<RotateCcw className="size-5" />}
          onClick={() => {
            setBusy(true)
            void resetLocalCache()
          }}
        >
          {t('crash.reset')}
        </Button>
        {detail && <p className="mt-6 font-mono text-[0.75rem] break-words text-ink-3">{detail}</p>}
      </div>
    </div>
  )
}
