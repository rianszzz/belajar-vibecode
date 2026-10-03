import Dexie from 'dexie'

// Skema sesuai REQUIREMENTS.md §5 — versi & migrasi terpusat di sini.
export const db = new Dexie('pos-db')

db.version(1).stores({
  products: 'uuid, barcode, name, category, updated_at',
  transactions: 'uuid, status, created_at, device_seq',
  receipts: 'txn_uuid',
  outbox: 'txn_uuid, retry_at',
  meta: 'key',
  users: 'username',
})

export const meta = {
  async get(key, fallback = null) {
    const row = await db.meta.get(key)
    return row ? row.value : fallback
  },
  set(key, value) {
    return db.meta.put({ key, value })
  },
}

export async function ensureDeviceId() {
  let id = await meta.get('device_id')
  if (!id) {
    id = crypto.randomUUID()
    await meta.set('device_id', id)
  }
  return id
}
