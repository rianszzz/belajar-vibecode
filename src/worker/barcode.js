// Generator barcode internal EAN-13 (prefix 2 = in-store use, standar GS1)
export function ean13Checksum(digits12) {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += Number(digits12[i]) * (i % 2 === 0 ? 1 : 3)
  }
  return (10 - (sum % 10)) % 10
}

export function generateEan13(random = Math.random) {
  let d = '2'
  for (let i = 0; i < 11; i++) d += Math.floor(random() * 10)
  return d + ean13Checksum(d)
}
