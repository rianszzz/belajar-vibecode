# REQUIREMENTS.md — Mini POS / Inventory PWA Offline-First

## 1. Ringkasan

PWA kasir + stok untuk toko kecil (1 toko, <5.000 produk, 1–3 device kasir).
Harus tetap bisa bertransaksi saat internet putus; data tersinkron balik saat online.

- **Frontend**: React + Vite (JavaScript murni), PWA (service worker + IndexedDB)
- **Backend sync**: REST API Node/Express + SQLite (single file DB, tanpa server DB terpisah)
- **Konflik**: Last-write-wins (LWW) + guard stok negatif
- **Bahasa UI**: Indonesia

---

## 2. Wajib

### W1. Katalog Produk

Admin dapat CRUD produk: SKU/barcode, nama, harga jual, harga beli (opsional),
stok, kategori, status aktif/nonaktif. Kasir read-only.

**Acceptance criteria:**
- [ ] Admin bisa tambah produk (nama wajib; barcode auto-generate jika kosong; harga ≥ 0; stok awal ≥ 0)
- [ ] Admin bisa edit, nonaktifkan (soft-delete — produk punya transaksi tidak boleh hard-delete)
- [ ] Kasir tidak punya aksi CRUD produk (tombol & API ditolak, HTTP 403)
- [ ] Katalog tampil di UI kasir dengan pencarian nama + filter kategori
- [ ] Katalog tersimpan di IndexedDB dan tampil offline penuh
- [ ] Perubahan katalog dari device lain muncul setelah sync tanpa refresh manual

### W2. Transaksi Kasir (POS)

Kasir buat transaksi: tambah item ke keranjang, set qty, diskon per-transaksi
(opsional), bayar tunai, simpan transaksi.

**Acceptance criteria:**
- [ ] Tambah item via tap katalog atau input/scan barcode
- [ ] Qty ditolak/dibatasi melebihi stok lokal (pesan jelas); stok tidak boleh jadi negatif karena satu transaksi
- [ ] Total dihitung benar: Σ(qty × harga) − diskon; pembulatan tanpa nilai float jelek (pakai satuan sen/integer)
- [ ] Transaksi tersimpan di IndexedDB dengan ID unik (UUID) segera, UI konfirmasi <1s, bekerja penuh offline
- [ ] Saat simpan, stok lokal IndexedDB langsung dikurangi (optimistik)
- [ ] Transaksi punya status: `pending` (belum sync) → `synced`
- [ ] Kasir tidak bisa hapus/edit transaksi setelah selesai (refund/void = flow admin, di luar scope v1)

### W3. Berjalan Offline (Service Worker + IndexedDB)

**Acceptance criteria:**
- [ ] App shell + aset statis ter-cache (precache; strategi di §6)
- [ ] Dengan airplane mode dari load pertama: app buka, katalog muncul, transaksi bisa dibuat & disimpan
- [ ] Data (produk, transaksi, user cache) persisten di IndexedDB, bertahan reload & restart browser
- [ ] UI menampilkan status koneksi (online/offline) dan jumlah transaksi `pending`
- [ ] Tanpa error uncaught saat request jaringan gagal (fallback ke lokal)

### W4. Sinkronisasi Online + Resolusi Konflik

Push transaksi `pending` ke server saat online; pull perubahan katalog/stok.
LWW pada `updated_at`; guard stok negatif di server.

**Acceptance criteria:**
- [ ] Sync otomatis saat kembali online (event `online` + polling interval, bukan hanya saat buka app)
- [ ] Sync juga bisa dipicu manual (tombol "Sinkronkan") dengan indikator progres
- [ ] Push idempotent: kirim ulang transaksi yang sama tidak membuat duplikat (server dedup by UUID)
- [ ] Konflik stok: server menolak push yang membuat stok < 0 → respons `conflict` per-item; client menerima stok final server, menandai transaksi `conflicted`, UI admin melihat daftar konflik untuk diselesaikan (terima stok server / batalkan transaksi)
- [ ] LWW untuk edit katalog: perubahan terbaru (`updated_at` server-side) menang, tercatat di log sinkron
- [ ] Sync tidak menggandakan item di keranjang aktif dan tidak merusak UI yang sedang dipakai
- [ ] Sync aman dijalankan ulang setelah crash di tengah proses (batch berdasarkan cursor/watermark, bukan "semua data tiap kali")

