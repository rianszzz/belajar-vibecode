import React, { useEffect, useState } from 'react'
import { useAuth } from '../state/auth-context.jsx'
import { db } from '../db/db.js'
import { formatRp } from '../lib/money.js'
import ReceiptModal from '../components/ReceiptModal.jsx'
import SyncBadge from '../components/SyncBadge.jsx'

export default function History() {
  const { user, logout } = useAuth()
  const [txns, setTxns] = useState([])
  const [open, setOpen] = useState(null)

  useEffect(() => {
    // terbaru dulu; orderBy memakai index created_at
    db.transactions.orderBy('created_at').reverse().limit(50).toArray().then(setTxns)
  }, [])

  return (
    <main style={{ padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>Riwayat Transaksi</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <SyncBadge />
          <span style={{ color: 'var(--muted)' }}>{user.username} ({user.role})</span>
          <button onClick={logout} style={{ padding: '6px 12px' }}>Keluar</button>
        </div>
      </header>

      {txns.length === 0 && <p style={{ color: 'var(--muted)', marginTop: 16 }}>Belum ada transaksi.</p>}

      <ul style={{ listStyle: 'none', padding: 0, marginTop: 12 }}>
        {txns.map((t) => (
          <li key={t.uuid}>
            <button
              onClick={() => setOpen(t)}
              style={{ width: '100%', textAlign: 'left', padding: 10, marginBottom: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
            >
              <span style={{ fontWeight: 600 }}>{t.receipt_no}</span>
              <span style={{ float: 'right' }}>
                {new Date(t.created_at).toLocaleString('id-ID')} · {formatRp(t.total)} ·{' '}
                <span style={{ color: t.status === 'synced' ? 'var(--ok)' : t.status === 'pending' ? 'var(--warning)' : 'var(--danger)' }}>{t.status}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open && <ReceiptModal txn={open} onClose={() => setOpen(null)} />}
    </main>
  )
}
