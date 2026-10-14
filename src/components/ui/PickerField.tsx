import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface PickerFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  type: 'date' | 'time'
  label: ReactNode
}

/**
 * Pole na dátum / čas so systémovým výberom.
 * - ťuknutie kamkoľvek do poľa otvorí výber (nielen na ikonku),
 * - data-vaul-no-drag: spodný panel nezachytí dotyk ako ťahanie,
 * - popis nie je obalom poľa (iOS by výber otvoril a hneď zavrel).
 */
export function PickerField({ type, label, className, onClick, id, ...rest }: PickerFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={inputId} className="block px-1 text-[0.88rem] font-semibold text-ink-2">
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        data-vaul-no-drag=""
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.()
          } catch {
            /* prehliadač výber nepodporuje alebo je už otvorený */
          }
          onClick?.(e)
        }}
        className={cn(
          'block h-[52px] w-full min-w-0 appearance-none rounded-[14px] border border-line-strong bg-surface px-4 text-left text-ink',
          'outline-none focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)]',
          '[&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:leading-[50px]',
        )}
        {...rest}
      />
    </div>
  )
}
