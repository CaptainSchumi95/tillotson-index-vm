import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { parseNumber } from '@/data/setup-fields'
import { cn } from '@/lib/cn'

/**
 * Číselné pole s tlačidlami − a +. Pracuje v jednotke používateľa.
 * Veľké dotykové plochy – ovládateľné aj v rukaviciach.
 */
export function Stepper({
  value,
  onChange,
  step,
  decimals,
  label,
  size = 'md',
  layout = 'row',
}: {
  value: number | null
  onChange: (value: number | null) => void
  step: number
  /** [min, max] desatinných miest pri zobrazení. */
  decimals: [number, number]
  label: string
  size?: 'md' | 'lg'
  /** 'stack' = číslo hore, tlačidlá pod ním (úzke dlaždice pneumatík). */
  layout?: 'row' | 'stack'
}) {
  const { i18n } = useTranslation()
  const fmt = (v: number | null) =>
    v == null
      ? ''
      : new Intl.NumberFormat(i18n.language, { minimumFractionDigits: decimals[0], maximumFractionDigits: decimals[1], useGrouping: false }).format(v)
  const [text, setText] = useState(fmt(value))
  const [focused, setFocused] = useState(false)

  // Zvonka zmenená hodnota (tlačidlá, reset) prepíše text, ak práve nepíšeš.
  useEffect(() => {
    if (!focused) setText(fmt(value))
  }, [value, focused])

  const bump = (dir: 1 | -1) => {
    const base = value ?? 0
    const next = Math.round((base + dir * step) * 10 ** (decimals[1] + 2)) / 10 ** (decimals[1] + 2)
    onChange(next)
  }

  const big = size === 'lg'
  const btn = cn(
    'grid shrink-0 place-items-center rounded-[12px] bg-sunken text-ink-2 transition-[background-color,transform] active:scale-95 active:bg-line-strong',
    big ? 'size-12' : 'size-11',
  )

  const input = (
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={text}
        placeholder="—"
        onFocus={(e) => {
          setFocused(true)
          e.target.select()
        }}
        onBlur={() => {
          setFocused(false)
          setText(fmt(value))
        }}
        onChange={(e) => {
          setText(e.target.value)
          onChange(parseNumber(e.target.value))
        }}
        className={cn(
          'display tnum min-w-0 rounded-[12px] border border-transparent bg-transparent text-center outline-none',
          'focus:border-accent focus:bg-surface placeholder:text-ink-3/50',
          layout === 'stack'
            ? 'h-12 w-full text-[1.75rem]'
            : big
              ? 'h-12 w-[5.2rem] text-[1.6rem]'
              : 'h-11 w-[4.6rem] text-[1.2rem]',
        )}
      />
  )

  const minus = (
    <button type="button" className={cn(btn, layout === 'stack' && 'h-10 w-auto flex-1')} onClick={() => bump(-1)} aria-label={`${label} −`}>
      <Minus className="size-5" strokeWidth={2.5} />
    </button>
  )
  const plus = (
    <button type="button" className={cn(btn, layout === 'stack' && 'h-10 w-auto flex-1')} onClick={() => bump(1)} aria-label={`${label} +`}>
      <Plus className="size-5" strokeWidth={2.5} />
    </button>
  )

  if (layout === 'stack')
    return (
      <div className="w-full space-y-1.5">
        {input}
        <div className="flex gap-1.5">
          {minus}
          {plus}
        </div>
      </div>
    )

  return (
    <div className="flex items-center gap-1.5">
      {minus}
      {input}
      {plus}
    </div>
  )
}
