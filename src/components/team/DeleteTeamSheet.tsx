import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Sheet } from '@/components/ui/Sheet'
import { safe, useDeleteTeam } from '@/data/queries'
import { useWorkspace } from '@/state/workspace'

/** Nevratné zmazanie tímu – treba napísať jeho názov, aby sa to nestalo omylom. */
export function DeleteTeamSheet({
  teamId,
  teamName,
  open,
  onOpenChange,
}: {
  teamId: string
  teamName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const del = useDeleteTeam()
  const reset = useWorkspace((s) => s.reset)
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (open) {
      setTyped('')
      del.reset()
    }
  }, [open])

  const matches = typed.trim().toLocaleLowerCase() === teamName.trim().toLocaleLowerCase()

  async function confirm() {
    const r = await safe(del.mutateAsync(teamId))
    if (!r.ok) return
    onOpenChange(false)
    reset()
    void navigate({ to: '/' })
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('team.deleteTeam')}
      description={t('team.deleteTeamBody')}
      footer={
        <div className="space-y-3">
          {del.isError && (
            <p className="rounded-[14px] bg-danger/10 px-4 py-3 text-[0.92rem] text-danger">{t('common.error')}</p>
          )}
          <Button
            block
            size="lg"
            disabled={!matches}
            loading={del.isPending}
            onClick={() => void confirm()}
            className="bg-danger! text-white!"
          >
            {t('team.deleteTeam')}
          </Button>
        </div>
      }
    >
      <Field
        label={t('team.deleteTeamField')}
        placeholder={teamName}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
    </Sheet>
  )
}
