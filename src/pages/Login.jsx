import React from 'react'
import { useAuth } from '../state/auth-context.jsx'

export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await login(username.trim(), password)
    setBusy(false)
    if (!res.ok) setError(res.error)
  }

  return (
    <main className="login-page" style={{ maxWidth: 360, margin: '80px auto', padding: 16 }}>
      <h1 style={{ fontSize: 24 }}>Mini POS</h1>
      <form onSubmit={onSubmit}>
        <label htmlFor="username" style={{ display: 'block', marginTop: 16 }}>Username</label>
        <input
          id="username" value={username} autoComplete="username" required
          onChange={(e) => setUsername(e.target.value)}
          style={{ width: '100%', padding: 10, marginTop: 4 }}
        />
        <label htmlFor="password" style={{ display: 'block', marginTop: 12 }}>Password</label>
        <input
          id="password" type="password" value={password} autoComplete="current-password" required
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: 10, marginTop: 4 }}
        />
        {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
        <button
          type="submit" disabled={busy}
          style={{ width: '100%', marginTop: 16, padding: 12, background: 'var(--primary)', color: 'var(--primary-ink)', border: 'none', borderRadius: 'var(--radius)' }}
        >
          {busy ? 'Memproses…' : 'Masuk'}
        </button>
      </form>
    </main>
  )
}
