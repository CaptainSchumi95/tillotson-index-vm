import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react'
import {
  ArrowUp,
  Bold,
  Code,
  CornerUpLeft,
  EyeOff,
  Heading,
  Italic,
  Link2,
  List,
  Pencil,
  Quote,
  Strikethrough,
  Type,
  Underline,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { plainText } from './Markdown'

export interface ComposerHandle {
  focus: () => void
  setText: (text: string) => void
}

/**
 * Písanie správy. Tlačidlá nepreberajú fokus (onPointerDown + preventDefault),
 * takže klávesnica na mobile po odoslaní ani pri formátovaní nezmizne.
 */
export const Composer = forwardRef<
  ComposerHandle,
  {
    placeholder: string
    onSend: (text: string) => void
    onCancelContext: () => void
    replyTo: { name: string; body: string } | null
    editing: boolean
  }
>(function Composer({ placeholder, onSend, onCancelContext, replyTo, editing }, ref) {
  const { t } = useTranslation()
  const input = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState('')
  const [formatting, setFormatting] = useState(false)

  useImperativeHandle(ref, () => ({
    focus: () => input.current?.focus(),
    setText: (v) => {
      setText(v)
      requestAnimationFrame(() => {
        const el = input.current
        if (!el) return
        el.focus()
        el.setSelectionRange(v.length, v.length)
      })
    },
  }))

  // Pole rastie s textom (max ~6 riadkov).
  useEffect(() => {
    const el = input.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [text])

  const submit = () => {
    const v = text.trim()
    if (!v) return
    onSend(v)
    setText('')
    input.current?.focus()
  }

  /** Obalí výber značkami (napr. **tučné**); bez výberu vloží značky a kurzor dá doprostred. */
  const wrap = (before: string, after = before) => {
    const el = input.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e } = el
    const next = text.slice(0, s) + before + text.slice(s, e) + after + text.slice(e)
    setText(next)
    requestAnimationFrame(() => {
      el.focus()
      if (s === e) el.setSelectionRange(s + before.length, s + before.length)
      else el.setSelectionRange(s + before.length, e + before.length)
    })
  }

  /** Pridá značku na začiatok aktuálneho riadku (nadpis, citát, zoznam). */
  const prefix = (mark: string) => {
    const el = input.current
    if (!el) return
    const s = el.selectionStart
    const lineStart = text.lastIndexOf('\n', s - 1) + 1
    const next = text.slice(0, lineStart) + mark + text.slice(lineStart)
    setText(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + mark.length, s + mark.length)
    })
  }

  const link = () => {
    const el = input.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e } = el
    const label = text.slice(s, e) || t('chat.format.link')
    const next = `${text.slice(0, s)}[${label}](https://)${text.slice(e)}`
    setText(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = s + label.length + 3 + 'https://'.length
      el.setSelectionRange(pos, pos)
    })
  }

  const keep = (e: React.PointerEvent) => e.preventDefault()

  const tool = (label: string, icon: ReactNode, onClick: () => void) => (
    <button
      key={label}
      type="button"
      title={label}
      aria-label={label}
      onPointerDown={keep}
      onClick={onClick}
      className="grid size-10 shrink-0 place-items-center rounded-[10px] text-ink-2 transition-colors hover:bg-sunken hover:text-ink active:bg-line"
    >
      {icon}
    </button>
  )

  const context = editing || replyTo

  return (
    <div className="space-y-2">
      {context && (
        <div className="flex items-center gap-2 rounded-[12px] bg-sunken px-3 py-2 text-[0.85rem]">
          {editing ? <Pencil className="size-4 shrink-0 text-accent-ink" /> : <CornerUpLeft className="size-4 shrink-0 text-accent-ink" />}
          <span className="min-w-0 flex-1 truncate text-ink-2">
            {editing ? (
              <span className="font-semibold text-ink">{t('chat.editing')}</span>
            ) : (
              <>
                <span className="font-semibold text-ink">{t('chat.replyingTo', { name: replyTo!.name })}</span>{' '}
                {plainText(replyTo!.body)}
              </>
            )}
          </span>
          <button
            type="button"
            aria-label={t('common.cancel')}
            onPointerDown={keep}
            onClick={() => {
              onCancelContext()
              if (editing) setText('')
            }}
            className="grid size-7 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-line hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {formatting && (
        <div className="-mx-1 flex gap-0.5 overflow-x-auto px-1 pb-0.5" role="toolbar" aria-label={t('chat.format.toggle')}>
          {tool(t('chat.format.bold'), <Bold className="size-4.5" />, () => wrap('**'))}
          {tool(t('chat.format.italic'), <Italic className="size-4.5" />, () => wrap('*'))}
          {tool(t('chat.format.underline'), <Underline className="size-4.5" />, () => wrap('__'))}
          {tool(t('chat.format.strike'), <Strikethrough className="size-4.5" />, () => wrap('~~'))}
          {tool(t('chat.format.heading'), <Heading className="size-4.5" />, () => prefix('# '))}
          {tool(t('chat.format.quote'), <Quote className="size-4.5" />, () => prefix('> '))}
          {tool(t('chat.format.list'), <List className="size-4.5" />, () => prefix('- '))}
          {tool(t('chat.format.code'), <Code className="size-4.5" />, () => wrap('`'))}
          {tool(t('chat.format.spoiler'), <EyeOff className="size-4.5" />, () => wrap('||'))}
          {tool(t('chat.format.link'), <Link2 className="size-4.5" />, link)}
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          aria-label={t('chat.format.toggle')}
          aria-pressed={formatting}
          title={t('chat.format.toggle')}
          onPointerDown={keep}
          onClick={() => setFormatting((v) => !v)}
          className={cn(
            'grid size-12 shrink-0 place-items-center rounded-full transition-colors',
            formatting ? 'bg-accent-soft text-accent-ink' : 'text-ink-2 hover:bg-sunken',
          )}
        >
          <Type className="size-5" />
        </button>
        <textarea
          ref={input}
          rows={1}
          value={text}
          enterKeyHint="send"
          onChange={(e) => setText(e.target.value.slice(0, 4000))}
          onKeyDown={(e) => {
            // Na počítači Enter odošle, Shift+Enter nový riadok. Esc zruší odpoveď / úpravu.
            if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(pointer: fine)').matches) {
              e.preventDefault()
              submit()
            }
            if (e.key === 'Escape' && context) {
              onCancelContext()
              if (editing) setText('')
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="max-h-[160px] min-h-[48px] flex-1 resize-none rounded-[24px] border border-line-strong bg-surface-2 px-4 py-3 leading-snug outline-none placeholder:text-ink-3 focus:border-accent focus:bg-surface"
        />
        <button
          type="button"
          onPointerDown={keep}
          onClick={submit}
          disabled={!text.trim()}
          aria-label={t('chat.send')}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-on-accent transition-[opacity,transform] active:scale-95 disabled:opacity-35"
        >
          {editing ? <Pencil className="size-5" /> : <ArrowUp className="size-6" strokeWidth={2.5} />}
        </button>
      </div>
    </div>
  )
})
