import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, verifyPassword } from './auth.js'

test('PBKDF2: hash & verify, termasuk salt byte >127', async () => {
  const h = await hashPassword('admin123')
  assert.ok(h.startsWith('pbkdf2$100000$'))
  assert.equal(await verifyPassword('admin123', h), true)
  assert.equal(await verifyPassword('salah', h), false)

  // paksa salt dengan byte tinggi: hash 10x, pastikan semua bisa diverifikasi
  for (let i = 0; i < 10; i++) {
    const x = await hashPassword('kasir123')
    assert.equal(await verifyPassword('kasir123', x), true)
  }
})
