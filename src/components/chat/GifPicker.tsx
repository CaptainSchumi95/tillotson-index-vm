import { useEffect, useRef, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Search, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '@/components/ui/Sheet'
import { Spinner } from '@/components/ui/Spinner'
import { backend } from '@/data'
import { useGifFavorites, useToggleGifFavorite } from '@/data/chat'
import type { GifItem } from '@/data/types'
import { cn } from '@/lib/cn'

type Tab = 'favorites' | 'trending'

/**
 * Výber GIFu ako v Discorde: obľúbené (patria účtu, takže sú v každom tíme),
 * populárne a hľadanie. Ťuknutím sa GIF hneď odošle, hviezdičkou sa uloží.
 */
export function GifPicker({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onPick: (gif: GifItem) => void
}) {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('trending')
  const sentinel = useRef<HTMLDivElement>(null)
  const favorites = useGifFavorites()
  const toggleFavorite = useToggleGifFavorite()
  const favUrls = new Set((favorites.data ?? []).map((g) => g.full.url))

  // Pri otvorení začne obľúbenými, ak nejaké sú.
  useEffect(() => {
    if (open) setTab((favorites.data?.length ?? 0) > 0 ? 'favorites' : 'trending')
  }, [open])

  // Hľadá sa až po krátkej pauze v písaní.
  useEffect(() => {
    const id = setTimeout(() => setQuery(q.trim()), 350)
    return () => clearTimeout(id)
  }, [q])

  const showFavorites = !query && tab === 'favorites'

  const gifs = useInfiniteQuery({
    queryKey: ['gifs', query],
    queryFn: ({ pageParam }) => backend.searchGifs(query, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last.hasNext ? all.length + 1 : undefined),
    enabled: open && !showFavorites,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
  })

  // Ďalšia strana sa načíta, keď sa človek doscrolluje na koniec.
  useEffect(() => {
    const el = sentinel.current
    if (!el || !open || showFavorites) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && gifs.hasNextPage && !gifs.isFetchingNextPage) void gifs.fetchNextPage()
    })
    io.observe(el)
    return () => io.disconnect()
  }, [open, showFavorites, gifs.hasNextPage, gifs.isFetchingNextPage, gifs.data])

  const items = showFavorites ? (favorites.data ?? []) : (gifs.data?.pages.flatMap((p) => p.items) ?? [])
  const notConfigured = gifs.error instanceof Error && gifs.error.message === 'gifs_not_configured'

  const chip = (value: Tab, label: string, icon?: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setTab(value)}
      className={cn(
        'flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[0.88rem] font-semibold transition-colors',
        tab === value ? 'bg-accent-fill text-on-accent' : 'bg-sunken text-ink-2 hover:text-ink',
      )}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('chat.gif.title')}>
      <div className="sticky -top-3 z-10 -mx-6 bg-surface px-6 pt-0 pb-3">
        <label className="flex h-12 items-center gap-2.5 rounded-full bg-sunken px-4 focus-within:ring-2 focus-within:ring-accent">
          <Search className="size-5 shrink-0 text-ink-3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('chat.gif.search')}
            aria-label={t('chat.gif.search')}
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-3"
          />
        </label>
        {query ? (
          <div className="eyebrow mt-3">{t('chat.gif.results', { q: query })}</div>
        ) : (
          <div className="mt-3 flex gap-2">
            {chip('favorites', t('chat.gif.favorites'), <Star className={cn('size-4', tab === 'favorites' && 'fill-current')} />)}
            {chip('trending', t('chat.gif.trending'))}
          </div>
        )}
      </div>

      {!showFavorites && gifs.isPending && (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      )}
      {!showFavorites && gifs.isError && (
        <p className="py-12 text-center text-ink-3">{notConfigured ? t('chat.gif.notConfigured') : t('chat.gif.error')}</p>
      )}
      {!showFavorites && gifs.isSuccess && items.length === 0 && (
        <p className="py-12 text-center text-ink-3">{t('chat.gif.empty')}</p>
      )}
      {showFavorites && favorites.isSuccess && items.length === 0 && (
        <p className="mx-auto max-w-[320px] py-12 text-center text-ink-3">{t('chat.gif.noFavorites')}</p>
      )}

      <div className="columns-2 gap-2 sm:columns-3">
        {items.map((g) => {
          const fav = favUrls.has(g.full.url)
          return (
            <div key={g.id} className="relative mb-2 break-inside-avoid">
              <button
                type="button"
                onClick={() => onPick(g)}
                title={g.title}
                className="block w-full overflow-hidden rounded-[12px] bg-sunken transition-transform active:scale-[0.97]"
                style={{ aspectRatio: g.preview.w && g.preview.h ? `${g.preview.w} / ${g.preview.h}` : '1' }}
              >
                <img src={g.preview.url} alt={g.title} loading="lazy" draggable={false} className="size-full object-cover" />
              </button>
              <button
                type="button"
                aria-label={fav ? t('chat.gif.removeFavorite') : t('chat.gif.addFavorite')}
                title={fav ? t('chat.gif.removeFavorite') : t('chat.gif.addFavorite')}
                aria-pressed={fav}
                onClick={() => toggleFavorite.mutate({ gif: g, on: !fav })}
                className="absolute top-1.5 right-1.5 grid size-8 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-transform active:scale-90"
              >
                <Star className={cn('size-4', fav && 'fill-[#ffc53d] text-[#ffc53d]')} />
              </button>
            </div>
          )
        })}
      </div>
      <div ref={sentinel} className="h-px" />
      {!showFavorites && gifs.isFetchingNextPage && (
        <div className="grid place-items-center py-4">
          <Spinner />
        </div>
      )}
      <p className="pt-3 text-center text-[0.72rem] font-semibold tracking-[0.08em] text-ink-3 uppercase">
        {t('chat.gif.poweredBy')}
      </p>
    </Sheet>
  )
}
