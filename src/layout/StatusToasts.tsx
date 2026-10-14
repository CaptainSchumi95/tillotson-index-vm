import { useEffect, useState } from 'react'
import { CloudOff, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

/** Hlásenia nad navigáciou: offline režim a nová verzia aplikácie. */
export function StatusToasts() {
  const { t } = useTranslation()
  const online = useOnline()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (online && !needRefresh) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom))] z-40 flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:left-[280px]">
      {!online && (
        <div className="animate-rise pointer-events-auto flex max-w-[480px] items-center gap-3 rounded-[16px] bg-ink px-4 py-3 text-[0.92rem] text-bg shadow-float">
          <CloudOff className="size-5 shrink-0 opacity-80" />
          {t('pwa.offline')}
        </div>
      )}
      {needRefresh && (
        <div className="animate-rise pointer-events-auto flex max-w-[480px] items-center gap-3 rounded-[16px] bg-ink py-2 pr-2 pl-4 text-[0.92rem] text-bg shadow-float">
          <RefreshCw className="size-5 shrink-0 opacity-80" />
          <span className="flex-1">{t('pwa.update')}</span>
          <button
            type="button"
            onClick={() => void updateServiceWorker(true)}
            className="h-9 rounded-[11px] bg-accent px-3.5 font-semibold text-on-accent"
          >
            {t('pwa.reload')}
          </button>
        </div>
      )}
    </div>
  )
}
