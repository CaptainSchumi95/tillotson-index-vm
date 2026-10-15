import { useEffect, useRef, useState } from 'react'
import { Check, ImageIcon, Pipette } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import {
  cmykToRgb,
  hexToRgb,
  hsvToRgb,
  normalizeHex,
  onColor,
  rgbToCmyk,
  rgbToHex,
  rgbToHsv,
  TEAM_COLORS,
  type CMYK,
} from '@/lib/color'
import { Button } from './Button'
import { ImageColorSheet } from './ImageColorSheet'
import { Segmented } from './Segmented'

type Mode = 'picker' | 'rgb' | 'cmyk'

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> }

/**
 * Farba tímu: rýchle návrhy, HEX kód (oficiálna farba tímu), RGB / CMYK,
 * vizuálny výber, farba z loga či fotky a na počítači aj priamo z obrazovky.
 */
export function ColorPicker({
  value,
  onChange,
  logoUrl,
}: {
  value: string
  onChange: (color: string) => void
  /** Logo tímu – ponúkne sa ako obrázok na výber farby. */
  logoUrl?: string | null
}) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('picker')
  const [imageOpen, setImageOpen] = useState(false)
  const hex = normalizeHex(value) ?? '#1d56e9'
  const eyeDropper = (window as Window & { EyeDropper?: EyeDropperCtor }).EyeDropper

  const fromScreen = async () => {
    if (!eyeDropper) return
    try {
      const { sRGBHex } = await new eyeDropper().open()
      const picked = normalizeHex(sRGBHex)
      if (picked) onChange(picked)
    } catch {
      /* zrušené klávesom Esc */
    }
  }

  return (
    <div className="space-y-4">
      {/* Rýchle návrhy */}
      <div className="grid grid-cols-6 gap-2.5 sm:grid-cols-12">
        {TEAM_COLORS.map((c) => {
          const active = c === hex
          return (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={active}
              onClick={() => onChange(c)}
              className={cn(
                'grid aspect-square place-items-center rounded-full shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] transition-transform duration-150 active:scale-90',
                active && 'ring-2 ring-offset-2 ring-offset-surface',
              )}
              style={{ background: c, color: onColor(c), ['--tw-ring-color' as string]: c }}
            >
              {active && <Check className="size-[45%]" strokeWidth={3} />}
            </button>
          )
        })}
      </div>

      {/* Vlastná farba */}
      <div className="space-y-4 rounded-[20px] border border-line bg-card p-4 shadow-card">
        <div className="flex items-end gap-3">
          <span
            className="size-[52px] shrink-0 rounded-[14px] shadow-[inset_0_1px_0_rgb(255_255_255/0.25),inset_0_0_0_1px_rgb(0_0_0/0.08)]"
            style={{ background: hex }}
          />
          <HexField value={hex} onChange={onChange} />
        </div>

        <Segmented
          value={mode}
          onChange={setMode}
          label={t('color.custom')}
          options={[
            { value: 'picker', label: t('color.picker') },
            { value: 'rgb', label: t('color.rgb') },
            { value: 'cmyk', label: t('color.cmyk') },
          ]}
        />

        {mode === 'picker' && <HsvPicker value={hex} onChange={onChange} />}
        {mode === 'rgb' && (
          <div className="grid grid-cols-3 gap-2.5">
            {(['R', 'G', 'B'] as const).map((label, i) => (
              <NumField
                key={label}
                label={label}
                value={hexToRgb(hex)[i]}
                max={255}
                onCommit={(v) => {
                  const rgb = hexToRgb(hex)
                  rgb[i] = v
                  onChange(rgbToHex(rgb))
                }}
              />
            ))}
          </div>
        )}
        {mode === 'cmyk' && (
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2">
              {(['C', 'M', 'Y', 'K'] as const).map((label, i) => (
                <NumField
                  key={label}
                  label={label}
                  suffix="%"
                  value={rgbToCmyk(hexToRgb(hex))[i]}
                  max={100}
                  onCommit={(v) => {
                    const cmyk = rgbToCmyk(hexToRgb(hex)) as CMYK
                    cmyk[i] = v
                    onChange(rgbToHex(cmykToRgb(cmyk)))
                  }}
                />
              ))}
            </div>
            <p className="px-1 text-[0.8rem] text-ink-3">{t('color.cmykHint')}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" icon={<ImageIcon className="size-4" />} onClick={() => setImageOpen(true)}>
            {t('color.fromImage')}
          </Button>
          {eyeDropper && (
            <Button type="button" variant="secondary" size="sm" icon={<Pipette className="size-4" />} onClick={() => void fromScreen()}>
              {t('color.fromScreen')}
            </Button>
          )}
        </div>
      </div>

      <ImageColorSheet
        open={imageOpen}
        onOpenChange={setImageOpen}
        logoUrl={logoUrl}
        initial={hex}
        onPick={(c) => {
          onChange(c)
          setImageOpen(false)
        }}
      />
    </div>
  )
}

/** HEX kód – prijme „E30613“, „#e30613“ aj skrátené „#e06“. */
function HexField({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(value.slice(1).toUpperCase())
  const [focused, setFocused] = useState(false)
  const valid = !!normalizeHex(draft)

  useEffect(() => {
    if (!focused) setDraft(value.slice(1).toUpperCase())
  }, [value, focused])

  return (
    <label className="min-w-0 flex-1 space-y-1.5">
      <span className="block px-1 text-[0.82rem] font-semibold text-ink-2">{t('color.hex')}</span>
      <span
        className={cn(
          'flex h-[52px] items-center rounded-[14px] border bg-surface px-4 transition-[border-color,box-shadow]',
          'focus-within:shadow-[0_0_0_4px_var(--accent-soft)]',
          valid ? 'border-line-strong focus-within:border-accent' : 'border-danger',
        )}
      >
        <span className="display mr-1 text-[1.05rem] text-ink-3">#</span>
        <input
          value={draft}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9a-fA-F#]/g, '').replace(/#/g, '').slice(0, 6).toUpperCase()
            setDraft(v)
            const hex = normalizeHex(v)
            if (hex && v.length === 6) onChange(hex)
          }}
          onPaste={(e) => {
            const hex = normalizeHex(e.clipboardData.getData('text'))
            if (!hex) return
            e.preventDefault()
            setDraft(hex.slice(1).toUpperCase())
            onChange(hex)
          }}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          aria-label={t('color.hex')}
          className="display tnum h-full min-w-0 flex-1 bg-transparent text-[1.15rem] tracking-[0.06em] text-ink outline-none"
        />
      </span>
    </label>
  )
}

