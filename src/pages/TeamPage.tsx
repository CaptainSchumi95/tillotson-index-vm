import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeftRight, Info, Palette, Plus, Settings, ShieldCheck, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { KartSheet } from '@/components/KartSheet'
import { Button } from '@/components/ui/Button'
import { Badge, Card, Section } from '@/components/ui/Card'
import { Avatar, KartPlate, TeamBadge } from '@/components/ui/Identity'
import { ListGroup, ListRow, RowIcon } from '@/components/ui/ListRow'
import { PageHeader } from '@/components/ui/PageHeader'
import { useCan, useCurrentTeam, useKarts, useMembers, useProfile } from '@/data/queries'
import type { Kart } from '@/data/types'

export function TeamPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { team, teams } = useCurrentTeam()
  const karts = useKarts(team?.id)
  const members = useMembers(team?.id)
  const profile = useProfile()
  const can = useCan()
  const [editing, setEditing] = useState<Kart | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  if (!team) return null
  const manage = can('team.manage')
  const roleName = team.role.preset ? t(`roles.${team.role.preset}`) : team.role.name

  const openKart = (k: Kart | null) => {
    setEditing(k)
    setSheetOpen(true)
  }

  return (
    <>
      <PageHeader title={t('team.title')} />

      <div className="space-y-8">
        <Card className="flex items-center gap-4 p-4 sm:p-5">
          <TeamBadge name={team.name} color={team.color} iconUrl={team.iconUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="display truncate text-[1.3rem]">{team.name}</div>
            <div className="mt-2">
              <Badge tone="accent">{roleName}</Badge>
            </div>
          </div>
        </Card>

        <Section
          title={t('team.karts')}
          action={
            manage && (
              <Button variant="ghost" size="sm" icon={<Plus className="size-4" />} onClick={() => openKart(null)}>
                {t('common.add')}
              </Button>
            )
          }
        >
          {karts.data && karts.data.length > 0 ? (
            <ListGroup>
              {karts.data.map((k) => (
                <ListRow
                  key={k.id}
                  leading={<KartPlate number={k.number} size="md" />}
                  title={k.driverName || '—'}
                  subtitle={`${t('context.kart')} ${k.number}`}
                  onClick={manage ? () => openKart(k) : undefined}
                />
              ))}
            </ListGroup>
          ) : (
            <Card className="p-5 text-center text-ink-3">{t('team.noKarts')}</Card>
          )}
        </Section>

        <Section title={t('team.members')}>
          <ListGroup>
            {members.data?.map((m) => (
              <ListRow
                key={m.membershipId}
                leading={<Avatar name={m.profile.name} url={m.profile.avatarUrl} />}
                title={
                  <>
                    {m.profile.name || m.profile.email}
                    {m.profile.id === profile.data?.id && <span className="font-normal text-ink-3"> · {t('team.you')}</span>}
                  </>
                }
                subtitle={m.role.preset ? t(`roles.${m.role.preset}`) : m.role.name}
                chevron={false}
              />
            ))}
            {manage && (
              <>
                <ListRow
                  leading={
                    <RowIcon tone="accent">
                      <UserPlus className="size-5" />
                    </RowIcon>
                  }
                  title={t('team.invite')}
                  trailing={<Badge>{t('common.soon')}</Badge>}
                  chevron={false}
                  disabled
                />
                <ListRow
                  leading={
                    <RowIcon>
                      <ShieldCheck className="size-5" />
                    </RowIcon>
                  }
                  title={t('team.roles')}
                  trailing={<Badge>{t('common.soon')}</Badge>}
                  chevron={false}
                  disabled
                />
              </>
            )}
          </ListGroup>
        </Section>

        <Section title={t('team.app')}>
          <ListGroup>
            {manage && (
              <ListRow
                leading={
                  <RowIcon>
                    <Palette className="size-5" />
                  </RowIcon>
                }
                title={t('team.appearance')}
                subtitle={t('team.appearanceHint')}
                to="/team/appearance"
              />
            )}
            <ListRow
              leading={
                <RowIcon>
                  <ArrowLeftRight className="size-5" />
                </RowIcon>
              }
              title={(teams.data?.length ?? 0) > 1 ? t('team.switchTeam') : t('context.newTeam')}
              onClick={() => void navigate({ to: (teams.data?.length ?? 0) > 1 ? '/select' : '/teams/new' })}
            />
            <ListRow
              leading={
                <RowIcon>
                  <Settings className="size-5" />
                </RowIcon>
              }
              title={t('settings.title')}
              to="/settings"
            />
            <ListRow
              leading={
                <RowIcon>
                  <Info className="size-5" />
                </RowIcon>
              }
              title={t('about.title')}
              to="/about"
            />
          </ListGroup>
        </Section>
      </div>

      <KartSheet teamId={team.id} kart={editing} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}
