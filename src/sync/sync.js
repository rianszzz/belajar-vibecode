import { api } from './api.js'
import { db, meta } from '../db/db.js'
import { dueBatch, markSuccess, markConflict, markRetry } from '../db/outbox.js'

let syncing = false

// Idempoten: boleh dipanggil berulang kapan pun; lock mencegah dobel loop
export async function syncNow() {
  if (syncing) return { skipped: true }
  if (!navigator.onLine) return { offline: true }
  syncing = true
  try {
    const pushRes = await pushPending()
    const pullRes = await pullProducts()
    await meta.set('last_sync', new Date().toISOString())
    return { pushed: pushRes, pulled: pullRes }
  } finally {
    syncing = false
  }
}

async function pushPending() {
  const batch = await dueBatch(50)
  if (batch.length === 0) return { processed: 0 }

  const res = await api('/transactions/batch', {
    method: 'POST',
    body: batch.map((e) => e.payload),
  })

  // Network/5xx gagal total: retry semua dengan backoff — data tetap di antrean
  if (!res.ok) {
    for (const entry of batch) await markRetry(entry)
    return { processed: 0, failed: batch.length }
  }

  for (const entry of batch) {
    const item = res.data.results?.find((r) => r.uuid === entry.payload.uuid)
    if (!item) {
      await markRetry(entry) // respons tidak lengkap: anggap gagal
      continue
    }
    if (item.status === 'synced' || item.status === 'duplicate') {
      await markSuccess(entry.txn_uuid)
    } else if (item.status === 'conflict') {
      await markConflict(entry.txn_uuid, item.server_stock)
    } else {
      await markRetry(entry)
    }
  }
  return { processed: batch.length }
}

async function pullProducts() {
  const since = await meta.get('watermark', '1970-01-01T00:00:00.000Z')
  const res = await api(`/products/changes?since=${encodeURIComponent(since)}`)
  if (!res.ok) return { pulled: 0 }

  const { products, next_since } = res.data
  if (products?.length) {
    await db.products.bulkPut(products)
  }
  if (next_since) await meta.set('watermark', next_since)
  return { pulled: products?.length || 0 }
}

// Trigger: event online + interval 30s + tombol manual
export function startAutoSync() {
  window.addEventListener('online', () => syncNow())
  setInterval(() => syncNow(), 30_000)
  syncNow() // sekali saat startup
}
