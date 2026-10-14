import { useEffect, useState } from 'react'
import { useParams, useRouter } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRoleName } from '@/components/team/pickers'
import { Button } from '@/components/ui/Button'
import { Card, Section } from '@/components/ui/Card'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { Field } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { Switch } from '@/components/ui/Switch'
import { PERMISSION_GROUPS, togglePermission } from '@/data/permissions'
import { errorCode, safe, useCan, useCurrentTeam, useDeleteRole, useRoles, useSaveRole } from '@/data/queries'
import type { Permission } from '@/data/types'

/** Vytvorenie (/team/roles/new) alebo úprava roly a jej oprávnení. */
export function RoleEditorPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { roleId } = useParams({ strict: false }) as { roleId: string }
  const { team } = useCurrentTeam()
  const roles = useRoles(team?.id)
  const can = useCan()
  const roleName = useRoleName()
  const save = useSaveRole(team?.id ?? '')
  const del = useDeleteRole(team?.id ?? '')
  const [name, setName] = useState('')
  const [perms, setPerms] = useState<Permission[]>([])
  const [confirm, setConfirm] = useState(false)

  const isNew = roleId === 'new'
  const role = roles.data?.find((r) => r.id === roleId)

  useEffect(() => {
    if (role) {
      setName(role.name)
      setPerms(role.permissions)
    }
  }, [role?.id])

  if (!team || !can('team.manage') || (!isNew && !role)) return null

  const isPreset = !!role?.preset
  const valid = isPreset || name.trim().length > 0

  async function submit() {
    if (!(await safe(save.mutateAsync({ id: role?.id, name: name.trim(), permissions: perms }))).ok) return
    router.history.back()
  }

  async function doDelete() {
    if (!role) return
    if (!(await safe(del.mutateAsync(role.id))).ok) return
    setConfirm(false)
    router.history.back()
  }

  const saveCode = errorCode(save.error)
  const delCode = errorCode(del.error)

  return (
    <>
      <PageHeader back title={isNew ? t('roles.newRole') : roleName(role!)} />

      <div className="space-y-8">
        {isPreset ? (
          <p className="-mt-2 px-1 text-[0.9rem] text-ink-3">{t('roles.presetNameHint')}</p>
        ) : (
          <Field
            label={t('roles.name')}
            placeholder={t('roles.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoFocus={isNew}
          />
        )}

        {PERMISSION_GROUPS.map((group) => (
          <Section key={group.key} title={t(`permission.groups.${group.key}`)}>
            <Card className="divide-y divide-line">
              {group.permissions.map((p) => {
                const on = perms.includes(p)
                return (
                  <label key={p} className="flex cursor-pointer items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-2">
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{t(`permission.${p}.label`)}</span>
                      <span className="block text-[0.88rem] leading-snug text-ink-3">{t(`permission.${p}.hint`)}</span>
                    </span>
                    <Switch
                      checked={on}
                      label={t(`permission.${p}.label`)}
                      onChange={(v) => setPerms((cur) => togglePermission(cur, p, v))}
                    />
                  </label>
                )
              })}
            </Card>
          </Section>
        ))}

        {save.isError && (
          <p className="rounded-[14px] bg-danger/10 px-4 py-3 text-[0.95rem] text-danger">
            {saveCode ? t(`errors.${saveCode}`) : t('common.error')}
          </p>
        )}

        <div className="space-y-3">
          <Button block size="lg" disabled={!valid} loading={save.isPending} onClick={() => void submit()}>
            {t('common.save')}
          </Button>
          {role && !isPreset && (
            <Button
              block
              variant="ghost"
              className="text-danger! hover:bg-danger/10!"
              icon={<Trash2 className="size-5" />}
              onClick={() => {
                del.reset()
                setConfirm(true)
              }}
            >
              {t('roles.delete')}
            </Button>
          )}
        </div>
      </div>

      <ConfirmSheet
        open={confirm}
        onOpenChange={setConfirm}
        title={t('roles.delete')}
        body={t('roles.deleteConfirm', { name: role?.name ?? '' })}
        confirmLabel={t('roles.delete')}
        onConfirm={() => void doDelete()}
        loading={del.isPending}
        error={del.isError ? (delCode ? t(`errors.${delCode}`) : t('common.error')) : undefined}
      />
    </>
  )
}
