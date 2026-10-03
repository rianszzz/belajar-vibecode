# DESIGN.md

## 1. Prinsip UI

- Bahasa Indonesia. Mobile-first (kasir di tablet/HP Android), minimum layar 360px, tetap layak di desktop.
- Tanpa UI framework — CSS biasa + CSS variables. Toko kecil, 6 halaman; framework hanya menambah build.
- Keadaan network selalu terlihat: badge online/offline + counter transaksi pending di header, di semua halaman.

## 2. Design tokens (CSS variables)

```css
:root {
  --bg: #f5f5f4;        --surface: #ffffff;   --border: #e7e5e4;
  --text: #1c1917;      --muted: #78716c;
  --primary: #0f766e;   --primary-ink: #ffffff;
  --danger: #b91c1c;    --warning: #b45309;   --ok: #15803d;
  --radius: 8px;
  --font: system-ui, sans-serif;
  /* font-size hanya 4 langkah: 13 / 15 / 18 / 24 */
}
```

Status warna: `pending` = warning, `synced` = ok, `conflicted` = danger.

## 3. Halaman & alur

### Login
Username + password → JWT + profil ke IndexedDB. Offline: login dari cache profil
(cek password hash lokal saat offline; server dicek saat online). Setelah login → POS.

### POS (utama kasir)
Layout dua kolom (satu kolom bertumpuk di layar sempit):
- Kiri: cari produk (input nama/scan) + grid kategori + grid produk (tap = masuk keranjang).
- Kanan: keranjang (item, qty ± , subtotal), diskon input, total besar, tombol BAYAR.
- Scan barcode: ikon kamera → overlay kamera (BarcodeDetector, fallback jsQR) → item masuk keranjang.
- Bayar: input uang tunai → kembalian otomatis → konfirmasi → struk modal.
- Item qty > stok lokal → tombol disable + pesan inline. Stok 0 → produk abu-abu.

### Struk (modal + print)
Monospace, 38ch lebar (thermal 58mm): nomor, tanggal, item (qty × harga), subtotal,
diskon, total, bayar, kembali. Tombol cetak → `window.print()` dengan
`@media print` (sembunyikan semua kecuali struk). Riwayat bisa buka ulang struk.

### Products (admin)
Tabel: barcode, nama, harga, stok, kategori, status. Form tambah/edit (modal).
Nonaktifkan = toggle. Pencarian + filter kategori. Tombol "Sinkronkan" ada di header global.

### History (kasir + admin)
Daftar transaksi tanggal terpilih, filter status (pending/synced/conflicted), tap → struk.

### Report (admin)
`<input type="date">` → kartu ringkas: jumlah transaksi, pendapatan, item terlaris
(tabel top 5). Diambil dari IndexedDB.

### Conflicts (admin)
Daftar transaksi `conflicted`: item, stok server vs diminta, aksi
[Terima stok server] / [Batalkan transaksi]. Hilang setelah diputuskan + sync.

## 4. Komponen

| Komponen | Isi |
|---|---|
| `Layout` | header (judul, SyncBadge, nav per-role), container |
| `SyncBadge` | status online + jumlah pending; klik = sync manual |
| `ProductGrid` | grid kartu produk, prop: onPick, query, kategori |
| `Cart` | daftar item keranjang + qty controls |
| `ReceiptModal` | render struk dari snapshot, tombol cetak |
| `Scanner` | overlay kamera, callback onDetect |

## 5. Aksesibilitas & dasar

- Semua input punya `<label>`; tombol ≥44px tap target; kontras AA.
- Struk modal: fokus tertahan di modal, `Esc` menutup.
- Tanpa animasi wajib; transisi CSS ≤150ms.

## 6. Print stylesheet

```css
@media print { body * { display: none; } .receipt, .receipt * { display: block; } }
```
(ponytail: cukup untuk satu struk; upgrade ke cloning node bila layout print rusak.)
