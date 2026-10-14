import { cn } from '@/lib/cn'

interface SegmentedProps<T extends string> {
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
  label?: string
  className?: string
}

export function Segmented<T extends string>({ value, options, onChange, label, className }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex rounded-[13px] bg-sunken p-1', className)}>
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
              'h-10 min-w-0 flex-1 truncate rounded-[10px] px-3 text-[0.92rem] font-semibold transition-all duration-200',
              active ? 'bg-surface text-ink shadow-[0_1px_3px_rgb(12_20_36/0.12)]' : 'text-ink-3 hover:text-ink-2',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
