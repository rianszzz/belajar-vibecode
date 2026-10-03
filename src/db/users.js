import { db, meta } from './db.js'

export async function saveSession(user, token) {
  await db.users.put({ username: user.username, role: user.role, token, saved_at: new Date().toISOString() })
}

export async function getSession() {
  const all = await db.users.toArray()
  return all[0] || null // satu device = satu user aktif
}

export function isTokenExpired(token) {
  try {
    const [, payloadB64] = token.split('.')
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export async function logout() {
  await db.users.clear()
}

export async function deviceInfo() {
  return { device_id: await meta.get('device_id') }
}
