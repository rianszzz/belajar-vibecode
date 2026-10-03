import React, { useEffect, useState } from 'react'
import { useAuth } from '../state/auth-context.jsx'
import { dailyReport, localDateStr } from '../db/reports.js'
import { formatRp } from '../lib/money.js'
import SyncBadge from '../components/SyncBadge.jsx'

export default function Report() {
  const { user, logout } = useAuth()
  const [date, setDate] = useState(localDateStr(new Date()))
  const [rep, setRep] = useState(null)

  useEffect(() => {
    dailyReport(date).then(setRep)
  }, [date])

  return (
    <main style={{ padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>Laporan Harian</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <SyncBadge />
          <span style={{ color: 'var(--muted)' }}>{user.username} ({user.role})</span>
          <button onClick={logout} style={{ padding: '6px 12px' }}>Keluar</button>
        </div>
      </header>

      <label htmlFor="repdate" style={{ display: 'block', marginTop: 16 }}>Tanggal</label>
      <input id="repdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: 8 }} />

      {rep && (
        <>
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>Transaksi</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{rep.count}</div>
            </div>
            <div style={{ flex: 1, minWidth: 160, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>Pendapatan</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{formatRp(rep.revenue)}</div>
            </div>
          </div>

          <h2 style={{ fontSize: 15, marginTop: 24 }}>Item Terlaris</h2>
          {rep.topItems.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>Tidak ada penjualan pada tanggal ini.</p>
          ) : (
            <table style={{ borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
                  <th style={{ padding: '6px 16px 6px 0' }}>Item</th>
                  <th style={{ padding: 6 }}>Qty terjual</th>
                </tr>
              </thead>
              <tbody>
                {rep.topItems.map((i) => (
                  <tr key={i.name} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 16px 6px 0' }}>{i.name}</td>
                    <td style={{ padding: 6 }}>{i.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </main>
  )
}
