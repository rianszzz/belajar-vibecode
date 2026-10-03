import React, { useEffect, useState } from 'react'
import { db, ensureDeviceId, meta } from './db/db.js'

export default function App() {
  const [status, setStatus] = useState('memuat…')

  useEffect(() => {
    ensureDeviceId()
      .then((id) => meta.set('app_ready_at', new Date().toISOString()))
      .then(() => db.open())
      .then(() => setStatus(`OK — device siap, store: ${db.tables.map((t) => t.name).join(', ')}`))
      .catch((e) => setStatus('Gagal buka DB: ' + e.message))
  }, [])

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, margin: 0 }}>Mini POS</h1>
      <p>{status}</p>
    </main>
  )
}
