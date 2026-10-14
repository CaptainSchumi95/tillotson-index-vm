import { useEffect, useState } from 'react'
import { ListPlus, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Section } from '@/components/ui/Card'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { Field } from '@/components/ui/Field'
import { ListGroup, ListRow, RowIcon } from '@/components/ui/ListRow'
import { PageHeader } from '@/components/ui/PageHeader'
import { Sheet } from '@/components/ui/Sheet'
import { safe, useCan, useCurrentTeam, useCustomSetupFields, useDeleteSetupField, useSaveSetupField } from '@/data/queries'
import { CUSTOM_FIELD_UNITS, GROUP_ORDER, type FieldUnit, type SetupGroup } from '@/data/setup-fields'
import type { CustomSetupField } from '@/data/types'
import { cn } from '@/lib/cn'

/** Vlastné položky setupu tímu (/setup/fields). */
export function SetupFieldsPage() {
  const { t } = useTranslation()
  const { team } = useCurrentTeam()
  const can = useCan()
  const fields = useCustomSetupFields(team?.id)
  const save = useSaveSetupField(team?.id ?? '')
  const del = useDeleteSetupField(team?.id ?? '')
  const [editing, setEditing] = useState<CustomSetupField | null>(null)
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [label, setLabel] = useState('')
  const [group, setGroup] = useState<SetupGroup>('other')
  const [unit, setUnit] = useState<FieldUnit>('none')

  useEffect(() => {
    if (open) {
      setLabel(editing?.label ?? '')
      setGroup(editing?.group ?? 'other')
      setUnit(editing?.unit ?? 'none')
      save.reset()
    }
  }, [open, editing?.id])

  if (!team || !can('team.manage')) return null

  const openField = (f: CustomSetupField | null) => {
    setEditing(f)
    setOpen(true)
  }

  async function submit() {
    const r = await safe(save.mutateAsync({ id: editing?.id, label: label.trim(), group, unit }))
    if (r.ok) setOpen(false)
  }

  async function remove() {
    if (!editing) return
    const r = await safe(del.mutateAsync(editing.id))
    if (r.ok) {
      setConfirm(false)
      setOpen(false)
    }
  }

  const chip = (active: boolean) =>
    cn(
      'h-10 rounded-[12px] border px-3.5 text-[0.92rem] font-medium transition-colors',
      active ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line-strong bg-surface text-ink-2 hover:bg-surface-2',
    )

  return (
    <>
      <PageHeader back title={t('setup.custom.title')} />
      <p className="-mt-2 mb-8 max-w-[56ch] leading-relaxed text-ink-2">{t('setup.custom.intro')}</p>

      <ListGroup>
        {fields.data?.map((f) => (
          <ListRow
            key={f.id}
            leading={
              <RowIcon>
                <ListPlus className="size-5" />
              </RowIcon>
            }
            title={f.label}
            subtitle={`${t(`setup.groups.${f.group}`)} · ${t(`setup.custom.units.${f.unit}` as never)}`}
            onClick={() => openField(f)}
          />
        ))}
        <ListRow
          leading={
            <RowIcon tone="accent">
              <Plus className="size-5" />
            </RowIcon>
          }
          title={<span className="text-accent-ink">{t('setup.custom.add')}</span>}
          chevron={false}
          onClick={() => openField(null)}
        />
      </ListGroup>

      <Sheet
        open={open && !confirm}
        onOpenChange={setOpen}
        title={editing ? t('setup.custom.edit') : t('setup.custom.add')}
        footer={
          <div className="space-y-3">
            <Button block size="lg" disabled={!label.trim()} loading={save.isPending} onClick={() => void submit()}>
              {t('common.save')}
            </Button>
            {editing && (
              <Button
                block
                variant="ghost"
                className="text-danger! hover:bg-danger/10!"
                icon={<Trash2 className="size-5" />}
                onClick={() => setConfirm(true)}
              >
                {t('setup.custom.delete')}
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-7">
          <Field
            label={t('setup.custom.label')}
            placeholder={t('setup.custom.labelPlaceholder')}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={40}
          />
          <Section title={t('setup.custom.group')}>
            <div className="flex flex-wrap gap-2">
              {GROUP_ORDER.map((g) => (
                <button key={g} type="button" className={chip(group === g)} onClick={() => setGroup(g)}>
                  {t(`setup.groups.${g}`)}
                </button>
              ))}
            </div>
          </Section>
          <Section title={t('setup.custom.unit')}>
            <div className="flex flex-wrap gap-2">
              {CUSTOM_FIELD_UNITS.map((u) => (
                <button key={u} type="button" className={chip(unit === u)} onClick={() => setUnit(u)}>
                  {t(`setup.custom.units.${u}` as never)}
                </button>
              ))}
            </div>
          </Section>
          {save.isError && <p className="text-danger">{t('common.error')}</p>}
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirm}
        onOpenChange={setConfirm}
        title={t('setup.custom.delete')}
        body={t('setup.custom.deleteConfirm', { name: editing?.label ?? '' })}
        confirmLabel={t('setup.custom.delete')}
        loading={del.isPending}
        onConfirm={() => void remove()}
      />
    </>
  )
}
