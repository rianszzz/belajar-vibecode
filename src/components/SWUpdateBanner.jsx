import React, { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

// AC W5: user diberi tahu "versi baru tersedia" — bukan update diam-diam
export default function SWUpdateBanner() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [updateSW, setUpdateSW] = useState(null)

  useEffect(() => {
    setUpdateSW(registerSW({
      immediate: true,
      onNeedRefresh() { setNeedRefresh(true) },
    }))
  }, [])

  if (!needRefresh) return null
  return (
    <div role="status" style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 16px', display: 'flex', gap: 10, boxShadow: '0 2px 8px rgba(0,0,0,.15)', zIndex: 100 }}>
      <span>Versi baru tersedia.</span>
      <button onClick={() => updateSW(true)} style={{ padding: '4px 12px', background: 'var(--primary)', color: 'var(--primary-ink)', border: 'none', borderRadius: 'var(--radius)' }}>Muat ulang</button>
      <button onClick={() => setNeedRefresh(false)} style={{ padding: '4px 12px' }}>Nanti</button>
    </div>
  )
}
