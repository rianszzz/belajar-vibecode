import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { saveSession, getSession, isTokenExpired, logout as dbLogout } from '../db/users.js'
import { setTokenProvider } from '../sync/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTokenProvider(async () => {
      const s = await getSession()
      return s && !isTokenExpired(s.token) ? s.token : null
    })
    getSession().then((s) => {
      if (s && !isTokenExpired(s.token)) setUser({ username: s.username, role: s.role })
      setLoading(false)
    })
  }, [])

  // online: verifikasi ke server; offline: percaya sesi cache device ini
  const login = useCallback(async (username, password) => {
    if (!navigator.onLine) {
      const cached = await getSession()
      if (cached && cached.username === username) {
        const u = { username: cached.username, role: cached.role }
        setUser(u)
        return { ok: true, offline: true }
      }
      return { ok: false, error: 'Offline: hanya bisa login dengan sesi terakhir di device ini' }
    }
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).catch(() => null)
    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => ({})) : {}
      return { ok: false, error: data.error || 'Server tidak dapat dihubungi' }
    }
    const { token, user: u } = await res.json()
    await saveSession(u, token)
    setUser(u)
    return { ok: true }
  }, [])

  const logout = useCallback(async () => {
    await dbLogout()
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
