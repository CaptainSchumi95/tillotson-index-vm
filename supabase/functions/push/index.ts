// Tillotson Index – rozoslanie push notifikácií po novej správe.
//
// Volá ju databáza (trigger notify_push cez pg_net) s tajným kľúčom z app_config.
// Pošle upozornenie všetkým, kto správu môže čítať, okrem autora.
// Premenné prostredia: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// (SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY dodá Supabase automaticky).

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'https://tillotson-index-vm.vercel.app',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

/** Text bez formátovacích značiek (do upozornenia). */
function plain(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, '[kód]')
    .replace(/^(#{1,3}|-#|>)\s+/gm, '')
    .replace(/(\*\*|__|~~|\|\||\*|_|`)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

Deno.serve(async (req) => {
  const { data: cfg } = await sb.from('app_config').select('value').eq('key', 'push_secret').single()
  if (!cfg || req.headers.get('x-push-secret') !== cfg.value) return new Response('forbidden', { status: 403 })

  const { message_id } = await req.json()
  const { data: m } = await sb
    .from('messages')
    .select('id, body, author_id, channel_id, team_id')
    .eq('id', message_id)
    .single()
  if (!m) return new Response('no message', { status: 404 })

  const [{ data: ch }, { data: team }, { data: author }] = await Promise.all([
    sb.from('channels').select('kind, member_a, member_b').eq('id', m.channel_id).single(),
    sb.from('teams').select('name').eq('id', m.team_id).single(),
    sb.from('profiles').select('name').eq('id', m.author_id).single(),
  ])
  if (!ch) return new Response('no channel', { status: 404 })

  // Príjemcovia: dvojica pri priamej správe, inak celý tím. Nikdy nie autor.
  let recipients: string[]
  if (ch.kind === 'direct') {
    recipients = [ch.member_a, ch.member_b]
  } else {
    const { data: members } = await sb.from('memberships').select('profile_id').eq('team_id', m.team_id)
    recipients = (members ?? []).map((x) => x.profile_id)
  }
  recipients = recipients.filter((id) => id && id !== m.author_id)
  if (recipients.length === 0) return new Response('ok')

  const { data: subs } = await sb.from('push_subscriptions').select('id, endpoint, p256dh, auth').in('profile_id', recipients)
  if (!subs?.length) return new Response('ok')

  const who = author?.name || 'Člen tímu'
  const title =
    ch.kind === 'direct'
      ? who
      : `${ch.kind === 'announcements' ? '📢 Nástenka' : 'Tímová skupina'} · ${team?.name ?? ''}`
  const body = ch.kind === 'direct' ? plain(m.body) : `${who}: ${plain(m.body)}`
  const payload = JSON.stringify({
    title,
    body: body.length > 180 ? body.slice(0, 177) + '…' : body,
    url: `/chat/${m.channel_id}?team=${m.team_id}`,
    tag: m.channel_id,
  })

  // Neplatné odbery (odinštalovaná aplikácia, zrušené povolenie) sa zmažú.
  const dead: string[] = []
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 60 * 60 * 24,
          urgency: ch.kind === 'announcements' ? 'high' : 'normal',
        })
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) dead.push(s.id)
      }
    }),
  )
  if (dead.length) await sb.from('push_subscriptions').delete().in('id', dead)

  return new Response('ok')
})
