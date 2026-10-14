import { Plus, ShieldCheck } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useRoleName } from '@/components/team/pickers'
import { Section } from '@/components/ui/Card'
import { ListGroup, ListRow, RowIcon } from '@/components/ui/ListRow'
import { PageHeader } from '@/components/ui/PageHeader'
import { useCan, useCurrentTeam, useRoles } from '@/data/queries'
import type { TeamRole } from '@/data/types'

export function RolesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { team } = useCurrentTeam()
  const roles = useRoles(team?.id)
  const can = useCan()
  const roleName = useRoleName()

  if (!team || !can('team.manage')) return null

  const presets = roles.data?.filter((r) => r.preset) ?? []
  const custom = roles.data?.filter((r) => !r.preset) ?? []

  const row = (r: TeamRole) => (
    <ListRow
      key={r.id}
      leading={
        <RowIcon tone={r.permissions.includes('team.manage') ? 'accent' : 'neutral'}>
          <ShieldCheck className="size-5" />
        </RowIcon>
      }
      title={roleName(r)}
      subtitle={r.preset ? t(`roles.desc.${r.preset}`) : t('roles.permissionCount', { count: r.permissions.length })}
      trailing={<span className="text-[0.85rem] whitespace-nowrap">{t('roles.memberCount', { count: r.memberCount })}</span>}
      onClick={() => void navigate({ to: '/team/roles/$roleId', params: { roleId: r.id } })}
    />
  )

  return (
    <>
      <PageHeader back title={t('roles.title')} />
      <p className="-mt-2 mb-8 max-w-[56ch] leading-relaxed text-ink-2">{t('roles.intro')}</p>

      <div className="space-y-8">
        <Section title={t('roles.preset')}>
          <ListGroup>{presets.map(row)}</ListGroup>
        </Section>

        <Section title={t('roles.custom')}>
          <ListGroup>
            {custom.map(row)}
            <ListRow
              leading={
                <RowIcon tone="accent">
                  <Plus className="size-5" />
                </RowIcon>
              }
              title={<span className="text-accent-ink">{t('roles.newRole')}</span>}
              chevron={false}
              onClick={() => void navigate({ to: '/team/roles/$roleId', params: { roleId: 'new' } })}
            />
          </ListGroup>
        </Section>
      </div>
    </>
  )
}
