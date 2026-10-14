import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { isDemo } from '@/data'
import hero from '@/assets/brand/ti-hero.webp'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

export function LoginPage() {
  const { t } = useTranslation()
  const { signIn } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  async function go() {
    setBusy(true)
    setError(false)
    try {
      await signIn()
    } catch {
      setError(true)
      setBusy(false)
    }
  }

  return (
    <div className="bg-brand-gradient relative flex min-h-dvh flex-col overflow-hidden text-white">
      {/* jemné svetlo a mriežka v pozadí */}
      <div className="pointer-events-none absolute -top-1/3 -left-1/4 size-[120vmax] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.16),transparent)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgb(255 255 255) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse at 50% 40%, black, transparent 75%)',
        }}
      />

      <div className="safe-top relative flex flex-1 flex-col items-center justify-center px-6">
        <img
          src={hero}
          alt="Tillotson Index"
          className="animate-rise w-full max-w-[440px] drop-shadow-[0_20px_40px_rgb(0_10_60/0.25)]"
        />
        <p
          className="animate-rise mt-8 max-w-[30ch] text-center text-[1.05rem] leading-relaxed text-white/80"
          style={{ animationDelay: '80ms' }}
        >
          {t('app.tagline')}
        </p>
      </div>

      <div className="safe-bottom relative mx-auto w-full max-w-[420px] px-6 pb-8">
        <div className="animate-rise space-y-4" style={{ animationDelay: '160ms' }}>
          <Button variant="inverse" size="lg" block loading={busy} icon={isDemo ? undefined : <GoogleIcon />} onClick={go}>
            {isDemo ? t('auth.demo') : t('auth.google')}
          </Button>
          {error && <p className="text-center text-[0.9rem] text-white">{t('common.error')}</p>}
          <p className="text-center text-[0.85rem] leading-relaxed text-white/60">
            {isDemo ? t('auth.demoNote') : t('auth.inviteHint')}
          </p>
        </div>
      </div>
    </div>
  )
}
