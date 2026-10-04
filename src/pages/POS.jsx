import React, { useEffect, useMemo, useState } from 'react'
import { useSync } from '../state/sync-context.jsx'
import { useCart } from '../state/cart-context.jsx'
import { cartTotal, formatRp, changeDue } from '../lib/money.js'
import { searchProducts, categories, checkout } from '../db/txns.js'
import ReceiptModal from '../components/ReceiptModal.jsx'
import Scanner from '../components/Scanner.jsx'

export default function POS() {
  const { refresh, dataVersion } = useSync()
  const { state, dispatch } = useCart()
  const [products, setProducts] = useState([])
  const [cats, setCats] = useState([])
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('')
  const [paid, setPaid] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)

  const reload = () => {
    searchProducts(query, cat).then(setProducts)
    categories().then(setCats)
  }
  // reload saat query/cat berubah ATAU setelah pull sync membawa katalog baru
  // (callback useEffect harus return undefined — bukan Promise)
  useEffect(() => { reload() }, [query, cat, dataVersion])

  const { subtotal, total } = useMemo(() => {
    try {
      return cartTotal(state.items, state.discount)
    } catch {
      return { subtotal: 0, total: 0 }
    }
  }, [state.items, state.discount])

  const change = changeDue(Number(paid) || 0, total)

  async function onPay() {
    setError('')
    try {
      const txn = await checkout({
        items: state.items,
        subtotal,
        discount: state.discount,
        total,
        paid: Number(paid) || total,
      })
      setReceipt(txn)
      dispatch({ type: 'clear' })
      setPaid('')
      reload()
      refresh()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <main style={{ padding: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
        {/* Katalog */}
        <section style={{ flex: 2, minWidth: 300 }}>
          <input
            placeholder="Cari nama / barcode…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: '100%', padding: 10 }}
            aria-label="Cari produk"
          />
          <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
            <button onClick={() => setScanning(true)} style={{ padding: '8px 14px' }} aria-label="Pindai barcode kamera">
              📷 Scan
            </button>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap', margin: 'var(--space-sm) 0' }}>
            <button onClick={() => setCat('')} className={`cat-pill ${!cat ? 'active' : ''}`}>Semua</button>
            {cats.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`cat-pill ${cat === c ? 'active' : ''}`}>{c}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--space-sm)' }}>
            {products.map((p) => (
              <button
                key={p.uuid}
                onClick={() => dispatch({ type: 'add', product: p })}
                disabled={p.stock === 0}
                className="product-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                  <span className="product-chip">{p.category || '—'}</span>
                  <span className="stock-chip">Stok: {p.stock}</span>
                </div>
                <div className="t-label-md" style={{ margin: 'var(--space-xs) 0' }}>{p.name}</div>
                <div className="product-barcode">{p.barcode || '—'}</div>
                <div className="product-price">{formatRp(p.price)}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Keranjang */}
        <section style={{ flex: 1, minWidth: 300, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-md)' }}>
          <h2 className="t-headline-md" style={{ margin: 0 }}>Keranjang</h2>
          {state.items.length === 0 && <p style={{ color: 'var(--muted)' }}>Belum ada item.</p>}
          {state.items.map((i) => (
            <div key={i.uuid} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', margin: 'var(--space-sm) 0', background: 'var(--surface-low)', borderRadius: 'var(--radius)', padding: 'var(--space-sm)' }}>
              <div style={{ flex: 1 }}>
                <div className="t-label-sm">{i.name}</div>
                <div className="t-body-sm" style={{ color: 'var(--muted)' }}>{formatRp(i.price)} × {i.qty}</div>
              </div>
              <button aria-label={`Kurangi ${i.name}`} className="qty-btn" onClick={() => dispatch({ type: 'setQty', uuid: i.uuid, qty: i.qty - 1 })}>−</button>
              <span className="t-headline-md" style={{ minWidth: 28, textAlign: 'center' }}>{i.qty}</span>
              <button aria-label={`Tambah ${i.name}`} className="qty-btn" onClick={() => dispatch({ type: 'setQty', uuid: i.uuid, qty: i.qty + 1 })}>+</button>
            </div>
          ))}
          <label htmlFor="disc" className="t-label-sm" style={{ display: 'block', marginTop: 'var(--space-sm)' }}>Diskon (Rp)</label>
          <input id="disc" type="number" min="0" value={state.discount || ''} onChange={(e) => dispatch({ type: 'discount', value: Number(e.target.value) || 0 })} className="input-mono" style={{ fontFamily: 'var(--font)', fontWeight: 400, fontSize: 15 }} />
          <hr className="receipt-divider" />
          <div className="t-body-md" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span className="t-mono">{formatRp(subtotal)}</span></div>
          <div className="t-headline-lg" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)' }}><span>Total</span><span>{formatRp(total)}</span></div>
          <label htmlFor="paid" className="t-label-sm" style={{ display: 'block', marginTop: 'var(--space-sm)' }}>Uang Diterima (Rp)</label>
          <input id="paid" type="number" min="0" value={paid} onChange={(e) => setPaid(e.target.value)} className="input-mono" />
          <div className="change-box" style={{ marginTop: 'var(--space-sm)' }}>
            <span className="t-body-sm">Kembali:</span>
            <span className="t-headline-md t-mono">{formatRp(change)}</span>
          </div>
          {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
          <button
            onClick={onPay}
            disabled={state.items.length === 0 || (paid !== '' && change < 0)}
            className="btn-primary"
            style={{ marginTop: 'var(--space-sm)' }}
          >
            BAYAR SEKARANG
          </button>
        </section>
      </div>

      {receipt && <ReceiptModal txn={receipt} onClose={() => setReceipt(null)} />}
      {scanning && (
        <Scanner
          products={products}
          onPick={(p) => { dispatch({ type: 'add', product: p }); setScanning(false) }}
          onClose={() => setScanning(false)}
        />
      )}
    </main>
  )
}
