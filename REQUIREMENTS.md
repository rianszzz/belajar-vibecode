# REQUIREMENTS.md — Mini POS / Inventory PWA Offline-First

## 1. Ringkasan

PWA kasir + stok untuk toko kecil (1 toko, <5.000 produk, 1–3 device kasir).
Harus tetap bisa bertransaksi saat internet putus; data tersinkron balik saat online.

- **Frontend**: React + Vite (JavaScript murni), PWA (service worker + IndexedDB via Dexie)
- **Backend sync**: Cloudflare Workers + Hono, DB D1 (SQLite) — deploy `npm run deploy`
- **Konflik**: Last-write-wins (LWW) + guard stok negatif
- **Bahasa UI**: Indonesia
- **Live**: https://belajar-vibecode.ryandraa27.workers.dev

---

## 2. Wajib

### W1. Katalog Produk

Admin dapat CRUD produk: SKU/barcode, nama, harga jual, harga beli (opsional),
stok, kategori, status aktif/nonaktif. Kasir read-only.

**Acceptance criteria:**
- [ ] Admin bisa tambah produk (nama wajib; barcode auto-generate jika kosong; harga ≥ 0; stok awal ≥ 0) <!-- GAP: auto-generate barcode belum ada — sisa field sudah tervalidasi (harga negatif 400, barcode duplikat 409) -->
- [x] Admin bisa edit, nonaktifkan (soft-delete — produk punya transaksi tidak boleh hard-delete) <!-- PUT/DELETE 200 terverifikasi via API; DELETE = soft-delete -->
- [x] Kasir tidak punya aksi CRUD produk (tombol & API ditolak, HTTP 403) <!-- terverifikasi: token kasir → 403 -->
- [x] Katalog tampil di UI kasir dengan pencarian nama + filter kategori <!-- terverifikasi di browser live -->
- [x] Katalog tersimpan di IndexedDB dan tampil offline penuh <!-- dieksekusi L1: katalog dari IDB tampil saat semua fetch /api diblok; UI reload otomatis setelah pull (dataVersion) -->
- [x] Perubahan katalog dari device lain muncul setelah sync tanpa refresh manual <!-- pull watermark + bulkPut terverifikasi (stok server → lokal) -->

### W2. Transaksi Kasir (POS)

Kasir buat transaksi: tambah item ke keranjang, set qty, diskon per-transaksi
(opsional), bayar tunai, simpan transaksi.

**Acceptance criteria:**
- [x] Tambah item via tap katalog atau input/scan barcode <!-- tap ✔ live; scan barcode dibangun, uji kamera menunggu device (B1) -->
- [x] Qty ditolak/dibatasi melebihi stok lokal (pesan jelas); stok tidak boleh jadi negatif karena satu transaksi <!-- guard di cart-context + server atomic guard (conflict) ✔ -->
- [x] Total dihitung benar: Σ(qty × harga) − diskon; pembulatan tanpa nilai float jelek (pakai satuan sen/integer) <!-- rupiah penuh integer; money_test.js 3 pass -->
- [x] Transaksi tersimpan di IndexedDB dengan ID unik (UUID) segera, UI konfirmasi <1s, bekerja penuh offline <!-- checkout hanya tulis IDB (tanpa network by design); struk modal ✔ live -->
- [x] Saat simpan, stok lokal IndexedDB langsung dikurangi (optimistik) <!-- ✔ live -->
- [x] Transaksi punya status: `pending` (belum sync) → `synced` <!-- ✔ live: pending → synced setelah auto-sync -->
- [x] Kasir tidak bisa hapus/edit transaksi setelah selesai (refund/void = flow admin, di luar scope v1) <!-- tidak ada UI/API untuk itu -->

### W3. Berjalan Offline (Service Worker + IndexedDB)

**Acceptance criteria:**
- [x] App shell + aset statis ter-cache (precache; strategi di §6) <!-- build: precache 7 entries; SW aktif -->
- [x] Dengan airplane mode dari load pertama: app buka, katalog muncul, transaksi bisa dibuat & disimpan <!-- dieksekusi: fetch /api diblok penuh → transaksi & struk OK, 0 panggilan jaringan (TESTING.md §1) -->
- [x] Data (produk, transaksi, user cache) persisten di IndexedDB, bertahan reload & restart browser <!-- reload berulang ✔ live -->
- [x] UI menampilkan status koneksi (online/offline) dan jumlah transaksi `pending` <!-- SyncBadge ✔ live -->
- [x] Tanpa error uncaught saat request jaringan gagal (fallback ke lokal) <!-- timeout 8s + backoff; 401 pre-login di-skip senyap -->

### W4. Sinkronisasi Online + Resolusi Konflik

Push transaksi `pending` ke server saat online; pull perubahan katalog/stok.
LWW pada `updated_at`; guard stok negatif di server.

