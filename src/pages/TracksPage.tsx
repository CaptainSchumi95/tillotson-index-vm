import { useEffect, useState } from 'react'
import { MapPin, Plus, Route as RouteIcon, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Badge, Card, Section } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field } from '@/components/ui/Field'
import { ListGroup, ListRow, RowIcon } from '@/components/ui/ListRow'
import { PageHeader } from '@/components/ui/PageHeader'
import { Sheet } from '@/components/ui/Sheet'
import { FullScreenLoader } from '@/components/ui/Spinner'
import { safe, useCan, useCurrentTeam } from '@/data/queries'
import { useSaveTrack, useTrackSetups, useTracks } from '@/data/tracks'
import type { Track } from '@/data/types'

/** Formulár trate (pridanie aj úprava) – použije ho aj detail trate. */
export function TrackSheet({
  teamId,
  track,
  open,
  onOpenChange,
  onSaved,
}: {
  teamId: string
  track?: Track | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (id: string) => void
}) {
  const { t } = useTranslation()
  const save = useSaveTrack(teamId)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [length, setLength] = useState('')

  useEffect(() => {
    if (open) {
      setName(track?.name ?? '')
      setLocation(track?.location ?? '')
      setLength(track?.lengthM ? String(track.lengthM) : '')
      save.reset()
    }
  }, [open, track?.id])

  const lengthM = length.trim() ? Number(length.replace(/\s/g, '')) : null
  const valid = name.trim().length > 0 && (lengthM == null || (Number.isInteger(lengthM) && lengthM >= 100 && lengthM <= 10000))

  async function submit() {
    const r = await safe(save.mutateAsync({ id: track?.id, name: name.trim(), location: location.trim(), lengthM }))
    if (!r.ok) return
    onOpenChange(false)
    onSaved?.(r.value)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={track ? t('tracks.edit') : t('tracks.add')}
      footer={
        <Button block size="lg" disabled={!valid} loading={save.isPending} onClick={() => void submit()}>
          {t('common.save')}
        </Button>
      }
    >
      <div className="space-y-5">
        <Field label={t('tracks.name')} placeholder={t('tracks.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        <Field
          label={t('tracks.location')}
          placeholder={t('tracks.locationPlaceholder')}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={80}
        />
        <Field
          label={`${t('tracks.length')} (${t('common.optional')})`}
          inputMode="numeric"
          value={length}
          onChange={(e) => setLength(e.target.value.replace(/[^\d\s]/g, ''))}
          placeholder="1200"
        />
        {save.isError && <p className="text-danger">{t('common.error')}</p>}
      </div>
    </Sheet>
  )
}

/** Knižnica tratí (/tracks). */
export function TracksPage() {
  const { t } = useTranslation()
  const { team } = useCurrentTeam()
  const can = useCan()
  const tracks = useTracks(team?.id)
  const setups = useTrackSetups(team?.id)
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)

  if (!team) return null
  if (!can('track.view'))
    return (
      <>
        <PageHeader title={t('tracks.title')} />
        <Card>
          <EmptyState icon={<RouteIcon className="size-7" />} title={t('tracks.title')} body={t('tracks.noView')} />
        </Card>
      </>
    )
  if (tracks.isPending) return <FullScreenLoader />

  const q = query.trim().toLocaleLowerCase()
  const match = (tr: Track) => !q || `${tr.name} ${tr.location}`.toLocaleLowerCase().includes(q)
  const list = (tracks.data ?? []).filter(match)
  const ours = list.filter((tr) => tr.teamId)
  const shared = list.filter((tr) => !tr.teamId)
  const countOf = (id: string) => (setups.data ?? []).filter((s) => s.trackId === id).length

  const row = (tr: Track) => {
    const count = countOf(tr.id)
    return (
      <ListRow
        key={tr.id}
        leading={
          <RowIcon tone={count > 0 ? 'accent' : 'neutral'}>
            <MapPin className="size-5" />
          </RowIcon>
        }
        title={tr.name}
        subtitle={[tr.location, t('tracks.setupCount', { count })].filter(Boolean).join(' · ')}
        to={`/tracks/${tr.id}`}
      />
    )
  }

  return (
    <>
      <PageHeader
        title={t('tracks.title')}
        action={
          can('track.manage') && (
            <Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
              {t('tracks.add')}
            </Button>
          )
        }
      />
      <p className="-mt-2 mb-6 max-w-[56ch] leading-relaxed text-ink-2">{t('tracks.intro')}</p>

      <div className="mb-8 flex h-[52px] items-center gap-3 rounded-[14px] border border-line-strong bg-surface px-4 focus-within:border-accent">
        <Search className="size-5 shrink-0 text-ink-3" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('tracks.search')}
          aria-label={t('tracks.search')}
          className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-3"
        />
      </div>

      <div className="space-y-8">
        {ours.length > 0 && (
          <Section title={t('tracks.ours')}>
            <ListGroup>{ours.map(row)}</ListGroup>
          </Section>
        )}
        {shared.length > 0 && (
          <Section title={t('tracks.shared')} action={<Badge>{shared.length}</Badge>}>
            <ListGroup>{shared.map(row)}</ListGroup>
          </Section>
        )}
        {list.length === 0 && <Card className="p-6 text-center text-ink-3">{t('tracks.noResults')}</Card>}
      </div>

      <TrackSheet teamId={team.id} open={adding} onOpenChange={setAdding} />
    </>
  )
}
