import React, { useEffect, useState } from 'react'
import { useAuth } from '../state/auth-context.jsx'
import { db } from '../db/db.js'
import { formatRp } from '../lib/money.js'
import ReceiptModal from '../components/ReceiptModal.jsx'

const STATUS_COLOR = { synced: 'var(--ok)', pending: 'var(--warning)', conflicted: 'var(--danger)', resolved: 'var(--muted)' }

export default function History() {
  const { user, logout } = useAuth()
  const [txns, setTxns] = useState([])
  const [open, setOpen] = useState(null)

  useEffect(() => {
    db.transactions.orderBy('created_at').reverse().limit(50).toArray().then(setTxns)
  }, [])

  return (
    <main style={{ padding: 'var(--space-lg)', maxWidth: 640, margin: '0 auto' }}>
      <h1 className="t-headline-md" style={{ marginTop: 0 }}>Riwayat Transaksi</h1>

      {txns.length === 0 && <p style={{ color: 'var(--muted)' }}>Belum ada transaksi.</p>}

      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {txns.map((t) => (
          <li key={t.uuid}>
            <button
              onClick={() => setOpen(t)}
              style={{
                width: '100%', textAlign: 'left', padding: 'var(--space-md)',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-sm)',
              }}
            >
              <div>
                <div className="t-label-sm t-mono">{t.receipt_no}</div>
                <div className="t-body-sm" style={{ color: 'var(--muted)' }}>
                  {new Date(t.created_at).toLocaleString('id-ID')} · {t.items.length} item
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="t-headline-md t-mono" style={{ color: 'var(--primary)' }}>{formatRp(t.total)}</div>
                <div className="t-label-sm" style={{ color: STATUS_COLOR[t.status] }}>{t.status}</div>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {open && <ReceiptModal txn={open} onClose={() => setOpen(null)} />}
    </main>
  )
}
