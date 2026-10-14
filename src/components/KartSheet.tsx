import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useSaveKart } from '@/data/queries'
import type { Kart } from '@/data/types'
import { Button } from './ui/Button'
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
    const id = await save.mutateAsync({ id: kart?.id, number: number.trim(), driverName: driverName.trim() })
    onOpenChange(false)
    onSaved?.(id)
  }

  return (
    <Sheet
      open={open}
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
      </form>
    </Sheet>
  )
}
