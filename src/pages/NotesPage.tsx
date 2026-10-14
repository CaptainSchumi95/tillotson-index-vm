import { useState } from 'react'
import { CloudUpload, MessageSquareText, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Badge, Card } from '@/components/ui/Card'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { Avatar, KartPlate } from '@/components/ui/Identity'
import { PageHeader } from '@/components/ui/PageHeader'
import { useCan, useCurrentKart, useDeleteNote, useNotes, useProfile, useSaveNote } from '@/data/queries'
import { relativeTime } from '@/lib/time'

/** Poznámky jazdca k motokáre (/notes). */
export function NotesPage() {
  const { t, i18n } = useTranslation()
  const { kart } = useCurrentKart()
  const can = useCan()
  const profile = useProfile()
  const notes = useNotes(kart?.id)
  const save = useSaveNote(kart?.id ?? '')
  const del = useDeleteNote(kart?.id ?? '')
  const [text, setText] = useState('')
  const [toDelete, setToDelete] = useState<string | null>(null)

  if (!kart) return null
  const canWrite = can('notes.edit')
  const canManage = can('team.manage')

  function add() {
    const v = text.trim()
    if (!v || !kart) return
    save.mutate({ id: crypto.randomUUID(), kartId: kart.id, text: v, recordedAt: new Date().toISOString() })
    setText('')
  }

  return (
    <>
      <PageHeader back title={t('notes.title')} action={<KartPlate number={kart.number} />} />

      {canWrite ? (
        <Card className="mb-6 p-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 2000))}
            placeholder={t('notes.placeholder')}
            rows={3}
            className="w-full resize-none rounded-[14px] bg-transparent px-2 py-1.5 outline-none placeholder:text-ink-3"
          />
          <div className="flex justify-end">
            <Button disabled={!text.trim()} onClick={add}>
              {t('notes.add')}
            </Button>
          </div>
        </Card>
      ) : (
        <p className="mb-6 px-1 text-[0.9rem] text-ink-3">{t('notes.readOnly')}</p>
      )}

      {notes.data && notes.data.length === 0 ? (
        <Card>
          <EmptyState icon={<MessageSquareText className="size-7" />} title={t('notes.empty')} body={t('notes.emptyHint')} />
        </Card>
      ) : (
        <ol className="space-y-3">
          {notes.data?.map((n) => {
            const name = n.author?.name || t('setup.unknownAuthor')
            const mine = n.author?.id === profile.data?.id
            return (
              <li key={n.id}>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={name} url={n.author?.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold leading-tight">{name}</div>
                      <div className="text-[0.85rem] text-ink-3">{relativeTime(n.recordedAt, i18n.language, t('time.justNow'))}</div>
                    </div>
                    {n.pending && (
                      <Badge tone="accent">
                        <CloudUpload className="mr-1 size-3.5" />
                        {t('setup.pending')}
                      </Badge>
                    )}
                    {!n.pending && (mine || canManage) && (
                      <button
                        type="button"
                        aria-label={t('notes.delete')}
                        onClick={() => setToDelete(n.id)}
                        className="grid size-10 place-items-center rounded-full text-ink-3 hover:bg-sunken hover:text-danger"
                      >
                        <Trash2 className="size-4.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-3 leading-relaxed whitespace-pre-wrap">{n.text}</p>
                </Card>
              </li>
            )
          })}
        </ol>
      )}

      <ConfirmSheet
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t('notes.delete')}
        body={t('notes.deleteConfirm')}
        confirmLabel={t('notes.delete')}
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete)
          setToDelete(null)
        }}
      />
    </>
  )
}