### W5. Installable PWA

**Acceptance criteria:**
- [ ] `manifest.json` valid: nama, ikon 192/512, `display: standalone`, theme color
- [ ] Chrome Lighthouse: "Installable" pass
- [ ] Terinstall di Android (home screen) dan desktop; buka tanpa browser chrome
- [ ] Update service worker terdeteksi dan memberi tahu user "versi baru tersedia" (skip-waiting atau prompt reload)

### W6. Preview Struk

**Acceptance criteria:**
- [ ] Setelah transaksi selesai: modal pratinjau struk (nomor, tanggal, item+qty+harga, subtotal, diskon, total, bayar, kembali)
- [ ] Struk bisa dicetak via `window.print()` dengan print stylesheet (lebar struk, tanpa header/footer browser)
- [ ] Struk tersimpan di IndexedDB, bisa dibuka ulang dari riwayat transaksi offline
- [ ] Nomor struk unik & berurutan per device (format `DEV{deviceId}-{seq}`), tidak bentrok antar device saat sync

---

## 3. Bonus

### B1. Scan Barcode via Kamera

- [ ] Scan kamera (BarcodeDetector API jika ada; fallback lib jsQR/ ZXing) mendeteksi EAN-13/Code128
- [ ] Hasil scan menambahkan produk ke keranjang / mencari di katalog
- [ ] Bekerja di Android Chrome & iOS Safari (via fallback lib); graceful error kalau kamera tidak diizinkan
- [ ] Torch toggle (bonus di atas bonus — skip jika mahal)

### B2. Laporan Harian

- [ ] Halaman laporan: total transaksi, total pendapatan, item terjual terbanyak, untuk tanggal terpilih
- [ ] Dihitung dari data lokal IndexedDB (offline OK), angka sama dengan hasil agregasi server setelah sync penuh
- [ ] Tanggal tidak punya transaksi → tampil 0, bukan kosong/error

### B3. Peran Kasir / Admin

- [ ] Login username + password; role `kasir` atau `admin`
- [ ] Kasir: POS, struk, lihat stok. Admin: semua + CRUD produk, laporan, penyelesaian konflik, kelola user
- [ ] Route admin terlindungi (redirect kasir); API admin tolak token kasir (403)
- [ ] Sesi bertahan offline (token di IndexedDB), validasi token saat sync; expired → minta login ulang, transaksi pending tidak hilang

---

## 4. Dinilai (fokus kualitas)

### 4a. Strategi Cache & Sinkronisasi — dijelaskan + diimplementasi

**Kriteria:**
- [ ] §6 menjelaskan pilihan cache per tipe resource beserta alasan satu kalimat
- [ ] Sync queue punya retry dengan backoff eksponensial + jitter; tidak spam server
- [ ] Batch push (per N transaksi / per flush), bukan satu request per transaksi
- [ ] Watermark/cursor per endpoint pull (katalog berubah sejak timestamp X) — tidak full-refresh tiap sync
- [ ] Documented: apa yang terjadi jika sync gagal di tengah batch (partial commit handling)

### 4b. Desain Data Lokal — skema IndexedDB jelas

**Kriteria:**
- [ ] §5 skema lengkap: object store, key, index, alasan
- [ ] Semua query UI layani lewat index (pencarian nama, filter kategori, transaksi by status/tanggal) — bukan full scan JS
- [ ] Versi skema + migrasi (`onupgradeneeded`) terdefinisi
- [ ] ID lokal UUID; tidak ada asumsi ID numerik server untuk data buatan client

### 4c. Ketahanan Koneksi Buruk

**Kriteria:**
- [ ] Timeouts + retry pada request sync; UI tidak freeze saat jaringan lambat (async, indikator)
- [ ] Transaksi pending bertahan: reload, restart browser, restart device
- [ ] Tidak ada kehilangan data saat sync gagal berkali-kali; data tetap di antrean
- [ ] Uji manual tercatat: throttle "Slow 3G" dan offline toggle → alur kasir tetap jalan, sync pulih tanpa duplikat

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
