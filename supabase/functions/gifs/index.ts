// Vyhľadávanie GIFov cez KLIPY – kľúč ostáva na serveri, aplikácia volá len túto funkciu.
// Premenné prostredia: KLIPY_KEY (app key z partner.klipy.com)

import { createClient } from 'npm:@supabase/supabase-js@2'

const KEY = Deno.env.get('KLIPY_KEY')
const PER_PAGE = 24

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

type Format = { url?: string; width?: number; height?: number }
type Item = { id?: number | string; slug?: string; title?: string; type?: string; file?: Record<string, Record<string, Format>> }

/** Prvá dostupná veľkosť – animované WebP je menšie než GIF. */
function pick(file: Item['file'], sizes: string[]) {
  for (const s of sizes) {
    const f = file?.[s]
    const v = f?.webp?.url ? f.webp : f?.gif
    if (v?.url) return { url: v.url, w: v.width ?? 0, h: v.height ?? 0 }
  }
  return null
}

/** KLIPY chce stále rovnaké id používateľa – posielame len jeho odtlačok, nie skutočné id. */
async function customerId(userId: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`tillotson:${userId}`))
  return Array.from(new Uint8Array(hash).slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return json({ error: 'unauthorized' }, 401)
  if (!KEY) return json({ error: 'not_configured' }, 503)

  const { q = '', page = 1 } = await req.json().catch(() => ({}))
  const query = String(q).trim().slice(0, 80)
  const url = new URL(`https://api.klipy.com/api/v1/${KEY}/gifs/${query ? 'search' : 'trending'}`)
  url.searchParams.set('page', String(Math.max(1, Number(page) || 1)))
  url.searchParams.set('per_page', String(PER_PAGE))
  url.searchParams.set('customer_id', await customerId(user.id))
  url.searchParams.set('locale', 'sk')
  url.searchParams.set('content_filter', 'medium')
  if (query) url.searchParams.set('q', query)

  const res = await fetch(url)
  if (!res.ok) return json({ error: 'upstream', status: res.status }, 502)
  const body = await res.json()

  const items = ((body?.data?.data ?? []) as Item[])
    .filter((x) => x.type !== 'ad' && x.file)
    .map((x) => ({
      id: String(x.id ?? x.slug),
      title: x.title ?? '',
      preview: pick(x.file, ['sm', 'xs', 'md']),
      full: pick(x.file, ['md', 'hd', 'sm']),
    }))
    .filter((x) => x.preview && x.full)

  return json({ items, hasNext: !!body?.data?.has_next })
})
