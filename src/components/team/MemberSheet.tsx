import { useEffect, useState } from 'react'
import { LogOut, UserMinus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Section } from '@/components/ui/Card'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { Avatar } from '@/components/ui/Identity'
import { Sheet } from '@/components/ui/Sheet'
import { errorCode, safe, useKarts, useRemoveMember, useRoles, useUpdateMember } from '@/data/queries'
import type { Member } from '@/data/types'
import { KartMultiSelect, RolePicker } from './pickers'

/** Úprava člena: rola, pridelené motokáry, odstránenie z tímu. */
export function MemberSheet({
  teamId,
  teamName,
  member,
  isSelf,
  canManage = true,
  open,
  onOpenChange,
  onLeft,
}: {
  teamId: string
  teamName: string
  member: Member | null
  isSelf: boolean
  /** Bez správy tímu sa ukáže iba potvrdenie odchodu z tímu. */
  canManage?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Volá sa, keď človek opustil tím sám. */
  onLeft?: () => void
}) {
  const { t } = useTranslation()
  const roles = useRoles(teamId)
  const karts = useKarts(teamId)
  const update = useUpdateMember(teamId)
  const remove = useRemoveMember(teamId)
  const [roleId, setRoleId] = useState<string | null>(null)
  const [kartIds, setKartIds] = useState<string[]>([])
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (open && member) {
      setRoleId(member.role.id)
      setKartIds(member.kartIds)
      update.reset()
      remove.reset()
    }
  }, [open, member?.membershipId])

  if (!member) return null
  const role = roles.data?.find((r) => r.id === roleId)
  const seesAll = role?.permissions.includes('kart.all')
  const name = member.profile.name || member.profile.email

  async function save() {
    if (!member || !roleId) return
    const r = await safe(update.mutateAsync({ membershipId: member.membershipId, roleId, kartIds: seesAll ? [] : kartIds }))
    if (!r.ok) return
    onOpenChange(false)
  }

  async function doRemove() {
    if (!member) return
    if (!(await safe(remove.mutateAsync(member.membershipId))).ok) return
    setConfirm(false)
    onOpenChange(false)
    if (isSelf) onLeft?.()
  }

  const updateCode = errorCode(update.error)
  const removeCode = errorCode(remove.error)
  const confirmOpen = canManage ? confirm : open
  const setConfirmOpen = canManage ? setConfirm : onOpenChange

  return (
    <>
      <Sheet
        open={canManage && open && !confirm}
        onOpenChange={onOpenChange}
        title={t('members.edit')}
        footer={
          <div className="space-y-3">
            {update.isError && (
              <p className="rounded-[14px] bg-danger/10 px-4 py-3 text-[0.92rem] leading-snug text-danger">
                {updateCode ? t(`errors.${updateCode}`) : t('common.error')}
              </p>
            )}
            <Button block size="lg" onClick={() => void save()} loading={update.isPending} disabled={!roleId}>
              {t('common.save')}
            </Button>
          </div>
        }
      >
        <div className="space-y-7">
          <div className="flex items-center gap-4">
            <Avatar name={name} url={member.profile.avatarUrl} size="lg" />
            <div className="min-w-0">
              <div className="truncate text-[1.1rem] font-semibold">{name}</div>
              <div className="truncate text-[0.9rem] text-ink-3">{member.profile.email}</div>
            </div>
          </div>

          <Section title={t('members.role')}>
            {roles.data && <RolePicker roles={roles.data} value={roleId} onChange={setRoleId} />}
          </Section>

          <Section title={t('members.karts')}>
            {seesAll ? (
              <p className="px-1 text-[0.92rem] text-ink-3">{t('members.kartsAll')}</p>
            ) : karts.data && karts.data.length > 0 ? (
              <KartMultiSelect karts={karts.data} value={kartIds} onChange={setKartIds} />
            ) : (
              <p className="px-1 text-[0.92rem] text-ink-3">{t('members.noKarts')}</p>
            )}
          </Section>

          <Button
            variant="ghost"
            block
            className="text-danger! hover:bg-danger/10!"
            icon={isSelf ? <LogOut className="size-5" /> : <UserMinus className="size-5" />}
            onClick={() => {
              remove.reset()
              setConfirm(true)
            }}
          >
            {isSelf ? t('members.leave') : t('members.remove')}
          </Button>
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={isSelf ? t('members.leave') : t('members.remove')}
        body={isSelf ? t('members.leaveConfirm', { team: teamName }) : t('members.removeConfirm', { name })}
        confirmLabel={isSelf ? t('members.leave') : t('members.remove')}
        onConfirm={() => void doRemove()}
        loading={remove.isPending}
        error={remove.isError ? (removeCode ? t(`errors.${removeCode}`) : t('common.error')) : undefined}
      />
    </>
  )
}
