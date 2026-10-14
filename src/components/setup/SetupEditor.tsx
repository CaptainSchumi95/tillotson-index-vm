import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Card, Section } from '@/components/ui/Card'
import {
  changedKeys,
  displayDecimals,
  displayStep,
  formatField,
  fromDisplay,
  gearRatio,
  GROUP_ORDER,
  TIRE_KEYS,
  toDisplay,
  unitLabel,
  type SetupField,
  type SetupValues,
} from '@/data/setup-fields'
import { cn } from '@/lib/cn'
import { PressureGrid, useFieldLabel, useUnitPrefs } from './SetupView'
import { Stepper } from './Stepper'

/**
 * Úprava setupu (aj variantu). Zmenené položky sú zvýraznené a ukazujú pôvodnú hodnotu.
 * Tlačidlo uloženia je prilepené dole, aby bolo vždy po ruke.
 */
export function SetupEditor({
  fields,
  initial,
  onSave,
  saving,
  withNote = true,
  header,
  saveLabel,
  saveDisabled,
}: {
  fields: SetupField[]
  initial: SetupValues
  onSave: (values: SetupValues, note: string) => void
  saving?: boolean
  withNote?: boolean
  header?: ReactNode
  /** Vlastný text tlačidla (inak „Uložiť N zmien“). */
  saveLabel?: string
  /** Napr. chýba povinný názov v hlavičke. */
  saveDisabled?: boolean
}) {
  const { t, i18n } = useTranslation()
  const label = useFieldLabel()
  const prefs = useUnitPrefs()
  const [values, setValues] = useState<SetupValues>(initial)
  const [note, setNote] = useState('')

  const changed = useMemo(() => changedKeys(initial, values), [initial, values])
  const set = (key: string, v: number | string | null) => setValues((cur) => ({ ...cur, [key]: v }))

  const stepper = (f: SetupField, layout: 'row' | 'stack' = 'row') => (
    <Stepper
      label={label(f)}
      value={toDisplay(f, values[f.key], prefs)}
      onChange={(v) => set(f.key, v == null ? null : fromDisplay(f, v, prefs))}
      step={displayStep(f, prefs)}
      decimals={displayDecimals(f, prefs)}
      layout={layout}
    />
  )

  const ratio = gearRatio(values)

  return (
    <div className="space-y-8 pb-28 lg:pb-0">
      {header}

      {GROUP_ORDER.map((group) => {
        const list = fields.filter((f) => f.group === group && !(TIRE_KEYS as readonly string[]).includes(f.key))
        const tires = group === 'tires'
        if (!tires && list.length === 0) return null
        return (
          <Section
            key={group}
            title={t(`setup.groups.${group}`)}
            action={tires ? <span className="eyebrow">{unitLabel(fields.find((f) => f.key === 'tire_fl')!, prefs)}</span> : undefined}
          >
            {tires && (
              <Card className="p-2 sm:p-3">
                <PressureGrid values={values} highlight={changed} renderTire={(f) => stepper(f, 'stack')} />
              </Card>
            )}
            {list.length > 0 && (
              <Card className="divide-y divide-line">
                {list.map((f) => {
                  const isChanged = changed.includes(f.key)
                  return (
                    <div
                      key={f.key}
                      className={cn(
                        'relative flex min-h-[64px] flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 pr-3 pl-4',
                        isChanged && 'bg-accent-soft/60',
                      )}
                    >
                      {isChanged && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-accent" />}
                      <span className="min-w-0">
                        <span className="block text-ink-2">{label(f)}</span>
                        {isChanged && (
                          <span className="block text-[0.8rem] text-ink-3">
                            {t('setup.was', { value: formatField(f, initial[f.key] ?? null, prefs, i18n.language) })}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        {f.unit === 'text' ? (
                          <input
                            type="text"
                            aria-label={label(f)}
                            value={typeof values[f.key] === 'string' ? (values[f.key] as string) : ''}
                            onChange={(e) => set(f.key, e.target.value || null)}
                            placeholder="—"
                            className="h-11 w-44 rounded-[12px] border border-line-strong bg-surface px-3 outline-none focus:border-accent"
                          />
                        ) : (
                          stepper(f)
                        )}
                        <span className="w-6 text-[0.85rem] text-ink-3">{unitLabel(f, prefs)}</span>
                      </span>
                    </div>
                  )
                })}
                {group === 'gearing' && (
                  <div className="flex min-h-[52px] items-center justify-between px-4 text-ink-3">
                    <span>{t('setup.ratio')}</span>
                    <span className="display tnum pr-9 text-[1.1rem]">
                      {ratio != null
                        ? new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(ratio)
                        : '—'}
                    </span>
                  </div>
                )}
              </Card>
            )}
          </Section>
        )
      })}

      {withNote && (
        <Section title={t('setup.note')}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            placeholder={t('setup.notePlaceholder')}
            rows={2}
            className="w-full resize-none rounded-[14px] border border-line-strong bg-surface px-4 py-3 outline-none placeholder:text-ink-3 focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)]"
          />
          <p className="px-1 text-[0.85rem] text-ink-3">{t('setup.realityHint')}</p>
        </Section>
      )}

      {/* Uloženie – na mobile prilepené nad spodnou navigáciou */}
      <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface/92 px-4 py-3 backdrop-blur-xl lg:sticky lg:bottom-6 lg:rounded-[22px] lg:border lg:p-3 lg:shadow-float">
        <div className="mx-auto flex max-w-[880px] gap-3">
          <Button
            block
            size="lg"
            disabled={(changed.length === 0 && !saveLabel) || saveDisabled}
            loading={saving}
            onClick={() => onSave(values, note.trim())}
          >
            {saveLabel ?? (changed.length === 0 ? t('setup.noChanges') : t('setup.saveCount', { count: changed.length }))}
          </Button>
        </div>
      </div>
    </div>
  )
}
