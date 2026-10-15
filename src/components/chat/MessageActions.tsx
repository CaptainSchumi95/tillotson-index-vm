import { useState } from 'react'
import { Check, Copy, CornerUpLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { Drawer } from 'vaul'
import { useTranslation } from 'react-i18next'
import type { ChatMessage } from '@/data/types'
import { cn } from '@/lib/cn'
import { plainText } from './Markdown'
import { QUICK_REACTIONS } from './MessageRow'

const MORE_EMOJI = [
  '👍', '👎', '❤️', '🔥', '😂', '🤣', '😮', '😢', '😡', '🙏', '👏', '💪', '🎉', '🏁', '🏎️', '⏱️',
  '🛞', '🔧', '⛽', '🌧️', '☀️', '✅', '❌', '⚠️', '👀', '🤔', '😎', '🥇', '🥈', '🥉', '💯', '🚀',
]

/** Akcie so správou (ako v Discorde): reakcie, odpovedať, kopírovať, upraviť, zmazať. */
export function MessageActions({
  message,
  canEdit,
  canDelete,
  myReactions,
  onClose,
  onReact,
  onReply,
  onEdit,
  onDelete,
}: {
  message: ChatMessage | null
  canEdit: boolean
  canDelete: boolean
  myReactions: string[]
  onClose: () => void
  onReact: (emoji: string) => void
  onReply: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const [allEmoji, setAllEmoji] = useState(false)
  const [copied, setCopied] = useState(false)

  const close = () => {
    setAllEmoji(false)
    setCopied(false)
    onClose()
  }

  const action = (icon: React.ReactNode, label: string, onClick: () => void, danger?: boolean) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-14 w-full items-center gap-4 rounded-[14px] px-4 text-left font-medium transition-colors hover:bg-sunken',
        danger && 'text-danger',
      )}
    >
      {icon}
      {label}
    </button>
  )

  const emojiButton = (e: string, size: 'lg' | 'md') => (
    <button
      key={e}
      type="button"
      onClick={() => {
        onReact(e)
        close()
      }}
      className={cn(
        'grid place-items-center rounded-full transition-transform active:scale-90',
        size === 'lg' ? 'size-12 text-[1.6rem]' : 'size-11 text-[1.45rem]',
        myReactions.includes(e) ? 'bg-accent-soft ring-2 ring-accent' : 'bg-sunken hover:bg-line',
      )}
    >
      {e}
    </button>
  )

  return (
    <Drawer.Root open={!!message} onOpenChange={(o) => !o && close()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-[rgb(8_12_20/0.45)]" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[60] mx-auto w-full max-w-[520px] rounded-t-[26px] bg-surface pb-[calc(16px+env(safe-area-inset-bottom))] outline-none shadow-float lg:bottom-6 lg:rounded-[26px] lg:pb-4">
          <div className="mx-auto mt-2.5 mb-3 h-1.5 w-10 rounded-full bg-line-strong" />
          <Drawer.Title className="sr-only">{t('chat.more')}</Drawer.Title>
          <Drawer.Description className="sr-only">{message ? plainText(message.body).slice(0, 80) : ''}</Drawer.Description>

          {message && (
            <div className="px-4">
              {/* Rýchle reakcie */}
              <div className="flex items-center justify-between gap-1.5 pb-3">
                {QUICK_REACTIONS.map((e) => emojiButton(e, 'lg'))}
                <button
                  type="button"
                  aria-label={t('chat.moreEmoji')}
                  onClick={() => setAllEmoji((v) => !v)}
                  className={cn(
                    'grid size-12 place-items-center rounded-full transition-colors',
                    allEmoji ? 'bg-accent text-on-accent' : 'bg-sunken text-ink-2 hover:bg-line',
                  )}
                >
                  <Plus className="size-6" />
                </button>
              </div>

              {allEmoji && (
                <div className="mb-3 grid grid-cols-8 gap-1.5 rounded-[18px] bg-surface-2 p-2" data-vaul-no-drag="">
                  {MORE_EMOJI.map((e) => emojiButton(e, 'md'))}
                </div>
              )}

              <div className="rounded-[18px] bg-surface-2 p-1">
                {action(<CornerUpLeft className="size-5" />, t('chat.reply'), () => {
                  onReply()
                  close()
                })}
                {action(
                  copied ? <Check className="size-5 text-success" /> : <Copy className="size-5" />,
                  copied ? t('chat.copied') : t('chat.copy'),
                  () => {
                    void navigator.clipboard?.writeText(message.body)
                    setCopied(true)
                    setTimeout(close, 500)
                  },
                )}
                {canEdit &&
                  action(<Pencil className="size-5" />, t('chat.edit'), () => {
                    onEdit()
                    close()
                  })}
                {canDelete &&
                  action(
                    <Trash2 className="size-5" />,
                    t('chat.deleteMessage'),
                    () => {
                      onDelete()
                      close()
                    },
                    true,
                  )}
              </div>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
