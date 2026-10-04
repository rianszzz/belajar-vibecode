import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ean13Checksum, generateEan13 } from './barcode.js'

test('EAN-13 checksum & generator', () => {
  // checksum digit terakhir EAN-13 valid: 4006381333931 → 1
  assert.equal(ean13Checksum('400638133393'), 1)
  assert.equal(ean13Checksum('888600001001'), 8) // seed seed.sql pakai 8886000010018
  for (let i = 0; i < 50; i++) {
    const b = generateEan13()
    assert.match(b, /^2\d{12}$/)
    assert.equal(ean13Checksum(b.slice(0, 12)), Number(b[12]))
  }
})
