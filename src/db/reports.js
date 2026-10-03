import { db } from './db.js'

// Laporan harian dari IndexedDB — offline penuh.
// Angka server (/reports/daily) dipakai sebagai pembanding setelah sync penuh.

function localDateStr(iso) {
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export async function dailyReport(dateStr) {
  const txns = (await db.transactions.where('created_at').startsWith(dateStr).toArray())
    .filter((t) => t.status === 'synced' || t.status === 'pending' || t.status === 'resolved')

  const revenue = txns.reduce((s, t) => s + t.total, 0)
  const itemQty = new Map()
  for (const t of txns) {
    for (const i of t.items) {
      itemQty.set(i.name, (itemQty.get(i.name) || 0) + i.qty)
    }
  }
  const topItems = [...itemQty.entries()]
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)

  return { date: dateStr, count: txns.length, revenue, topItems }
}

export { localDateStr }
