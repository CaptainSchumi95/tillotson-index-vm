import { useEffect, useRef, useState } from 'react'
import { Camera, ImageIcon, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { dominantColors, onColor, rgbToHex } from '@/lib/color'
import { Button } from './Button'
import { Sheet } from './Sheet'

/**
 * Farba z obrázka: odfotí sa logo (napr. na kombinéze či kamióne) alebo sa vyberie
 * obrázok / logo tímu. Ťuknutím na miesto sa farba nasníma, hlavné farby sa ponúknu samé.
 */
export function ImageColorSheet({
  open,
  onOpenChange,
  logoUrl,
  initial,
  onPick,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  logoUrl?: string | null
  initial: string
  onPick: (hex: string) => void
}) {
  const { t } = useTranslation()
  const [src, setSrc] = useState<string | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [marker, setMarker] = useState<{ x: number; y: number } | null>(null)
  const [suggested, setSuggested] = useState<string[]>([])
  const [unreadable, setUnreadable] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const objectUrl = useRef<string | null>(null)

  // Pri otvorení začneme logom tímu (ak je).
  useEffect(() => {
    if (!open) return
    setPicked(null)
    setMarker(null)
    setSrc((cur) => cur ?? logoUrl ?? null)
  }, [open])

  useEffect(() => () => void (objectUrl.current && URL.revokeObjectURL(objectUrl.current)), [])

  const loadFile = (file: File | undefined) => {
    if (!file) return
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    objectUrl.current = URL.createObjectURL(file)
    setPicked(null)
    setMarker(null)
    setSrc(objectUrl.current)
  }

  // Vykreslenie obrázka a hlavné farby.
  useEffect(() => {
    if (!src || !open) return
    let alive = true
    const img = new Image()
    if (/^https?:/.test(src)) img.crossOrigin = 'anonymous'
    img.onload = () => {
      const c = canvas.current
      if (!alive || !c) return
      const maxW = c.parentElement?.clientWidth ?? 360
      const scale = Math.min(maxW / img.width, 300 / img.height, 4)
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      c.style.width = `${Math.round(img.width * scale)}px`
      c.style.height = `${Math.round(img.height * scale)}px`
      c.width = Math.round(img.width * scale * dpr)
      c.height = Math.round(img.height * scale * dpr)
      const ctx = c.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, c.width, c.height)
      try {
        const small = document.createElement('canvas')
        small.width = 64
        small.height = Math.max(1, Math.round((64 * img.height) / img.width))
        const sctx = small.getContext('2d')!
        sctx.drawImage(img, 0, 0, small.width, small.height)
        setSuggested(dominantColors(sctx.getImageData(0, 0, small.width, small.height).data))
        setUnreadable(false)
      } catch {
        // Obrázok z iného servera bez povolenia – farby sa z neho čítať nedajú.
        setSuggested([])
        setUnreadable(true)
      }
    }
    img.onerror = () => alive && setUnreadable(true)
    img.src = src
    return () => {
      alive = false
    }
  }, [src, open])

  const sample = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvas.current
    if (!c) return
    const r = c.getBoundingClientRect()
    const fx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const fy = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    setMarker({ x: fx, y: fy })
    try {
      const ctx = c.getContext('2d', { willReadFrequently: true })!
      const x = Math.min(c.width - 3, Math.max(0, Math.round(fx * c.width) - 1))
      const y = Math.min(c.height - 3, Math.max(0, Math.round(fy * c.height) - 1))
      const d = ctx.getImageData(x, y, 3, 3).data
      let rr = 0
      let gg = 0
      let bb = 0
      for (let i = 0; i < d.length; i += 4) {
        rr += d[i]
        gg += d[i + 1]
        bb += d[i + 2]
      }
      setPicked(rgbToHex([rr / 9, gg / 9, bb / 9]))
    } catch {
      setUnreadable(true)
    }
  }

  const current = picked ?? initial

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('color.imageTitle')}
      description={src ? t('color.imageHint') : undefined}
      footer={
        <div className="flex items-center gap-3">
          <span
            className="size-12 shrink-0 rounded-[14px] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)]"
            style={{ background: current }}
          />
          <span className="display tnum min-w-0 flex-1 text-[1.15rem] tracking-[0.06em]">{current.toUpperCase()}</span>
          <Button type="button" disabled={!picked} onClick={() => picked && onPick(picked)}>
            {t('color.use')}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" icon={<Camera className="size-4" />} onClick={() => cameraInput.current?.click()}>
            {t('color.takePhoto')}
          </Button>
          <Button type="button" variant="secondary" size="sm" icon={<ImageIcon className="size-4" />} onClick={() => fileInput.current?.click()}>
            {t('color.chooseImage')}
          </Button>
          {logoUrl && src !== logoUrl && (
            <Button type="button" variant="secondary" size="sm" icon={<Shield className="size-4" />} onClick={() => setSrc(logoUrl)}>
              {t('color.teamLogo')}
            </Button>
          )}
        </div>
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => loadFile(e.target.files?.[0])} />
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => loadFile(e.target.files?.[0])} />

        {src ? (
          <div className="grid place-items-center rounded-[18px] bg-[repeating-conic-gradient(var(--sunken)_0_25%,var(--surface)_0_50%)] bg-[length:20px_20px] p-3">
            <div className="relative">
              <canvas
                ref={canvas}
                onPointerDown={(e) => {
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId)
                  } catch {
                    /* ukazovateľ už neexistuje */
                  }
                  sample(e)
                }}
                onPointerMove={(e) => e.buttons && sample(e)}
                className="block max-w-full cursor-crosshair touch-none rounded-[10px]"
              />
              {marker && picked && (
                <span
                  className="pointer-events-none absolute size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_2px_10px_rgb(0_0_0/0.45)]"
                  style={{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%`, background: picked }}
                />
              )}
            </div>
          </div>
        ) : (
          <p className="rounded-[18px] bg-sunken px-5 py-8 text-center text-ink-2">{t('color.emptyImage')}</p>
        )}

        {unreadable && <p className="text-[0.9rem] text-danger">{t('color.unreadable')}</p>}

        {suggested.length > 0 && (
          <div className="space-y-2.5">
            <div className="eyebrow px-1">{t('color.suggested')}</div>
            <div className="flex flex-wrap gap-2.5">
              {suggested.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => {
                    setPicked(c)
                    setMarker(null)
                  }}
                  className={cn(
                    'grid size-12 place-items-center rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)] transition-transform active:scale-90',
                    picked === c && 'ring-2 ring-offset-2 ring-offset-surface',
                  )}
                  style={{ background: c, color: onColor(c), ['--tw-ring-color' as string]: c }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}
