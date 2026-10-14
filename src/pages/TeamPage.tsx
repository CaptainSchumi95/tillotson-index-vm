import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeftRight, Info, LogOut, Mail, Palette, Plus, Settings, ShieldCheck, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { KartSheet } from '@/components/KartSheet'
import { InviteSheet } from '@/components/team/InviteSheet'
import { MemberSheet } from '@/components/team/MemberSheet'
import { useRoleName } from '@/components/team/pickers'
import { Button } from '@/components/ui/Button'
import { Badge, Card, Section } from '@/components/ui/Card'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { Avatar, KartPlate, TeamBadge } from '@/components/ui/Identity'
import { ListGroup, ListRow, RowIcon } from '@/components/ui/ListRow'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  safe,
  useCan,
  useCancelInvitation,
  useCurrentTeam,
  useInvitations,
  useKarts,
  useMembers,
  useProfile,
} from '@/data/queries'
import type { Invitation, Kart, Member } from '@/data/types'
import { useWorkspace } from '@/state/workspace'

export function TeamPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { team, teams } = useCurrentTeam()
  const karts = useKarts(team?.id)
  const members = useMembers(team?.id)
  const profile = useProfile()
  const can = useCan()
  const manage = can('team.manage')
  const invitations = useInvitations(team?.id, manage)
  const cancelInvite = useCancelInvitation(team?.id ?? '')
  const roleName = useRoleName()
  const resetWorkspace = useWorkspace((s) => s.reset)

  const [editingKart, setEditingKart] = useState<Kart | null>(null)
  const [kartOpen, setKartOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [member, setMember] = useState<Member | null>(null)
  const [memberOpen, setMemberOpen] = useState(false)
  const [pending, setPending] = useState<Invitation | null>(null)

  if (!team) return null

  const me = members.data?.find((m) => m.profile.id === profile.data?.id)
  const multipleTeams = (teams.data?.length ?? 0) > 1

  const kartNumbers = (ids: string[] | undefined) =>
    (ids ?? [])
      .map((id) => karts.data?.find((k) => k.id === id)?.number)
      .filter(Boolean)
      .map((n) => `#${n}`)
      .join(' ')

  const openKart = (k: Kart | null) => {
    setEditingKart(k)
    setKartOpen(true)
  }

  const openMember = (m: Member) => {
    setMember(m)
    setMemberOpen(true)
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
              <Badge tone="accent">{roleName(team.role)}</Badge>
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

        <Section
          title={t('team.members')}
          action={members.data && <Badge>{members.data.length}</Badge>}
        >
          <ListGroup>
            {members.data?.map((m) => (
              <ListRow
                key={m.membershipId}
                leading={<Avatar name={m.profile.name || m.profile.email} url={m.profile.avatarUrl} />}
                title={
                  <>
                    {m.profile.name || m.profile.email}
                    {m.profile.id === profile.data?.id && <span className="font-normal text-ink-3"> · {t('team.you')}</span>}
                  </>
                }
                subtitle={[roleName(m.role), kartNumbers(m.kartIds)].filter(Boolean).join(' · ')}
                onClick={manage ? () => openMember(m) : undefined}
              />
            ))}
            {invitations.data?.map((inv) => (
              <ListRow
                key={inv.id}
                leading={
                  <RowIcon>
                    <Mail className="size-5" />
                  </RowIcon>
                }
                title={inv.email}
                subtitle={`${roleName(inv.role)} · ${t('members.pending')}`}
                onClick={() => setPending(inv)}
              />
            ))}
            {manage && (
              <ListRow
                leading={
                  <RowIcon tone="accent">
                    <UserPlus className="size-5" />
                  </RowIcon>
                }
                title={<span className="text-accent-ink">{t('members.invite')}</span>}
                onClick={() => setInviteOpen(true)}
                chevron={false}
              />
            )}
          </ListGroup>
        </Section>

        <Section title={t('team.app')}>
          <ListGroup>
            {manage && (
              <ListRow
                leading={
                  <RowIcon>
                    <ShieldCheck className="size-5" />
                  </RowIcon>
                }
                title={t('roles.title')}
                to="/team/roles"
              />
            )}
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
              title={multipleTeams ? t('team.switchTeam') : t('context.newTeam')}
              onClick={() => void navigate({ to: multipleTeams ? '/select' : '/teams/new' })}
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
            {!manage && me && (
              <ListRow
                leading={
                  <RowIcon>
                    <LogOut className="size-5" />
                  </RowIcon>
                }
                title={t('members.leave')}
                onClick={() => openMember(me)}
              />
            )}
          </ListGroup>
        </Section>
      </div>

      <KartSheet teamId={team.id} kart={editingKart} open={kartOpen} onOpenChange={setKartOpen} />
      <InviteSheet teamId={team.id} open={inviteOpen} onOpenChange={setInviteOpen} />
      <MemberSheet
        teamId={team.id}
        teamName={team.name}
        member={member}
        isSelf={member?.profile.id === profile.data?.id}
        canManage={manage}
        open={memberOpen}
        onOpenChange={setMemberOpen}
        onLeft={() => {
          resetWorkspace()
          void navigate({ to: '/' })
        }}
      />
      <ConfirmSheet
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={t('members.pendingTitle')}
        body={pending ? `${pending.email} · ${roleName(pending.role)} · ${t('members.pending')}` : ''}
        confirmLabel={t('members.cancelInvite')}
        loading={cancelInvite.isPending}
        onConfirm={() => {
          if (pending) void safe(cancelInvite.mutateAsync(pending.id)).then((r) => r.ok && setPending(null))
        }}
      />
    </>
  )
}
