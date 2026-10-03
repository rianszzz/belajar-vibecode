import React from 'react'
import { AuthProvider, useAuth } from './state/auth-context.jsx'
import { CartProvider } from './state/cart-context.jsx'
import { SyncProvider } from './state/sync-context.jsx'
import { startAutoSync } from './sync/sync.js'
import Login from './pages/Login.jsx'
import POS from './pages/POS.jsx'

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

  if (loading) return <main style={{ padding: 24 }}>Memuat…</main>
  if (!user) return <Login />
  return <POS />
}
