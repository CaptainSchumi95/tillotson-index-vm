import { cn } from '@/lib/cn'

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-[30px] w-[50px] shrink-0 items-center rounded-full transition-colors duration-200',
        checked ? 'bg-accent-fill shadow-[0_4px_12px_-4px_var(--accent-glow)]' : 'bg-line-strong',
        disabled && 'opacity-45',
      )}
    >
      <span
        className={cn(
          'absolute left-[3px] size-6 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-transform duration-200 ease-out-soft',
          checked && 'translate-x-5',
        )}
      />
    </button>
  )
}
