// Push notifikácie v prehliadači / nainštalovanej aplikácii.
// Verejný VAPID kľúč (súkromný je iba v Supabase – funkcia „push“).

import { backend } from '@/data'

export const VAPID_PUBLIC_KEY = 'BGUIcSg9C1WRLlpyKmJWIsJ_mQn4o86HFibZ5haMeaWgeZf7NQWu6MxVkg5hhFeOVgr3qwMIZRK7GHRW_tIFDIo'

export type PushStatus =
  | 'unsupported' //  prehliadač to nevie
  | 'needs-install' // iPhone / iPad: funguje iba v aplikácii pridanej na plochu
  | 'denied' //       používateľ zablokoval upozornenia
  | 'off' //          ešte nezapnuté
  | 'on'

export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

function supported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function registration() {
  // V režime vývoja (bez service workera) by „ready“ čakal donekonečna.
  const reg = await navigator.serviceWorker.getRegistration()
  return reg ?? null
}

export async function pushStatus(): Promise<PushStatus> {
  if (isIos() && !isStandalone()) return 'needs-install'
  if (!supported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted') return 'off'
  const reg = await registration()
  const sub = await reg?.pushManager.getSubscription()
  return sub ? 'on' : 'off'
}

function keyBytes(base64url: string) {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

const b64 = (buf: ArrayBuffer | null) =>
  buf ? btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : ''

async function saveSubscription(sub: PushSubscription) {
  await backend.savePushSubscription({
    endpoint: sub.endpoint,
    p256dh: b64(sub.getKey('p256dh')),
    auth: b64(sub.getKey('auth')),
    userAgent: navigator.userAgent.slice(0, 200),
  })
}

/** Zapne upozornenia (musí sa volať po ťuknutí používateľa). Vráti nový stav. */
export async function enablePush(): Promise<PushStatus> {
  const status = await pushStatus()
  if (status === 'unsupported' || status === 'needs-install' || status === 'on') return status
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off'
  const reg = await registration()
  if (!reg) return 'unsupported'
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }))
  await saveSubscription(sub)
  return 'on'
}

/** Pri štarte: ak sú upozornenia povolené, uistí sa, že server pozná aktuálny odber. */
export async function syncPush() {
  if (!supported() || Notification.permission !== 'granted') return
  const reg = await registration()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) await saveSubscription(sub)
}

/** Odhlásenie zariadenia (pri odhlásení z aplikácie). */
export async function disablePush() {
  if (!supported()) return
  const reg = await registration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await backend.removePushSubscription(sub.endpoint).catch(() => {})
  await sub.unsubscribe()
}
