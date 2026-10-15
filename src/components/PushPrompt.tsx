import { useEffect, useState } from 'react'
import { BellOff, BellRing, Share, SquarePlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { enablePush, pushStatus, type PushStatus } from '@/lib/push'

const SNOOZE_KEY = 'ti-push-snooze'
const SNOOZE_MS = 12 * 60 * 60 * 1000

/** Aktuálny stav upozornení (obnoví sa aj po návrate do aplikácie). */
export function usePushStatus() {
  const [status, setStatus] = useState<PushStatus | null>(null)
  useEffect(() => {
    const check = () => void pushStatus().then(setStatus)
    check()
    document.addEventListener('visibilitychange', check)
    return () => document.removeEventListener('visibilitychange', check)
  }, [])
  return [status, setStatus] as const
}

function snoozed() {
  try {
    return Date.now() - Number(localStorage.getItem(SNOOZE_KEY) ?? 0) < SNOOZE_MS
  } catch {
    return false
  }
}

/**
 * Výzva zapnúť upozornenia. Kým nie sú zapnuté, ukazuje sa znova a znova
 * („Neskôr“ ju skryje iba na 12 hodín). `always` = ukázať aj počas odloženia (nastavenia).
 */
export function PushPrompt({ always, compact, className }: { always?: boolean; compact?: boolean; className?: string }) {
  const { t } = useTranslation()
  const [status, setStatus] = usePushStatus()
  const [busy, setBusy] = useState(false)
  const [hidden, setHidden] = useState(() => !always && snoozed())

  if (!status || status === 'on' || status === 'unsupported' || hidden) return null

  const later = () => {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now()))
    } catch {
      /* bez úložiska sa výzva ukáže znova */
    }
    setHidden(true)
  }

  const enable = async () => {
    setBusy(true)
    try {
      setStatus(await enablePush())
    } catch {
      setStatus(await pushStatus())
    } finally {
      setBusy(false)
    }
  }

  const Icon = status === 'denied' ? BellOff : BellRing

  return (
    <div
      className={cn(
        'animate-rise overflow-hidden rounded-[22px] border border-accent bg-accent-soft shadow-[0_0_0_1px_var(--accent)]',
        compact ? 'rounded-[18px] p-3.5' : 'p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex gap-3.5">
        <span
          className={cn(
            'grid shrink-0 place-items-center bg-accent-fill text-on-accent',
            compact ? 'size-9 rounded-[12px]' : 'size-11 rounded-[14px]',
          )}
        >
          <Icon className={compact ? 'size-5' : 'size-6'} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{t(`push.${status}.title`)}</div>
          <p className={cn('mt-1 leading-relaxed text-ink-2', compact ? 'text-[0.85rem]' : 'text-[0.92rem]')}>{t(`push.${status}.body`)}</p>

          {status === 'needs-install' && (
            <ol className="mt-3 space-y-1.5 text-[0.9rem] text-ink-2">
              <li className="flex items-center gap-2">
                <Share className="size-4 shrink-0 text-accent-ink" /> {t('push.needs-install.step1')}
              </li>
              <li className="flex items-center gap-2">
                <SquarePlus className="size-4 shrink-0 text-accent-ink" /> {t('push.needs-install.step2')}
              </li>
            </ol>
          )}

          <div className={cn('flex flex-wrap gap-2', compact ? 'mt-3' : 'mt-4')}>
            {status === 'off' && (
              <Button size="sm" loading={busy} onClick={() => void enable()}>
                {t('push.enable')}
              </Button>
            )}
            {!always && (
              <Button size="sm" variant="ghost" onClick={later}>
                {t('push.later')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
