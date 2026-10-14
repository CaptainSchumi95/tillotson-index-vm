import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Section } from '@/components/ui/Card'
import { useProfile } from '@/data/queries'
import {
  formatField,
  gearRatio,
  GROUP_ORDER,
  STANDARD_FIELDS,
  TIRE_KEYS,
  unitLabel,
  type SetupField,
  type SetupValues,
} from '@/data/setup-fields'
import { cn } from '@/lib/cn'
import { DEFAULT_UNITS } from '@/lib/units'

/** Názov položky – preklad štandardnej, alebo názov vlastnej. */
export function useFieldLabel() {
  const { t } = useTranslation()
  return (field: SetupField) => (field.labelKey ? t(field.labelKey as never) : (field.label ?? field.key))
}

export function useUnitPrefs() {
  return useProfile().data?.unitPrefs ?? DEFAULT_UNITS
}

const TIRE_FIELDS = TIRE_KEYS.map((k) => STANDARD_FIELDS.find((f) => f.key === k)!)

/**
 * Tlaky v rozložení ako na motokáre: predok hore, zadok dole, podvozok v strede.
 * `renderTire` umožní namiesto hodnoty vložiť napr. krokovač.
 */
export function PressureGrid({
  values,
  renderTire,
  highlight = [],
}: {
  values: SetupValues
  renderTire?: (field: SetupField) => ReactNode
  highlight?: string[]
}) {
  const { i18n } = useTranslation()
  const label = useFieldLabel()
  const prefs = useUnitPrefs()
  return (
    <div className="grid grid-cols-[1fr_44px_1fr] grid-rows-2 gap-y-3 sm:grid-cols-[1fr_64px_1fr]">
      {TIRE_FIELDS.map((f, i) => {
        const empty = typeof values[f.key] !== 'number'
        return (
          <div
            key={f.key}
            className={cn(
              'rounded-[16px] px-4 py-3 transition-colors',
              highlight.includes(f.key) ? 'bg-accent-soft' : 'bg-surface-2',
              i % 2 === 0 ? 'col-start-1' : 'col-start-3 text-right',
              i < 2 ? 'row-start-1' : 'row-start-2',
            )}
          >
            <div className="text-[0.78rem] font-medium text-ink-3">{label(f)}</div>
            {renderTire ? (
              <div className={cn('mt-1.5 flex', i % 2 === 1 && 'justify-end')}>{renderTire(f)}</div>
            ) : (
              <div className={cn('display tnum mt-1 text-[1.75rem]', empty && 'text-ink-3/60')}>
                {formatField(f, values[f.key], prefs, i18n.language)}
              </div>
            )}
          </div>
        )
      })}
      <div aria-hidden className="relative col-start-2 row-span-2 row-start-1">
        <div className="absolute inset-x-0 top-1/4 h-[2px] -translate-y-1/2 bg-line-strong" />
        <div className="absolute inset-x-0 top-3/4 h-[2px] -translate-y-1/2 bg-line-strong" />
        <div className="absolute inset-y-[12%] left-1/2 w-5 -translate-x-1/2 rounded-[10px] border-2 border-line-strong bg-surface sm:w-6" />
        <div className="absolute top-[40%] left-1/2 size-3 -translate-x-1/2 rounded-full border-2 border-line-strong bg-surface" />
      </div>
    </div>
  )
}

/** Celý setup na čítanie – po skupinách. */
export function SetupView({ fields, values }: { fields: SetupField[]; values: SetupValues }) {
  const { t, i18n } = useTranslation()
  const label = useFieldLabel()
  const prefs = useUnitPrefs()
  const ratio = gearRatio(values)

  return (
    <div className="space-y-8">
      {GROUP_ORDER.map((group) => {
        const groupFields = fields.filter((f) => f.group === group && !(TIRE_KEYS as readonly string[]).includes(f.key))
        if (group === 'tires') {
          const extra = groupFields
          return (
            <Section key={group} title={t('setup.groups.tires')} action={<span className="eyebrow">{unitLabel(TIRE_FIELDS[0], prefs)}</span>}>
              <Card className="p-3">
                <PressureGrid values={values} />
              </Card>
              {extra.length > 0 && <FieldRows fields={extra} values={values} />}
            </Section>
          )
        }
        if (groupFields.length === 0) return null
        return (
          <Section key={group} title={t(`setup.groups.${group}`)}>
            <FieldRows
              fields={groupFields}
              values={values}
              extra={
                group === 'gearing' && ratio != null ? (
                  <Row label={t('setup.ratio')} value={new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(ratio)} />
                ) : null
              }
            />
          </Section>
        )
      })}
    </div>
  )

  function FieldRows({ fields: list, values: v, extra }: { fields: SetupField[]; values: SetupValues; extra?: ReactNode }) {
    return (
      <Card className="divide-y divide-line">
        {list.map((f) => (
          <Row key={f.key} label={label(f)} value={formatField(f, v[f.key], prefs, i18n.language)} unit={unitLabel(f, prefs)} />
        ))}
        {extra}
      </Card>
    )
  }
}

function Row({ label, value, unit }: { label: string; value: string; unit?: string }) {
  const empty = value === '—'
  return (
    <div className="flex min-h-[56px] items-center justify-between gap-4 px-4 py-2.5">
      <span className="text-ink-2">{label}</span>
      <span className="flex items-baseline gap-1.5 text-right">
        <span className={cn('display tnum text-[1.2rem]', empty && 'text-ink-3/60')}>{value}</span>
        {unit && !empty && <span className="text-[0.85rem] text-ink-3">{unit}</span>}
      </span>
    </div>
  )
}
