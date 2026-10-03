const TIMEOUT_MS = 8000

let getToken = null

export function setTokenProvider(fn) {
  getToken = fn
}

// Satu pintu semua fetch network: timeout 8s, Bearer token otomatis.
// Return { ok, status, data }. Tidak throw untuk 4xx/5xx/timeout.
export async function api(path, { method = 'GET', body } = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const headers = { 'Content-Type': 'application/json' }
    const token = getToken ? await getToken() : null
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    })
    let data = null
    try { data = await res.json() } catch { /* body kosong */ }
    return { ok: res.ok, status: res.status, data }
  } catch (e) {
    if (e.name === 'AbortError') return { ok: false, status: 0, error: 'timeout' }
    return { ok: false, status: 0, error: e.message }
  } finally {
    clearTimeout(timer)
  }
}
