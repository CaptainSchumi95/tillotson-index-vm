import { memo, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { posterDesign, posterLines, seeded, type PosterDesign } from '@/lib/poster'

const W = 400
const H = 640
/** Priemerná šírka veľkého písmena Saira pri zúžení 62 % (násobok veľkosti písma). */
const GLYPH = 0.47

const font = {
  fontFamily: "'Saira Variable', 'Archivo Variable', sans-serif",
  fontStretch: '62%',
  fontWeight: 800,
} as const

/**
 * Plagát trate v štýle FIA WEC+ – vykreslený priamo v aplikácii (ostrý, bez sťahovania obrázkov).
 * Každá trať má vlastný motív vo farbách svojej krajiny.
 */
export const TrackPoster = memo(function TrackPoster({
  track,
  className,
}: {
  track: { name: string; location: string; lengthM?: number | null }
  className?: string
}) {
  const d = posterDesign(track)
  const rnd = seeded(d.seed)
  const lines = posterLines(track.name)

  let art: ReactNode
  let title: ReactNode
  switch (d.style) {
    case 'stripes':
      art = <Stripes d={d} rnd={rnd} />
      title = <Title lines={lines} x={28} y={62} width={344} height={170} max={92} d={d} />
      break
    case 'sweep':
      art = <Sweep d={d} />
      title = <Title lines={lines} x={28} y={62} width={240} height={190} max={86} d={d} />
      break
    case 'bolt':
      art = <Bolt d={d} rnd={rnd} />
      title = <Title lines={lines} x={28} y={62} width={344} height={186} max={88} d={d} />
      break
    case 'rings':
      art = <Rings d={d} />
      title = <Title lines={lines} x={28} y={62} width={344} height={150} max={88} d={d} />
      break
    case 'waves':
      art = <Waves d={d} />
      title = <Title lines={lines} x={28} y={62} width={344} height={170} max={88} d={d} />
      break
    case 'fan':
      art = <Fan d={d} />
      title = <Title lines={lines} x={28} y={448} width={344} height={160} max={80} d={d} />
      break
    case 'ribbon':
      art = <Ribbon d={d} />
      title = <Title lines={lines} x={28} y={62} width={344} height={200} max={88} d={d} />
      break
  }

  const length = track.lengthM ? `${new Intl.NumberFormat('sk').format(track.lengthM)} M` : ''
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={track.name} className={cn('block h-auto w-full', className)}>
      <rect width={W} height={H} fill={d.bg} />
      {art}
      {title}
      {/* Hlavička: miesto a dĺžka */}
      <g style={{ ...font, fontStretch: '100%', fontWeight: 700 }} fontSize={13} letterSpacing={1.2} fill={d.ink} opacity={0.9}>
        <text x={28} y={36}>{[d.city.toLocaleUpperCase('sk'), d.country].filter(Boolean).join(' · ')}</text>
        {length && (
          <text x={372} y={36} textAnchor="end">
            {length}
          </text>
        )}
      </g>
    </svg>
  )
})

/** Názov trate – každý riadok čo najväčší, no celý sa zmestí do svojej zóny (šírka aj výška). */
function Title({
  lines,
  x,
  y,
  width,
  height,
  max,
  d,
  anchor = 'start',
  outline,
}: {
  lines: string[]
  x: number
  y: number
  width: number
  height: number
  max: number
  d: PosterDesign
  anchor?: 'start' | 'end'
  outline?: boolean
}) {
  const fit = lines.map((line) => Math.min(max, width / Math.max(1, line.length * GLYPH)))
  const total = fit.reduce((s, size, i) => s + size * (i === 0 ? 0.86 : 0.98), 0)
  const scale = total > height ? height / total : 1
  let top = y
  return (
    <g style={font} fill={d.ink} textAnchor={anchor}>
      {lines.map((line, i) => {
        const size = fit[i] * scale
        const natural = line.length * size * GLYPH
        top += size * (i === 0 ? 0.86 : 0.98)
        return (
          <text
            key={i}
            x={x}
            y={top}
            fontSize={size}
            // Istota, že sa riadok zmestí (odhad šírky písma nie je presný).
            textLength={natural > width ? width : undefined}
            lengthAdjust="spacingAndGlyphs"
            stroke={outline ? d.bg : undefined}
            strokeWidth={outline ? size * 0.12 : undefined}
            strokeLinejoin="round"
            paintOrder="stroke"
          >
            {line}
          </text>
        )
      })}
    </g>
  )
}

