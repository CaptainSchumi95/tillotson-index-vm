import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Výber jednej možnosti veľkými tlačidlami. Opätovné ťuknutie výber zruší. */
export function ChoiceChips<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T | null
  options: readonly { value: T; label: string; icon?: ReactNode }[]
  onChange: (value: T | null) => void
  label?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active ? null : o.value)}
            className={cn(
              'flex h-12 items-center gap-2 rounded-[14px] border px-4 font-medium transition-colors',
              active
                ? 'border-accent bg-accent-tonal text-accent-ink shadow-[0_0_0_1px_var(--accent),0_8px_18px_-12px_var(--accent-glow)]'
                : 'border-line-strong bg-surface text-ink-2 hover:bg-surface-2',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
