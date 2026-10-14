import { CloudUpload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Identity'
import { changedKeys, formatField, unitLabel, type SetupField } from '@/data/setup-fields'
import type { SetupRevision } from '@/data/types'
import { dateTime } from '@/lib/time'
import { useFieldLabel, useUnitPrefs } from './SetupView'

const MAX_CHIPS = 4

/** Časová os zmien: kto, kedy, čo a prečo. */
export function SetupHistory({ revisions, fields }: { revisions: SetupRevision[]; fields: SetupField[] }) {
  const { t, i18n } = useTranslation()
  const label = useFieldLabel()
  const prefs = useUnitPrefs()

  if (revisions.length === 0) return <Card className="p-6 text-center text-ink-3">{t('setup.history.empty')}</Card>

  return (
    <ol className="relative space-y-3">
      {revisions.map((rev, i) => {
        const prev = revisions[i + 1]
        const keys = prev ? changedKeys(prev.values, rev.values) : []
        const changes = keys
          .map((k) => fields.find((f) => f.key === k))
          .filter((f): f is SetupField => !!f)
        const shown = changes.slice(0, MAX_CHIPS)
        const name = rev.author?.name || t('setup.unknownAuthor')

        return (
          <li key={rev.id}>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Avatar name={name} url={rev.author?.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold leading-tight">{name}</div>
                  <div className="text-[0.85rem] text-ink-3">{dateTime(rev.recordedAt, i18n.language)}</div>
                </div>
                {rev.pending && (
                  <Badge tone="accent">
                    <CloudUpload className="mr-1 size-3.5" />
                    {t('setup.pending')}
                  </Badge>
                )}
              </div>

              {rev.note && <p className="mt-3 leading-relaxed text-ink-2">{rev.note}</p>}

              {!prev ? (
                <p className="mt-3 text-[0.9rem] text-ink-3">{t('setup.history.first')}</p>
              ) : (
                shown.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {shown.map((f) => (
                      <li key={f.key} className="rounded-[10px] bg-surface-2 px-3 py-1.5 text-[0.88rem]">
                        <span className="text-ink-3">{label(f)} </span>
                        <span className="tnum text-ink-3 line-through decoration-ink-3/50">
                          {formatField(f, prev.values[f.key] ?? null, prefs, i18n.language)}
                        </span>
                        <span className="text-ink-3"> → </span>
                        <span className="tnum font-semibold">
                          {formatField(f, rev.values[f.key] ?? null, prefs, i18n.language)} {unitLabel(f, prefs)}
                        </span>
                      </li>
                    ))}
                    {changes.length > MAX_CHIPS && (
                      <li className="px-1 py-1.5 text-[0.88rem] text-ink-3">
                        {t('setup.history.moreChanges', { count: changes.length - MAX_CHIPS })}
                      </li>
                    )}
                  </ul>
                )
              )}
            </Card>
          </li>
        )
      })}
    </ol>
  )
}
