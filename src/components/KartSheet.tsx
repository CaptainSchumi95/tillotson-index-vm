import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import { safe, useArchiveKart, useSaveKart } from '@/data/queries'
import type { Kart } from '@/data/types'
import { Button } from './ui/Button'
import { ConfirmSheet } from './ui/ConfirmSheet'
import { Field } from './ui/Field'
import { KartPlate } from './ui/Identity'
import { Sheet } from './ui/Sheet'

/** Pridanie alebo úprava motokáry. */
export function KartSheet({
  teamId,
  kart,
  open,
  onOpenChange,
  onSaved,
}: {
  teamId: string
  kart?: Kart | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (kartId: string) => void
}) {
  const { t } = useTranslation()
  const save = useSaveKart(teamId)
  const archive = useArchiveKart(teamId)
  const [confirm, setConfirm] = useState(false)
  const [number, setNumber] = useState('')
  const [driverName, setDriverName] = useState('')

  useEffect(() => {
    if (open) {
      setNumber(kart?.number ?? '')
      setDriverName(kart?.driverName ?? '')
    }
  }, [open, kart])

  const valid = number.trim().length > 0

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    const r = await safe(save.mutateAsync({ id: kart?.id, number: number.trim(), driverName: driverName.trim() }))
    if (!r.ok) return
    onOpenChange(false)
    onSaved?.(r.value)
  }

  async function doArchive() {
    if (!kart) return
    if (!(await safe(archive.mutateAsync(kart.id))).ok) return
    setConfirm(false)
    onOpenChange(false)
  }

  return (
    <>
    <Sheet
      open={open && !confirm}
      onOpenChange={onOpenChange}
      title={kart ? t('team.editKart') : t('team.addKart')}
      footer={
        <Button form="kart-form" type="submit" block size="lg" disabled={!valid} loading={save.isPending}>
          {t('common.save')}
        </Button>
      }
    >
      <form id="kart-form" onSubmit={submit} className="space-y-5">
        <div className="grid place-items-center rounded-[20px] bg-surface-2 py-7">
          <KartPlate number={number.trim() || '00'} size="xl" muted={!number.trim()} />
        </div>
        <Field
          label={t('team.kartNumber')}
          value={number}
          onChange={(e) => setNumber(e.target.value.slice(0, 6))}
          inputMode="numeric"
          autoComplete="off"
          autoFocus={!kart}
          placeholder="95"
        />
        <Field
          label={t('team.driverName')}
          value={driverName}
          onChange={(e) => setDriverName(e.target.value)}
          placeholder={t('team.driverNamePlaceholder')}
          autoComplete="off"
        />
        {save.isError && <p className="text-[0.9rem] text-danger">{t('common.error')}</p>}
        {kart && (
          <Button
            type="button"
            variant="ghost"
            block
            className="text-danger! hover:bg-danger/10!"
            icon={<Trash2 className="size-5" />}
            onClick={() => setConfirm(true)}
          >
            {t('team.removeKart')}
          </Button>
        )}
      </form>
    </Sheet>
    <ConfirmSheet
      open={confirm}
      onOpenChange={setConfirm}
      title={t('team.removeKart')}
      body={t('team.removeKartConfirm', { number: kart?.number ?? '' })}
      confirmLabel={t('team.removeKart')}
      loading={archive.isPending}
      onConfirm={() => void doArchive()}
    />
    </>
  )
}
