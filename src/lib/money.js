export function toMoney(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.round(n)
}

export function formatRp(n) {
  return 'Rp' + toMoney(n).toLocaleString('id-ID')
}

export function cartTotal(items, discount = 0) {
  const subtotal = items.reduce((s, i) => s + i.qty * toMoney(i.price), 0)
  const disc = toMoney(discount)
  if (disc < 0 || disc > subtotal) throw new Error('Diskon tidak valid')
  return { subtotal, total: subtotal - disc }
}

export function changeDue(paid, total) {
  return toMoney(paid) - toMoney(total)
}
