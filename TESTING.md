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

## 6. PWA — ✔ sebagian terekssekusi

| Langkah | Hasil |
|---|---|
| Lighthouse kategori "Installable" | ⏳ MENUNGGU RUN — manifest + ikon 192/512 + SW sudah ada di build |
| App terinstall (Android/desktop) | ⏳ menunggu uji device Anda |
| Update SW: banner "Versi baru tersedia" | ✔ registerType 'prompt' + SWUpdateBanner (onNeedRefresh → tombol Muat ulang / Nanti) — kode sesuai docs vite-plugin-pwa |

## 9. GAP #1–4 + /reports/daily (Langkah 2) — ✔ terekssekusi (browser-harness, live)

| Fitur | Hasil |
|---|---|
| Barcode auto-generate (W1): POST /products tanpa barcode | ✔ 201; tersimpan `2150235150259` — EAN-13 valid (prefix 2 in-store, checksum GS1; unit test) |
| Riwayat transaksi (W6): halaman History, tap → struk | ✔ dibangun; orderBy index created_at, 50 terakhir, semua role |
| Notif update SW (W5) | ✔ banner prompt (bukan update diam-diam) |
| `/reports/daily` server (B2 pembanding) | ✔ admin-only (kasir 403), date salah 400; live cocok dengan laporan lokal |
| Resolusi konflik lokal-only (W4) | ✔ teks AC direvisi sesuai keputusan; log server ditunda v1.1 |

## 10. Uji browser-harness live (Langkah 3) — ✔

| Langkah | Hasil |
|---|---|
| Kasir: nav hanya Kasir+Riwayat (Konflik/Laporan tersembunyi) | ✔ |
| Riwayat: daftar transaksi + status, tap → struk | ✔ (DEV…000001 · Rp72.000 · synced) |
| Admin: Konflik kosong → "Tidak ada konflik"; dengan data conflicted → daftar + Terima stok server → hilang, tanpa blank | ✔ |
| Laporan: tanggal dengan transaksi (10-03) → 1 txn, Rp72.000, top item | ✔ |
| `/reports/daily` live vs laporan lokal | ✔ untuk transaksi device ini (device lain belum di-pull — transaksi push-only, sesuai arsitektur) |

### Root cause laporan "Konflik blank" dari pengguna
1. **Deploy memakai build lama** — live hash `D1nf09vx` vs build benar `CquZytNi`. Fix: rebuild + redeploy.
2. **Crash React saat meninggalkan halaman Konflik** (`n is not a function`): `useEffect(reload, [])` dengan `reload = () => conflictedTxns().then(...)` — callback useEffect yang **return Promise** (bukan undefined/function) membuat React crash saat unmount → blank + nav hilang. Fix: bungkus `useEffect(() => { reload() }, [])` (Conflicts.jsx; POS.jsx dikonsistenkan). Pola ini di-audit ke seluruh src — hanya dua lokasi itu.
3. **"Konflik tak bisa diklik" di localhost** = efek samping crash loop (setelah blank, tidak ada nav untuk diklik). Setelah fix, localhost & live lolos matriks navigasi 7 langkah bolak-balik (Konflik↔Kasir↔Laporan↔Riwayat) tanpa crash, 0 console error.

Deploy final: `43593a4c`.

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

## 11. Opsi A–D (finalisasi) — 2026-10-04

### A. Lighthouse (live) — ✔

| Kategori | Skor |
|---|---|
| Performance | 99 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 (setelah fix meta description + robots.txt) |
| **PWA** | **100** (setelah fix maskable icon + clientsClaim) |

Catatan: lighthouse@10 sempat FAIL audit `service-worker` di headless — false negative (SW aktif & controlling terverifikasi via CDP di browser nyata; run final memberi PWA 100). Fix yang diambil: `clientsClaim: true`, ikon `purpose: maskable`, meta description, robots.txt, favicon.svg (menghilangkan 404 console).

