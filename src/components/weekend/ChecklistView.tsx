import { useState } from 'react'
import { Check, ListChecks, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Card, Section } from '@/components/ui/Card'
import { ListGroup, ListRow, RowIcon } from '@/components/ui/ListRow'
import { Sheet } from '@/components/ui/Sheet'
import { useChecklistItems, useChecks, useSetRound, useToggleCheck } from '@/data/events'
import type { ChecklistCheck, ChecklistItem, ChecklistPhase, TeamEvent } from '@/data/types'
import { cn } from '@/lib/cn'
import { relativeTime } from '@/lib/time'

const PHASES: ChecklistPhase[] = ['prep', 'pre_run', 'post_run']

/** Postup checklistu pre motokáru (Príprava + aktuálna jazda) – aj pre Domov. */
export function useChecklistProgress(teamId: string | undefined, event: TeamEvent | null, kartId: string | undefined) {
  const items = useChecklistItems(teamId)
  const checks = useChecks(event?.id, kartId)
  const round = event?.karts.find((k) => k.kartId === kartId)?.round ?? 1
  const list = items.data ?? []
  const isDone = (item: ChecklistItem) => {
    const r = item.phase === 'prep' ? 0 : round
    return (checks.data ?? []).some((c) => c.itemId === item.id && c.round === r)
  }
  return { total: list.length, done: list.filter(isDone).length, round, items: list, checks: checks.data ?? [], isDone }
}

export function ChecklistView({
  teamId,
  event,
  kartId,
  canEdit,
  canManageTemplate,
}: {
  teamId: string
  event: TeamEvent
  kartId: string
  canEdit: boolean
  canManageTemplate: boolean
}) {
  const { t, i18n } = useTranslation()
  const toggle = useToggleCheck()
  const setRound = useSetRound()
  const progress = useChecklistProgress(teamId, event, kartId)
  const [confirmRound, setConfirmRound] = useState(false)
  const { round } = progress

  const checkOf = (item: ChecklistItem): ChecklistCheck | undefined => {
    const r = item.phase === 'prep' ? 0 : round
    return progress.checks.find((c) => c.itemId === item.id && c.round === r)
  }

  return (
    <div className="space-y-8">
      {PHASES.map((phase) => {
        const list = progress.items.filter((i) => i.phase === phase)
        if (list.length === 0) return null
        const done = list.filter((i) => !!checkOf(i)).length
        const complete = done === list.length
        return (
          <Section
            key={phase}
            title={
              <span className="flex items-center gap-2">
                {t(`weekend.checklist.phases.${phase}`)}
                {phase !== 'prep' && (
                  <span className="rounded-full bg-sunken px-2 py-0.5 text-[0.68rem] text-ink-2">
                    {t('weekend.checklist.round', { round })}
                  </span>
                )}
              </span>
            }
            action={
              <span className={cn('display tnum text-[0.95rem]', complete ? 'text-success' : 'text-ink-3')}>
                {done}/{list.length}
              </span>
            }
          >
            <Card className="divide-y divide-line overflow-hidden">
              {list.map((item) => {
                const check = checkOf(item)
                const r = item.phase === 'prep' ? 0 : round
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => toggle.mutate({ eventId: event.id, kartId, itemId: item.id, round: r, done: !check })}
                    className={cn(
                      'flex min-h-[64px] w-full items-center gap-4 px-4 py-3 text-left transition-colors',
                      canEdit && 'hover:bg-surface-2 active:bg-sunken',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-8 shrink-0 place-items-center rounded-[10px] border-2 transition-all duration-200',
                        check ? 'scale-100 border-success bg-success text-white' : 'border-line-strong bg-surface',
                      )}
                    >
                      {check && <Check className="size-5" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block font-medium', check && 'text-ink-3 line-through decoration-ink-3/40')}>
                        {item.text}
                      </span>
                      {check && (
                        <span className="block text-[0.82rem] text-ink-3">
                          {t('weekend.checklist.by', {
                            name: check.doneBy?.name ?? t('setup.unknownAuthor'),
                            when: relativeTime(check.doneAt, i18n.language, t('time.justNow')),
                          })}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </Card>
          </Section>
        )
      })}

      {canEdit && (
        <Button variant="secondary" block size="lg" icon={<RotateCcw className="size-5" />} onClick={() => setConfirmRound(true)}>
          {t('weekend.checklist.nextRound')}
        </Button>
      )}
      {!canEdit && <p className="px-1 text-[0.9rem] text-ink-3">{t('weekend.checklist.readOnly')}</p>}

      {canManageTemplate && (
        <ListGroup>
          <ListRow
            leading={
              <RowIcon>
                <ListChecks className="size-5" />
              </RowIcon>
            }
            title={t('weekend.checklist.template')}
            to="/team/checklist"
          />
        </ListGroup>
      )}

      <Sheet
        open={confirmRound}
        onOpenChange={setConfirmRound}
        title={`${t('weekend.checklist.nextRound')} → ${t('weekend.checklist.round', { round: round + 1 })}`}
        description={t('weekend.checklist.nextRoundHint')}
        footer={
          <Button
            block
            size="lg"
            icon={<RotateCcw className="size-5" />}
            onClick={() => {
              setRound.mutate({ teamId, eventId: event.id, kartId, round: round + 1 })
              setConfirmRound(false)
            }}
          >
            {t('weekend.checklist.nextRound')}
          </Button>
        }
      >
        <div />
      </Sheet>
    </div>
  )
}
