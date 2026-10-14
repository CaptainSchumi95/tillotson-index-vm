import { useEffect, useState } from 'react'
import { useNavigate, useParams, useRouter } from '@tanstack/react-router'
import { Flag, Timer, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { KartMultiSelect } from '@/components/team/pickers'
import { Button } from '@/components/ui/Button'
import { Section } from '@/components/ui/Card'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { Field } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { useDeleteEvent, useEvents, useSaveEvent } from '@/data/events'
import { safe, useCan, useCurrentKart, useCurrentTeam, useKarts } from '@/data/queries'
import type { EventKind } from '@/data/types'
import { cn } from '@/lib/cn'
import { todayIso } from '@/lib/time'

const inputCls =
  'h-[52px] w-full rounded-[14px] border border-line-strong bg-surface px-4 outline-none focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)]'

/** Nová udalosť (/weekend/new) alebo úprava (/weekend/$eventId/edit). */
export function EventEditPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const navigate = useNavigate()
  const { eventId } = useParams({ strict: false }) as { eventId?: string }
  const { team } = useCurrentTeam()
  const { kart } = useCurrentKart()
  const karts = useKarts(team?.id)
  const events = useEvents(team?.id)
  const save = useSaveEvent(team?.id ?? '')
  const del = useDeleteEvent(team?.id ?? '')
  const can = useCan()
  const existing = eventId ? events.data?.find((e) => e.id === eventId) : undefined

  const [kind, setKind] = useState<EventKind>('race')
  const [name, setName] = useState('')
  const [from, setFrom] = useState(todayIso())
  const [to, setTo] = useState(todayIso())
  const [track, setTrack] = useState('')
  const [notes, setNotes] = useState('')
  const [kartIds, setKartIds] = useState<string[]>(kart ? [kart.id] : [])
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (existing) {
      setKind(existing.kind)
      setName(existing.name)
      setFrom(existing.dateFrom)
      setTo(existing.dateTo)
      setTrack(existing.trackName)
      setNotes(existing.notes)
      setKartIds(existing.karts.map((k) => k.kartId))
    }
  }, [existing?.id])

  if (!team || !can('event.manage') || (eventId && !existing)) return null

  const valid = name.trim().length > 0 && from && to && to >= from

  async function submit() {
    const r = await safe(
      save.mutateAsync({
        id: existing?.id,
        kind,
        name: name.trim(),
        dateFrom: from,
        dateTo: to,
        trackName: track.trim(),
        notes: notes.trim(),
        kartIds,
      }),
    )
    if (!r.ok) return
    if (existing) router.history.back()
    else void navigate({ to: '/weekend/$eventId', params: { eventId: r.value }, replace: true })
  }

  async function remove() {
    if (!existing) return
    const r = await safe(del.mutateAsync(existing.id))
    if (r.ok) void navigate({ to: '/weekend', replace: true })
  }

  const kindBtn = (k: EventKind, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setKind(k)}
      aria-pressed={kind === k}
      className={cn(
        'flex h-20 flex-1 flex-col items-center justify-center gap-1.5 rounded-[18px] border font-semibold transition-colors',
        kind === k ? 'border-accent bg-accent-soft text-accent-ink shadow-[0_0_0_1px_var(--accent)]' : 'border-line-strong bg-surface text-ink-2',
      )}
    >
      {icon}
      {t(`weekend.kind.${k}`)}
    </button>
  )

  return (
    <>
      <PageHeader back title={existing ? t('weekend.edit') : t('weekend.new')} />

      <div className="space-y-8 pb-6">
        <div className="flex gap-3">
          {kindBtn('race', <Flag className="size-6" />)}
          {kindBtn('test', <Timer className="size-6" />)}
        </div>

        <Field
          label={t('weekend.name')}
          placeholder={t(`weekend.namePlaceholder.${kind}`)}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
        />

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="block px-1 text-[0.88rem] font-semibold text-ink-2">{t('weekend.dateFrom')}</span>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value)
                if (e.target.value > to) setTo(e.target.value)
              }}
              className={inputCls}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="block px-1 text-[0.88rem] font-semibold text-ink-2">{t('weekend.dateTo')}</span>
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={inputCls} />
          </label>
        </div>

        <Field
          label={t('weekend.track')}
          placeholder={t('weekend.trackPlaceholder')}
          value={track}
          onChange={(e) => setTrack(e.target.value)}
          maxLength={80}
        />

        <Section title={t('weekend.karts')}>
          {karts.data && <KartMultiSelect karts={karts.data} value={kartIds} onChange={setKartIds} />}
          <p className="px-1 text-[0.85rem] text-ink-3">{t('weekend.kartsHint')}</p>
        </Section>

        <Section title={t('weekend.notes')}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 4000))}
            placeholder={t('weekend.notesPlaceholder')}
            rows={3}
            className="w-full resize-none rounded-[14px] border border-line-strong bg-surface px-4 py-3 outline-none placeholder:text-ink-3 focus:border-accent"
          />
        </Section>

        {save.isError && <p className="text-danger">{t('common.error')}</p>}

        <div className="space-y-3">
          <Button block size="lg" disabled={!valid} loading={save.isPending} onClick={() => void submit()}>
            {t('common.save')}
          </Button>
          {existing && (
            <Button
              block
              variant="ghost"
              className="text-danger! hover:bg-danger/10!"
              icon={<Trash2 className="size-5" />}
              onClick={() => setConfirm(true)}
            >
              {t('weekend.delete')}
            </Button>
          )}
        </div>
      </div>

      <ConfirmSheet
        open={confirm}
        onOpenChange={setConfirm}
        title={t('weekend.delete')}
        body={t('weekend.deleteConfirm', { name: existing?.name ?? '' })}
        confirmLabel={t('weekend.delete')}
        loading={del.isPending}
        onConfirm={() => void remove()}
      />
    </>
  )
}
