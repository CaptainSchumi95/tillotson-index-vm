import { useEffect, useState } from 'react'
import { useNavigate, useParams, useRouter, useSearch } from '@tanstack/react-router'
import { Check, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SetupEditor } from '@/components/setup/SetupEditor'
import { SetupView, useFieldLabel, useUnitPrefs } from '@/components/setup/SetupView'
import { Button } from '@/components/ui/Button'
import { Card, Section } from '@/components/ui/Card'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { Field } from '@/components/ui/Field'
import { KartPlate } from '@/components/ui/Identity'
import { PageHeader } from '@/components/ui/PageHeader'
import { Sheet } from '@/components/ui/Sheet'
import { FullScreenLoader } from '@/components/ui/Spinner'
import { safe, useCan, useCurrentKart, useCurrentTeam, useSaveSetup, useSetupFields, useSetupRevisions } from '@/data/queries'
import { changedKeys, formatField, unitLabel, type SetupValues } from '@/data/setup-fields'
import { useDeleteTrackSetup, useSaveTrackSetup, useTrackSetups, useTracks } from '@/data/tracks'
import { relativeTime } from '@/lib/time'

/** Setup k trati – prehľad, rozdiel oproti motokáre a použitie (/tracks/$trackId/setups/$setupId). */
export function TrackSetupPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { trackId, setupId } = useParams({ strict: false }) as { trackId: string; setupId: string }
  const { team } = useCurrentTeam()
  const { kart } = useCurrentKart()
  const can = useCan()
  const tracks = useTracks(team?.id)
  const setups = useTrackSetups(team?.id)
  const fields = useSetupFields(team?.id)
  const revisions = useSetupRevisions(kart?.id)
  const saveSetup = useSaveSetup(kart?.id ?? '')
  const del = useDeleteTrackSetup(team?.id ?? '')
  const label = useFieldLabel()
  const prefs = useUnitPrefs()
  const [applying, setApplying] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (setups.isPending) return <FullScreenLoader />
  const track = tracks.data?.find((x) => x.id === trackId)
  const setup = setups.data?.find((s) => s.id === setupId)
  if (!team || !track || !setup) return null

  const current = revisions.data?.[0]?.values ?? {}
  const merged: SetupValues = { ...current, ...setup.values }
  const diff = kart && can('setup.view') ? changedKeys(current, merged).filter((k) => fields.some((f) => f.key === k)) : []
  const canApply = !!kart && can('track.apply') && can('setup.edit')

  function apply() {
    if (!kart || !track || !setup) return
    saveSetup.mutate({
      id: crypto.randomUUID(),
      kartId: kart.id,
      values: merged,
      note: t('tracks.applyNote', { track: track.name, name: setup.name }),
      recordedAt: new Date().toISOString(),
    })
    setApplying(false)
    void navigate({ to: '/setup' })
  }

  async function remove() {
    const r = await safe(del.mutateAsync(setup!.id))
    if (r.ok) void navigate({ to: '/tracks/$trackId', params: { trackId }, replace: true })
  }

  return (
    <>
      <PageHeader
        back
        eyebrow={track.name}
        title={setup.name}
        action={
          can('track.manage') && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Pencil className="size-4" />}
              onClick={() => void navigate({ to: '/tracks/$trackId/setups/$setupId/edit', params: { trackId, setupId } })}
            >
              {t('common.edit')}
            </Button>
          )
        }
      />
      <p className="-mt-3 mb-6 px-1 text-[0.9rem] text-ink-3">
        {t('tracks.updated', {
          name: setup.updatedBy?.name || t('setup.unknownAuthor'),
          when: relativeTime(setup.updatedAt, i18n.language, t('time.justNow')),
        })}
      </p>

      <div className="space-y-8">
        {/* Rozdiel oproti aktuálnemu setupu motokáry + použitie */}
        {kart && can('setup.view') && (
          <Card className="overflow-hidden">
            <div className="flex items-center gap-4 p-4 sm:p-5">
              <KartPlate number={kart.number} />
              <span className="min-w-0 flex-1 font-medium">
                {diff.length === 0
                  ? t('tracks.sameAsKart', { number: kart.number })
                  : t('tracks.diffKart', { count: diff.length, number: kart.number })}
              </span>
            </div>
            {canApply && diff.length > 0 && (
              <div className="border-t border-line p-3">
                <Button block size="lg" icon={<Check className="size-5" />} onClick={() => setApplying(true)}>
                  {t('tracks.apply', { number: kart.number })}
                </Button>
              </div>
            )}
          </Card>
        )}

        {setup.notes && (
          <Section title={t('tracks.notes')}>
            <Card className="p-4 leading-relaxed whitespace-pre-wrap">{setup.notes}</Card>
          </Section>
        )}

        <SetupView fields={fields} values={setup.values} />

        {can('track.manage') && (
          <Button
            variant="ghost"
            block
            className="text-danger! hover:bg-danger/10!"
            icon={<Trash2 className="size-5" />}
            onClick={() => setConfirmDelete(true)}
          >
            {t('tracks.deleteSetup')}
          </Button>
        )}
      </div>

      {/* Potvrdenie použitia s prehľadom zmien */}
      <Sheet
        open={applying}
        onOpenChange={setApplying}
        title={t('tracks.applyTitle', { number: kart?.number ?? '' })}
        description={t('tracks.applyHint')}
        footer={
          <Button block size="lg" icon={<Check className="size-5" />} onClick={apply}>
            {t('tracks.apply', { number: kart?.number ?? '' })}
          </Button>
        }
      >
        <div className="overflow-hidden rounded-[16px] border border-line">
          <div className="eyebrow grid grid-cols-[1fr_auto_auto] gap-x-4 bg-surface-2 px-4 py-2">
            <span />
            <span className="w-16 text-right">{t('setup.variants.current')}</span>
            <span className="w-16 text-right">{t('tracks.trackColumn')}</span>
          </div>
          {diff.map((k) => {
            const f = fields.find((x) => x.key === k)!
            return (
              <div key={k} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-t border-line px-4 py-3">
                <span className="text-ink-2">{label(f)}</span>
                <span className="tnum w-16 text-right text-ink-3">{formatField(f, current[k] ?? null, prefs, i18n.language)}</span>
                <span className="tnum w-16 text-right font-semibold">
                  {formatField(f, merged[k] ?? null, prefs, i18n.language)}
                  <span className="ml-1 text-[0.8rem] font-normal text-ink-3">{unitLabel(f, prefs)}</span>
                </span>
              </div>
            )
          })}
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('tracks.deleteSetup')}
        body={t('tracks.deleteSetupConfirm', { name: setup.name })}
        confirmLabel={t('tracks.deleteSetup')}
        loading={del.isPending}
        onConfirm={() => void remove()}
      />
    </>
  )
}

