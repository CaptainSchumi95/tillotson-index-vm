import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-[22px] border border-line bg-surface shadow-card', className)} {...rest} />
}

/** Nadpis sekcie s voliteľnou akciou vpravo. */
export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('space-y-2.5', className)}>
      {(title || action) && (
        <div className="flex min-h-7 items-end justify-between px-1">
          {title && <h2 className="eyebrow">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2.5 text-[0.72rem] font-semibold',
        tone === 'accent' ? 'bg-accent-soft text-accent-ink' : 'bg-sunken text-ink-2',
      )}
    >
      {children}
    </span>
  )
}
