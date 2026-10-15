import { useRef, useState, type ReactNode } from 'react'
import { CornerUpLeft, MoreHorizontal, SmilePlus, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRoleName } from '@/components/team/pickers'
import { Avatar } from '@/components/ui/Identity'
import type { ChatMessage, Member } from '@/data/types'
import { cn } from '@/lib/cn'
import { parseGif } from '@/lib/gif'
import { Markdown, plainText } from './Markdown'

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

const LONG_PRESS_MS = 450
const DOUBLE_TAP_MS = 300
/** Ako ďaleko treba správu potiahnuť doprava, aby sa na ňu odpovedalo. */
const SWIPE_REPLY = 64

/**
 * Správa v štýle Discordu: avatar, meno, čas a text zarovnané vľavo.
 * Podržanie (mobil) / pravé tlačidlo (počítač) = akcie, dvojité ťuknutie = 👍.
 */
export function MessageRow({
  message,
  author,
  mine,
  me,
  grouped,
  replied,
  repliedAuthor,
  highlight,
  onActions,
  onReact,
  onReply,
  onJump,
  memberName,
  gifFavorite,
  onToggleGifFavorite,
}: {
  message: ChatMessage
  author: Member | undefined
  mine: boolean
  me: string
  /** Pokračovanie predchádzajúcej správy toho istého autora (bez hlavičky). */
  grouped: boolean
  replied: ChatMessage | null | undefined
  repliedAuthor: string
  highlight: boolean
  onActions: (m: ChatMessage) => void
  onReact: (m: ChatMessage, emoji: string) => void
  onReply: (m: ChatMessage) => void
  onJump: (id: string) => void
  memberName: (profileId: string) => string
  gifFavorite: boolean
  onToggleGifFavorite: (m: ChatMessage) => void
}) {
  const { t, i18n } = useTranslation()
  const press = useRef<{ timer: number; x: number; y: number; fired: boolean } | null>(null)
  const lastTap = useRef(0)
  const swipe = useRef<{ x: number; y: number; active: boolean; armed: boolean } | null>(null)
  const [dx, setDx] = useState(0)
  const roleName = useRoleName()

  const name = mine ? t('chat.you') : author?.profile.name || t('chat.unknown')
  const time = new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit' }).format(new Date(message.createdAt))
  const gif = parseGif(message.body)

  const startPress = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' || message.pending) return
    swipe.current = { x: e.clientX, y: e.clientY, active: false, armed: false }
    const timer = window.setTimeout(() => {
      if (press.current) press.current.fired = true
      navigator.vibrate?.(10)
      onActions(message)
    }, LONG_PRESS_MS)
    press.current = { timer, x: e.clientX, y: e.clientY, fired: false }
  }
  const movePress = (e: React.PointerEvent) => {
    const s = swipe.current
    if (s) {
      const mx = e.clientX - s.x
      const my = e.clientY - s.y
      // Vodorovný pohyb doprava = potiahnutie na odpoveď (zvislý nechávame na posúvanie).
      if (!s.active && mx > 12 && mx > Math.abs(my) * 1.4) {
        s.active = true
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          /* ukazovateľ už neexistuje */
        }
      }
      if (s.active) {
        const d = Math.max(0, Math.min(mx, 140))
        setDx(d < SWIPE_REPLY ? d : SWIPE_REPLY + (d - SWIPE_REPLY) * 0.3)
        if (!s.armed && d >= SWIPE_REPLY) {
          s.armed = true
          navigator.vibrate?.(8)
        } else if (s.armed && d < SWIPE_REPLY) s.armed = false
      }
    }
    const p = press.current
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) {
      clearTimeout(p.timer)
      press.current = null
    }
  }
  const endPress = () => {
    if (press.current) clearTimeout(press.current.timer)
    const fired = press.current?.fired
    press.current = null
    return fired
  }

  /** Koniec potiahnutia – vráti správu na miesto; true = išlo o potiahnutie. */
  const endSwipe = () => {
    const s = swipe.current
    swipe.current = null
    if (!s?.active) return false
    setDx(0)
    if (s.armed) onReply(message)
    return true
  }

  const onTap = (e: React.PointerEvent) => {
    if (endSwipe()) {
      endPress()
      lastTap.current = 0
      return
    }
    if (endPress() || message.pending) return
    // Dvojité ťuknutie / dvojklik = 👍 (prepnutie).
    if (e.timeStamp - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0
      onReact(message, '👍')
    } else lastTap.current = e.timeStamp
  }

  let reply: ReactNode = null
  if (message.replyTo) {
    reply = (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (replied) onJump(replied.id)
        }}
        className="mb-0.5 ml-[18px] flex max-w-full items-center gap-1.5 text-[0.82rem] text-ink-3 hover:text-ink-2"
      >
        <span className="h-3 w-6 shrink-0 rounded-tl-[6px] border-t-2 border-l-2 border-line-strong" />
        {replied ? (
          <>
            <span className="shrink-0 font-semibold text-ink-2">{repliedAuthor}</span>
            <span className="truncate">{plainText(replied.body)}</span>
          </>
        ) : (
          <span className="italic">{t('chat.deleted')}</span>
        )}
      </button>
    )
  }

  const showHeader = !grouped || !!message.replyTo

  return (
    <div
      id={`msg-${message.id}`}
      onPointerDown={startPress}
      onPointerMove={movePress}
      onPointerUp={onTap}
      onPointerCancel={() => {
        swipe.current = null
        setDx(0)
        endPress()
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        if (!message.pending) onActions(message)
      }}
      className={cn(
        'group relative -mx-3 touch-pan-y rounded-[10px] px-3 transition-colors select-none [-webkit-touch-callout:none] sm:select-text',
        showHeader ? 'mt-3 pt-1 pb-0.5' : 'py-0.5',
        'hover:bg-sunken/60',
        highlight && 'animate-[flash_1.6s_ease-out] bg-accent-soft',
        message.pending && 'opacity-55',
      )}
    >
      {/* Ikona odpovede, ktorá sa odkryje pri potiahnutí */}
      {dx > 0 && (
        <span
          className={cn(
            'pointer-events-none absolute top-1/2 left-1 grid size-8 -translate-y-1/2 place-items-center rounded-full transition-colors',
            dx >= SWIPE_REPLY ? 'bg-accent text-on-accent' : 'bg-(--chat-field) text-ink-2',
          )}
          style={{
            opacity: Math.min(1, dx / SWIPE_REPLY),
            transform: `translateY(-50%) scale(${0.6 + 0.4 * Math.min(1, dx / SWIPE_REPLY)})`,
          }}
        >
          <CornerUpLeft className="size-4" />
        </span>
      )}
      <div
        style={{ transform: dx ? `translateX(${dx}px)` : undefined }}
        className={cn(!dx && 'transition-transform duration-200 ease-out-soft')}
      >
        {reply}
        <div className="flex gap-3">
          <div className="w-10 shrink-0">
            {showHeader ? (
              <Avatar name={author?.profile.name || '?'} url={author?.profile.avatarUrl} />
            ) : (
              <span className="block pt-0.5 text-right text-[0.68rem] text-ink-3 opacity-0 group-hover:opacity-100">{time}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {showHeader && (
              <div className="flex min-w-0 items-baseline gap-2">
                <span className={cn('truncate font-semibold', mine ? 'text-accent-ink' : 'text-ink')}>{name}</span>
                {author && (
                  <span className="shrink-0 text-[0.66rem] font-bold tracking-[0.07em] text-ink-3 uppercase">
                    {roleName(author.role)}
                  </span>
                )}
                <span className="tnum shrink-0 text-[0.72rem] text-ink-3">{message.pending ? t('chat.sending') : time}</span>
              </div>
            )}
            {gif ? (
              <span className="group/gif relative mt-1 block w-[min(100%,260px)]">
                <img
                  src={gif.url}
                  alt="GIF"
                  loading="lazy"
                  draggable={false}
                  className="block w-full rounded-[14px] bg-(--chat-field) object-cover"
                  style={{ aspectRatio: gif.w && gif.h ? `${gif.w} / ${gif.h}` : undefined }}
                />
                {!message.pending && (
                  <button
                    type="button"
                    aria-label={gifFavorite ? t('chat.gif.removeFavorite') : t('chat.gif.addFavorite')}
                    title={gifFavorite ? t('chat.gif.removeFavorite') : t('chat.gif.addFavorite')}
                    aria-pressed={gifFavorite}
                    onPointerUp={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleGifFavorite(message)
                    }}
                    className={cn(
                      'absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-opacity pointer-coarse:hidden',
                      gifFavorite ? 'opacity-100' : 'opacity-0 group-hover/gif:opacity-100',
                    )}
                  >
                    <Star className={cn('size-4', gifFavorite && 'fill-[#ffc53d] text-[#ffc53d]')} />
                  </button>
                )}
              </span>
            ) : (
              <div className="leading-relaxed text-ink">
                <Markdown text={message.body} />
                {message.editedAt && <span className="text-[0.72rem] text-ink-3"> {t('chat.edited')}</span>}
              </div>
            )}

            {message.reactions.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {message.reactions.map((r) => {
                  const mineR = r.profileIds.includes(me)
                  return (
                    <button
                      key={r.emoji}
                      type="button"
                      title={r.profileIds.map(memberName).join(', ')}
                      onPointerUp={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        onReact(message, r.emoji)
                      }}
                      className={cn(
                        'flex h-7 items-center gap-1 rounded-full border px-2 text-[0.85rem] transition-colors',
                        mineR
                          ? 'border-accent bg-accent-soft text-accent-ink'
                          : 'border-transparent bg-(--chat-field) text-ink-2 hover:border-line-strong',
                      )}
                    >
                      <span className="text-[1rem] leading-none">{r.emoji}</span>
                      <span className="tnum font-semibold">{r.profileIds.length}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Na počítači: rýchle akcie pri prejdení myšou (ako v Discorde) */}
      {!message.pending && (
        <div className="absolute -top-4 right-2 hidden items-center gap-0.5 rounded-[10px] border border-line bg-(--chat-field) p-0.5 shadow-float group-hover:flex pointer-coarse:hidden!">
          {QUICK_REACTIONS.slice(0, 3).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onReact(message, e)}
              className="grid size-8 place-items-center rounded-[8px] text-[1.05rem] hover:bg-sunken"
            >
              {e}
            </button>
          ))}
          <HoverButton label={t('chat.react')} onClick={() => onActions(message)}>
            <SmilePlus className="size-4.5" />
          </HoverButton>
          <HoverButton label={t('chat.reply')} onClick={() => onReply(message)}>
            <CornerUpLeft className="size-4.5" />
          </HoverButton>
          <HoverButton label={t('chat.more')} onClick={() => onActions(message)}>
            <MoreHorizontal className="size-4.5" />
          </HoverButton>
        </div>
      )}
    </div>
  )
}

function HoverButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-[8px] text-ink-2 hover:bg-sunken hover:text-ink"
    >
      {children}
    </button>
  )
}
