import React from 'react'
import { useSync } from '../state/sync-context.jsx'

export default function SyncBadge() {
  const { online, pending, busy, sync } = useSync()

  const label = !online
    ? `Offline (${pending} pending)`
    : busy
      ? 'Sinkron…'
      : pending > 0
        ? `Sinkronkan (${pending})`
        : 'Tersinkron'

  const color = !online ? 'var(--warning)' : pending > 0 ? 'var(--danger)' : 'var(--ok)'

  return (
    <button
      onClick={() => sync()}
      aria-label={`Status sinkronisasi: ${label}. Klik untuk sinkron manual.`}
      style={{
        padding: '6px 12px', borderRadius: 999, border: `1px solid ${color}`,
        background: 'var(--surface)', color, fontSize: 13, cursor: 'pointer',
      }}
    >
      {busy ? '⏳' : online ? '🟢' : '🔴'} {label}
    </button>
  )
}
