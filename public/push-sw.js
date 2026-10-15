// Push notifikácie – načítava ich service worker aplikácie (workbox importScripts).

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Tillotson Index', body: event.data ? event.data.text() : '' }
  }

  event.waitUntil(
    (async () => {
      // Ak má človek túto konverzáciu práve otvorenú na obrazovke, neotravujeme ho.
      const path = String(data.url || '').split('?')[0]
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const watching = wins.some((w) => w.visibilityState === 'visible' && new URL(w.url).pathname === path)
      if (watching) return

      await self.registration.showNotification(data.title || 'Tillotson Index', {
        body: data.body || '',
        tag: data.tag,
        renotify: true,
        icon: '/pwa-192.png',
        badge: '/favicon-64.png',
        data: { url: data.url || '/' },
      })
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const w of wins) {
        if ('focus' in w) {
          await w.focus()
          if ('navigate' in w) await w.navigate(url)
          return
        }
      }
      await self.clients.openWindow(url)
    })(),
  )
})