### B. Token expired end-to-end — ✔ + 1 bug bonus diperbaiki

| Langkah | Hasil |
|---|---|
| Buat transaksi pending, tamper token jadi exp 2001 | ✔ |
| Reload → client deteksi expired → minta login ulang | ✔ |
| Transaksi pending & riwayat tetap utuh | ✔ outbox=1, txns utuh |
| Login ulang → sync → pending terkirim | ✔ outbox=0, semua `synced` |

**Bug bonus ditemukan:** re-login tanpa logout menumpuk baris di store `users` (admin lama token mati + kasir baru); `getSession` mengambil `all[0]` → sesi mati dipakai → sync macet senyap. Fix: `saveSession` = clear + put (satu device = satu user aktif).

### B2. Bug "offline → online, sync tak jalan" (laporan pengguna, localhost) — ✔ root cause + fix

| Langkah | Hasil |
|---|---|
| Reproduksi: offline → transaksi → online → klik sync | ✔ REPRODUCED: badge "Sinkronkan (4)" menetap, POST batch tak terkirim |
| Akar masalah | ✔ **Backoff vs tombol manual**: transaksi offline gagal berkali-kali → `attempts` naik → backoff 30 menit. Tombol sync manual memakai `dueBatch` yang hanya mengambil item `retry_at <= now` → item yang masih dalam backoff TIDAK dikirim walau user minta eksplisit. Transaksi baru (attempts=0) terkirim; yang lama tersangkut — tampak "sync tidak jalan" |
| Fix | ✔ `dueBatch(limit, force)` + `syncNow(force)` — tombol sync manual = force (abaikan backoff, kirim semua sekarang); auto-sync (event online/interval/startup) tetap hormati backoff |
| Verifikasi pasca-fix | ✔ offline → transaksi → online → klik sync → outbox=0, semua `synced` (tanpa reset manual) |
| Review agent | ✔ `markRetry` tetap naikkan backoff setelah force-fail (tidak reset); auto-sync tidak regresi; test membungkus logika asli (`filterDue` diekstrak dari outbox.js — bukan copy) |

Deploy: `6a1f4958`.

### C. Checklist uji device fisik (untuk dijalankan pemilik)

**Android Chrome — Install & offline:**
1. Buka https://belajar-vibecode.ryandraa27.workers.dev → menu ⋮ → "Tambahkan ke layar utama"
2. Buka dari ikon home screen → harus tanpa address bar (standalone)
3. Aktifkan airplane mode → buat 2–3 transaksi → struk muncul
4. Matikan airplane mode → tunggu ≤30 detik → badge "Tersinkron", tidak ada duplikat di Riwayat

**Android Chrome — Scan kamera (B1):**
5. Halaman Kasir → 📷 Scan → izinkan kamera
6. Arahkan ke barcode EAN-13 fisik (kemasan produk) → item masuk keranjang
7. Tolak izin kamera (via setting browser) → buka scan → pesan inline, bukan crash

**iOS Safari — fallback jsqr:**
8. Buka URL → scan → arahkan barcode → item masuk keranjang
9. Tambah ke Home Screen → buka standalone → katalog & transaksi offline jalan

Laporan hasil: tick AC terkait di REQUIREMENTS.md yang terbukti.

### D. Kredensial default — ✔ diganti di remote

- Endpoint baru: `POST /api/auth/change-password` (auth wajib, self-service, verifikasi password lama, min 8 karakter)
- Uji lokal: lama-salah 401 · baru-pendek 400 · valid ok · login password baru ok · password lama ditolak
- Remote: admin & kasir sudah diganti dari default. Kredensial baru disimpan di `.dev.vars.production-note` (gitignore) — **berikan ke pemilik toko, hapus setelah disimpan aman**.
- Seed default `admin123/kasir123` tetap dibuat pada DB kosong (memudahkan setup awal) — WAJIB langsung diganti setelah setup toko nyata.
