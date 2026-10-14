import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import tiWordmark from '@/assets/brand/ti-wordmark.png'
import tiIdx from '@/assets/brand/ti-idx.png'
import vilimWordmark from '@/assets/brand/vilim-wordmark.svg'

function Mask({ src, ratio, className, label }: { src: string; ratio: number; className?: string; label?: string }) {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('brand-mask inline-block', className)}
      style={{ maskImage: `url(${src})`, WebkitMaskImage: `url(${src})`, aspectRatio: ratio }}
    />
  )
}

/** Logo „TILLOTSON INDEX“ vo farbe textu. */
export function TiWordmark({ className }: { className?: string }) {
  return <Mask src={tiWordmark} ratio={900 / 380} className={className} label="Tillotson Index" />
}

/** Skratka „IDX“ vo farbe textu. */
export function TiMark({ className }: { className?: string }) {
  return <Mask src={tiIdx} ratio={400 / 243} className={className} label="Tillotson Index" />
}

export function VilimWordmark({ className }: { className?: string }) {
  return <Mask src={vilimWordmark} ratio={4376.6 / 1128.56} className={className} label="Vilim Motorsport" />
}

/** Podpis „Vyvinul Vilim Motorsport“. */
export function VilimCredit({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="eyebrow text-current! tracking-[0.12em]! opacity-60">{t('app.developedBy')}</span>
      <VilimWordmark className="h-[18px] opacity-85" />
    </span>
  )
}
