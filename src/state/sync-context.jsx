import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { syncNow } from '../sync/sync.js'
import { pendingCount } from '../db/txns.js'

const SyncContext = createContext(null)

export function SyncProvider({ children }) {
  const [online, setOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState(0)
  const [busy, setBusy] = useState(false)
  const [lastSync, setLastSync] = useState(null)

  const refresh = useCallback(() => {
    pendingCount().then(setPending)
  }, [])

  const sync = useCallback(async () => {
    setBusy(true)
    const res = await syncNow()
    setBusy(false)
    if (!res.offline && !res.skipped) {
      setLastSync(new Date().toLocaleTimeString('id-ID'))
      refresh()
    }
    return res
  }, [refresh])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    refresh()
    const t = setInterval(refresh, 10_000)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); clearInterval(t) }
  }, [refresh])

  return <SyncContext.Provider value={{ online, pending, busy, lastSync, sync, refresh }}>{children}</SyncContext.Provider>
}

export function useSync() {
  return useContext(SyncContext)
}
