import { useState } from 'react'
import { CloudUpload, Droplet, Plus, Trash2, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Badge, Card, Section } from '@/components/ui/Card'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { KartPlate } from '@/components/ui/Identity'
import { RowIcon } from '@/components/ui/ListRow'
import { Sheet } from '@/components/ui/Sheet'
import { PageHeader } from '@/components/ui/PageHeader'
import { PickerField } from '@/components/ui/PickerField'
import { useCan, useCurrentKart, useDeleteService, useProfile, useSaveService, useService } from '@/data/queries'
import { SERVICE_KINDS, type ServiceKind } from '@/data/types'
import { cn } from '@/lib/cn'
import { relativeDay, todayIso } from '@/lib/time'

/** Servisná knižka motokáry (/service). */
export function ServicePage() {
  const { t, i18n } = useTranslation()
  const { kart } = useCurrentKart()
  const can = useCan()
  const profile = useProfile()
  const entries = useService(kart?.id)
  const save = useSaveService(kart?.id ?? '')
  const del = useDeleteService(kart?.id ?? '')
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<ServiceKind>('oil')
  const [date, setDate] = useState(todayIso())
  const [note, setNote] = useState('')
  const [toDelete, setToDelete] = useState<string | null>(null)

  if (!kart) return null
  const canWrite = can('service.edit')
  const lastOil = entries.data?.find((e) => e.kind === 'oil')

  function openAdd() {
    setKind('oil')
    setDate(todayIso())
    setNote('')
    setOpen(true)
  }

  function submit() {
    if (!kart || !date) return
    save.mutate({ id: crypto.randomUUID(), kartId: kart.id, kind, performedOn: date, note: note.trim() })
    setOpen(false)
  }

  const chip = (active: boolean) =>
    cn(
      'h-11 rounded-[12px] border px-4 font-medium transition-colors',
      active ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line-strong bg-surface text-ink-2 hover:bg-surface-2',
    )

  return (
    <>
      <PageHeader back title={t('service.title')} action={<KartPlate number={kart.number} />} />

      <div className="space-y-8">
        {/* Najdôležitejšie: kedy bol naposledy olej */}
        <Card className="flex items-center gap-4 p-5">
          <span className="grid size-14 shrink-0 place-items-center rounded-[16px] bg-accent text-on-accent">
            <Droplet className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="eyebrow mb-1">{t('service.kinds.oil')}</div>
            <div className="display text-[1.35rem]">
              {lastOil ? relativeDay(lastOil.performedOn, i18n.language) : '—'}
            </div>
            {!lastOil && <div className="text-[0.9rem] text-ink-3">{t('service.lastOilNever')}</div>}
          </div>
        </Card>

        {canWrite && (
          <Button size="lg" block icon={<Plus className="size-5" />} onClick={openAdd}>
            {t('service.add')}
          </Button>
        )}

        {entries.data && entries.data.length === 0 ? (
          <Card>
            <EmptyState icon={<Wrench className="size-7" />} title={t('service.empty')} body={t('service.emptyHint')} />
          </Card>
        ) : (
          <Section>
            <Card className="divide-y divide-line">
              {entries.data?.map((e) => {
                const mine = e.author?.id === profile.data?.id
                return (
                  <div key={e.id} className="flex items-center gap-3.5 px-4 py-3">
                    <RowIcon tone={e.kind === 'oil' ? 'accent' : 'neutral'}>
                      {e.kind === 'oil' ? <Droplet className="size-5" /> : <Wrench className="size-5" />}
                    </RowIcon>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{t(`service.kinds.${e.kind}`)}</div>
                      <div className="truncate text-[0.88rem] text-ink-3">
                        {[relativeDay(e.performedOn, i18n.language), e.author?.name, e.note].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    {e.pending ? (
                      <Badge tone="accent">
                        <CloudUpload className="size-3.5" />
                      </Badge>
                    ) : (
                      (mine || can('team.manage')) && (
                        <button
                          type="button"
                          aria-label={t('service.delete')}
                          onClick={() => setToDelete(e.id)}
                          className="grid size-10 place-items-center rounded-full text-ink-3 hover:bg-sunken hover:text-danger"
                        >
                          <Trash2 className="size-4.5" />
                        </button>
                      )
                    )}
                  </div>
                )
              })}
            </Card>
          </Section>
        )}
      </div>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={t('service.add')}
        footer={
          <Button block size="lg" disabled={!date} onClick={submit}>
            {t('common.save')}
          </Button>
        }
      >
        <div className="space-y-7">
          <Section title={t('service.kind')}>
            <div className="flex flex-wrap gap-2">
              {SERVICE_KINDS.map((k) => (
                <button key={k} type="button" className={chip(kind === k)} onClick={() => setKind(k)}>
                  {t(`service.kinds.${k}`)}
                </button>
              ))}
            </div>
          </Section>
          <PickerField
            type="date"
            label={t('service.date')}
            value={date}
            max={todayIso()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
          <Section title={t('service.note')}>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              placeholder={t('service.notePlaceholder')}
              className="h-[52px] w-full rounded-[14px] border border-line-strong bg-surface px-4 outline-none placeholder:text-ink-3 focus:border-accent"
            />
          </Section>
        </div>
      </Sheet>

      <ConfirmSheet
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t('service.delete')}
        body={t('service.deleteConfirm')}
        confirmLabel={t('service.delete')}
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete)
          setToDelete(null)
        }}
      />
    </>
  )
}
