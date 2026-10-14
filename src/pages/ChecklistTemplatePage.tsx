import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Section } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { ListGroup, ListRow, RowIcon } from '@/components/ui/ListRow'
import { PageHeader } from '@/components/ui/PageHeader'
import { Sheet } from '@/components/ui/Sheet'
import { useChecklistItems, useDeleteChecklistItem, useSaveChecklistItem } from '@/data/events'
import { safe, useCan, useCurrentTeam } from '@/data/queries'
import type { ChecklistItem, ChecklistPhase } from '@/data/types'

const PHASES: ChecklistPhase[] = ['prep', 'pre_run', 'post_run']

/** Šablóna checklistu tímu (/team/checklist). */
export function ChecklistTemplatePage() {
  const { t } = useTranslation()
  const { team } = useCurrentTeam()
  const can = useCan()
  const items = useChecklistItems(team?.id)
  const save = useSaveChecklistItem(team?.id ?? '')
  const del = useDeleteChecklistItem(team?.id ?? '')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ChecklistItem | null>(null)
  const [phase, setPhase] = useState<ChecklistPhase>('prep')
  const [text, setText] = useState('')

  useEffect(() => {
    if (open) setText(editing?.text ?? '')
  }, [open, editing?.id])

  if (!team || !can('team.manage')) return null
  const list = items.data ?? []

  const openNew = (p: ChecklistPhase) => {
    setEditing(null)
    setPhase(p)
    setOpen(true)
  }

  async function submit() {
    const inPhase = list.filter((i) => i.phase === phase)
    const sortOrder = editing?.sortOrder ?? (inPhase.length ? Math.max(...inPhase.map((i) => i.sortOrder)) + 10 : 10)
    const r = await safe(save.mutateAsync({ id: editing?.id, phase: editing?.phase ?? phase, text: text.trim(), sortOrder }))
    if (r.ok) setOpen(false)
  }

  async function remove() {
    if (!editing) return
    const r = await safe(del.mutateAsync(editing.id))
    if (r.ok) setOpen(false)
  }

  return (
    <>
      <PageHeader back title={t('weekend.checklist.templateTitle')} />
      <p className="-mt-2 mb-8 max-w-[56ch] leading-relaxed text-ink-2">{t('weekend.checklist.templateIntro')}</p>

      <div className="space-y-8">
        {PHASES.map((p) => (
          <Section key={p} title={t(`weekend.checklist.phases.${p}`)}>
            <ListGroup>
              {list
                .filter((i) => i.phase === p)
                .map((i) => (
                  <ListRow
                    key={i.id}
                    title={i.text}
                    onClick={() => {
                      setEditing(i)
                      setOpen(true)
                    }}
                  />
                ))}
              <ListRow
                leading={
                  <RowIcon tone="accent">
                    <Plus className="size-5" />
                  </RowIcon>
                }
                title={<span className="text-accent-ink">{t('weekend.checklist.addItem')}</span>}
                chevron={false}
                onClick={() => openNew(p)}
              />
            </ListGroup>
          </Section>
        ))}
      </div>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={t(`weekend.checklist.phases.${editing?.phase ?? phase}`)}
        footer={
          <div className="space-y-3">
            <Button block size="lg" disabled={!text.trim()} loading={save.isPending} onClick={() => void submit()}>
              {t('common.save')}
            </Button>
            {editing && (
              <Button
                block
                variant="ghost"
                className="text-danger! hover:bg-danger/10!"
                icon={<Trash2 className="size-5" />}
                loading={del.isPending}
                onClick={() => void remove()}
              >
                {t('weekend.checklist.deleteItem')}
              </Button>
            )}
          </div>
        }
      >
        <Field
          label={t('weekend.checklist.addItem')}
          placeholder={t('weekend.checklist.itemPlaceholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={120}
          autoFocus
        />
      </Sheet>
    </>
  )
}
