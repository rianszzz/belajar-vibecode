import { Hono } from 'hono'

const api = new Hono().basePath('/api')

api.get('/health', async (c) => {
  const row = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM products').first()
  return c.json({ ok: true, products: row?.n ?? 0 })
})

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) return api.fetch(request, env)
    return env.ASSETS.fetch(request)
  },
}
