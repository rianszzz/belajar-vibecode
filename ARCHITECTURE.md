# ARCHITECTURE.md

## 1. Gambaran

Dua komponen:

```
[Browser: PWA React]  ←→  [Node/Express + SQLite]  ←→  (1–3 device PWA, masing-masing IndexedDB lokal)
```

Prinsip: **server = sumber kebenaran akhir**, IndexedDB = sistem kerja kasir.
Kasir tidak pernah menunggu jaringan. Semua tulis lokal dulu, sync belakangan.

## 2. Frontend (PWA)

- **Vite + React, JavaScript murni, tanpa state library** — React context + hooks cukup untuk 5 halaman.
- **IndexedDB** via wrapper tipis (native API + promise helper ~50 baris; tanpa Dexie dulu). Skema: lihat REQUIREMENTS.md §5.
- **Service worker**: Workbox via `vite-plugin-pwa`. Precache app shell; runtime rules sesuai REQUIREMENTS.md §6.
- **Modul frontend** (folder `src/`):

```
src/
  db/          idb.js (open/migrasi), products.js, txns.js, outbox.js, meta.js
  sync/        sync.js (push/pull engine), api.js (fetch + timeout + token)
  state/       auth-context.jsx, cart-context.jsx (keranjang hanya di memori)
  pages/       Login, POS, Products (admin), History, Report, Conflicts (admin)
  components/  ProductGrid, Cart, ReceiptModal, Scanner, SyncBadge, Layout
  sw           via vite-plugin-pwa config
```

- **Alur transaksi (jalur panas, harus <1s, offline-safe):**
  1. Kasir tap item → `cart-context` update (memori).
  2. "Bayar" → satu `putAll` ke IndexedDB: transaksi (`pending`), receipt snapshot, entri outbox; kurangi `products.stock` optimistik; increment seq nomor struk di `meta`.
  3. UI konfirmasi + struk. Jaringan tidak disentuh di jalur ini.
- **Sync engine (`sync/sync.js`)** — satu loop:
  - Trigger: event `online`, interval 30s, tombol manual.
  - Push: ambil outbox batch ≤50 → POST `/transactions/batch` → proses respons per-item (`synced`/`duplicate` = hapus dari outbox + tandai synced; `conflict` = tandai transaksi conflicted + terapkan stok server + buang entri outbox).
  - Pull: GET `/products/changes?since=<watermark>` → upsert products → simpan watermark baru.
  - Retry: gagal network/5xx → backoff eksponensial (30s→2m→5m→…max 30m) + jitter, catat `retry_at` di outbox.
  - Idempoten: sync bisa dipanggil ulang kapan pun; outbox kosong = no-op. Crash di tengah batch aman — item tersisa di outbox.
  - Keranjang aktif tidak tersentuh sync (sync hanya baca-tulis products/transactions/outbox).

## 3. Backend (server/)

- Express + `better-sqlite3` (synchronous, cukup untuk <5rb produk, bebas config).
- Tabel SQLite: `users`, `products`, `transactions` (dengan UNIQUE `uuid`), `stock_log` (audit mutasi stok), `conflicts` (resolusi konflik).
- Endpoint sesuai REQUIREMENTS.md §7. Semua auth JWT (lib `jsonwebtoken`), role di payload.
- **Push `/transactions/batch`:**
  - Satu SQLite transaction per transaksi client: cek UUID duplikat → `duplicate`; update stok dengan `UPDATE ... WHERE stock >= qty` → jika rows=0 → `conflict` + baca stok final; else kurangi stok + insert transaksi → `synced`.
  - Partial commit OK: respons array per-item, item gagal tidak mengunci yang lain.
- **Pull katalog:** `WHERE updated_at > since ORDER BY updated_at LIMIT 200` + header/kolom `next_since`.
- Produk edit: server set `updated_at = now()` (LWW server-side).
- CORS untuk dev; serve frontend build di produksi (satu proses).

## 4. Keamanan

- Password: `bcrypt` (10 rounds). JWT expiry 12h; client simpan di IndexedDB `users` (perangkat toko, risiko acceptable — REQUIREMENTS.md §8).
- Endpoint admin (CRUD produk, laporan, user) cek role `admin` → 403 untuk kasir.
- Tidak ada rahasia di client. CORS restrict ke origin app.

## 5. Deployment

- `npm run build` frontend → Express serve `dist/` → satu proses, satu port.
- SQLite file di `server/data.db` (gitignore). Backup = copy file.
