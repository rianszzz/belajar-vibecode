import { Hono } from 'hono'
import { sign, verify } from 'hono/jwt'
import { verifyPassword, hashPassword, seedUsers } from './auth.js'
import { generateEan13 } from './barcode.js'

const api = new Hono().basePath('/api')

// seed admin default sekali — ponytail: kredensial default admin/admin123,
// WAJIB ganti via POST /api/auth/change-password sebelum dipakai toko nyata
api.use('*', async (c, next) => { await seedUsers(c.env); await next() })

// guard: verifikasi JWT + role opsional (requireRole('admin'))
async function requireAuth(c, next) {
  const token = c.req.header('Authorization')?.slice(7)
  if (!token) return c.json({ error: 'Belum login' }, 401)
  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256')
    c.set('jwtPayload', payload)
    await next()
  } catch {
    return c.json({ error: 'Token tidak valid atau kedaluwarsa' }, 401)
  }
}

async function requireAdmin(c, next) {
  const payload = c.get('jwtPayload')
  if (payload?.role !== 'admin') return c.json({ error: 'Hanya admin' }, 403)
  await next()
}

api.get('/health', async (c) => {
  const row = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM products').first()
  return c.json({ ok: true }) // tanpa count: jangan bocorkan data via endpoint publik
})

api.post('/auth/login', async (c) => {
  const { username, password } = await c.req.json().catch(() => ({}))
  if (!username || !password) return c.json({ error: 'Username dan password wajib' }, 400)

  const user = await c.env.DB.prepare('SELECT username, password_hash, role FROM users WHERE username = ?')
    .bind(String(username))
    .first()
  // pesan sama untuk user tak ada & password salah (hindari user enumeration)
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: 'Username atau password salah' }, 401)
  }

  const token = await sign({ sub: user.username, role: user.role, exp: Math.floor(Date.now() / 1000) + 12 * 3600 }, c.env.JWT_SECRET)
  return c.json({ token, user: { username: user.username, role: user.role } })
})

// Ganti password sendiri (Opsi D — akhir masa kredensial default)
api.post('/auth/change-password', requireAuth, async (c) => {
  const { oldPassword, newPassword } = await c.req.json().catch(() => ({}))
  if (!oldPassword || !newPassword || String(newPassword).length < 8) {
    return c.json({ error: 'Password baru minimal 8 karakter' }, 400)
  }
  const { sub } = c.get('jwtPayload')
  const user = await c.env.DB.prepare('SELECT username, password_hash FROM users WHERE username = ?').bind(sub).first()
  if (!user || !(await verifyPassword(oldPassword, user.password_hash))) {
    return c.json({ error: 'Password lama salah' }, 401)
  }
  await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE username = ?')
    .bind(await hashPassword(newPassword), sub)
    .run()
  return c.json({ ok: true })
})

// ==== Katalog (T3) ====

api.use('/products/*', requireAuth)

api.get('/products/changes', async (c) => {
  const since = c.req.query('since') || '1970-01-01T00:00:00.000Z'
  const rows = await c.env.DB.prepare(
    'SELECT uuid, barcode, name, price, cost, stock, category, active, updated_at FROM products WHERE updated_at > ? ORDER BY updated_at LIMIT 200'
  )
    .bind(since)
    .all()
  const last = rows.results.at(-1)?.updated_at
  return c.json({ products: rows.results, next_since: last || since })
})

api.post('/products', requireAuth, requireAdmin, async (c) => {
  const p = await c.req.json().catch(() => ({}))
  const name = typeof p.name === 'string' ? p.name.trim() : ''
  const price = Math.round(Number(p.price))
  if (!name) return c.json({ error: 'Nama wajib diisi' }, 400)
  if (!Number.isFinite(price) || price < 0) return c.json({ error: 'Harga tidak valid' }, 400)
  const barcode = p.barcode ? String(p.barcode) : generateEan13() // AC W1: auto-generate jika kosong
  if (barcode) {
    const dup = await c.env.DB.prepare('SELECT uuid FROM products WHERE barcode = ?').bind(barcode).first()
    if (dup) return c.json({ error: 'Barcode sudah dipakai produk lain' }, 409)
  }
  const uuid = crypto.randomUUID()
  const now = new Date().toISOString()
  await c.env.DB.prepare(
    'INSERT INTO products (uuid, barcode, name, price, cost, stock, category, active, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)'
  )
    .bind(uuid, barcode, name, price, Math.max(0, Math.round(Number(p.cost) || 0)), Math.max(0, Math.round(Number(p.stock) || 0)), p.category ? String(p.category) : null, now)
    .run()
  return c.json({ uuid }, 201)
})

api.put('/products/:uuid', requireAuth, requireAdmin, async (c) => {
  const uuid = c.req.param('uuid')
  const existing = await c.env.DB.prepare('SELECT uuid FROM products WHERE uuid = ?').bind(uuid).first()
  if (!existing) return c.json({ error: 'Produk tidak ditemukan' }, 404)
  const p = await c.req.json().catch(() => ({}))
  const price = Math.round(Number(p.price))
  if (!Number.isFinite(price) || price < 0) return c.json({ error: 'Harga tidak valid' }, 400)
  if (p.name !== undefined && (typeof p.name !== 'string' || !p.name.trim())) {
    return c.json({ error: 'Nama tidak boleh kosong' }, 400)
  }
  const name = typeof p.name === 'string' ? p.name.trim() : undefined
  const now = new Date().toISOString()
  const sets = ['price = ?', 'cost = ?', 'stock = ?', 'category = ?', 'active = ?', 'updated_at = ?']
  const vals = [
    price,
    Math.max(0, Math.round(Number(p.cost) || 0)),
    Math.max(0, Math.round(Number(p.stock) || 0)),
    p.category ? String(p.category) : null,
    p.active === false ? 0 : 1,
    now,
  ]
  if (name !== undefined) {
    sets.unshift('name = ?')
    vals.unshift(name)
  }
  await c.env.DB.prepare(`UPDATE products SET ${sets.join(', ')} WHERE uuid = ?`).bind(...vals, uuid).run()
  return c.json({ ok: true })
})

