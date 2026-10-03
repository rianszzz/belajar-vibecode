import { db } from './db.js'

// Konflik diselesaikan LOKAL (keputusan pengguna): stok server = truth, sudah
// diterapkan markConflict. Aksi admin hanya menandai resolved di device ini.
// ponytail: resolusi tidak dikirim ke server (log audit hilang) — tambahkan
// endpoint /conflicts/resolve + outbox entry bila multi-admin audit dibutuhkan.

export async function conflictedTxns() {
  return db.transactions.where('status').equals('conflicted').toArray()
}

export async function resolveConflict(txnUuid) {
  // guard status: hanya conflicted → resolved (dobel-tap / race dengan sync aman)
  return db.transactions
    .where('uuid').equals(txnUuid)
    .and((t) => t.status === 'conflicted')
    .modify({ status: 'resolved' })
}