/** Číslo s hranicami (RGB 0–255, CMYK 0–100). */
function NumField({
  label,
  value,
  max,
  suffix,
  onCommit,
}: {
  label: string
  value: number
  max: number
  suffix?: string
  onCommit: (v: number) => void
}) {
  const [draft, setDraft] = useState(String(value))
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (!focused) setDraft(String(value))
  }, [value, focused])

  return (
    <label className="space-y-1">
      <span className="block text-center text-[0.78rem] font-bold text-ink-3">{label}</span>
      <span className="flex h-12 items-center rounded-[12px] border border-line-strong bg-surface px-2.5 transition-colors focus-within:border-accent">
        <input
          value={draft}
          inputMode="numeric"
          onFocus={(e) => {
            setFocused(true)
            e.target.select()
          }}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 3)
            setDraft(v)
            if (v !== '') onCommit(Math.min(max, Number(v)))
          }}
          aria-label={label}
          className="tnum h-full w-full min-w-0 bg-transparent text-center font-semibold text-ink outline-none"
        />
        {suffix && <span className="text-[0.8rem] text-ink-3">{suffix}</span>}
      </span>
    </label>
  )
}

/** Vizuálny výber: plocha sýtosť × jas a pás odtieňa. Funguje prstom aj myšou. */
function HsvPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [hsv, setHsv] = useState(() => rgbToHsv(hexToRgb(value)))
  const last = useRef(value)
  const area = useRef<HTMLDivElement>(null)
  const hue = useRef<HTMLDivElement>(null)

  // Zmena zvonku (návrh, HEX, obrázok) – odtieň sa pri sivých farbách zachová.
  useEffect(() => {
    if (value === last.current) return
    last.current = value
    const next = rgbToHsv(hexToRgb(value))
    setHsv((cur) => (next[1] === 0 ? [cur[0], 0, next[2]] : next))
  }, [value])

  const emit = (next: [number, number, number]) => {
    setHsv(next)
    const hex = rgbToHex(hsvToRgb(next))
    last.current = hex
    onChange(hex)
  }

  const drag = (el: HTMLDivElement | null, apply: (x: number, y: number) => void) => (e: React.PointerEvent) => {
    if (!el) return
    e.preventDefault()
    try {
      el.setPointerCapture(e.pointerId)
    } catch {
      /* ukazovateľ už neexistuje */
    }
    const move = (ev: PointerEvent | React.PointerEvent) => {
      const r = el.getBoundingClientRect()
      apply(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)))
    }
    move(e)
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }

  const [h, s, v] = hsv
  const current = rgbToHex(hsvToRgb(hsv))

  return (
    <div className="space-y-3">
      <div
        ref={area}
        onPointerDown={(e) => drag(area.current, (x, y) => emit([h, x, 1 - y]))(e)}
        className="relative h-44 touch-none rounded-[14px] select-none"
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${h} 100% 50%))` }}
      >
        <span
          className="pointer-events-none absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_2px_8px_rgb(0_0_0/0.35)]"
          style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: current }}
        />
      </div>
      <div
        ref={hue}
        onPointerDown={(e) => drag(hue.current, (x) => emit([x * 360, s, v]))(e)}
        className="relative h-7 touch-none rounded-full select-none"
        style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
      >
        <span
          className="pointer-events-none absolute top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_2px_8px_rgb(0_0_0/0.35)]"
          style={{ left: `${(h / 360) * 100}%`, background: `hsl(${h} 100% 50%)` }}
        />
      </div>
    </div>
  )
}
