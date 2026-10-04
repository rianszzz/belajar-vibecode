import React, { useEffect, useState } from 'react'
import { dailyReport, localDateStr } from '../db/reports.js'
import { formatRp } from '../lib/money.js'

export default function Report() {
  const [date, setDate] = useState(localDateStr(new Date()))
  const [rep, setRep] = useState(null)

  useEffect(() => {
    dailyReport(date).then(setRep)
  }, [date])

  return (
    <main style={{ padding: 'var(--space-lg)', maxWidth: 640, margin: '0 auto' }}>
      <h1 className="t-headline-md" style={{ marginTop: 0 }}>Laporan Harian</h1>

      <label htmlFor="repdate" className="t-label-sm" style={{ display: 'block', marginTop: 'var(--space-md)' }}>Tanggal</label>
      <input id="repdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-mono" style={{ width: 'auto' }} />

      {rep && (
        <>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-md)' }}>
              <div className="t-body-sm" style={{ color: 'var(--muted)' }}>Transaksi</div>
              <div className="t-headline-lg">{rep.count}</div>
            </div>
            <div style={{ flex: 1, minWidth: 160, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-md)' }}>
              <div className="t-body-sm" style={{ color: 'var(--muted)' }}>Pendapatan</div>
              <div className="t-headline-lg t-mono" style={{ color: 'var(--primary)' }}>{formatRp(rep.revenue)}</div>
            </div>
          </div>

          <h2 className="t-headline-md" style={{ fontSize: 15, marginTop: 'var(--space-xl)' }}>Item Terlaris</h2>
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
