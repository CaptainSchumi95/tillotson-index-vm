import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CloudUpload, EyeOff, ListPlus, Pencil, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SetupHistory } from '@/components/setup/SetupHistory'
import { SetupVariants } from '@/components/setup/SetupVariants'
import { SetupView } from '@/components/setup/SetupView'
import { EngineerEntry } from '@/components/pressures/EngineerEntry'
import { PressureOrderCard } from '@/components/pressures/PressureOrderCard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListGroup, ListRow, RowIcon } from '@/components/ui/ListRow'
import { PageHeader } from '@/components/ui/PageHeader'
import { Segmented } from '@/components/ui/Segmented'
import { FullScreenLoader } from '@/components/ui/Spinner'
import { useCan, useCurrentKart, useCurrentTeam, useSetupFields, useSetupRevisions } from '@/data/queries'
import { relativeTime } from '@/lib/time'

type Tab = 'current' | 'variants' | 'history'

export function SetupPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { team } = useCurrentTeam()
  const { kart } = useCurrentKart()
  const can = useCan()
  const fields = useSetupFields(team?.id)
  const revisions = useSetupRevisions(kart?.id)
  const [tab, setTab] = useState<Tab>('current')

  if (!can('setup.view'))
    return (
      <>
        <PageHeader title={t('setup.title')} />
        <Card>
          <EmptyState icon={<EyeOff className="size-7" />} title={t('setup.title')} body={t('setup.hidden')} />
        </Card>
      </>
    )

  if (!kart)
    return (
      <>
        <PageHeader title={t('setup.title')} />
        <Card>
          <EmptyState
            icon={<span className="display text-[1.4rem]">#</span>}
            title={t('home.noKartTitle')}
            body={t('home.noKartHint')}
            action={<Button onClick={() => void navigate({ to: '/select' })}>{t('context.chooseKart')}</Button>}
          />
        </Card>
      </>
    )

  if (revisions.isPending) return <FullScreenLoader />

  const canEdit = can('setup.edit')
  const current = revisions.data?.[0]
  const edit = () => void navigate({ to: '/setup/edit' })

  if (!current)
    return (
      <>
        <PageHeader title={t('setup.title')} />
        <Card>
          <EmptyState
            icon={<SlidersHorizontal className="size-7" />}
            title={t('setup.firstTitle')}
            body={canEdit ? t('setup.firstBody') : t('setup.noEditHint')}
            action={
              canEdit && (
                <Button size="lg" icon={<Pencil className="size-5" />} onClick={edit}>
                  {t('setup.firstAction')}
                </Button>
              )
            }
          />
        </Card>
      </>
    )

  const author = current.author?.name || t('setup.unknownAuthor')

  return (
    <>
      <PageHeader
        title={t('setup.title')}
        action={
          canEdit &&
          tab === 'current' && (
            <Button icon={<Pencil className="size-4" />} onClick={edit}>
              {t('setup.edit')}
            </Button>
          )
        }
      />

      <Segmented<Tab>
        className="mb-6"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'current', label: t('setup.tabs.current') },
          { value: 'variants', label: t('setup.tabs.variants') },
          { value: 'history', label: t('setup.tabs.history') },
        ]}
      />

      {tab === 'current' && (
        <div className="space-y-8">
          <PressureOrderCard teamId={team!.id} kartId={kart.id} />
          {can('pressure.engineer') && <EngineerEntry />}
          <p className="-mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[0.9rem] text-ink-3">
            {t('setup.lastChange', { name: author, when: relativeTime(current.recordedAt, i18n.language, t('time.justNow')) })}
            {current.pending && (
              <span className="inline-flex items-center gap-1 font-semibold text-accent-ink" title={t('setup.pendingHint')}>
                <CloudUpload className="size-4" />
                {t('setup.pending')}
              </span>
            )}
          </p>

          <SetupView fields={fields} values={current.values} />

          {can('team.manage') && (
            <ListGroup>
              <ListRow
                leading={
                  <RowIcon>
                    <ListPlus className="size-5" />
                  </RowIcon>
                }
                title={t('setup.custom.manage')}
                subtitle={t('setup.custom.manageHint')}
                to="/setup/fields"
              />
            </ListGroup>
          )}
        </div>
      )}

      {tab === 'variants' && <SetupVariants kartId={kart.id} current={current.values} fields={fields} canEdit={canEdit} />}

      {tab === 'history' && <SetupHistory revisions={revisions.data ?? []} fields={fields} />}
    </>
  )
}
