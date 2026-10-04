import React from 'react'
import { useSync } from '../state/sync-context.jsx'

export default function SyncBadge() {
  const { online, pending, busy, sync } = useSync()

  const color = !online ? 'var(--warning)' : pending > 0 ? 'var(--danger)' : 'var(--ok)'
  const label = !online ? `Offline (${pending})` : busy ? 'Sinkron…' : pending > 0 ? `Sinkronkan (${pending})` : 'Tersinkron'

  return (
    <button
      onClick={() => sync()}
      aria-label={`Status sinkronisasi: ${label}. Klik untuk sinkron manual.`}
      className="sync-badge"
    >
      <span className="dot" style={{ background: color }} aria-hidden="true" />
      <span className="t-label-sm">{label}</span>
    </button>
  )
}
