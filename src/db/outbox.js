import { db } from './db.js'
import { backoffFor } from '../sync/backoff.js'

// Satu-satunya penulis outbox (aturan AGENTS.md #4). Checkout menulis via
// db.outbox.add langsung di dalam transaction Dexie-nya (lihat txns.js).

function backoffMs(attempts) {
  return backoffFor(attempts)
}

export async function dueBatch(limit = 50) {
  const now = Date.now()
  const all = await db.outbox.where('retry_at').belowOrEqual(now).toArray()
  return all.sort((a, b) => a.retry_at - b.retry_at).slice(0, limit)
}

export function markSuccess(txnUuid) {
  return db.transaction('rw', db.outbox, db.transactions, async () => {
    await db.outbox.delete(txnUuid)
    await db.transactions.update(txnUuid, { status: 'synced' })
  })
}

export async function markConflict(txnUuid, serverStock) {
  return db.transaction('rw', db.outbox, db.transactions, db.products, async () => {
    await db.outbox.delete(txnUuid)
    await db.transactions.update(txnUuid, { status: 'conflicted', server_stock: serverStock })
    // terapkan stok server (sumber kebenaran) untuk item yang konflik
    for (const s of serverStock || []) {
      await db.products.update(s.uuid, { stock: s.stock })
    }
  })
}

export function markRetry(entry) {
  const attempts = (entry.attempts || 0) + 1
  return db.outbox.update(entry.txn_uuid, { attempts, retry_at: Date.now() + backoffMs(attempts) })
}
