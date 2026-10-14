import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useRouter, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Stepper } from '@/components/setup/Stepper'
import { CONDITION_ICON } from '@/components/weekend/SessionsTab'
import { Button } from '@/components/ui/Button'
import { Card, Section } from '@/components/ui/Card'
import { ChoiceChips } from '@/components/ui/ChoiceChips'
import { Field } from '@/components/ui/Field'
import { KartPlate } from '@/components/ui/Identity'
import { PageHeader } from '@/components/ui/PageHeader'
import { FullScreenLoader } from '@/components/ui/Spinner'
import { useEvents, useSchedule } from '@/data/events'
import { useCan, useCurrentTeam, useKarts, useSetupRevisions } from '@/data/queries'
import { useSaveSession, useSessions } from '@/data/sessions'
import type { Balance, TrackCondition } from '@/data/types'
import { cn } from '@/lib/cn'
import { formatLapTime, parseLapTime } from '@/lib/laptime'
import { nowTime, relativeTime, todayIso } from '@/lib/time'

const TEXTAREA =
  'w-full resize-none rounded-[14px] border border-line-strong bg-surface px-4 py-3 outline-none placeholder:text-ink-3 focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)]'

/** Zápis jazdy (/weekend/$eventId/sessions/new?kart=…) alebo úprava (…/$sessionId/edit). */
export function SessionEditPage() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const navigate = useNavigate()
  const { eventId, sessionId } = useParams({ strict: false }) as { eventId: string; sessionId?: string }
  const search = useSearch({ strict: false }) as { kart?: string }
  const { team } = useCurrentTeam()
  const can = useCan()
  const events = useEvents(team?.id)
  const karts = useKarts(team?.id)
  const schedule = useSchedule(eventId)
  const event = events.data?.find((e) => e.id === eventId)

  const kartId = search.kart
  const sessions = useSessions(kartId)
  const existing = sessionId ? sessions.data?.find((s) => s.id === sessionId) : undefined
  const revisions = useSetupRevisions(kartId)
  const save = useSaveSession(kartId ?? '')

  const [label, setLabel] = useState('')
  const [lapText, setLapText] = useState('')
  const [laps, setLaps] = useState<number | null>(null)
  const [condition, setCondition] = useState<TrackCondition | null>(null)
  const [conditionsNote, setConditionsNote] = useState('')
  const [balance, setBalance] = useState<Balance | null>(null)
  const [behaviour, setBehaviour] = useState('')
  const [feedback, setFeedback] = useState('')
  const [plan, setPlan] = useState('')
  const [loaded, setLoaded] = useState(false)

  const eventSessions = useMemo(() => (sessions.data ?? []).filter((s) => s.eventId === eventId), [sessions.data, eventId])

  // Predvyplnenie: pri úprave hodnoty jazdy, pri novej názov podľa programu a podmienky z minulej jazdy.
  useEffect(() => {
    // Čakáme na jazdy aj harmonogram – názov novej jazdy sa berie z programu.
    if (loaded || !sessions.data || (!sessionId && schedule.isPending)) return
    if (sessionId) {
      if (!existing) return
      setLabel(existing.label)
      setLapText(existing.bestLapMs != null ? formatLapTime(existing.bestLapMs, i18n.language) : '')
      setLaps(existing.laps)
      setCondition(existing.trackCondition)
      setConditionsNote(existing.conditionsNote)
      setBalance(existing.balance)
      setBehaviour(existing.behaviour)
      setFeedback(existing.driverFeedback)
      setPlan(existing.nextPlan)
    } else {
      const today = todayIso()
      const now = nowTime()
      const started = (schedule.data ?? []).filter((i) => i.day < today || (i.day === today && (i.time ?? '') <= now))
      setLabel(started.at(-1)?.title ?? `${t('weekend.session.title')} ${eventSessions.length + 1}`)
      setCondition(eventSessions[0]?.trackCondition ?? null)
    }
    setLoaded(true)
  }, [loaded, sessions.data, existing, sessionId, schedule.data, eventSessions, i18n.language, t])

  if (!team || !can('session.edit')) return null
  if (!event || !loaded) return <FullScreenLoader />

  const kart = karts.data?.find((k) => k.id === kartId)
  const lapMs = parseLapTime(lapText)
  const lapInvalid = lapText.trim() !== '' && lapMs == null
  const currentSetup = revisions.data?.[0]

  function submit() {
    if (!kartId || lapInvalid) return
    const id = existing?.id ?? crypto.randomUUID()
    save.mutate({
      id,
      eventId,
      kartId,
      label: label.trim(),
      bestLapMs: lapMs,
      laps,
      trackCondition: condition,
      conditionsNote: conditionsNote.trim(),
      balance,
      behaviour: behaviour.trim(),
      driverFeedback: feedback.trim(),
      nextPlan: plan.trim(),
      // Pri úprave ostane setup z času jazdy, pri novej sa uloží aktuálny.
      setupRevisionId: existing ? existing.setupRevisionId : (currentSetup?.id ?? null),
      recordedAt: existing?.recordedAt ?? new Date().toISOString(),
    })
    if (existing) router.history.back()
    else
      void navigate({
        to: '/weekend/$eventId/sessions/$sessionId',
        params: { eventId, sessionId: id },
        search: { kart: kartId },
        replace: true,
      })
  }

  return (
    <>
      <PageHeader
        back
        title={existing ? t('weekend.session.edit') : t('weekend.session.add')}
        action={kart && <KartPlate number={kart.number} />}
      />

      <div className="space-y-8 pb-28 lg:pb-0">
        {/* Najdôležitejšie hore: čas a kolá */}
        <Card className="space-y-5 p-5">
          <div className="space-y-1.5">
            <label htmlFor="best-lap" className="block px-1 text-[0.88rem] font-semibold text-ink-2">
              {t('weekend.session.bestLap')}
            </label>
            <input
              id="best-lap"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={lapText}
              onChange={(e) => setLapText(e.target.value)}
              placeholder={t('weekend.session.bestLapPlaceholder')}
              className={cn(
                'display tnum h-[72px] w-full rounded-[16px] border bg-surface px-5 text-[2.2rem] outline-none placeholder:text-ink-3/40',
                lapInvalid ? 'border-danger' : 'border-line-strong focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)]',
              )}
            />
            <p className={cn('px-1 text-[0.85rem]', lapInvalid ? 'text-danger' : 'text-ink-3')}>
              {lapInvalid ? t('weekend.session.bestLapInvalid') : t('weekend.session.bestLapHint')}
            </p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium text-ink-2">{t('weekend.session.laps')}</span>
            <Stepper label={t('weekend.session.laps')} value={laps} onChange={setLaps} step={1} decimals={[0, 0]} />
          </div>
        </Card>

        <Field
          label={t('weekend.session.label')}
          placeholder={t('weekend.session.labelPlaceholder')}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={80}
        />

        <Section title={t('weekend.session.conditions')}>
          <ChoiceChips<TrackCondition>
            value={condition}
            onChange={setCondition}
            options={(['dry', 'damp', 'wet'] as const).map((c) => {
              const Icon = CONDITION_ICON[c]
              return { value: c, label: t(`weekend.session.condition.${c}`), icon: <Icon className="size-5" /> }
            })}
          />
          <input
            type="text"
            value={conditionsNote}
            onChange={(e) => setConditionsNote(e.target.value.slice(0, 500))}
            placeholder={t('weekend.session.conditionsNotePlaceholder')}
            className="h-[52px] w-full rounded-[14px] border border-line-strong bg-surface px-4 outline-none placeholder:text-ink-3 focus:border-accent"
          />
        </Section>

        <Section title={t('weekend.session.balance')}>
          <ChoiceChips<Balance>
            value={balance}
            onChange={setBalance}
            options={(['understeer', 'neutral', 'oversteer'] as const).map((b) => ({
              value: b,
              label: t(`weekend.session.balanceOf.${b}`),
            }))}
          />
          <textarea
            value={behaviour}
            onChange={(e) => setBehaviour(e.target.value.slice(0, 2000))}
            placeholder={t('weekend.session.behaviourPlaceholder')}
            rows={2}
            className={TEXTAREA}
          />
        </Section>

        <Section title={t('weekend.session.feedback')}>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value.slice(0, 2000))}
            placeholder={t('weekend.session.feedbackPlaceholder')}
            rows={3}
            className={TEXTAREA}
          />
        </Section>

        <Section title={t('weekend.session.plan')}>
          <textarea
            value={plan}
            onChange={(e) => setPlan(e.target.value.slice(0, 2000))}
            placeholder={t('weekend.session.planPlaceholder')}
            rows={2}
            className={TEXTAREA}
          />
        </Section>

        {!existing && can('setup.view') && (
          <Section title={t('weekend.session.setupUsed')}>
            <Card className="p-4 text-[0.92rem] text-ink-2">
              {currentSetup ? (
                <>
                  <span className="font-semibold text-ink">
                    {t('setup.lastChange', {
                      name: currentSetup.author?.name || t('setup.unknownAuthor'),
                      when: relativeTime(currentSetup.recordedAt, i18n.language, t('time.justNow')),
                    })}
                  </span>
                  <span className="mt-1 block text-ink-3">{t('weekend.session.setupUsedHint')}</span>
                </>
              ) : (
                t('weekend.session.noSetup')
              )}
            </Card>
          </Section>
        )}

        <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface/92 px-4 py-3 backdrop-blur-xl lg:sticky lg:bottom-6 lg:rounded-[22px] lg:border lg:p-3 lg:shadow-float">
          <div className="mx-auto max-w-[880px]">
            <Button block size="lg" disabled={lapInvalid || !kartId} onClick={submit}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
