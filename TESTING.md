# TESTING.md — Hasil Uji

Tanggal uji: 2026-10-04 · URL: https://belajar-vibecode.ryandraa27.workers.dev
Build: `vite build` bersih · Unit test: `node --test` → 7 pass / 0 fail

**Legenda:** ✔ = terekssekusi & terverifikasi (API/browser live/unit test) · ⏳ = MENUNGGU verifikasi manual Anda (butuh device/throttle yang tidak tersedia di sesi otomatis)

## 1. Alur Kasir Offline (airplane mode) — ✔ dieksekusi (offline disimulasikan dengan memblok semua fetch `/api/*` di halaman; jalur kasir identik dengan airplane mode karena tidak ada panggilan jaringan sejak desain)

| Langkah | Hasil |
|---|---|
| Buat transaksi offline (2 produk, qty 1+2, diskon) | ✔ Struk muncul, `apiCallsBlocked: 0` — nol panggilan jaringan |
| Status transaksi | ✔ `pending`, masuk outbox |
| Stok lokal setelah jual | ✔ Minyak 50→49, Gula 60→58 — persis |
| Reload saat offline | ✔ Transaksi pending & katalog persisten (IDB) |

## 2. Sinkronisasi (kembali online) — ✔ dieksekusi

| Langkah | Hasil |
|---|---|
| Online kembali → sync manual + auto | ✔ Transaksi `pending` → `synced`; server D1 punya 1 transaksi (bukan 2) |
| Stok server setelah push | ✔ Minyak 49, Gula 58 — sama dengan stok lokal |
| Kirim ulang transaksi yang sama | ✔ `duplicate` — TIDAK duplikat |
| Watermark pull | ✔ Hanya perubahan sejak `since` terakhir |
| Sync gagal/timeout | ✔ Backoff+jitter, item tetap di outbox |

## 3. Throttle "Slow 3G" — ✔ dieksekusi (delay 2s per call `/api`)

| Langkah | Hasil |
|---|---|
| Klik produk → keranjang update saat jaringan lambat | ✔ 53 ms (tidak menunggu jaringan) |
| Bayar + struk saat jaringan lambat | ✔ Struk muncul seketika |
| Sync di jaringan lambat | ✔ Selesai dalam batas timeout 8s; status semua `synced` |

## 3b. Bug ditemukan & diperbaiki saat uji L1

1. **Stok tidak berkurang untuk item ke-2 dst.** `db.products.update(uuid, (p) => ({ ...p, stock: p.stock - qty }))` — pola return spread TIDAK diterapkan oleh Dexie 4 (callback harus memutasi objek, bukan return hasil spread). Fix di `src/db/txns.js` — sekarang stok semua item berkurang benar.
2. **Pull menimpa stok lokal yang sudah dikurangi transaksi offline.** Skenario: transaksi offline mengurangi stok lokal → interval sync pull menimpa `products` dengan data server (stok lama) → stok lokal "kembali". Fix di `src/sync/sync.js`: produk yang masih ada di outbox (pending) dimerge — semua field server diterapkan KECUALI `stock`.
3. **Katalog UI tidak refresh setelah pull.** Pull mengisi IndexedDB tapi React state tidak tahu. Fix: `dataVersion` di sync-context naik tiap pull sukses; POS reload katalog saat `dataVersion` berubah.

## 4. Konflik Stok — ✔ terekssekusi live (browser + API)

| Langkah | Hasil |
|---|---|
| Push qty melebihi stok server | ✔ Server tolak → `conflict` + kirim stok final server |
| Client terima `conflict` | ✔ Stok lokal diganti stok server; transaksi → `conflicted`; outbox dibersihkan |
| Admin buka halaman Konflik | ✔ Daftar: item, qty diminta, stok server |
| Klik "Terima stok server" | ✔ Status → `resolved` (lokal-only), hilang dari daftar; dobel-klik aman (guard status) |

## 5. Laporan Harian — ✔ terekssekusi live

| Langkah | Hasil |
|---|---|
| Tanggal dengan transaksi | ✔ Jumlah transaksi, pendapatan, top item benar |
| Tanggal tanpa transaksi | ✔ Tampil 0, bukan kosong/error |
| Pembanding server `/reports/daily` | ⏳ endpoint belum dibuat — keputusan P2 |

## 6. PWA — ⏳ sebagian

| Langkah | Hasil |
|---|---|
| Lighthouse kategori "Installable" | ⏳ MENUNGGU RUN (P2) — manifest + ikon 192/512 + SW sudah ada di build |
| App terinstall (Android/desktop) | ⏳ menunggu uji device Anda |
| Update SW | ✔ `autoUpdate` aktif (versi baru masuk setelah reload); notifikasi user belum ada (GAP tercatat di REQUIREMENTS W5) |

## 7. Auth & Peran — ✔ terekssekusi live

| Langkah | Hasil |
|---|---|
| Login admin / kasir | ✔ JWT 12 jam, disimpan di IndexedDB |
| Kasir: menu Konflik/Laporan | ✔ Tersembunyi; render guard di App.jsx |
| API admin dengan token kasir | ✔ 403 |
| Token expired | ⏳ deteksi client-side terpasang (isTokenExpired, base64url-safe); skenario expired menunggu uji Anda |
| Login offline | ⏳ dari cache sesi (username harus sama); menunggu uji offline Anda |

## 8. Unit Test Otomatis (`node --test`) — ✔ 7 pass / 0 fail

- `money_test.js` — total/diskon/kembalian edge ✔
- `auth_test.js` — PBKDF2 hash/verify termasuk salt byte >127 ✔
- `sync_response_test.js` — parsing batch respons, idempotensi, backoff monoton ✔

## Temuan & Fix selama pengujian

1. Blank page: `useAuth` tidak diimport di App.jsx → crash React. Fix: import ditambahkan.
2. Sync 401 sebelum login → guard sesi di `syncNow()`.
3. `PBKDF2 600k` ditolak runtime Workers → cap 100k (mitigasi: rate limit login menyusul).
4. JWT_SECRET belum ada di worker → `wrangler secret put`.
5. Page state admin bocor ke sesi kasir → render guard per-role (security review agent).
6. Kamera stream bocor saat error → stop track di catch (security review agent).
7. Loop scan berhenti pada barcode tak dikenal → raf dilanjutkan (security review agent).
8. `resolveConflict` tanpa guard status → filter `status === 'conflicted'` (security review agent).
9. Checkout gagal "null.slice" — `device_id` belum dibuat saat boot → `ensureDeviceId()` di checkout.
10. Pull tidak menerapkan stok baru dari push — server UPDATE tidak menaikkan `updated_at` → watermark tidak melihat perubahan. Fix: `updated_at = ?` (now) dalam UPDATE stok.
11. Uji verifikasi penuh (live): transaksi → push `synced` → stok server 50→49 → pull menerapkan stok baru ke IndexedDB lokal (49). ✔