/** Nový setup k trati (/tracks/$trackId/setups/new?from=kart|blank) alebo úprava (…/$setupId/edit). */
export function TrackSetupEditPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const navigate = useNavigate()
  const { trackId, setupId } = useParams({ strict: false }) as { trackId: string; setupId?: string }
  const { from } = useSearch({ strict: false }) as { from?: 'kart' | 'blank' }
  const { team } = useCurrentTeam()
  const { kart } = useCurrentKart()
  const can = useCan()
  const tracks = useTracks(team?.id)
  const setups = useTrackSetups(team?.id)
  const fields = useSetupFields(team?.id)
  const revisions = useSetupRevisions(from === 'kart' ? kart?.id : undefined)
  const save = useSaveTrackSetup(team?.id ?? '')
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')

  const existing = setupId ? setups.data?.find((s) => s.id === setupId) : undefined
  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setNotes(existing.notes)
    }
  }, [existing?.id])

  const track = tracks.data?.find((x) => x.id === trackId)
  if (!team || !track || !can('track.manage')) return null
  if ((setupId && !existing) || (from === 'kart' && revisions.isPending)) return <FullScreenLoader />

  const initial: SetupValues = existing?.values ?? (from === 'kart' ? (revisions.data?.[0]?.values ?? {}) : {})

  async function submit(values: SetupValues) {
    const r = await safe(save.mutateAsync({ id: existing?.id, trackId, name: name.trim(), values, notes: notes.trim() }))
    if (!r.ok) return
    if (existing) router.history.back()
    else void navigate({ to: '/tracks/$trackId/setups/$setupId', params: { trackId, setupId: r.value }, replace: true })
  }

  return (
    <>
      <PageHeader back eyebrow={track.name} title={existing ? t('tracks.editSetup') : t('tracks.newSetup')} />
      <SetupEditor
        fields={fields}
        initial={initial}
        withNote={false}
        saving={save.isPending}
        saveLabel={t('common.save')}
        saveDisabled={!name.trim()}
        onSave={(values) => void submit(values)}
        header={
          <div className="space-y-5">
            <Field
              label={t('tracks.setupName')}
              placeholder={t('tracks.setupNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              autoFocus={!existing}
            />
            <Section title={t('tracks.notes')}>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
                placeholder={t('tracks.notesPlaceholder')}
                rows={2}
                className="w-full resize-none rounded-[14px] border border-line-strong bg-surface px-4 py-3 outline-none placeholder:text-ink-3 focus:border-accent"
              />
            </Section>
          </div>
        }
      />
    </>
  )
}
