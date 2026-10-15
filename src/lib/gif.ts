import type { GifFile } from '@/data/types'

/**
 * GIF v správe = celé telo správy je odkaz na GIF z KLIPY (v ukážke obrázok SVG).
 * Rozmery sú v časti za # (w, h), aby sa miesto rezervovalo ešte pred načítaním.
 */
const GIF_RE = /^(https:\/\/static\.klipy\.com\/\S+|data:image\/svg\+xml,\S+)$/

export function parseGif(body: string): GifFile | null {
  const text = body.trim()
  if (!GIF_RE.test(text)) return null
  const hash = text.lastIndexOf('#')
  const url = hash > 0 ? text.slice(0, hash) : text
  const params = new URLSearchParams(hash > 0 ? text.slice(hash + 1) : '')
  return { url, w: Number(params.get('w')) || 0, h: Number(params.get('h')) || 0 }
}

export function gifBody(file: GifFile) {
  return `${file.url}#w=${file.w}&h=${file.h}`
}
