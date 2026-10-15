import { useEffect, useRef, useState } from 'react'
import { Camera, Check, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/auth/AuthProvider'
import { VilimCredit } from '@/components/ui/Brand'
import { Button } from '@/components/ui/Button'
import { Card, Section } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Avatar } from '@/components/ui/Identity'
import { PageHeader } from '@/components/ui/PageHeader'
import { Segmented } from '@/components/ui/Segmented'
import { Spinner } from '@/components/ui/Spinner'
import { backend } from '@/data'
import { safe, useProfile, useUpdateProfile } from '@/data/queries'
import { LANGUAGES } from '@/i18n'
import { compressImage } from '@/lib/image'
import type { ThemeMode } from '@/lib/theme'
import { DEFAULT_UNITS, UNIT_LABEL, UNIT_OPTIONS, type UnitKind } from '@/lib/units'
import { useWorkspace } from '@/state/workspace'
import { PushPrompt, usePushStatus } from '@/components/PushPrompt'

/** Stav upozornení v nastaveniach – zapnuté, alebo výzva čo spraviť. */
function PushSettings() {
  const { t } = useTranslation()
  const [status] = usePushStatus()
  if (status === 'on' || status === 'unsupported')
    return (
      <Card className="p-4">
        <div className="font-medium">{t(`push.${status}.title`)}</div>
        <p className="mt-1 text-[0.9rem] text-ink-3">{t(`push.${status}.body`)}</p>
      </Card>
    )
  return <PushPrompt always />
}

export function SettingsPage() {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  const profile = useProfile()
  const update = useUpdateProfile()
  const theme = useWorkspace((s) => s.theme)
  const setTheme = useWorkspace((s) => s.setTheme)
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [savedName, setSavedName] = useState(false)

  useEffect(() => {
    if (profile.data) setName(profile.data.name)
  }, [profile.data?.id])

  const p = profile.data
  if (!p) return null
  const units = p.unitPrefs ?? DEFAULT_UNITS

  async function saveName() {
    const v = name.trim()
    if (!v || v === p?.name) return
    if (!(await safe(update.mutateAsync({ name: v }))).ok) return
    setSavedName(true)
    setTimeout(() => setSavedName(false), 1800)
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return
    setUploading(true)
    try {
      const url = await backend.uploadAvatar(await compressImage(file, 384))
      await safe(update.mutateAsync({ avatarUrl: url }))
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <PageHeader back title={t('settings.title')} />

      <div className="space-y-8">
        <Section title={t('settings.profile')}>
          <Card className="p-5">
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative shrink-0 rounded-full"
                aria-label={t('settings.photoChange')}
              >
                <Avatar name={p.name} url={p.avatarUrl} size="xl" />
                <span className="absolute -right-0.5 -bottom-0.5 grid size-9 place-items-center rounded-full border-[3px] border-surface bg-accent-fill text-on-accent">
                  {uploading ? <Spinner className="size-4" /> : <Camera className="size-4" />}
                </span>
              </button>
              <div className="min-w-0">
                <div className="truncate text-[1.1rem] font-semibold">{p.name || p.email}</div>
                <div className="truncate text-[0.9rem] text-ink-3">{p.email}</div>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void pickPhoto(e.target.files?.[0])}
            />
            <Field
              className="mt-6"
              label={t('settings.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => void saveName()}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              autoComplete="name"
              suffix={savedName && <Check className="size-5 text-success" />}
              hint={t('settings.profileHint')}
            />
          </Card>
        </Section>

        <Section title={t('push.settings')}>
          <PushSettings />
        </Section>

        <Section title={t('settings.units')}>
          <Card className="divide-y divide-line">
            {(Object.keys(UNIT_OPTIONS) as UnitKind[]).map((kind) => (
              <div key={kind} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="font-medium">{t(`settings.unit.${kind}`)}</span>
                <Segmented
                  className="w-[156px]"
                  label={t(`settings.unit.${kind}`)}
                  value={units[kind]}
                  options={UNIT_OPTIONS[kind].map((u) => ({ value: u, label: UNIT_LABEL[u] }))}
                  onChange={(u) => update.mutate({ unitPrefs: { ...units, [kind]: u } })}
                />
              </div>
            ))}
          </Card>
        </Section>

        <Section title={t('settings.appearance')}>
          <Segmented<ThemeMode>
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'system', label: t('settings.theme.system') },
              { value: 'light', label: t('settings.theme.light') },
              { value: 'dark', label: t('settings.theme.dark') },
            ]}
          />
        </Section>

        <Section title={t('settings.language')}>
          <Segmented
            value={p.locale}
            onChange={(locale) => update.mutate({ locale })}
            options={LANGUAGES.map((l) => ({ value: l.code as string, label: l.label }))}
          />
        </Section>

        <Section title={t('settings.account')}>
          <Button variant="danger" block icon={<LogOut className="size-5" />} onClick={() => void signOut()}>
            {t('auth.signOut')}
          </Button>
        </Section>

        <div className="flex justify-center pt-4 pb-2 text-ink-3 lg:hidden">
          <VilimCredit />
        </div>
      </div>
    </>
  )
}
