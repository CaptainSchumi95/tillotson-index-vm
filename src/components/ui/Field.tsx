import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode
  hint?: ReactNode
  suffix?: ReactNode
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, suffix, className, id, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={inputId} className="block px-1 text-[0.88rem] font-semibold text-ink-2">
        {label}
      </label>
      <div
        className={cn(
          'flex h-[52px] items-center rounded-[14px] border border-line-strong bg-surface px-4',
          'transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-[0_0_0_4px_var(--accent-soft)]',
        )}
      >
        <input
          ref={ref}
          id={inputId}
          className="h-full min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-3"
          {...rest}
        />
        {suffix && <span className="ml-2 text-ink-3">{suffix}</span>}
      </div>
      {hint && <p className="px-1 text-[0.85rem] text-ink-3">{hint}</p>}
    </div>
  )
})
