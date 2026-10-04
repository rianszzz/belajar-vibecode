# TASKS.md

Urutan pengerjaan. Tiap task = definisi "selesai" di AGENTS.md.
Dependency: T1 → T2 → T3 → (T4, T5 paralel) → T6 → T7 → T8 → T9 → T10.

## T1 — Scaffold & fondasi
- Vite + React (JS), `vite-plugin-pwa`, folder sesuai ARCHITECTURE.md §2.
- `src/db/idb.js`: open DB v1, semua store/index REQUIREMENTS.md §5, `onupgradeneeded` migrasi.
- `src/lib/money.js`: integer (rupiah penuh), format `Rp`.
- Scaffold backend: Express + better-sqlite3, skema tabel, `/health`.
- ✔ AC: app buka; IndexedDB punya semua store; `/health` 200.

## T2 — Auth + peran (B3)
- `/auth/login` (bcrypt + JWT). Client: halaman Login, auth-context, simpan sesi di IndexedDB `users`, login offline dari cache.
- Guard route per role; header `Authorization` di semua call via `sync/api.js` (fetch + timeout 8s + refresh handling).
- ✔ AC: login kasir/admin; kasir ditolak route & API admin (403); sesi bertahan reload; token expired → minta login ulang, pending data tidak hilang.

## T3 — Katalog + CRUD produk (W1)
- `/products/changes`, `/products` CRUD admin. Client: page Products (admin), ProductGrid + pencarian + kategori di POS.
- Seed data awal (script server): 20 produk contoh dengan barcode EAN-13.
- ✔ AC: semua checkbox W1.

## T4 — Transaksi kasir + struk (W2, W6)
- Alur panas: cart-context → bayar → putAll IndexedDB (txn+receipt+outbox, stok optimistik, seq struk) → ReceiptModal + print.
- `money_test.js`: total/diskon/kembalian edge (diskon > subtotal ditolak, kembalian benar).
- ✔ AC: semua checkbox W2 & W6; transaksi sukses di airplane mode.

## T5 — Service worker + installable (W5)
- Konfigurasi `vite-plugin-pwa` sesuai REQUIREMENTS.md §6 (precache; network-first katalog API; never-cache API mutasi).
- Manifest, ikon 192/512, prompt update SW ("versi baru tersedia").
- ✔ AC: semua checkbox W5; Lighthouse installable.

## T6 — Sync engine (W4, 4a) — jantung
- `src/sync/sync.js`: loop push/pull, backoff+jitter, watermark, batch ≤50, proses respons per-item.
- `src/db/outbox.js`: enqueue/dequeue/retry_at, satu-satunya penulis outbox.
- `sync_response_test.js`: parsing respons batch (synced/duplicate/conflict) + idempotensi (panggil 2×).
- Server: dedup UUID, atomic stock guard, `conflicts` tabel.
- ✔ AC: semua checkbox W4 & 4a; reload di tengah sync tidak duplikat.

## T7 — Konflik UI (W4 lanjutan)
- Page Conflicts (admin): daftar conflicted, aksi terima/batalkan → tulis ke server saat sync.
- ✔ AC: konflik stok dari 2 device terlihat dan terselesaikan.

## T8 — Laporan harian (B2)
- Page Report dari IndexedDB; `/reports/daily` server sebagai pembanding.
- ✔ AC: semua checkbox B2.

## T9 — Scan barcode (B1)
- `Scanner`: BarcodeDetector, fallback `jsqr` (dependency ke-4, hanya karena fallback browser).
- ✔ AC: semua checkbox B1 kecuali torch.

## T10 — Polish ketahanan + uji manual (4c)
- UI status koneksi + pending counter; retry/backoff terlihat; uji manual Slow 3G & offline toggle; catat hasil di `TESTING.md`.
- ✔ AC: semua checkbox 4c; build bersih; lighthouse PWA pass penuh.

---

# TAHAP UI POLISH (Stitch "Kasir Bersih Nusantara")

Desain referensi: Stitch project `18194228294840684774` (DESIGN.md Stitch + 3 screen:
POS, Riwayat, Struk thermal + logo SVG). Prinsip desain: Utilitarian Minimalism —
tanpa drop-shadow dekoratif, kedalaman lewat outline & surface tier, tap target ≥44px.
Aturan: tetap TANPA framework UI — hanya CSS tokens + kelas di index.css.
Tiap tahap: build bersih + uji visual (screenshot) + deploy sebelum lanjut.

## U11 — Design tokens (fondasi) — ✔ SELESAI
- `src/index.css`: import Inter + JetBrains Mono; surface tiers (`--surface-low/container/high`);
  spacing scale Stitch (`--space-xs..xl`); typography classes (`.t-headline-lg/md`, `.t-label-*`, `.t-mono`);
  komponen dasar (`.app-header`, `.app-nav`, `.product-card`, `.qty-btn`, `.btn-primary`,
  `.change-box`, `.input-mono`, `.sync-badge`, `.cat-pill`, `.modal-overlay`, `.receipt`).
- Logo SVG Stitch → `public/logo.svg`.
- ✔ AC: build bersih; token terpakai lintas halaman.

## U12 — Layout shell — ✔ SELESAI
- Header sticky global (blur + hair shadow): logo + brand + SyncBadge + nav pill + Keluar.
- Header duplikat di POS/Conflicts/Report dihapus (single source di App.jsx).
- ✔ AC: navigasi bolak-balik semua halaman tanpa crash; nav pill aktif jelas.

## U13 — POS — ✔ SELESAI
- Kartu produk: chip kategori + chip stok (hijau), barcode mono, harga 18px bold teal, hover border primary.
- Stok 0: disabled + abu.
- Cart: baris permukaan `--surface-low`, stepper 44×44 (−/+ 18px bold), qty tengah 18px.
- Kalkulasi: Subtotal mono, Total 24px bold teal, kembalian box `--secondary-fixed/40`.
- Tombol BAYAR SEKARANG: 52px, `--primary-container`, active scale 0.99.
- ✔ AC: alur transaksi offline tetap <1s; screenshot cocok dengan referensi Stitch.

## U14 — ReceiptModal — ✔ SELESAI
- Struk thermal: border-top 6px primary, mono 13px/18px, dashed divider, header toko,
  pasangan label-nilai `flex space-between` (pola Stitch), maks 38ch.
- Tombol Cetak (44px) + Tutup; Esc menutup.
- ✔ AC: `@media print` hanya struk yang tercetak.

## U15 — History + Conflicts + Report — ✔ SELESAI
- History: kartu transaksi dua kolom (receipt_no mono + tanggal | total teal + status berwarna).
- Conflicts/Report: max-width 640, token typografi, kartu ringkas 24px angka.
- ✔ AC: semua halaman konsisten satu bahasa visual.

## U16 — Verifikasi akhir — ✔ SELESAI
- Screenshot semua halaman (login/POS/Riwayat/struk) vs referensi Stitch.
- Console 0 error; unit test pass; Lighthouse ≥ skor sebelumnya (PWA 100).
- Deploy live.
- ✔ AC: tidak ada regresi fungsional (transaksi offline, sync, konflik, laporan).
