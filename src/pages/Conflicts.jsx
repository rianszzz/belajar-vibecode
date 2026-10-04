import React, { useEffect, useState } from 'react'
import { useAuth } from '../state/auth-context.jsx'
import { conflictedTxns, resolveConflict } from '../db/conflicts.js'
import { formatRp } from '../lib/money.js'
import SyncBadge from '../components/SyncBadge.jsx'

export default function Conflicts() {
  const { user, logout } = useAuth()
  const [txns, setTxns] = useState([])

  const reload = () => conflictedTxns().then(setTxns)
  // useEffect callback HARUS return undefined/function — return Promise → crash saat unmount
  useEffect(() => { reload() }, [])

  async function accept(txn) {
    await resolveConflict(txn.uuid)
    reload()
  }

  return (
    <main style={{ padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>Konflik Stok</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <SyncBadge />
          <span style={{ color: 'var(--muted)' }}>{user.username} ({user.role})</span>
          <button onClick={logout} style={{ padding: '6px 12px' }}>Keluar</button>
        </div>
      </header>

      {txns.length === 0 && <p style={{ color: 'var(--muted)', marginTop: 16 }}>Tidak ada konflik. 🎉</p>}

      {txns.map((txn) => (
        <div key={txn.uuid} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginTop: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {txn.receipt_no} — {new Date(txn.created_at).toLocaleString('id-ID')}
          </div>
          <table style={{ width: '100%', marginTop: 8, fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
                <th style={{ padding: 4 }}>Item</th>
                <th style={{ padding: 4 }}>Diminta</th>
                <th style={{ padding: 4 }}>Stok server</th>
              </tr>
            </thead>
            <tbody>
              {txn.items.map((i) => {
                const ss = txn.server_stock?.find((s) => s.uuid === i.uuid)
                return (
                  <tr key={i.uuid} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 4 }}>{i.name}</td>
                    <td style={{ padding: 4, color: 'var(--danger)' }}>{i.qty}</td>
                    <td style={{ padding: 4, color: 'var(--ok)' }}>{ss ? ss.stock : '?'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ marginTop: 8, fontSize: 13 }}>Total transaksi: {formatRp(txn.total)}</div>
          <button
            onClick={() => accept(txn)}
            style={{ marginTop: 8, padding: '8px 14px', background: 'var(--primary)', color: 'var(--primary-ink)', border: 'none', borderRadius: 'var(--radius)' }}
          >
            Terima stok server
          </button>
        </div>
      ))}
    </main>
  )
}
