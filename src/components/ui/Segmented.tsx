import { cn } from '@/lib/cn'

interface SegmentedProps<T extends string> {
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
  label?: string
  className?: string
}

export function Segmented<T extends string>({ value, options, onChange, label, className }: SegmentedProps<T>) {
  const index = options.findIndex((o) => o.value === value)
  return (
    <div role="radiogroup" aria-label={label} className={cn('relative flex rounded-[13px] bg-sunken p-1', className)}>
      {/* Podklad aktívnej možnosti sa presúva (všetky možnosti majú rovnakú šírku) */}
      {index >= 0 && (
        <span
          aria-hidden
          className="absolute top-1 bottom-1 left-1 rounded-[10px] bg-surface shadow-[0_1px_3px_rgb(12_20_36/0.12),inset_0_1px_0_rgb(255_255_255/0.05)] transition-transform duration-300 ease-out-soft"
          style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
        />
      )}
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative h-10 min-w-0 flex-1 truncate rounded-[10px] px-3 text-[0.92rem] font-semibold transition-colors duration-200',
              active ? 'text-ink' : 'text-ink-3 hover:text-ink-2',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
