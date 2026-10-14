import { useEffect, useState } from 'react'
import { CalendarClock, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Card, Section } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { PickerField } from '@/components/ui/PickerField'
import { Sheet } from '@/components/ui/Sheet'
import { nextScheduleItem, useDeleteScheduleItem, useSaveScheduleItem, useSchedule } from '@/data/events'
import { safe } from '@/data/queries'
import type { ScheduleItem, TeamEvent } from '@/data/types'
import { cn } from '@/lib/cn'
import { daysBetween, nowTime, todayIso, weekdayDate } from '@/lib/time'

/** Harmonogram po dňoch. Najbližší bod dnešného programu je zvýraznený. */
export function ScheduleView({ event, canManage }: { event: TeamEvent; canManage: boolean }) {
  const { t, i18n } = useTranslation()
  const schedule = useSchedule(event.id)
  const save = useSaveScheduleItem(event.id)
  const del = useDeleteScheduleItem(event.id)
  const days = daysBetween(event.dateFrom, event.dateTo)
  const [editing, setEditing] = useState<ScheduleItem | null>(null)
  const [open, setOpen] = useState(false)
  const [day, setDay] = useState(days[0])
  const [time, setTime] = useState('')
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (open) {
      setDay(editing?.day ?? (days.includes(todayIso()) ? todayIso() : days[0]))
      setTime(editing?.time ?? '')
      setTitle(editing?.title ?? '')
    }
  }, [open, editing?.id])

  const items = schedule.data ?? []
  const today = todayIso()
  const now = nowTime()
  // Ďalší bod: prvý, ktorý ešte nezačal (počas udalosti).
  const next = today >= event.dateFrom && today <= event.dateTo ? nextScheduleItem(items, today, now) : undefined

  async function submit() {
    const r = await safe(save.mutateAsync({ id: editing?.id, day, time: time || null, title: title.trim() }))
    if (r.ok) setOpen(false)
  }

  async function remove() {
    if (!editing) return
    const r = await safe(del.mutateAsync(editing.id))
    if (r.ok) setOpen(false)
  }

  const openItem = (item: ScheduleItem | null) => {
    setEditing(item)
    setOpen(true)
  }

  return (
    <div className="space-y-8">
      {items.length === 0 && (
        <Card className="flex items-center gap-4 p-5 text-ink-3">
          <CalendarClock className="size-6 shrink-0" />
          <span>{event.kind === 'test' ? t('weekend.schedule.emptyTest') : t('weekend.schedule.empty')}</span>
        </Card>
      )}

      {days.map((d) => {
        const list = items.filter((i) => i.day === d)
        if (list.length === 0) return null
        return (
          <Section key={d} title={weekdayDate(d, i18n.language)}>
            <Card className="divide-y divide-line">
              {list.map((item) => {
                const isNext = item.id === next?.id
                const past = d < today || (d === today && !!item.time && item.time < now && !isNext)
                const Row = canManage ? 'button' : 'div'
                return (
                  <Row
                    key={item.id}
                    type={canManage ? 'button' : undefined}
                    onClick={canManage ? () => openItem(item) : undefined}
                    className={cn(
                      'relative flex min-h-[60px] w-full items-center gap-4 px-4 py-3 text-left',
                      canManage && 'transition-colors hover:bg-surface-2',
                      isNext && 'bg-accent-soft',
                    )}
                  >
                    {isNext && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-accent" />}
                    <span className={cn('display tnum w-14 shrink-0 text-[1.1rem]', past && 'text-ink-3')}>
                      {item.time ?? '—'}
                    </span>
                    <span className={cn('min-w-0 flex-1 font-medium', past && 'text-ink-3')}>{item.title}</span>
                    {isNext && (
                      <span className="rounded-full bg-accent px-2.5 py-0.5 text-[0.72rem] font-bold tracking-wide text-on-accent uppercase">
                        {t('weekend.schedule.next')}
                      </span>
                    )}
                  </Row>
                )
              })}
            </Card>
          </Section>
        )
      })}

      {canManage && (
        <Button variant="secondary" block icon={<Plus className="size-5" />} onClick={() => openItem(null)}>
          {t('weekend.schedule.add')}
        </Button>
      )}

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={editing ? t('weekend.schedule.edit') : t('weekend.schedule.add')}
        footer={
          <div className="space-y-3">
            <Button block size="lg" disabled={!title.trim()} loading={save.isPending} onClick={() => void submit()}>
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
                {t('weekend.schedule.delete')}
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-6">
          {days.length > 1 && (
            <Section title={t('weekend.schedule.day')}>
              <div className="flex flex-wrap gap-2">
                {days.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDay(d)}
                    className={cn(
                      'h-11 rounded-[12px] border px-4 font-medium transition-colors first-letter:uppercase',
                      day === d ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line-strong bg-surface text-ink-2',
                    )}
                  >
                    {weekdayDate(d, i18n.language)}
                  </button>
                ))}
              </div>
            </Section>
          )}
          <PickerField type="time" label={t('weekend.schedule.time')} value={time} onChange={(e) => setTime(e.target.value)} />
          <Field
            label={t('weekend.schedule.title')}
            placeholder={t('weekend.schedule.titlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
          />
        </div>
      </Sheet>
    </div>
  )
}
