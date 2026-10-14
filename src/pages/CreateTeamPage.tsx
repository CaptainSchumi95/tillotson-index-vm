import { useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { TiMark } from '@/components/ui/Brand'
import { Button } from '@/components/ui/Button'
import { Card, Section } from '@/components/ui/Card'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { Field } from '@/components/ui/Field'
import { KartPlate, TeamBadge } from '@/components/ui/Identity'
import { PageHeader } from '@/components/ui/PageHeader'
import { useCreateTeam, useProfile } from '@/data/queries'
import { TEAM_COLORS } from '@/lib/color'
import { accentVars } from '@/lib/theme'
import { useWorkspace } from '@/state/workspace'

/** Založenie tímu – prvé spustenie (`first`) aj ďalší tím. */
export function CreateTeamPage({ first }: { first?: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const profile = useProfile()
  const create = useCreateTeam()
  const selectTeam = useWorkspace((s) => s.selectTeam)
  const [name, setName] = useState('')
  const [color, setColor] = useState(TEAM_COLORS[0])

  const firstName = profile.data?.name.split(' ')[0]

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const id = await create.mutateAsync({ name: name.trim(), color })
    selectTeam(id)
    void navigate({ to: '/select' })
  }

  return (
    <div className="min-h-dvh">
      <div className="mx-auto w-full max-w-[520px] px-5 pt-[calc(env(safe-area-inset-top)+28px)] pb-12 sm:pt-16">
        {first ? (
          <header className="animate-rise mb-9">
            <TiMark className="mb-8 h-9 text-brand" />
            <h1 className="display text-[2.1rem]">
              {firstName ? t('onboarding.hello', { name: firstName }) : t('onboarding.helloAnon')}
            </h1>
            <p className="mt-4 text-[1.05rem] leading-relaxed text-ink-2">{t('onboarding.intro')}</p>
          </header>
        ) : (
          <PageHeader back title={t('context.newTeam')} />
        )}

        <form onSubmit={submit} className="animate-rise space-y-8" style={{ animationDelay: '60ms' }}>
          <Field
            label={t('onboarding.teamName')}
            placeholder={t('onboarding.teamNamePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoComplete="organization"
          />

          <Section title={t('onboarding.teamColor')}>
            <ColorPicker value={color} onChange={setColor} />
            <p className="px-1 text-[0.85rem] text-ink-3">{t('onboarding.teamColorHint')}</p>
          </Section>

          <Section title={t('onboarding.preview')}>
            <Card className="flex items-center gap-4 p-4" style={accentVars(color)}>
              <TeamBadge name={name || '?'} color={color} size="lg" />
              <div className="min-w-0 flex-1">
                <div className={name ? 'display truncate text-[1.15rem]' : 'display truncate text-[1.15rem] text-ink-3/50'}>{name || t('onboarding.teamName')}</div>
                <div className="mt-2 h-1.5 w-16 rounded-full bg-accent" />
              </div>
              <KartPlate number="95" size="md" />
            </Card>
          </Section>

          {create.isError && <p className="text-danger">{t('common.error')}</p>}

          <Button type="submit" size="lg" block disabled={!name.trim()} loading={create.isPending} style={accentVars(color)}>
            {t('onboarding.create')}
          </Button>
        </form>
      </div>
    </div>
  )
}