/** Vodorovné rýchlostné pruhy (ako Imola). */
function Stripes({ d, rnd }: { d: PosterDesign; rnd: () => number }) {
  const bars: ReactNode[] = []
  let y = 250
  let i = 0
  while (y < H - 30) {
    const h = 9 + Math.floor(rnd() * 3) * 5
    const color = d.colors[i % 3]
    // Pruh rozdelený na 1–3 úseky s medzerami
    let x = rnd() < 0.3 ? rnd() * 90 : 0
    const end = 160 + rnd() * 240
    while (x < end) {
      const seg = 40 + rnd() * 180
      bars.push(<rect key={`${i}-${x}`} x={x} y={y} width={Math.min(seg, end - x)} height={h} fill={color} />)
      x += seg + 6 + rnd() * 14
    }
    y += h + 7
    i++
  }
  return <g>{bars}</g>
}

/** Široký oblúk cez celý plagát (ako Spa). */
function Sweep({ d }: { d: PosterDesign }) {
  const path = 'M -90 720 C 40 430, 440 500, 340 -80'
  return (
    <g fill="none" strokeLinecap="butt">
      <path d={path} stroke={d.colors[0]} strokeWidth={190} />
      <path d={path} stroke={d.colors[1]} strokeWidth={70} />
      <path d={path} stroke={d.colors[2]} strokeWidth={10} />
    </g>
  )
}

/** Šikmé rýchlostné pásy pod diagonálnym rezom (ako Le Mans). */
function Bolt({ d, rnd }: { d: PosterDesign; rnd: () => number }) {
  const bands: ReactNode[] = []
  let x = -260
  for (let i = 0; x < 700; i++) {
    const w = 22 + rnd() * 54
    bands.push(<rect key={i} x={x} y={-400} width={w} height={1500} fill={d.colors[i % 3]} />)
    x += w + 12 + rnd() * 30
  }
  return (
    <g>
      <g transform="rotate(34 200 320)">{bands}</g>
      {/* Rez: hore čistá plocha pre názov */}
      <polygon points="0,0 400,0 400,250 0,352" fill={d.bg} />
      <line x1={0} y1={356} x2={400} y2={254} stroke={d.colors[0]} strokeWidth={9} />
    </g>
  )
}

/** Sústredné oblúky a slnko (ako Fuji). */
function Rings({ d }: { d: PosterDesign }) {
  const cx = 64
  const cy = 480
  const arcs: ReactNode[] = []
  for (let r = 36, i = 0; r < 262; r += 24, i++) {
    const a0 = (-70 * Math.PI) / 180
    const a1 = (250 * Math.PI) / 180
    const p = (a: number) => `${cx + r * Math.cos(a)} ${cy - r * Math.sin(a)}`
    arcs.push(<path key={r} d={`M ${p(a0)} A ${r} ${r} 0 1 0 ${p(a1)}`} stroke={d.colors[i % 2]} strokeWidth={11} fill="none" />)
  }
  return (
    <g>
      {arcs}
      <circle cx={cx + 96} cy={cy} r={34} fill={d.colors[2]} />
    </g>
  )
}

/** Vlnité zvislé pruhy a šachovnica cieľa (ako Barcelona). */
function Waves({ d }: { d: PosterDesign }) {
  const paths: ReactNode[] = []
  for (let i = 0, x = -20; x < W + 40; i++, x += 34) {
    let p = `M ${x} 250`
    for (let y = 250; y < 600; y += 50) p += ` q ${i % 2 ? 22 : -22} 25 0 50`
    paths.push(<path key={i} d={p} stroke={d.colors[i % 2]} strokeWidth={20} fill="none" />)
  }
  const squares: ReactNode[] = []
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 20; c++)
      if ((r + c) % 2 === 0) squares.push(<rect key={`${r}-${c}`} x={c * 20} y={600 + r * 20} width={20} height={20} fill={d.colors[2]} />)
  return (
    <g>
      {paths}
      <rect x={0} y={600} width={W} height={40} fill={d.bg} />
      {squares}
    </g>
  )
}

/** Vejár čiar z rohu (ako Lone Star). */
function Fan({ d }: { d: PosterDesign }) {
  const lines: ReactNode[] = []
  const ox = 40
  const oy = 420
  for (let i = 0; i < 44; i++) {
    const a = ((-6 - i * 1.9) * Math.PI) / 180
    lines.push(
      <line key={i} x1={ox} y1={oy} x2={ox + 760 * Math.cos(a)} y2={oy + 760 * Math.sin(a)} stroke={d.colors[i % 2]} strokeWidth={2.6} />,
    )
  }
  return (
    <g>
      <g strokeLinecap="round">{lines}</g>
      {/* Čistý pás pre hlavičku */}
      <rect width={W} height={56} fill={d.bg} />
    </g>
  )
}

/** Vlniace sa pásy vlajky (ako Monza). */
function Ribbon({ d }: { d: PosterDesign }) {
  return (
    <g fill="none">
      {d.colors.map((c, i) => (
        <path key={i} d={`M -60 ${330 + i * 74} C 120 ${250 + i * 74}, 200 ${560 + i * 40}, 470 ${470 + i * 50}`} stroke={c} strokeWidth={78} />
      ))}
    </g>
  )
}
