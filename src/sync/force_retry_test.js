import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filterDue } from '../db/outbox.js'

// Force retry: sync manual harus mengirim SEMUA item outbox, bukan hanya yang
// sudah jatuh tempo backoff — root cause "offline → online, sync tak jalan".

test('dueBatch tanpa force: hanya item yang jatuh tempo', () => {
  const now = 1_000_000
  const all = [
    { txn_uuid: 'a', retry_at: now - 1 },
    { txn_uuid: 'b', retry_at: now + 30 * 60 * 1000 }, // backoff panjang
  ]
  assert.deepEqual(filterDue(all, now, false).map((r) => r.txn_uuid), ['a'])
})

test('dueBatch force: SEMUA item diambil walau masih backoff', () => {
  const now = 1_000_000
  const all = [
    { txn_uuid: 'a', retry_at: now + 30 * 60 * 1000 },
    { txn_uuid: 'b', retry_at: now + 5 * 60 * 1000 },
  ]
  assert.equal(filterDue(all, now, true).length, 2)
})

test('edge: outbox kosong & limit 50 dihormati', () => {
  assert.deepEqual(filterDue([], Date.now(), true), [])
  const many = Array.from({ length: 60 }, (_, i) => ({ txn_uuid: String(i), retry_at: 0 }))
  assert.equal(filterDue(many, Date.now(), true).length, 50)
})
