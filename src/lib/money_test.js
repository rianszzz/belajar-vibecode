import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cartTotal, changeDue, formatRp } from './money.js'

test('total: qty × harga, diskon, tanpa float error', () => {
  const items = [
    { qty: 3, price: 15000 },
    { qty: 1, price: 2500 },
  ]
  const { subtotal, total } = cartTotal(items, 500)
  assert.equal(subtotal, 47500)
  assert.equal(total, 47000)
})

test('diskon > subtotal atau negatif ditolak', () => {
  assert.throws(() => cartTotal([{ qty: 1, price: 1000 }], 2000))
  assert.throws(() => cartTotal([{ qty: 1, price: 1000 }], -1))
})

test('kembalian dan format', () => {
  assert.equal(changeDue(50000, 47000), 3000)
  assert.equal(changeDue(47000, 47000), 0)
  assert.equal(formatRp(47500), 'Rp47.500')
})
