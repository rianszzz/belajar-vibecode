import React, { useState } from 'react'
import { AuthProvider, useAuth } from './state/auth-context.jsx'
import { CartProvider } from './state/cart-context.jsx'
import { SyncProvider } from './state/sync-context.jsx'
import { startAutoSync } from './sync/sync.js'
import Login from './pages/Login.jsx'
import POS from './pages/POS.jsx'
import Conflicts from './pages/Conflicts.jsx'
import Report from './pages/Report.jsx'

startAutoSync()

export default function App() {
  return (
    <AuthProvider>
      <SyncProvider>
        <CartProvider>
          <AppInner />
        </CartProvider>
      </SyncProvider>
    </AuthProvider>
  )
}

function AppInner() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState('pos')

  if (loading) return <main style={{ padding: 24 }}>Memuat…</main>
  if (!user) return <Login />

  const isAdmin = user.role === 'admin'
  // guard: page admin tidak boleh render untuk kasir (mis. page state sisa sesi admin)
  if (!isAdmin && page !== 'pos') setPage('pos')

  return (
    <>
      <nav style={{ display: 'flex', gap: 4, padding: '8px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => setPage('pos')} style={{ padding: '6px 14px', background: page === 'pos' ? 'var(--primary)' : 'transparent', color: page === 'pos' ? 'var(--primary-ink)' : 'var(--text)', border: 'none', borderRadius: 'var(--radius)' }}>Kasir</button>
        {user.role === 'admin' && (
          <>
            <button onClick={() => setPage('conflicts')} style={{ padding: '6px 14px', background: page === 'conflicts' ? 'var(--primary)' : 'transparent', color: page === 'conflicts' ? 'var(--primary-ink)' : 'var(--text)', border: 'none', borderRadius: 'var(--radius)' }}>Konflik</button>
            <button onClick={() => setPage('report')} style={{ padding: '6px 14px', background: page === 'report' ? 'var(--primary)' : 'transparent', color: page === 'report' ? 'var(--primary-ink)' : 'var(--text)', border: 'none', borderRadius: 'var(--radius)' }}>Laporan</button>
          </>
        )}
      </nav>
      {page === 'pos' && <POS />}
      {isAdmin && page === 'conflicts' && <Conflicts />}
      {isAdmin && page === 'report' && <Report />}
    </>
  )
}
