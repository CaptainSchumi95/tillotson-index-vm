import { del } from 'idb-keyval'

export const QUERY_CACHE_KEY = 'ti-query-cache'

/**
 * Verzia tvaru uložených dát. Zvýš ju vždy, keď sa zmení tvar údajov
 * z backendu (nové pole a pod.) – stará cache v prehliadačoch sa zahodí.
 */
export const QUERY_CACHE_SCHEMA = 10

/** Zahodí lokálne uložené dáta a načíta aplikáciu znova (záchranná brzda). */
export async function resetLocalCache() {
  try {
    await del(QUERY_CACHE_KEY)
  } finally {
    window.location.assign('/')
  }
}
