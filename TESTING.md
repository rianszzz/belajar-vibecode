# TESTING.md — Hasil Uji Manual

Tanggal uji: 2026-10-04 · URL: https://belajar-vibecode.ryandraa27.workers.dev
Build: `vite build` bersih · Unit test: `node --test` → 7 pass / 0 fail

## 1. Alur Kasir Offline (airplane mode)

| Langkah | Hasil |
|---|---|
| Login online → tutup koneksi (DevTools Offline) | ✔ App tetap jalan dari precache + IndexedDB |
| Buat transaksi (tap produk, qty, diskon, bayar) | ✔ Tersimpan <1s, struk muncul, jaringan tidak tersentuh |
| Status transaksi | ✔ `pending`, counter di SyncBadge bertambah |
| Reload / tutup-buka browser saat offline | ✔ Transaksi pending & katalog tetap ada |
| Stok lokal setelah jual | ✔ Berkurang optimistik, tidak boleh jadi negatif (guard qty) |

## 2. Sinkronisasi (kembali online)

| Langkah | Hasil |
|---|---|
| Nyalakan koneksi → auto-sync (event online + interval 30s) | ✔ Transaksi terkirim, status → `synced` |
| Kirim ulang transaksi yang sama (restart di tengah sync) | ✔ Server jawab `duplicate` — TIDAK duplikat (dedup UUID) |
| Watermark pull | ✔ Hanya katalog berubah sejak `since` terakhir, bukan full refresh |
| Sync dengan network timeout | ✔ Backoff+jitter: item tetap di outbox, retry otomatis |

## 3. Throttle "Slow 3G"

| Langkah | Hasil |
|---|---|
| Kasir bertransaksi saat throttle | ✔ Tidak ada efek — jalur kasir 100% lokal |
| UI tidak freeze | ✔ Sync async; SyncBadge menampilkan "Sinkron…" |
| API call timeout | ✔ 8s timeout di `src/sync/api.js`, gagal → retry backoff |

## 4. Konflik Stok (2 sumber tulis)

| Langkah | Hasil |
|---|---|
| Device A push transaksi qty valid; device lain push qty 999 untuk produk sama | ✔ Server tolak → `conflict` + kirim stok final server |
| Client terima `conflict` | ✔ Stok lokal diganti stok server; transaksi → `conflicted`; outbox dibersihkan |
| Admin buka halaman Konflik | ✔ Daftar konflik: item, qty diminta, stok server |
| Klik "Terima stok server" | ✔ Status → `resolved` (lokal-only, sesuai keputusan), hilang dari daftar |

## 5. Laporan Harian

| Langkah | Hasil |
|---|---|
| Buka Laporan tanggal hari ini (ada transaksi) | ✔ Jumlah transaksi, pendapatan, top 5 item benar |
| Tanggal tanpa transaksi | ✔ Tampil 0, bukan kosong/error |
| Hitung offline | ✔ Dari IndexedDB — bekerja tanpa jaringan |

## 6. PWA

| Langkah | Hasil |
|---|---|
| Lighthouse kategori "Installable" | ✔ Pass (manifest valid, ikon 192/512, SW) |
| App terinstall (desktop Chrome) | ✔ Buka tanpa address bar |
| Update SW | ✔ `registerType: autoUpdate` — versi baru aktif otomatis |

## 7. Auth & Peran

| Langkah | Hasil |
|---|---|
| Login admin / kasir | ✔ JWT 12 jam, disimpan di IndexedDB |
| Kasir: menu Konflik/Laporan | ✔ Tersembunyi; render guard di App.jsx |
| API admin dengan token kasir | ✔ 403 |
| Token expired | ✔ Deteksi client-side → minta login ulang; pending data tidak hilang |
| Login offline | ✔ Hanya sesi cache device itu (username harus sama) |

## 8. Unit Test Otomatis (`node --test`)

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
