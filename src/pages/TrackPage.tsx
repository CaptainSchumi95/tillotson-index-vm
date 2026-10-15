import { useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { Copy, Layers, MapPin, Pencil, Plus, SquarePen, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Badge, Card, Section } from '@/components/ui/Card'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { ListGroup, ListRow, RowIcon } from '@/components/ui/ListRow'
import { PageHeader } from '@/components/ui/PageHeader'
import { Sheet } from '@/components/ui/Sheet'
import { FullScreenLoader } from '@/components/ui/Spinner'
import { safe, useCan, useCurrentKart, useCurrentTeam } from '@/data/queries'
import { useDeleteTrack, useTrackSetups, useTracks } from '@/data/tracks'
import { relativeTime } from '@/lib/time'
import { TrackPoster } from '@/components/tracks/TrackPoster'
import { TrackSheet } from './TracksPage'

/** Detail trate a setupy tímu k nej (/tracks/$trackId). */
export function TrackPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { trackId } = useParams({ strict: false }) as { trackId: string }
  const { team } = useCurrentTeam()
  const { kart } = useCurrentKart()
  const can = useCan()
  const tracks = useTracks(team?.id)
  const setups = useTrackSetups(team?.id)
  const del = useDeleteTrack(team?.id ?? '')
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [choosing, setChoosing] = useState(false)

  if (tracks.isPending) return <FullScreenLoader />
  const track = tracks.data?.find((x) => x.id === trackId)
  if (!team || !track) return null

  const own = !!track.teamId
  const canManage = can('track.manage')
  const list = (setups.data ?? []).filter((s) => s.trackId === track.id)

  const newSetup = (from: 'kart' | 'blank') => {
    setChoosing(false)
    void navigate({ to: '/tracks/$trackId/setups/new', params: { trackId: track.id }, search: { from } })
  }

  async function remove() {
    const r = await safe(del.mutateAsync(track!.id))
    if (r.ok) void navigate({ to: '/tracks', replace: true })
  }

  return (
    <>
      <PageHeader
        back
        eyebrow={own ? t('tracks.ours') : <Badge>{t('tracks.sharedBadge')}</Badge>}
        title={track.name}
        action={
          own &&
          canManage && (
            <Button variant="secondary" size="sm" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
              {t('common.edit')}
            </Button>
          )
        }
      />

      <div className="-mt-2 mb-8 flex items-end gap-5">
        <div className="w-[42%] max-w-[220px] shrink-0 overflow-hidden rounded-[18px] shadow-float ring-1 ring-line">
          <TrackPoster track={track} />
        </div>
        <dl className="min-w-0 flex-1 space-y-4 pb-1">
          {track.location && (
            <div>
              <dt className="eyebrow mb-1">{t('tracks.location')}</dt>
              <dd className="flex items-start gap-1.5 font-medium text-ink">
                <MapPin className="mt-0.5 size-4 shrink-0 text-ink-3" />
                {track.location}
              </dd>
            </div>
          )}
          {track.lengthM && (
            <div>
              <dt className="eyebrow mb-1">{t('tracks.lengthLabel')}</dt>
              <dd className="display tnum text-gradient text-[1.6rem] leading-none">
                {new Intl.NumberFormat(i18n.language).format(track.lengthM)} m
              </dd>
            </div>
          )}
          <div>
            <dt className="eyebrow mb-1">{t('tracks.setups')}</dt>
            <dd className="display tnum text-gradient text-[2.4rem] leading-none">{list.length}</dd>
          </div>
        </dl>
      </div>

      <div className="space-y-8">
        <Section title={t('tracks.setups')}>
          <p className="px-1 text-[0.9rem] leading-relaxed text-ink-3">{t('tracks.setupsHint')}</p>
          <ListGroup>
            {list.map((s) => (
              <ListRow
                key={s.id}
                leading={
                  <RowIcon tone="accent">
                    <Layers className="size-5" />
                  </RowIcon>
                }
                title={s.name}
                subtitle={t('tracks.updated', {
                  name: s.updatedBy?.name || t('setup.unknownAuthor'),
                  when: relativeTime(s.updatedAt, i18n.language, t('time.justNow')),
                })}
                to={`/tracks/${track.id}/setups/${s.id}`}
              />
            ))}
            {list.length === 0 && <div className="p-5 text-center text-ink-3">{t('tracks.noSetups')}</div>}
            {canManage && (
              <ListRow
                leading={
                  <RowIcon>
                    <Plus className="size-5" />
                  </RowIcon>
                }
                title={<span className="text-accent-ink">{t('tracks.newSetup')}</span>}
                chevron={false}
                onClick={() => setChoosing(true)}
              />
            )}
          </ListGroup>
        </Section>

        {own && canManage && (
          <Button
            variant="ghost"
            block
            className="text-danger! hover:bg-danger/10!"
            icon={<Trash2 className="size-5" />}
            onClick={() => setConfirm(true)}
          >
            {t('tracks.delete')}
          </Button>
        )}
      </div>

      {/* Odkiaľ vziať nový setup */}
      <Sheet open={choosing} onOpenChange={setChoosing} title={t('tracks.newSetup')}>
        <div className="space-y-3 pb-2">
          {kart && can('setup.view') && (
            <Card className="overflow-hidden">
              <ListRow
                leading={
                  <RowIcon tone="accent">
                    <Copy className="size-5" />
                  </RowIcon>
                }
                title={t('tracks.fromKart', { number: kart.number })}
                subtitle={t('tracks.fromKartHint')}
                onClick={() => newSetup('kart')}
              />
            </Card>
          )}
          <Card className="overflow-hidden">
            <ListRow
              leading={
                <RowIcon>
                  <SquarePen className="size-5" />
                </RowIcon>
              }
              title={t('tracks.blank')}
              onClick={() => newSetup('blank')}
            />
          </Card>
        </div>
      </Sheet>

      <TrackSheet teamId={team.id} track={track} open={editing} onOpenChange={setEditing} />

      <ConfirmSheet
        open={confirm}
        onOpenChange={setConfirm}
        title={t('tracks.delete')}
        body={t('tracks.deleteConfirm', { name: track.name })}
        confirmLabel={t('tracks.delete')}
        loading={del.isPending}
        onConfirm={() => void remove()}
      />
    </>
  )
}
