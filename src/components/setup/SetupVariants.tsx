import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Check, Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { Field } from '@/components/ui/Field'
import { ListGroup, ListRow, RowIcon } from '@/components/ui/ListRow'
import { Sheet } from '@/components/ui/Sheet'
import { safe, useDeleteVariant, useSaveSetup, useSaveVariant, useSetupVariants } from '@/data/queries'
import { changedKeys, formatField, unitLabel, type SetupField, type SetupValues } from '@/data/setup-fields'
import type { SetupVariant } from '@/data/types'
import { useFieldLabel, useUnitPrefs } from './SetupView'

/** Varianty setupu: zoznam, porovnanie s aktuálnym, použitie na motokáru. */
export function SetupVariants({
  kartId,
  current,
  fields,
  canEdit,
}: {
  kartId: string
  current: SetupValues
  fields: SetupField[]
  canEdit: boolean
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const label = useFieldLabel()
  const prefs = useUnitPrefs()
  const variants = useSetupVariants(kartId)
  const saveVariant = useSaveVariant(kartId)
  const deleteVariant = useDeleteVariant(kartId)
  const saveSetup = useSaveSetup(kartId)
  const [open, setOpen] = useState<SetupVariant | null>(null)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const diff = (v: SetupVariant) =>
    changedKeys(current, { ...current, ...v.values }).filter((k) => fields.some((f) => f.key === k))

  async function createFromCurrent() {
    const r = await safe(saveVariant.mutateAsync({ name: name.trim(), values: current }))
    if (r.ok) {
      setNaming(false)
      setName('')
    }
  }

  function apply(v: SetupVariant) {
    saveSetup.mutate({
      id: crypto.randomUUID(),
      kartId,
      values: { ...current, ...v.values },
      note: t('setup.history.applied', { name: v.name }),
      recordedAt: new Date().toISOString(),
    })
    setOpen(null)
  }

  async function remove() {
    if (!open) return
    const r = await safe(deleteVariant.mutateAsync(open.id))
    if (r.ok) {
      setConfirmDelete(false)
      setOpen(null)
    }
  }

  const openDiff = open ? diff(open) : []

  return (
    <>
      <p className="mb-5 max-w-[60ch] px-1 leading-relaxed text-ink-2">{t('setup.variants.intro')}</p>
      <ListGroup>
        {variants.data?.map((v) => {
          const n = diff(v).length
          return (
            <ListRow
              key={v.id}
              leading={
                <RowIcon tone="accent">
                  <Layers className="size-5" />
                </RowIcon>
              }
              title={v.name}
              subtitle={t('setup.variants.diff', { count: n })}
              onClick={() => setOpen(v)}
            />
          )
        })}
        {canEdit && (
          <ListRow
            leading={
              <RowIcon>
                <Plus className="size-5" />
              </RowIcon>
            }
            title={<span className="text-accent-ink">{t('setup.variants.saveCurrent')}</span>}
            chevron={false}
            onClick={() => setNaming(true)}
          />
        )}
        {!canEdit && variants.data?.length === 0 && <div className="p-5 text-center text-ink-3">{t('setup.variants.empty')}</div>}
      </ListGroup>

      {/* Nový variant z aktuálneho setupu */}
      <Sheet
        open={naming}
        onOpenChange={setNaming}
        title={t('setup.variants.saveCurrent')}
        footer={
          <Button block size="lg" disabled={!name.trim()} loading={saveVariant.isPending} onClick={() => void createFromCurrent()}>
            {t('common.save')}
          </Button>
        }
      >
        <Field
          label={t('setup.variants.name')}
          placeholder={t('setup.variants.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoFocus
        />
      </Sheet>

      {/* Detail variantu: rozdiely oproti aktuálnemu setupu */}
      <Sheet
        open={!!open && !confirmDelete}
        onOpenChange={(o) => !o && setOpen(null)}
        title={open?.name ?? ''}
        description={open ? t('setup.variants.diff', { count: openDiff.length }) : undefined}
        footer={
          canEdit && open ? (
            <div className="space-y-3">
              <Button block size="lg" icon={<Check className="size-5" />} disabled={openDiff.length === 0} onClick={() => apply(open)}>
                {t('setup.variants.apply')}
              </Button>
              <div className="flex gap-3">
                <Button
                  block
                  variant="secondary"
                  icon={<Pencil className="size-4" />}
                  onClick={() => void navigate({ to: '/setup/variants/$variantId', params: { variantId: open.id } })}
                >
                  {t('common.edit')}
                </Button>
                <Button block variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)}>
                  {t('setup.variants.delete')}
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        {open && openDiff.length > 0 && (
          <div className="overflow-hidden rounded-[16px] border border-line">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 bg-surface-2 px-4 py-2 eyebrow">
              <span />
              <span className="w-16 text-right">{t('setup.variants.current')}</span>
              <span className="w-16 text-right">{t('setup.variants.variant')}</span>
            </div>
            {openDiff.map((k) => {
              const f = fields.find((x) => x.key === k)!
              return (
                <div key={k} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-t border-line px-4 py-3">
                  <span className="text-ink-2">{label(f)}</span>
                  <span className="tnum w-16 text-right text-ink-3">{formatField(f, current[k] ?? null, prefs, i18n.language)}</span>
                  <span className="tnum w-16 text-right font-semibold">
                    {formatField(f, open.values[k] ?? null, prefs, i18n.language)}
                    <span className="ml-1 text-[0.8rem] font-normal text-ink-3">{unitLabel(f, prefs)}</span>
                  </span>
                </div>
              )
            })}
          </div>
        )}
        {canEdit && open && openDiff.length > 0 && (
          <p className="mt-4 text-[0.88rem] leading-relaxed text-ink-3">{t('setup.variants.applyHint')}</p>
        )}
      </Sheet>

      <ConfirmSheet
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('setup.variants.delete')}
        body={t('setup.variants.deleteConfirm', { name: open?.name ?? '' })}
        confirmLabel={t('setup.variants.delete')}
        loading={deleteVariant.isPending}
        onConfirm={() => void remove()}
      />
    </>
  )
}
