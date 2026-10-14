import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Kart } from '@/data/types'
import { KartPlate } from './ui/Identity'

/** Veľké dlaždice motokár – ľahko trafiteľné aj v rukaviciach. */
export function KartPicker({
  karts,
  selectedId,
  onPick,
}: {
  karts: Kart[]
  selectedId?: string | null
  onPick: (kart: Kart) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {karts.map((k, i) => {
        const active = k.id === selectedId
        return (
          <button
            key={k.id}
            type="button"
            onClick={() => onPick(k)}
            style={{ animationDelay: `${i * 40}ms` }}
            className={cn(
              'animate-rise relative flex flex-col items-start gap-4 rounded-[22px] border bg-surface p-4 text-left shadow-card',
              'transition-[border-color,transform,box-shadow] duration-150 active:scale-[0.98]',
              active ? 'border-accent shadow-[0_0_0_3px_var(--accent-soft)]' : 'border-line hover:border-line-strong',
            )}
          >
            <KartPlate number={k.number} size="lg" />
            <span className="min-w-0 max-w-full">
              <span className="block truncate text-[1.05rem] font-semibold">{k.driverName || '—'}</span>
            </span>
            {active && (
              <span className="absolute top-3.5 right-3.5 grid size-6 place-items-center rounded-full bg-accent text-on-accent">
                <Check className="size-3.5" strokeWidth={3} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
