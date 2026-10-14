import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ListRowProps {
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  to?: string
  onClick?: () => void
  chevron?: boolean
  disabled?: boolean
}

/** Riadok zoznamu – celá plocha je klikateľná (min. 60 px na prst). */
export function ListRow({ leading, title, subtitle, trailing, to, onClick, chevron, disabled }: ListRowProps) {
  const interactive = !disabled && (to || onClick)
  const body = (
    <>
      {leading && <span className="flex shrink-0 items-center">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-ink">{title}</span>
        {subtitle && <span className="block truncate text-[0.88rem] text-ink-3">{subtitle}</span>}
      </span>
      {trailing && <span className="flex shrink-0 items-center gap-2 text-ink-3">{trailing}</span>}
      {(chevron ?? !!interactive) && <ChevronRight className="size-5 shrink-0 text-ink-3" strokeWidth={2} />}
    </>
  )
  const cls = cn(
    'flex min-h-[60px] w-full items-center gap-3.5 px-4 py-2.5 text-left',
    interactive && 'transition-colors hover:bg-surface-2 active:bg-sunken',
    disabled && 'opacity-55',
  )
  if (to && !disabled)
    return (
      <Link to={to} className={cls}>
        {body}
      </Link>
    )
  if (onClick && !disabled)
    return (
      <button type="button" onClick={onClick} className={cls}>
        {body}
      </button>
    )
  return <div className={cls}>{body}</div>
}

/** Skupina riadkov v karte s deliacimi čiarami. */
export function ListGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[22px] border border-line bg-surface shadow-card divide-y divide-line',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function RowIcon({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' }) {
  return (
    <span
      className={cn(
        'grid size-10 place-items-center rounded-[12px]',
        tone === 'accent' ? 'bg-accent-soft text-accent-ink' : 'bg-sunken text-ink-2',
      )}
    >
      {children}
    </span>
  )
}
