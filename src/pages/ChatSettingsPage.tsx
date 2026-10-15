import { useEffect, useState, type ReactNode } from 'react'
import { useParams, useRouter } from '@tanstack/react-router'
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRoleName } from '@/components/team/pickers'
import { Button } from '@/components/ui/Button'
import { Card, Section } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Identity'
import { PageHeader } from '@/components/ui/PageHeader'
import { FullScreenLoader } from '@/components/ui/Spinner'
import { useChatOverview, useUpdatePosters } from '@/data/chat'
import { safe, useCan, useCurrentTeam, useMembers, useRoles } from '@/data/queries'
import { cn } from '@/lib/cn'

function CheckRow({
  checked,
  onToggle,
  leading,
  title,
  subtitle,
  disabled,
}: {
  checked: boolean
  onToggle: () => void
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      className="flex min-h-[60px] w-full items-center gap-3.5 px-4 py-2.5 text-left transition-colors hover:bg-surface-2 disabled:opacity-60"
    >
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        {subtitle && <span className="block truncate text-[0.85rem] text-ink-3">{subtitle}</span>}
      </span>
      <span
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-[9px] border-2 transition-colors',
          checked ? 'border-accent bg-accent text-on-accent' : 'border-line-strong',
        )}
      >
        {checked && <Check className="size-4" strokeWidth={3} />}
      </span>
    </button>
  )
}

/** Kto smie písať na nástenku (/chat/$channelId/settings) – iba správca tímu. */
export function ChatSettingsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { channelId } = useParams({ strict: false }) as { channelId: string }
  const { team } = useCurrentTeam()
  const can = useCan()
  const overview = useChatOverview(team?.id)
  const roles = useRoles(team?.id)
  const members = useMembers(team?.id)
  const update = useUpdatePosters(team?.id ?? '')
  const roleName = useRoleName()
  const channel = overview.data?.find((c) => c.id === channelId)
  const [roleIds, setRoleIds] = useState<string[]>([])
  const [profileIds, setProfileIds] = useState<string[]>([])

  useEffect(() => {
    if (channel) {
      setRoleIds(channel.postRoles)
      setProfileIds(channel.postProfiles)
    }
  }, [channel?.id])

  if (!team || !can('team.manage')) return null
  if (overview.isPending || roles.isPending || members.isPending) return <FullScreenLoader />
  if (!channel || channel.kind !== 'announcements') return null

  const toggle = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

  async function save() {
    const r = await safe(update.mutateAsync({ channelId, roleIds, profileIds }))
    if (r.ok) router.history.back()
  }

  return (
    <>
      <PageHeader back title={t('chat.settingsTitle')} />
      <p className="-mt-2 mb-8 max-w-[56ch] leading-relaxed text-ink-2">{t('chat.settingsIntro')}</p>

      <div className="space-y-8">
        <Section title={t('chat.byRole')}>
          <Card className="divide-y divide-line overflow-hidden">
            {(roles.data ?? []).map((r) => (
              <CheckRow
                key={r.id}
                checked={roleIds.includes(r.id)}
                onToggle={() => toggle(roleIds, setRoleIds, r.id)}
                title={roleName(r)}
              />
            ))}
          </Card>
        </Section>

        <Section title={t('chat.byPerson')}>
          <Card className="divide-y divide-line overflow-hidden">
            {(members.data ?? []).map((m) => {
              const viaRole = roleIds.includes(m.role.id)
              return (
                <CheckRow
                  key={m.membershipId}
                  checked={viaRole || profileIds.includes(m.profile.id)}
                  disabled={viaRole}
                  onToggle={() => toggle(profileIds, setProfileIds, m.profile.id)}
                  leading={<Avatar name={m.profile.name || m.profile.email} url={m.profile.avatarUrl} />}
                  title={m.profile.name || m.profile.email}
                  subtitle={viaRole ? `${roleName(m.role)} · ${t('chat.alwaysByRole')}` : roleName(m.role)}
                />
              )
            })}
          </Card>
        </Section>

        {update.isError && <p className="text-danger">{t('common.error')}</p>}

        <Button block size="lg" loading={update.isPending} onClick={() => void save()}>
          {t('common.save')}
        </Button>
      </div>
    </>
  )
}
