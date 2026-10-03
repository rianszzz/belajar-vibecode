// PBKDF2 password hashing via Web Crypto — pengganti bcrypt (Workers tanpa native binding).
// Format tersimpan: pbkdf2$<iterations>$<saltB64>$<hashB64>
// ponytail: cap 100rb = batas Cloudflare Workers untuk PBKDF2 (600rb OWASP tak bisa di runtime ini);
// mitigasi rate-limit login saat ada; naikkan bila Workers menaikkan batas
const ITERATIONS = 100_000

async function deriveBits(password, saltB64, iterations) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0))
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    256
  )
  return btoa(String.fromCharCode(...new Uint8Array(bits)))
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const saltB64 = btoa(String.fromCharCode(...salt))
  const hashB64 = await deriveBits(password, saltB64, ITERATIONS)
  return `pbkdf2$${ITERATIONS}$${saltB64}$${hashB64}`
}

export async function verifyPassword(password, stored) {
  const [scheme, iterationsRaw, saltB64, hashB64] = stored.split('$')
  if (scheme !== 'pbkdf2') return false
  // clamp: hash korup/berbahaya tidak boleh memicu CPU exhaustion
  const iterations = Math.min(Number(iterationsRaw), 1_000_000)
  if (!Number.isFinite(iterations) || iterations < 1) return false
  const derived = await deriveBits(password, saltB64, iterations)
  // constant-time-ish compare via XOR
  const a = Uint8Array.from(atob(derived), (c) => c.charCodeAt(0))
  const b = Uint8Array.from(atob(hashB64), (c) => c.charCodeAt(0))
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

export async function seedUsers(env) {
  const admin = await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin'").first()
  if (admin.n > 0) return
  await env.DB.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
    .bind('admin', await hashPassword('admin123'), 'admin')
    .run()
  await env.DB.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
    .bind('kasir', await hashPassword('kasir123'), 'kasir')
    .run()
}
