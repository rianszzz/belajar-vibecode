import { test } from 'node:test'
import assert from 'node:assert/strict'

// Uji parsing respons batch + idempotensi LOGIKA (tanpa DB browser).
// Logika dipindah ke fungsi murni di sini agar bisa dites Node tanpa IndexedDB.

export function applyResponses(batch, results) {
  // batch: [{txn_uuid}], results: [{uuid, status}] — return per-entry aksi
  return batch.map((entry) => {
    const item = results.find((r) => r.uuid === entry.payload.uuid)
    if (!item) return { uuid: entry.payload.uuid, action: 'retry' }
    if (item.status === 'synced' || item.status === 'duplicate') return { uuid: entry.payload.uuid, action: 'success' }
    if (item.status === 'conflict') return { uuid: entry.payload.uuid, action: 'conflict', stock: item.server_stock }
    return { uuid: entry.payload.uuid, action: 'retry' }
  })
}

test('parsing respons batch: synced/duplicate/conflict/missing', () => {
  const batch = [
    { txn_uuid: 't1', payload: { uuid: 't1' } },
    { txn_uuid: 't2', payload: { uuid: 't2' } },
    { txn_uuid: 't3', payload: { uuid: 't3' } },
    { txn_uuid: 't4', payload: { uuid: 't4' } },
  ]
  const results = [
    { uuid: 't1', status: 'synced' },
    { uuid: 't2', status: 'duplicate' },
    { uuid: 't3', status: 'conflict', server_stock: [{ uuid: 'p1', stock: 2 }] },
    // t4 hilang dari respons
  ]
  const actions = applyResponses(batch, results)
  assert.deepEqual(actions[0], { uuid: 't1', action: 'success' })
  assert.deepEqual(actions[1], { uuid: 't2', action: 'success' })
  assert.deepEqual(actions[2], { uuid: 't3', action: 'conflict', stock: [{ uuid: 'p1', stock: 2 }] })
  assert.deepEqual(actions[3], { uuid: 't4', action: 'retry' })
})

test('idempotensi: hasil sama saat dipanggil 2× (duplicate = success)', () => {
  const batch = [{ txn_uuid: 't1', payload: { uuid: 't1' } }]
  const first = applyResponses(batch, [{ uuid: 't1', status: 'synced' }])
  // server menerima ulang UUID sama → duplicate, client tetap success
  const second = applyResponses(batch, [{ uuid: 't1', status: 'duplicate' }])
  assert.equal(first[0].action, 'success')
  assert.equal(second[0].action, 'success')
})

// backoff: panggilan berulang tidak boleh spam — uji fungsi backoff via import? outbox.js pakai Dexie.
// Cukup assert pola: attempts naik → delay naik, dipakai bersama markRetry di outbox.
test('backoff monoton naik dengan attempts', async () => {
  const { backoffFor } = await import('./backoff.js')
  let prev = 0
  for (let i = 1; i <= 5; i++) {
    const ms = backoffFor(i)
    assert.ok(ms > prev, `attempt ${i} harus lebih lambat dari sebelumnya`)
    prev = ms
  }
  assert.ok(backoffFor(99) <= 1_980_000 + 198_000) // cap 30m + jitter
})
