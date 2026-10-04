import { db, meta, ensureDeviceId } from './db.js'

export async function saveProducts(products) {
  await db.products.bulkPut(products)
}

// Katalog untuk UI: hanya produk aktif, cari nama/barcode, filter kategori
export async function searchProducts(query = '', category = '') {
  let items
  if (query) {
    const q = query.toLowerCase()
    items = await db.products.where('name').startsWithIgnoreCase(q).toArray()
    if (items.length === 0) {
      const byBarcode = await db.products.where('barcode').equals(query).toArray()
      items = byBarcode
    }
  } else if (category) {
    items = await db.products.where('category').equals(category).toArray()
  } else {
    items = await db.products.toArray()
  }
  return items.filter((p) => p.active).sort((a, b) => a.name.localeCompare(b.name))
}

export async function categories() {
  const all = await db.products.toArray()
  return [...new Set(all.filter((p) => p.active).map((p) => p.category).filter(Boolean))]
}

// Alur panas: transaksi + receipt + outbox + stok + seq — satu transaksi Dexie.
// Gagal di tengah = rollback semua (tidak ada transaksi "setengah jadi").
export async function checkout({ items, subtotal, discount, total, paid }) {
  const deviceId = await ensureDeviceId()
  const uuid = crypto.randomUUID()
  const now = new Date().toISOString()

  return db.transaction('rw', db.products, db.transactions, db.receipts, db.outbox, db.meta, async () => {
    // validasi stok ulang di dalam transaksi
    for (const it of items) {
      const p = await db.products.get(it.uuid)
      if (!p || p.stock < it.qty) throw new Error(`Stok ${it?.name || it.uuid} tidak cukup`)
    }

    let seq = (await meta.get('receipt_seq', 0)) + 1
    await meta.set('receipt_seq', seq)
    const receiptNo = `DEV${deviceId.slice(0, 8)}-${String(seq).padStart(6, '0')}`

    const txn = {
      uuid,
      device_id: deviceId,
      receipt_no: receiptNo,
      created_at: now,
      items: items.map((i) => ({ uuid: i.uuid, name: i.name, price: i.price, qty: i.qty })),
      subtotal,
      discount,
      total,
      paid,
      change: paid - total,
      status: 'pending',
    }

    await db.transactions.add(txn)
    await db.receipts.add({ txn_uuid: uuid, ...txn })
    await db.outbox.add({ txn_uuid: uuid, payload: txn, attempts: 0, retry_at: 0 })

    for (const it of items) {
      // Dexie 4: callback update harus MUTASI objek yang diterima, bukan return spread baru
      // (return {...p} tidak diterapkan — bug ditemukan saat uji offline lokal)
      await db.products.update(it.uuid, (p) => {
        p.stock = p.stock - it.qty
        return p
      })
    }

    return txn
  })
}

export async function pendingCount() {
  return db.outbox.count()
}

export async function transactionsByDate(dateStr) {
  // dateStr: 'YYYY-MM-DD' (lokal)
  const all = await db.transactions.where('created_at').startsWith(dateStr).toArray()
  return all.sort((a, b) => b.created_at.localeCompare(a.created_at))
}
