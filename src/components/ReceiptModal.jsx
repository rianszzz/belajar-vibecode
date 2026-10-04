import React, { useEffect, useRef } from 'react'
import { formatRp } from '../lib/money.js'

function lines(txn) {
  return [
    `Mini POS`,
    txn.receipt_no,
    new Date(txn.created_at).toLocaleString('id-ID'),
    `--------------------------------`,
    ...(Array.isArray(txn.items) ? txn.items : []).map(
      (i) => `${i.name}\n  ${i.qty} x ${formatRp(i.price).padEnd(14)} ${formatRp(i.qty * i.price)}`
    ),
    `--------------------------------`,
    `Subtotal          ${formatRp(txn.subtotal)}`,
    `Diskon            ${formatRp(txn.discount)}`,
    `TOTAL             ${formatRp(txn.total)}`,
    `Bayar             ${formatRp(txn.paid)}`,
    `Kembali           ${formatRp(txn.change)}`,
    `--------------------------------`,
    `Terima kasih!`,
  ].join('\n')
}

export default function ReceiptModal({ txn, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    ref.current?.focus()
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Struk pembayaran"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        ref={ref} tabIndex={-1}
        style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 16, maxWidth: 400, width: '100%', outline: 'none' }}
      >
        <pre className="receipt" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, margin: 0, whiteSpace: 'pre-wrap' }}>
          {lines(txn)}
        </pre>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={() => window.print()} style={{ flex: 1, padding: 10, background: 'var(--primary)', color: 'var(--primary-ink)', border: 'none', borderRadius: 'var(--radius)' }}>
            Cetak
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: 10 }}>Tutup</button>
        </div>
      </div>
    </div>
  )
}
