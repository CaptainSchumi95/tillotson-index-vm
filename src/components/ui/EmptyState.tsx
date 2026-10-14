import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function EmptyState({
  icon,
  title,
  body,
  action,
  tag,
  className,
}: {
  icon: ReactNode
  title: ReactNode
  body?: ReactNode
  action?: ReactNode
  tag?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <div className="relative mb-6">
        <div className="relative grid size-[72px] place-items-center rounded-[22px] border border-line bg-surface text-accent-ink shadow-card">
          {icon}
        </div>
      </div>
      {tag && <div className="mb-3">{tag}</div>}
      <h2 className="display text-[1.3rem]">{title}</h2>
      {body && <p className="mt-3 max-w-[34ch] text-[0.98rem] leading-relaxed text-ink-2">{body}</p>}
      {action && <div className="mt-7">{action}</div>}
    </div>
  )
}
