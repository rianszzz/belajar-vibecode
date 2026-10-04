import { db } from './db.js'

export async function saveSession(user, token) {
  // satu device = satu user aktif: clear dulu agar tidak menumpuk baris
  // (baris lama token expired membuat getSession mengambil sesi mati)
  await db.transaction('rw', db.users, async () => {
    await db.users.clear()
    await db.users.put({ username: user.username, role: user.role, token, saved_at: new Date().toISOString() })
  })
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
