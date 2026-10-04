import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../state/auth-context.jsx'
import { useCart } from '../state/cart-context.jsx'
import { useSync } from '../state/sync-context.jsx'
import { cartTotal, formatRp, changeDue } from '../lib/money.js'
import { searchProducts, categories, checkout } from '../db/txns.js'
import ReceiptModal from '../components/ReceiptModal.jsx'
import SyncBadge from '../components/SyncBadge.jsx'
import Scanner from '../components/Scanner.jsx'

export default function POS() {
  const { user, logout } = useAuth()
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
    <main style={{ padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>Kasir</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <SyncBadge />
          <span style={{ color: 'var(--muted)' }}>{user.username} ({user.role})</span>
          <button onClick={logout} style={{ padding: '6px 12px' }}>Keluar</button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
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
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}>
            <button onClick={() => setCat('')} style={{ padding: '6px 10px', background: !cat ? 'var(--primary)' : 'var(--surface)' }}>Semua</button>
            {cats.map((c) => (
              <button key={c} onClick={() => setCat(c)} style={{ padding: '6px 10px', background: cat === c ? 'var(--primary)' : 'var(--surface)' }}>{c}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            {products.map((p) => (
              <button
                key={p.uuid}
                onClick={() => dispatch({ type: 'add', product: p })}
                disabled={p.stock === 0}
                style={{
                  padding: 10, textAlign: 'left', background: 'var(--surface)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  opacity: p.stock === 0 ? 0.5 : 1, cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                <div>{formatRp(p.price)}</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>stok {p.stock}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Keranjang */}
        <section style={{ flex: 1, minWidth: 280, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12 }}>
          <h2 style={{ fontSize: 15, margin: 0 }}>Keranjang</h2>
          {state.items.length === 0 && <p style={{ color: 'var(--muted)' }}>Belum ada item.</p>}
          {state.items.map((i) => (
            <div key={i.uuid} style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '8px 0' }}>
              <div style={{ flex: 1, fontSize: 13 }}>
                {i.name}
                <div style={{ color: 'var(--muted)' }}>{formatRp(i.price)} × {i.qty}</div>
              </div>
              <button aria-label={`Kurangi ${i.name}`} onClick={() => dispatch({ type: 'setQty', uuid: i.uuid, qty: i.qty - 1 })} style={{ width: 32, height: 32 }}>−</button>
              <span style={{ minWidth: 20, textAlign: 'center' }}>{i.qty}</span>
              <button aria-label={`Tambah ${i.name}`} onClick={() => dispatch({ type: 'setQty', uuid: i.uuid, qty: i.qty + 1 })} style={{ width: 32, height: 32 }}>+</button>
            </div>
          ))}
          <label htmlFor="disc" style={{ display: 'block', marginTop: 8 }}>Diskon (Rp)</label>
          <input id="disc" type="number" min="0" value={state.discount || ''} onChange={(e) => dispatch({ type: 'discount', value: Number(e.target.value) || 0 })} style={{ width: '100%', padding: 8 }} />
          <hr />
          <div>Subtotal: {formatRp(subtotal)}</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Total: {formatRp(total)}</div>
          <label htmlFor="paid" style={{ display: 'block', marginTop: 8 }}>Bayar (Rp)</label>
          <input id="paid" type="number" min="0" value={paid} onChange={(e) => setPaid(e.target.value)} style={{ width: '100%', padding: 8 }} />
          <div>Kembali: {formatRp(change)}</div>
          {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
          <button
            onClick={onPay}
            disabled={state.items.length === 0 || (paid !== '' && change < 0)}
            style={{ width: '100%', marginTop: 12, padding: 14, background: 'var(--primary)', color: 'var(--primary-ink)', border: 'none', borderRadius: 'var(--radius)', fontSize: 16, fontWeight: 700 }}
          >
            BAYAR
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
