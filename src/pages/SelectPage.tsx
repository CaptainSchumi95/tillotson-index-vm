import { useState } from 'react'
import { Navigate, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Plus, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { KartPicker } from '@/components/KartPicker'
import { KartSheet } from '@/components/KartSheet'
import { TiMark } from '@/components/ui/Brand'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { TeamBadge } from '@/components/ui/Identity'
import { ListGroup, ListRow, RowIcon } from '@/components/ui/ListRow'
import { FullScreenLoader } from '@/components/ui/Spinner'
import { useCurrentTeam, useKarts } from '@/data/queries'
import { useWorkspace } from '@/state/workspace'

/** Po prihlásení: vyber tím (ak ich je viac) a motokáru. */
export function SelectPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { team, teams } = useCurrentTeam()
  const karts = useKarts(team?.id)
  const { selectTeam, selectKart, kartByTeam, lastSection } = useWorkspace()
  const [pickTeam, setPickTeam] = useState(false)
  const [kartSheet, setKartSheet] = useState(false)

  if (teams.isPending) return <FullScreenLoader />
  if (!teams.data || teams.data.length === 0) return <Navigate to="/welcome" />

  const onlyTeam = teams.data.length === 1 ? teams.data[0] : null
  const current = team ?? onlyTeam
  const showTeams = pickTeam || !current

  const enter = (kartId: string | null) => {
    if (!current) return
    if (current.id !== team?.id) selectTeam(current.id)
    selectKart(current.id, kartId)
    void navigate({ to: lastSection || '/home' })
  }

  return (
    <div className="min-h-dvh">
      <div className="mx-auto w-full max-w-[640px] px-5 pt-[calc(env(safe-area-inset-top)+28px)] pb-12 sm:pt-16">
        <TiMark className="mb-9 h-8 text-brand" />

        {showTeams || !current ? (
          <section className="animate-rise">
            <h1 className="display text-[2rem]">{t('context.chooseTeam')}</h1>
            <p className="mt-3 mb-7 text-[1.05rem] text-ink-2">{t('context.chooseTeamHint')}</p>
            <ListGroup>
              {teams.data.map((x) => (
                <ListRow
                  key={x.id}
                  leading={<TeamBadge name={x.name} color={x.color} iconUrl={x.iconUrl} />}
                  title={x.name}
                  subtitle={x.role.preset ? t(`roles.${x.role.preset}`) : x.role.name}
                  onClick={() => {
                    selectTeam(x.id)
                    setPickTeam(false)
                  }}
                />
              ))}
              <ListRow
                leading={
                  <RowIcon>
                    <Plus className="size-5" />
                  </RowIcon>
                }
                title={t('context.newTeam')}
                to="/teams/new"
              />
            </ListGroup>
          </section>
        ) : (
          <section className="animate-rise">
            <Card className="mb-8 flex items-center gap-3.5 p-3 pr-2">
              <TeamBadge name={current.name} color={current.color} iconUrl={current.iconUrl} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{current.name}</div>
                <div className="truncate text-[0.88rem] text-ink-3">
                  {current.role.preset ? t(`roles.${current.role.preset}`) : current.role.name}
                </div>
              </div>
              <Button variant="ghost" size="sm" icon={<Users className="size-4" />} onClick={() => setPickTeam(true)}>
                {t('context.otherTeam')}
              </Button>
            </Card>

            <h1 className="display text-[2rem]">{t('context.chooseKart')}</h1>
            <p className="mt-3 mb-7 text-[1.05rem] text-ink-2">{t('context.chooseKartHint')}</p>

            {karts.isPending ? (
              <div className="h-40" />
            ) : karts.data && karts.data.length > 0 ? (
              <>
                <KartPicker karts={karts.data} selectedId={kartByTeam[current.id]} onPick={(k) => enter(k.id)} />
                <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                  {current.permissions.includes('team.manage') && (
                    <Button variant="ghost" icon={<Plus className="size-5" />} onClick={() => setKartSheet(true)}>
                      {t('team.addKart')}
                    </Button>
                  )}
                  <Button variant="ghost" className="ml-auto text-ink-3!" onClick={() => enter(null)}>
                    {t('context.skip')}
                    <ArrowRight className="size-4.5" />
                  </Button>
                </div>
              </>
            ) : (
              <Card>
                <EmptyState
                  icon={<span className="display text-[1.4rem]">#</span>}
                  title={t('context.noKarts')}
                  body={current.permissions.includes('team.manage') ? t('context.noKartsManager') : t('context.noKartsMember')}
                  action={
                    <div className="flex flex-col items-center gap-3">
                      {current.permissions.includes('team.manage') && (
                        <Button size="lg" icon={<Plus className="size-5" />} onClick={() => setKartSheet(true)}>
                          {t('team.addKart')}
                        </Button>
                      )}
                      <Button variant="ghost" onClick={() => enter(null)}>
                        {t('context.skip')}
                      </Button>
                    </div>
                  }
                />
              </Card>
            )}
          </section>
        )}
      </div>

      {current && (
        <KartSheet teamId={current.id} open={kartSheet} onOpenChange={setKartSheet} onSaved={(id) => enter(id)} />
      )}
    </div>
  )
}