**Acceptance criteria:**
- [x] Sync otomatis saat kembali online (event `online` + polling interval, bukan hanya saat buka app) <!-- ✔ live: pending 1 → synced tanpa klik -->
- [x] Sync juga bisa dipicu manual (tombol "Sinkronkan") dengan indikator progres <!-- SyncBadge klik ✔ live -->
- [x] Push idempotent: kirim ulang transaksi yang sama tidak membuat duplikat (server dedup by UUID) <!-- ✔: `duplicate`; unit test idempotensi -->
- [x] Konflik stok: server menolak push yang membuat stok < 0 → respons `conflict` per-item; client menerima stok final server, menandai transaksi `conflicted`, UI admin melihat daftar konflik untuk diselesaikan (terima stok server / batalkan transaksi) <!-- end-to-end ✔ live; resolusi = terima stok server (void = v1.1, keputusan grill) -->
- [ ] LWW untuk edit katalog: perubahan terbaru (`updated_at` server-side) menang, tercatat di log sinkron <!-- LWW ✔ (updated_at server); GAP: log resolusi sinkron belum ada -->
- [x] Sync tidak menggandakan item di keranjang aktif dan tidak merusak UI yang sedang dipakai <!-- keranjang di memori, sync tak menyentuhnya -->
- [x] Sync aman dijalankan ulang setelah crash di tengah proses (batch berdasarkan cursor/watermark, bukan "semua data tiap kali") <!-- outbox tersisa + watermark; sync_response_test -->

### W5. Installable PWA

**Acceptance criteria:**
- [x] `manifest.json` valid: nama, ikon 192/512, `display: standalone`, theme color <!-- di dist build -->
- [ ] Chrome Lighthouse: "Installable" pass <!-- MENUNGGU RUN LIGHTHOUSE (P2) -->
- [ ] Terinstall di Android (home screen) dan desktop; buka tanpa browser chrome <!-- MENUNGGU UJI DEVICE ANDA -->
- [ ] Update service worker terdeteksi dan memberi tahu user "versi baru tersedia" (skip-waiting atau prompt reload) <!-- GAP: autoUpdate diam-diam, belum ada notifikasi user -->

### W6. Preview Struk

**Acceptance criteria:**
- [x] Setelah transaksi selesai: modal pratinjau struk (nomor, tanggal, item+qty+harga, subtotal, diskon, total, bayar, kembali) <!-- ✔ live -->
- [x] Struk bisa dicetak via `window.print()` dengan print stylesheet (lebar struk, tanpa header/footer browser) <!-- @media print terpasang; uji dialog cetak menunggu Anda -->
- [ ] Struk tersimpan di IndexedDB, bisa dibuka ulang dari riwayat transaksi offline <!-- struk tersimpan ✔; GAP: halaman History (riwayat) belum dibangun -->
- [x] Nomor struk unik & berurutan per device (format `DEV{deviceId}-{seq}`), tidak bentrok antar device saat sync <!-- ✔ live: DEVxxxx-000001 -->

---

## 3. Bonus

### B1. Scan Barcode via Kamera

- [ ] Scan kamera (BarcodeDetector API jika ada; fallback lib jsQR/ ZXing) mendeteksi EAN-13/Code128 <!-- dibangun; uji menunggu device kamera -->
- [ ] Hasil scan menambahkan produk ke keranjang / mencari di katalog <!-- dibangun; uji menunggu device kamera -->
- [ ] Bekerja di Android Chrome & iOS Safari (via fallback lib); graceful error kalau kamera tidak diizinkan <!-- graceful error ✔ (kodenya); uji lintas browser menunggu device -->
- [ ] Torch toggle (bonus di atas bonus — skip jika mahal) <!-- SKIP sesuai rencana -->

### B2. Laporan Harian

- [x] Halaman laporan: total transaksi, total pendapatan, item terjual terbanyak, untuk tanggal terpilih <!-- ✔ live -->
- [ ] Dihitung dari data lokal IndexedDB (offline OK), angka sama dengan hasil agregasi server setelah sync penuh <!-- lokal ✔; endpoint pembanding /reports/daily BELUM dibuat — keputusan P2 -->
- [x] Tanggal tidak punya transaksi → tampil 0, bukan kosong/error <!-- ✔ live -->

### B3. Peran Kasir / Admin

- [x] Login username + password; role `kasir` atau `admin` <!-- ✔ live -->
- [x] Kasir: POS, struk, lihat stok. Admin: semua + CRUD produk, laporan, penyelesaian konflik, kelola user <!-- kelola user: belum ada UI kelola user (seed saja) — sisa ✔ live -->
- [x] Route admin terlindungi (redirect kasir); API admin tolak token kasir (403) <!-- ✔ live -->
- [ ] Sesi bertahan offline (token di IndexedDB), validasi token saat sync; expired → minta login ulang, transaksi pending tidak hilang <!-- sesi IDB + isTokenExpired ✔; skenario expired end-to-end menunggu uji Anda -->

---

## 4. Dinilai (fokus kualitas)

### 4a. Strategi Cache & Sinkronisasi — dijelaskan + diimplementasi

