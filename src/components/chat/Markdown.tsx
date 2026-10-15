// Formátovanie správ ako v Discorde. Skladá React prvky priamo (žiadne vkladanie HTML),
// takže text správy nemôže spustiť žiadny kód.
//
// Riadky:  # nadpis  ## menší  ### najmenší  -# drobný text  > citát  >>> citát do konca
//          - / * zoznam  1. číslovaný  ```kód```
// V texte: **tučné**  *kurzíva*  _kurzíva_  __podčiarknuté__  ~~prečiarknuté~~
//          `kód`  ||spoiler||  [text](https://odkaz)  https://odkaz

import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Rule = { re: RegExp; render: (m: RegExpExecArray, key: string) => ReactNode }

const URL_RE = /https?:\/\/[^\s<]+[^\s<.,:;"')\]!?*_~|]/

function Spoiler({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(false)
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation()
        setShown(true)
      }}
      className={cn(
        'rounded-[4px] px-0.5 transition-colors',
        shown ? 'bg-sunken' : 'cursor-pointer bg-ink-3 text-transparent select-none [&_*]:invisible',
      )}
    >
      {children}
    </span>
  )
}

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="break-all text-accent-ink underline decoration-accent-ink/40 underline-offset-2 hover:decoration-accent-ink"
    >
      {children}
    </a>
  )
}

const RULES: Rule[] = [
  { re: /`([^`\n]+)`/, render: (m, k) => <code key={k} className="rounded-[5px] bg-sunken px-1.5 py-0.5 font-mono text-[0.88em]">{m[1]}</code> },
  { re: /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/, render: (m, k) => <ExtLink key={k} href={m[2]}>{inline(m[1], k)}</ExtLink> },
  { re: URL_RE, render: (m, k) => <ExtLink key={k} href={m[0]}>{m[0]}</ExtLink> },
  { re: /\|\|([\s\S]+?)\|\|/, render: (m, k) => <Spoiler key={k}>{inline(m[1], k)}</Spoiler> },
  { re: /\*\*([\s\S]+?)\*\*/, render: (m, k) => <strong key={k} className="font-bold">{inline(m[1], k)}</strong> },
  { re: /__([\s\S]+?)__/, render: (m, k) => <u key={k} className="underline-offset-2">{inline(m[1], k)}</u> },
  { re: /~~([\s\S]+?)~~/, render: (m, k) => <s key={k}>{inline(m[1], k)}</s> },
  { re: /\*(?!\s)([^*\n]+?)(?<!\s)\*/, render: (m, k) => <em key={k}>{inline(m[1], k)}</em> },
  { re: /(?<![\w])_(?!\s)([^_\n]+?)(?<!\s)_(?![\w])/, render: (m, k) => <em key={k}>{inline(m[1], k)}</em> },
]

/** Formátovanie v rámci riadku – vždy sa spracuje najskorší výskyt. */
function inline(text: string, keyBase = 'i'): ReactNode[] {
  const out: ReactNode[] = []
  let rest = text
  let n = 0
  while (rest) {
    let best: { m: RegExpExecArray; rule: Rule } | null = null
    for (const rule of RULES) {
      const m = rule.re.exec(rest)
      if (m && (!best || m.index < best.m.index)) best = { m, rule }
    }
    if (!best) {
      out.push(rest)
      break
    }
    if (best.m.index > 0) out.push(rest.slice(0, best.m.index))
    out.push(best.rule.render(best.m, `${keyBase}-${n++}`))
    rest = rest.slice(best.m.index + best.m[0].length)
  }
  return out
}

/** Text správy s formátovaním po riadkoch (nadpisy, citáty, zoznamy, bloky kódu). */
export function Markdown({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let k = 0
  const key = () => `b${k++}`

  while (i < lines.length) {
    const line = lines[i]

    // ```blok kódu```
    if (line.trimStart().startsWith('```')) {
      const body: string[] = []
      const first = line.trimStart().slice(3)
      const closedOnFirst = first.endsWith('```') && first.length >= 3
      if (closedOnFirst) {
        body.push(first.slice(0, -3))
        i++
      } else {
        i++
        while (i < lines.length && !lines[i].trimEnd().endsWith('```')) body.push(lines[i++])
        if (i < lines.length) {
          const last = lines[i].trimEnd().slice(0, -3)
          if (last) body.push(last)
          i++
        }
      }
      blocks.push(
        <pre key={key()} className="my-1 overflow-x-auto rounded-[10px] border border-line bg-sunken p-3 font-mono text-[0.85em] leading-relaxed whitespace-pre">
          {body.join('\n')}
        </pre>,
      )
      continue
    }

    // >>> citát až do konca správy
    if (line.startsWith('>>> ')) {
      const rest = [line.slice(4), ...lines.slice(i + 1)].join('\n')
      blocks.push(
        <blockquote key={key()} className="my-0.5 border-l-4 border-line-strong pl-3">
          <Markdown text={rest} />
        </blockquote>,
      )
      break
    }

    const h = /^(#{1,3}) (.+)$/.exec(line)
    if (h) {
      const size = h[1].length === 1 ? 'text-[1.5rem]' : h[1].length === 2 ? 'text-[1.25rem]' : 'text-[1.08rem]'
      blocks.push(
        <div key={key()} className={cn('mt-1 font-bold leading-tight', size)}>
          {inline(h[2], key())}
        </div>,
      )
      i++
      continue
    }

    if (line.startsWith('-# ')) {
      blocks.push(
        <div key={key()} className="text-[0.8rem] text-ink-3">
          {inline(line.slice(3), key())}
        </div>,
      )
      i++
      continue
    }

    if (line.startsWith('> ') || line === '>') {
      const quoted: string[] = []
      while (i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>')) quoted.push(lines[i++].slice(2))
      blocks.push(
        <blockquote key={key()} className="my-0.5 border-l-4 border-line-strong pl-3">
          {quoted.map((q, j) => (
            <div key={j}>{q ? inline(q, `${key()}-${j}`) : ' '}</div>
          ))}
        </blockquote>,
      )
      continue
    }

    if (/^\s*[-*] /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*] /, ''))
      blocks.push(
        <ul key={key()} className="my-0.5 list-disc space-y-0.5 pl-6 marker:text-ink-3">
          {items.map((it, j) => (
            <li key={j}>{inline(it, `${key()}-${j}`)}</li>
          ))}
        </ul>,
      )
      continue
    }

    if (/^\s*\d+\. /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\. /.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\. /, ''))
      blocks.push(
        <ol key={key()} className="my-0.5 list-decimal space-y-0.5 pl-6 marker:text-ink-3">
          {items.map((it, j) => (
            <li key={j}>{inline(it, `${key()}-${j}`)}</li>
          ))}
        </ol>,
      )
      continue
    }

    blocks.push(<div key={key()}>{line ? inline(line, key()) : ' '}</div>)
    i++
  }

  return <div className="break-words">{blocks}</div>
}

/** Text bez formátovacích značiek – pre náhľad v zozname a citát odpovede. */
export function plainText(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, '[kód]')
    .replace(/^(#{1,3}|-#|>>>|>)\s+/gm, '')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1')
    .replace(/(\*\*|__|~~|\|\||`)/g, '')
    .replace(/(^|\s)[*_](\S[^*_]*?)[*_](?=\s|$)/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim()
}
