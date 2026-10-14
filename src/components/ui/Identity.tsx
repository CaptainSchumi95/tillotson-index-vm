import { cn } from '@/lib/cn'
import { onColor } from '@/lib/color'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

const avatarSizes = { sm: 'size-8 text-[0.75rem]', md: 'size-10 text-[0.85rem]', lg: 'size-16 text-[1.2rem]', xl: 'size-24 text-[1.7rem]' }

export function Avatar({
  name,
  url,
  size = 'md',
  className,
}: {
  name: string
  url?: string | null
  size?: keyof typeof avatarSizes
  className?: string
}) {
  return (
    <span
      className={cn(
        'relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent-soft font-semibold text-accent-ink',
        avatarSizes[size],
        className,
      )}
    >
      {url ? (
        <img src={url} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className="display text-[1em]">{initials(name)}</span>
      )}
    </span>
  )
}

const plateSizes = {
  sm: { box: 'h-8 min-w-10 px-2 rounded-[9px]', text: 'text-[0.95rem]', bar: 'h-[2px] w-3.5 top-[5px]' },
  md: { box: 'h-12 min-w-14 px-3 rounded-[12px]', text: 'text-[1.45rem]', bar: 'h-[3px] w-5 top-[7px]' },
  lg: { box: 'h-[72px] min-w-[84px] px-4 rounded-[16px]', text: 'text-[2.2rem]', bar: 'h-[4px] w-8 top-[10px]' },
  xl: { box: 'h-[96px] min-w-[112px] px-5 rounded-[22px]', text: 'text-[3rem]', bar: 'h-[5px] w-10 top-[13px]' },
}

/**
 * Štartové číslo motokáry. Prúžok nad číslom odkazuje na logo IDX.
 * Bez farby preberá farbu tímu (accent).
 */
export function KartPlate({
  number,
  size = 'md',
  muted,
  className,
}: {
  number: string
  size?: keyof typeof plateSizes
  muted?: boolean
  className?: string
}) {
  const s = plateSizes[size]
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center',
        muted ? 'bg-sunken text-ink-2' : 'bg-accent text-on-accent',
        s.box,
        className,
      )}
    >
      <span className={cn('absolute left-1/2 -translate-x-1/2 rounded-full bg-current opacity-55', s.bar)} />
      <span className={cn('display tnum translate-y-[3%]', s.text)}>{number}</span>
    </span>
  )
}

const badgeSizes = { sm: 'size-8 rounded-[9px] text-[0.7rem]', md: 'size-11 rounded-[13px] text-[0.85rem]', lg: 'size-16 rounded-[18px] text-[1.2rem]' }

/** Ikona tímu – nahraný obrázok alebo monogram vo farbe tímu. */
export function TeamBadge({
  name,
  color,
  iconUrl,
  size = 'md',
  className,
}: {
  name: string
  color: string
  iconUrl?: string | null
  size?: keyof typeof badgeSizes
  className?: string
}) {
  return (
    <span
      className={cn('inline-grid shrink-0 place-items-center overflow-hidden', badgeSizes[size], className)}
      style={{ background: color, color: onColor(color) }}
    >
      {iconUrl ? (
        <img src={iconUrl} alt="" className="size-full object-cover" />
      ) : (
        <span className="display">{initials(name)}</span>
      )}
    </span>
  )
}
