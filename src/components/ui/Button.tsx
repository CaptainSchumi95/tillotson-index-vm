import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse'
type Size = 'md' | 'lg' | 'sm'

const variants: Record<Variant, string> = {
  primary:
    'sheen bg-accent-fill text-on-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_8px_20px_-10px_var(--accent-glow)] hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_14px_28px_-10px_var(--accent-glow)] hover:brightness-[1.05] active:brightness-95',
  secondary: 'bg-surface text-ink border border-line-strong shadow-card hover:bg-surface-2 hover:border-ink-3/45 active:bg-sunken',
  ghost: 'text-accent-ink hover:bg-accent-soft active:bg-accent-soft',
  danger: 'bg-surface text-danger border border-line-strong shadow-card hover:bg-surface-2 hover:border-danger/45',
  inverse: 'bg-white text-[#0c1424] hover:bg-white/90 active:bg-white/80',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[0.9rem] rounded-[11px] gap-1.5',
  md: 'h-12 px-5 text-[1rem] rounded-[14px] gap-2',
  lg: 'h-14 px-6 text-[1.05rem] rounded-[16px] gap-2.5',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  block?: boolean
  loading?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', block, loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold whitespace-nowrap',
        'transition-[filter,background-color,border-color,box-shadow,transform,opacity] duration-200 ease-out-soft active:scale-[0.97]',
        'pointer-fine:hover:-translate-y-px pointer-fine:active:translate-y-0',
        'disabled:opacity-45 disabled:active:scale-100',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner className="size-5" /> : icon}
      {children}
    </button>
  )
})
