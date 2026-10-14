import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { BookmarkPlus, Info, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFieldLabel, useUnitPrefs } from '@/components/setup/SetupView'
import { CONDITION_ICON, DeltaBadge, lapDelta } from '@/components/weekend/SessionsTab'
import { Button } from '@/components/ui/Button'
import { Badge, Card, Section } from '@/components/ui/Card'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { Field } from '@/components/ui/Field'
import { Sheet } from '@/components/ui/Sheet'
import { KartPlate } from '@/components/ui/Identity'
import { PageHeader } from '@/components/ui/PageHeader'
import { FullScreenLoader } from '@/components/ui/Spinner'
import { useEvents } from '@/data/events'
import { safe, useCan, useCurrentTeam, useKarts, useSetupFields, useSetupRevisions } from '@/data/queries'
import { useSaveTrackSetup } from '@/data/tracks'
import { previousSession, useDeleteSession, useSessionFeedback, useSessions } from '@/data/sessions'
import { changedKeys, formatField, unitLabel } from '@/data/setup-fields'
import { formatLapTime } from '@/lib/laptime'
import { dateTime } from '@/lib/time'

/** Detail jazdy a porovnanie s predchádzajúcou (/weekend/$eventId/sessions/$sessionId?kart=…). */
export function SessionPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { eventId, sessionId } = useParams({ strict: false }) as { eventId: string; sessionId: string }
  const { kart: kartId } = useSearch({ strict: false }) as { kart?: string }
  const { team } = useCurrentTeam()
  const can = useCan()
  const events = useEvents(team?.id)
  const karts = useKarts(team?.id)
  const sessions = useSessions(kartId)
  const revisions = useSetupRevisions(kartId)
  const fields = useSetupFields(team?.id)
  const label = useFieldLabel()
  const prefs = useUnitPrefs()
  const del = useDeleteSession(kartId ?? '')
  const saveFeedback = useSessionFeedback(kartId ?? '')
  const [confirm, setConfirm] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)
  const [setupName, setSetupName] = useState('')
  const saveToTrack = useSaveTrackSetup(team?.id ?? '')

  const session = sessions.data?.find((s) => s.id === sessionId)
  useEffect(() => {
    if (session) setFeedback(session.driverFeedback)
  }, [session?.id, session?.driverFeedback])

  if (sessions.isPending) return <FullScreenLoader />
  if (!session || !kartId) return null

  const event = events.data?.find((e) => e.id === eventId)
  const kart = karts.data?.find((k) => k.id === kartId)
  const prev = previousSession(sessions.data, session)
  const delta = lapDelta(session, prev)
  const canEdit = can('session.edit')
  // Jazdec bez práva upravovať jazdu smie meniť iba svoju spätnú väzbu.
  const feedbackOnly = !canEdit && can('session.feedback')
  const CondIcon = session.trackCondition ? CONDITION_ICON[session.trackCondition] : null

  // Setup v jazde vs. v predchádzajúcej (iba pre toho, kto setup vidí).
  const revOf = (id: string | null) => (id ? revisions.data?.find((r) => r.id === id) : undefined)
  const thisSetup = revOf(session.setupRevisionId)
  const prevSetup = prev ? revOf(prev.setupRevisionId) : undefined
  const setupDiff =
    can('setup.view') && thisSetup && prevSetup
      ? changedKeys(prevSetup.values, thisSetup.values)
          .map((k) => fields.find((f) => f.key === k))
          .filter((f) => !!f)
      : null

  return (
    <>
      <PageHeader
        back
        eyebrow={event?.name}
        title={session.label || t('weekend.session.title')}
        action={
          canEdit && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Pencil className="size-4" />}
              onClick={() =>
                void navigate({
                  to: '/weekend/$eventId/sessions/$sessionId/edit',
                  params: { eventId, sessionId },
                  search: { kart: kartId },
                })
              }
            >
              {t('common.edit')}
            </Button>
          )
        }
      />

      <div className="space-y-8">
        {/* Výsledok */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="eyebrow mb-2">{t('weekend.session.bestLap')}</div>
              <div className="display tnum text-[3rem] leading-none">{formatLapTime(session.bestLapMs, i18n.language)}</div>
              {delta != null && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <DeltaBadge delta={delta} size="lg" />
                  <span className="text-[0.9rem] text-ink-3">
                    {delta < 0 ? t('weekend.session.faster') : delta > 0 ? t('weekend.session.slower') : t('weekend.session.same')}
                    {prev?.label ? ` · ${t('weekend.session.previous', { label: prev.label })}` : ''}
                  </span>
                </div>
              )}
            </div>
            {kart && <KartPlate number={kart.number} size="lg" />}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {session.laps != null && <Badge>{t('weekend.session.lapsShort', { count: session.laps })}</Badge>}
            {session.trackCondition && (
              <Badge>
                {CondIcon && <CondIcon className="mr-1 size-3.5" />}
                {t(`weekend.session.condition.${session.trackCondition}`)}
              </Badge>
            )}
            {session.balance && <Badge tone="accent">{t(`weekend.session.balanceOf.${session.balance}`)}</Badge>}
            {session.pending && <Badge tone="accent">{t('setup.pending')}</Badge>}
          </div>
          <div className="mt-4 text-[0.85rem] text-ink-3">
            {[dateTime(session.recordedAt, i18n.language), session.author?.name].filter(Boolean).join(' · ')}
            {session.conditionsNote && ` · ${session.conditionsNote}`}
          </div>
        </Card>

        {session.behaviour && <TextBlock title={t('weekend.session.behaviour')}>{session.behaviour}</TextBlock>}

        {feedbackOnly ? (
          <Section title={t('weekend.session.feedback')}>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value.slice(0, 2000))}
              placeholder={t('weekend.session.feedbackPlaceholder')}
              rows={3}
              className="w-full resize-none rounded-[14px] border border-line-strong bg-surface px-4 py-3 outline-none placeholder:text-ink-3 focus:border-accent"
            />
            <Button
              disabled={feedback.trim() === session.driverFeedback}
              loading={saveFeedback.isPending}
              onClick={() => saveFeedback.mutate({ id: session.id, text: feedback.trim() })}
            >
              {t('weekend.session.saveFeedback')}
            </Button>
          </Section>
        ) : (
          session.driverFeedback && <TextBlock title={t('weekend.session.feedback')}>{session.driverFeedback}</TextBlock>
        )}

        {session.nextPlan && <TextBlock title={t('weekend.session.plan')}>{session.nextPlan}</TextBlock>}

        {/* Porovnanie s predchádzajúcou jazdou */}
        <Section title={t('weekend.session.compare')}>
          {!prev ? (
            <Card className="p-5 text-ink-3">{t('weekend.session.compareFirst')}</Card>
          ) : (
            <Card className="divide-y divide-line">
              <CompareRow
                label={t('weekend.session.bestLap')}
                from={formatLapTime(prev.bestLapMs, i18n.language)}
                to={formatLapTime(session.bestLapMs, i18n.language)}
                extra={<DeltaBadge delta={delta} />}
              />
              {prev.trackCondition !== session.trackCondition && (
                <CompareRow
                  label={t('weekend.session.conditions')}
                  from={prev.trackCondition ? t(`weekend.session.condition.${prev.trackCondition}`) : '—'}
                  to={session.trackCondition ? t(`weekend.session.condition.${session.trackCondition}`) : '—'}
                />
              )}
              {prev.balance !== session.balance && (
                <CompareRow
                  label={t('weekend.session.balance')}
                  from={prev.balance ? t(`weekend.session.balanceOf.${prev.balance}`) : '—'}
                  to={session.balance ? t(`weekend.session.balanceOf.${session.balance}`) : '—'}
                />
              )}
              {setupDiff && (
                <div className="px-4 py-3.5">
                  <div className="eyebrow mb-2">{t('weekend.session.setupChanges')}</div>
                  {setupDiff.length === 0 ? (
                    <div className="text-ink-3">{t('weekend.session.noSetupChanges')}</div>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {setupDiff.map((f) => (
                        <li key={f.key} className="rounded-[10px] bg-surface-2 px-3 py-1.5 text-[0.88rem]">
                          <span className="text-ink-3">{label(f)} </span>
                          <span className="tnum text-ink-3 line-through decoration-ink-3/50">
                            {formatField(f, prevSetup!.values[f.key] ?? null, prefs, i18n.language)}
                          </span>
                          <span className="text-ink-3"> → </span>
                          <span className="tnum font-semibold">
                            {formatField(f, thisSetup!.values[f.key] ?? null, prefs, i18n.language)} {unitLabel(f, prefs)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div className="flex gap-3 px-4 py-3.5 text-[0.88rem] leading-relaxed text-ink-3">
                <Info className="mt-0.5 size-4 shrink-0" />
                {t('weekend.session.caveat')}
              </div>
            </Card>
          )}
        </Section>

        {/* Úspešné nastavenie → knižnica trate udalosti */}
        {event?.trackId && thisSetup && can('track.manage') && (
          <Button
            block
            variant="secondary"
            size="lg"
            icon={<BookmarkPlus className="size-5" />}
            onClick={() => {
              setSetupName(`${session.label || t('weekend.session.title')} · ${formatLapTime(session.bestLapMs, i18n.language)}`)
              setSaving(true)
            }}
          >
            {t('tracks.saveFromSession')}
          </Button>
        )}

        {canEdit && (
          <Button
            block
            variant="ghost"
            className="text-danger! hover:bg-danger/10!"
            icon={<Trash2 className="size-5" />}
            onClick={() => setConfirm(true)}
          >
            {t('weekend.session.delete')}
          </Button>
        )}
      </div>

      <Sheet
        open={saving}
        onOpenChange={setSaving}
        title={t('tracks.saveFromSession')}
        description={event?.trackName}
        footer={
          <Button
            block
            size="lg"
            disabled={!setupName.trim()}
            loading={saveToTrack.isPending}
            onClick={async () => {
              if (!event?.trackId || !thisSetup) return
              const r = await safe(
                saveToTrack.mutateAsync({
                  trackId: event.trackId,
                  name: setupName.trim().slice(0, 60),
                  values: thisSetup.values,
                  notes: [session.driverFeedback, session.behaviour].filter(Boolean).join('\n'),
                }),
              )
              if (!r.ok) return
              setSaving(false)
              void navigate({ to: '/tracks/$trackId/setups/$setupId', params: { trackId: event.trackId, setupId: r.value } })
            }}
          >
            {t('common.save')}
          </Button>
        }
      >
        <Field
          label={t('tracks.setupName')}
          value={setupName}
          onChange={(e) => setSetupName(e.target.value)}
          maxLength={60}
        />
      </Sheet>

      <ConfirmSheet
        open={confirm}
        onOpenChange={setConfirm}
        title={t('weekend.session.delete')}
        body={t('weekend.session.deleteConfirm')}
        confirmLabel={t('weekend.session.delete')}
        onConfirm={() => {
          del.mutate(session.id)
          setConfirm(false)
          void navigate({ to: '/weekend/$eventId', params: { eventId }, search: { tab: 'sessions' }, replace: true })
        }}
      />
    </>
  )
}

function TextBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Section title={title}>
      <Card className="p-4 leading-relaxed whitespace-pre-wrap">{children}</Card>
    </Section>
  )
}

function CompareRow({ label, from, to, extra }: { label: string; from: string; to: string; extra?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3.5">
      <span className="text-ink-2">{label}</span>
      <span className="flex items-center gap-2">
        <span className="tnum text-ink-3 line-through decoration-ink-3/40">{from}</span>
        <span className="text-ink-3">→</span>
        <span className="tnum font-semibold">{to}</span>
        {extra}
      </span>
    </div>
  )
}