api.delete('/products/:uuid', requireAuth, requireAdmin, async (c) => {
  const uuid = c.req.param('uuid')
  // soft-delete saja: produk dengan riwayat transaksi tak boleh hilang
  await c.env.DB.prepare('UPDATE products SET active = 0, updated_at = ? WHERE uuid = ?')
    .bind(new Date().toISOString(), uuid)
    .run()
  return c.json({ ok: true })
})

// ==== Transaksi batch (T6) ====

api.post('/transactions/batch', requireAuth, async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!Array.isArray(body)) return c.json({ error: 'Body harus array transaksi' }, 400)
  if (body.length > 50) return c.json({ error: 'Batch maksimal 50' }, 400)

  const results = []
  for (const txn of body) {
    results.push(await applyTxn(c.env, txn))
  }
  return c.json({ results })
})

// Satu transaksi client = satu SQLite transaction: dedup UUID → stock guard atomic → insert.
async function applyTxn(env, txn) {
  const uuid = String(txn.uuid || '')
  const items = Array.isArray(txn.items) ? txn.items : []
  if (!uuid || items.length === 0) return { uuid, status: 'invalid' }

  try {
    return await env.DB.batch(
      [
        // 1) cek duplikat
        env.DB.prepare('SELECT uuid FROM transactions WHERE uuid = ?').bind(uuid),
        // 2) atomic guard stok per item: rowsaffected=0 berarti stok kurang.
        // updated_at ikut dinaikkan agar perubahan stok terlihat oleh pull watermark.
        ...items.map((i) =>
          env.DB.prepare(
            "UPDATE products SET stock = stock - ?, updated_at = ? WHERE uuid = ? AND stock >= ? AND active = 1"
          ).bind(Math.round(Number(i.qty) || 0), new Date().toISOString(), String(i.uuid || ''), Math.round(Number(i.qty) || 0))
        ),
      ],
      'write'
    ).then(async (res) => {
      console.log('applyTxn batch meta:', res.map((r) => r.meta))
      const dup = res[0].results?.length > 0
      if (dup) return { uuid, status: 'duplicate' }

      const failed = items.filter((_, idx) => (res[idx + 1].meta?.changes ?? 0) === 0)
      if (failed.length > 0) {
        // stok kurang: baca stok final server untuk item yang gagal
        const stocks = await Promise.all(
          failed.map((i) =>
            env.DB.prepare('SELECT uuid, name, stock FROM products WHERE uuid = ?').bind(String(i.uuid)).first()
          )
        )
        return { uuid, status: 'conflict', server_stock: stocks.filter(Boolean) }
      }

      // sukses: catat transaksi + stock_log
      const now = new Date().toISOString()
      const cashier = String(txn.cashier || 'unknown')
      await env.DB.batch([
        env.DB.prepare(
          'INSERT INTO transactions (uuid, device_id, receipt_no, cashier, total, discount, paid, created_at, items) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          uuid,
          String(txn.device_id || ''),
          String(txn.receipt_no || ''),
          cashier,
          Math.round(Number(txn.total) || 0),
          Math.round(Number(txn.discount) || 0),
          Math.round(Number(txn.paid) || 0),
          String(txn.created_at || now),
          JSON.stringify(items)
        ),
        ...items.map((i) =>
          env.DB.prepare('INSERT INTO stock_log (product_uuid, delta, reason, txn_uuid) VALUES (?, ?, ?, ?)').bind(
            String(i.uuid), -Math.round(Number(i.qty) || 0), 'sale', uuid
          )
        ),
      ])
      return { uuid, status: 'synced' }
    })
  } catch (e) {
    console.error('applyTxn error:', e)
    return { uuid, status: 'error', message: e.message }
  }
}

// ==== Laporan harian server (pembanding laporan lokal, AC B2) ====

api.get('/reports/daily', requireAuth, requireAdmin, async (c) => {
  const date = c.req.query('date')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return c.json({ error: 'Format tanggal YYYY-MM-DD' }, 400)
  // catatan: pencocokan created_at pakai UTC (ISO tersimpan UTC); selisih dengan
  // tanggal lokal client ≤1 hari zona — cukup sebagai pembanding agregat
  const rows = await c.env.DB.prepare(
    'SELECT total, items, created_at FROM transactions WHERE created_at LIKE ?'
  )
    .bind(date + '%')
    .all()
  const itemQty = new Map()
  let revenue = 0
  for (const r of rows.results) {
    revenue += Math.round(Number(r.total) || 0)
    try {
      for (const i of JSON.parse(r.items || '[]')) {
        itemQty.set(String(i.name), (itemQty.get(String(i.name)) || 0) + Math.round(Number(i.qty) || 0))
      }
    } catch {
      // items korup: skip row, laporan tetap jalan
    }
  }
  const topItems = [...itemQty.entries()]
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)
  return c.json({ date, count: rows.results.length, revenue, topItems })
})

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) return api.fetch(request, env)
    return env.ASSETS.fetch(request)
  },
}
