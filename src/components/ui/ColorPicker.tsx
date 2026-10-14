import { Check, Pipette } from 'lucide-react'
import { cn } from '@/lib/cn'
import { onColor, TEAM_COLORS } from '@/lib/color'

export function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const custom = !TEAM_COLORS.includes(value.toLowerCase())
  return (
    <div className="grid grid-cols-7 gap-2.5">
      {TEAM_COLORS.map((c) => {
        const active = c === value.toLowerCase()
        return (
          <button
            key={c}
            type="button"
            aria-label={c}
            aria-pressed={active}
            onClick={() => onChange(c)}
            className={cn(
              'grid aspect-square place-items-center rounded-full transition-transform duration-150 active:scale-90',
              active && 'ring-2 ring-offset-2 ring-offset-surface',
            )}
            style={{ background: c, color: onColor(c), ['--tw-ring-color' as string]: c }}
          >
            {active && <Check className="size-[45%]" strokeWidth={3} />}
          </button>
        )
      })}
      <label
        className={cn(
          'relative grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-full border border-line-strong',
          custom && 'ring-2 ring-offset-2 ring-offset-surface',
        )}
        style={
          custom
            ? { background: value, color: onColor(value), ['--tw-ring-color' as string]: value }
            : { background: 'conic-gradient(#ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)' }
        }
      >
        {custom ? <Check className="size-[45%]" strokeWidth={3} /> : <Pipette className="size-[42%] text-white drop-shadow" />}
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  )
}
