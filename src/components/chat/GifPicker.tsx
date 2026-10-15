import { useEffect, useRef, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '@/components/ui/Sheet'
import { Spinner } from '@/components/ui/Spinner'
import { backend } from '@/data'
import type { GifItem } from '@/data/types'

/** Ťuknutím sa GIF hneď odošle. Bez hľadania sa ukazujú práve populárne. */
export function GifPicker({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; onPick: (gif: GifItem) => void }) {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const sentinel = useRef<HTMLDivElement>(null)

  // Hľadá sa až po krátkej pauze v písaní.
  useEffect(() => {
    const id = setTimeout(() => setQuery(q.trim()), 350)
    return () => clearTimeout(id)
  }, [q])

  const gifs = useInfiniteQuery({
    queryKey: ['gifs', query],
    queryFn: ({ pageParam }) => backend.searchGifs(query, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last.hasNext ? all.length + 1 : undefined),
    enabled: open,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
  })

  // Ďalšia strana sa načíta, keď sa človek doscrolluje na koniec.
  useEffect(() => {
    const el = sentinel.current
    if (!el || !open) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && gifs.hasNextPage && !gifs.isFetchingNextPage) void gifs.fetchNextPage()
    })
    io.observe(el)
    return () => io.disconnect()
  }, [open, gifs.hasNextPage, gifs.isFetchingNextPage, gifs.data])

  const items = gifs.data?.pages.flatMap((p) => p.items) ?? []
  const notConfigured = gifs.error instanceof Error && gifs.error.message === 'gifs_not_configured'

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
        <div className="eyebrow mt-3">{query ? t('chat.gif.results', { q: query }) : t('chat.gif.trending')}</div>
      </div>

      {gifs.isPending && (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      )}
      {gifs.isError && <p className="py-12 text-center text-ink-3">{notConfigured ? t('chat.gif.notConfigured') : t('chat.gif.error')}</p>}
      {gifs.isSuccess && items.length === 0 && <p className="py-12 text-center text-ink-3">{t('chat.gif.empty')}</p>}

      <div className="columns-2 gap-2 sm:columns-3">
        {items.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onPick(g)}
            title={g.title}
            className="mb-2 block w-full break-inside-avoid overflow-hidden rounded-[12px] bg-sunken transition-transform active:scale-[0.97]"
            style={{ aspectRatio: g.preview.w && g.preview.h ? `${g.preview.w} / ${g.preview.h}` : '1' }}
          >
            <img src={g.preview.url} alt={g.title} loading="lazy" draggable={false} className="size-full object-cover" />
          </button>
        ))}
      </div>
      <div ref={sentinel} className="h-px" />
      {gifs.isFetchingNextPage && (
        <div className="grid place-items-center py-4">
          <Spinner />
        </div>
      )}
      <p className="pt-3 text-center text-[0.72rem] font-semibold tracking-[0.08em] text-ink-3 uppercase">{t('chat.gif.poweredBy')}</p>
    </Sheet>
  )
}
