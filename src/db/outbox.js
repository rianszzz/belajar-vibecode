import { db } from './db.js'
import { backoffFor } from '../sync/backoff.js'

// Satu-satunya penulis outbox (aturan AGENTS.md #4). Checkout menulis via
// db.outbox.add langsung di dalam transaction Dexie-nya (lihat txns.js).

function backoffMs(attempts) {
  return backoffFor(attempts)
}

// Pola filter dipisah agar testable (mengikuti pola backoffFor) — jangan copy di test
export function filterDue(all, now, force) {
  const due = force ? all : all.filter((r) => r.retry_at <= now)
  return due.sort((a, b) => a.retry_at - b.retry_at).slice(0, 50)
}

export async function dueBatch(limit = 50, force = false) {
  const all = await db.outbox.toArray()
  return filterDue(all, Date.now(), force).slice(0, limit)
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
