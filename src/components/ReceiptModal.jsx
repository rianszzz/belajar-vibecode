import React, { useEffect, useRef } from 'react'
import { formatRp } from '../lib/money.js'

function lines(txn) {
  return (
    <>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>MINI POS</div>
        <div style={{ color: 'var(--muted)', fontSize: 12 }}>Struk Digital — Bukan Faktur Pajak</div>
      </div>
      <hr className="receipt-divider" />
      <div className="row"><span className="k">No. Struk</span><b>{txn.receipt_no}</b></div>
      <div className="row"><span className="k">Tanggal</span><span>{new Date(txn.created_at).toLocaleString('id-ID')}</span></div>
      <hr className="receipt-divider" />
      {txn.items.map((i) => (
        <div key={i.uuid} style={{ marginBottom: 4 }}>
          <div>{i.name}</div>
          <div className="row">
            <span className="k">{i.qty} x {formatRp(i.price)}</span>
            <span>{formatRp(i.qty * i.price)}</span>
          </div>
        </div>
      ))}
      <hr className="receipt-divider" />
      <div className="row"><span className="k">Subtotal</span><span>{formatRp(txn.subtotal)}</span></div>
      <div className="row"><span className="k">Diskon</span><span>{formatRp(txn.discount)}</span></div>
      <div className="row" style={{ fontWeight: 700, fontSize: 15 }}><span>TOTAL</span><span>{formatRp(txn.total)}</span></div>
      <div className="row"><span className="k">Bayar</span><span>{formatRp(txn.paid)}</span></div>
      <div className="row"><span className="k">Kembali</span><span>{formatRp(txn.change)}</span></div>
      <hr className="receipt-divider" />
      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Terima kasih!</div>
    </>
  )
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
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div ref={ref} tabIndex={-1} className="modal-card" style={{ outline: 'none' }}>
        <div className="receipt">
          {lines(txn)}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-md)' }}>
          <button onClick={() => window.print()} className="btn-primary" style={{ flex: 1, minHeight: 44 }}>
            Cetak
          </button>
          <button onClick={onClose} style={{ flex: 1, minHeight: 44, border: 'none', borderRadius: 'var(--radius-xl)', background: 'var(--surface-high)' }}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
