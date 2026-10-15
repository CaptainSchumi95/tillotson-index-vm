import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { KartPlate } from '@/components/ui/Identity'
import type { Kart, Role, TeamRole } from '@/data/types'
import { cn } from '@/lib/cn'

/** Názov roly – predvolené roly sa prekladajú, vlastné majú názov od tímu. */
export function useRoleName() {
  const { t } = useTranslation()
  return (role: Pick<Role, 'name' | 'preset'>) => (role.preset ? t(`roles.${role.preset}`) : role.name)
}

/** Výber jednej roly – veľké karty s počtom oprávnení. */
export function RolePicker({
  roles,
  value,
  onChange,
}: {
  roles: TeamRole[]
  value: string | null
  onChange: (roleId: string) => void
}) {
  const { t } = useTranslation()
  const roleName = useRoleName()
  return (
    <div role="radiogroup" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {roles.map((r) => {
        const active = r.id === value
        return (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(r.id)}
            className={cn(
              'flex min-h-[60px] items-center gap-3 rounded-[16px] border px-4 py-3 text-left transition-[border-color,background-color,box-shadow]',
              active
                ? 'border-accent bg-accent-soft shadow-[0_0_0_1px_var(--accent)]'
                : 'border-line-strong bg-surface hover:bg-surface-2',
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{roleName(r)}</span>
              <span className="block text-[0.85rem] leading-snug text-ink-3">
                {r.preset ? t(`roles.desc.${r.preset}`) : t('roles.permissionCount', { count: r.permissions.length })}
              </span>
            </span>
            <span
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors',
                active ? 'border-accent bg-accent-fill text-on-accent' : 'border-line-strong',
              )}
            >
              {active && <Check className="size-3.5" strokeWidth={3} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Výber viacerých motokár – ťuknutím sa prepína. */
export function KartMultiSelect({
  karts,
  value,
  onChange,
}: {
  karts: Kart[]
  value: string[]
  onChange: (ids: string[]) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {karts.map((k) => {
        const active = value.includes(k.id)
        return (
          <button
            key={k.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? value.filter((id) => id !== k.id) : [...value, k.id])}
            className={cn(
              'flex h-12 items-center gap-2.5 rounded-[14px] border py-1.5 pr-4 pl-1.5 transition-[border-color,background-color]',
              active ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface hover:bg-surface-2',
            )}
          >
            <KartPlate number={k.number} size="sm" muted={!active} />
            <span className={cn('font-medium', !active && 'text-ink-2')}>{k.driverName || k.number}</span>
          </button>
        )
      })}
    </div>
  )
}