**Kriteria:**
- [x] §6 menjelaskan pilihan cache per tipe resource beserta alasan satu kalimat
- [x] Sync queue punya retry dengan backoff eksponensial + jitter; tidak spam server <!-- backoff.js + unit test -->
- [x] Batch push (per N transaksi / per flush), bukan satu request per transaksi <!-- batch ≤50 ✔ -->
- [x] Watermark/cursor per endpoint pull (katalog berubah sejak timestamp X) — tidak full-refresh tiap sync <!-- ✔ live -->
- [x] Documented: apa yang terjadi jika sync gagal di tengah batch (partial commit handling) <!-- ARCHITECTURE.md §2 + TESTING.md §2 -->

### 4b. Desain Data Lokal — skema IndexedDB jelas

**Kriteria:**
- [x] §5 skema lengkap: object store, key, index, alasan
- [x] Semua query UI layani lewat index (pencarian nama, filter kategori, transaksi by status/tanggal) — bukan full scan JS <!-- Dexie where() dengan index -->
- [x] Versi skema + migrasi (`onupgradeneeded`) terdefinisi <!-- Dexie db.version(1) terpusat di src/db/db.js -->
- [x] ID lokal UUID; tidak ada asumsi ID numerik server untuk data buatan client <!-- crypto.randomUUID -->

### 4c. Ketahanan Koneksi Buruk

**Kriteria:**
- [x] Timeouts + retry pada request sync; UI tidak freeze saat jaringan lambat (async, indikator) <!-- api.js timeout 8s; SyncBadge async -->
- [x] Transaksi pending bertahan: reload, restart browser, restart device <!-- reload ✔; IDB persisten antar sesi ✔ (uji L1) -->
- [x] Tidak ada kehilangan data saat sync gagal berkali-kali; data tetap di antrean <!-- outbox retry_at + backoff -->
- [x] Uji manual tercatat: throttle "Slow 3G" dan offline toggle → alur kasir tetap jalan, sync pulih tanpa duplikat <!-- dieksekusi via delay-injection 2s + fetch-block (TESTING.md §1–3) -->

---

## 5. Skema Data Lokal (IndexedDB) — draft

DB: `pos-db`, versi 1.

| Store | Key | Index | Isi |
|---|---|---|---|
| `products` | `uuid` | `barcode`, `name` (lowercase), `category`, `updated_at` | katalog |
| `transactions` | `uuid` | `status`, `created_at`, `device_seq` | transaksi kasir |
| `receipts` | `txn_uuid` | — | snapshot struk (denormalized, render cepat) |
| `outbox` | `txn_uuid` | `retry_at` | antrean push sync (payload + attempt count) |
| `meta` | `key` | — | watermark pull, device_id, seq nomor struk, last sync |
| `users` | `username` | — | cache profil + role (login offline) |

Catatan:
- Transaksi selesai = salin ke `receipts` + status `pending` + entri `outbox`. Tiga store, masing-masing satu tanggung jawab — bukan satu blob raksasa.
- Stok disimpan di `products.stock`; mutasi optimistik saat kasir jual; server adalah sumber kebenaran saat sync.

## 6. Strategi Cache (Service Worker)

| Resource | Strategi | Alasan |
|---|---|---|
| App shell (HTML, JS, CSS, font, ikon) | Precache on install + update on activate | offline dari boot |
| API GET katalog | Network-first, fallback cache; response sukses → update cache | data segar saat online, tetap tampil offline |
| API sync (push/pull) | Never cache; hanya via sync manager | mutasi, tidak boleh dari cache |
| Aset lain (foto produk, jika ada) | Cache-first + revalidate | jarang berubah |

- Komunikasi SW ↔ app tidak perlu postMessage kompleks; sync trigger via `navigator.onLine` + interval di app; SW cukup untuk cache & precache.
- `ponytail:` tanpa Background Sync API — hanya Chrome. Interval polling + event `online` cukup untuk 1–3 device; tambahkan Background Sync kalau nanti butuh sync saat app ditutup.

## 7. Kontrak API Sync (backend sederhana)

Base: `/api/v1`, JSON, auth `Bearer <JWT>`.

| Endpoint | Metode | Fungsi |
|---|---|---|
| `/auth/login` | POST | JWT + profil user |
| `/products/changes?since=<iso>` | GET | pull katalog berubah sejak watermark |
| `/transactions/batch` | POST | push array transaksi → per-item: `synced` \| `conflict` (stok) \| `duplicate` |
| `/products` | POST/PUT/DELETE | admin CRUD (server set `updated_at`) |
| `/reports/daily?date=` | GET | agregasi server (validasi angka laporan lokal) |

Aturan server:
- Dedup transaksi by UUID (`duplicate` = sukses, tidak error).
- Cek stok atomik dalam satu DB transaction per transaksi; stok hasil < 0 → `conflict` + kirim stok final server.
- LWW produk by `updated_at`; log semua resolusi konflik.

## 8. Batasan & Non-goals (v1)

- Tidak ada: multi toko, kembalian selain tunai, pajak multi tarif, export PDF struk, i18n.
- Refund/void = flow admin, diprioritaskan v1.1.
- Enkripsi data lokal: tidak (perangkat milik toko); token auth ya.
