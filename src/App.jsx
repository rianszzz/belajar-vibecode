import React, { useState } from 'react'
import { AuthProvider, useAuth } from './state/auth-context.jsx'
import { CartProvider } from './state/cart-context.jsx'
import { SyncProvider } from './state/sync-context.jsx'
import { startAutoSync } from './sync/sync.js'
import Login from './pages/Login.jsx'
import POS from './pages/POS.jsx'
import Conflicts from './pages/Conflicts.jsx'
import Report from './pages/Report.jsx'
import History from './pages/History.jsx'
import SWUpdateBanner from './components/SWUpdateBanner.jsx'
import SyncBadge from './components/SyncBadge.jsx'

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
  const { user, loading, logout } = useAuth()
  const [page, setPage] = useState('pos')

  if (loading) return <main style={{ padding: 24 }}>Memuat…</main>
  if (!user) return <Login />

  const isAdmin = user.role === 'admin'
  // guard: page admin tidak boleh render untuk kasir (mis. page state sisa sesi admin)
  if (!isAdmin && (page === 'conflicts' || page === 'report')) setPage('pos')

  return (
    <>
      <SWUpdateBanner />
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand">
            <img src="/logo.svg" alt="" aria-hidden="true" />
            <span className="brand-name">Mini POS</span>
            <SyncBadge />
          </div>
          <nav className="app-nav" aria-label="Navigasi utama">
            <button onClick={() => setPage('pos')} className={page === 'pos' ? 'active' : ''}>Kasir</button>
            <button onClick={() => setPage('history')} className={page === 'history' ? 'active' : ''}>Riwayat</button>
            {isAdmin && <button onClick={() => setPage('conflicts')} className={page === 'conflicts' ? 'active' : ''}>Konflik</button>}
            {isAdmin && <button onClick={() => setPage('report')} className={page === 'report' ? 'active' : ''}>Laporan</button>}
            <button onClick={logout}>Keluar</button>
          </nav>
        </div>
      </header>
      {page === 'pos' && <POS />}
      {page === 'history' && <History />}
      {isAdmin && page === 'conflicts' && <Conflicts />}
      {isAdmin && page === 'report' && <Report />}
    </>
  )
}
