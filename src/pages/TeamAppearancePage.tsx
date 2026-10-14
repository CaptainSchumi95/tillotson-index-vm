import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import { ImagePlus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Card, Section } from '@/components/ui/Card'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { Field } from '@/components/ui/Field'
import { KartPlate, TeamBadge } from '@/components/ui/Identity'
import { PageHeader } from '@/components/ui/PageHeader'
import { backend } from '@/data'
import { safe, useCan, useCurrentTeam, useUpdateTeam } from '@/data/queries'
import { compressImage } from '@/lib/image'
import { accentVars } from '@/lib/theme'

export function TeamAppearancePage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { team } = useCurrentTeam()
  const can = useCan()
  const update = useUpdateTeam(team?.id ?? '')
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#1d56e9')
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (team) {
      setName(team.name)
      setColor(team.color)
      setIconUrl(team.iconUrl)
    }
  }, [team?.id])

  if (!team || !can('team.manage')) return null

  async function pickIcon(file: File | undefined) {
    if (!file || !team) return
    setUploading(true)
    try {
      setIconUrl(await backend.uploadTeamIcon(team.id, await compressImage(file, 256)))
    } finally {
      setUploading(false)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!(await safe(update.mutateAsync({ name: name.trim(), color, iconUrl }))).ok) return
    router.history.back()
  }

  return (
    <>
      <PageHeader back title={t('team.appearance')} />

      <form onSubmit={submit} className="space-y-8">
        <Card className="flex items-center gap-4 p-4 sm:p-5" style={accentVars(color)}>
          <TeamBadge name={name || '?'} color={color} iconUrl={iconUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="display truncate text-[1.2rem]">{name || '—'}</div>
            <div className="mt-2 h-1.5 w-16 rounded-full bg-accent" />
          </div>
          <KartPlate number="95" />
        </Card>

        <Field label={t('onboarding.teamName')} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />

        <Section title={t('onboarding.teamColor')}>
          <ColorPicker value={color} onChange={setColor} />
        </Section>

        <Section title={t('team.icon')}>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              icon={<ImagePlus className="size-5" />}
              loading={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {t('team.iconUpload')}
            </Button>
            {iconUrl && (
              <Button type="button" variant="danger" icon={<Trash2 className="size-5" />} onClick={() => setIconUrl(null)}>
                {t('team.iconRemove')}
              </Button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void pickIcon(e.target.files?.[0])}
          />
        </Section>

        {update.isError && <p className="text-danger">{t('common.error')}</p>}

        <Button type="submit" size="lg" block disabled={!name.trim()} loading={update.isPending}>
          {t('common.save')}
        </Button>
      </form>
    </>
  )
}
