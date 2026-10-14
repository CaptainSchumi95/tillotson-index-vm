import { useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCurrentKart, useCurrentTeam } from '@/data/queries'
import { useWorkspace } from '@/state/workspace'
import { KartPicker } from './KartPicker'
import { Section } from './ui/Card'
import { TeamBadge } from './ui/Identity'
import { ListGroup, ListRow, RowIcon } from './ui/ListRow'
import { Sheet } from './ui/Sheet'

/** Rýchle prepnutie motokáry alebo tímu odkiaľkoľvek. */
export function ContextSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { team, teams } = useCurrentTeam()
  const { kart, karts } = useCurrentKart()
  const selectTeam = useWorkspace((s) => s.selectTeam)
  const selectKart = useWorkspace((s) => s.selectKart)

  if (!team) return null
  const otherTeams = (teams.data ?? []).filter((x) => x.id !== team.id)

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('context.chooseKart')}>
      <div className="space-y-7">
        {karts.data && karts.data.length > 0 ? (
          <KartPicker
            karts={karts.data}
            selectedId={kart?.id}
            onPick={(k) => {
              selectKart(team.id, k.id)
              onOpenChange(false)
            }}
          />
        ) : (
          <p className="text-ink-2">{t('context.noKarts')}</p>
        )}

        <Section title={t('context.teams')}>
          <ListGroup>
            <ListRow
              leading={<TeamBadge name={team.name} color={team.color} iconUrl={team.iconUrl} />}
              title={team.name}
              subtitle={team.role.preset ? t(`roles.${team.role.preset}`) : team.role.name}
              chevron={false}
            />
            {otherTeams.map((x) => (
              <ListRow
                key={x.id}
                leading={<TeamBadge name={x.name} color={x.color} iconUrl={x.iconUrl} />}
                title={x.name}
                subtitle={x.role.preset ? t(`roles.${x.role.preset}`) : x.role.name}
                onClick={() => {
                  selectTeam(x.id)
                  onOpenChange(false)
                  void navigate({ to: '/select' })
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
              onClick={() => {
                onOpenChange(false)
                void navigate({ to: '/teams/new' })
              }}
            />
          </ListGroup>
        </Section>
      </div>
    </Sheet>
  )
}
