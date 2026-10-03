# AGENTS.md

Panduan untuk agent/AI yang mengerjakan repo ini. Baca dulu: REQUIREMENTS.md, ARCHITECTURE.md, DESIGN.md, TASKS.md.

## Stack (terkunci — jangan ganti tanpa diskusi)

- Frontend: React 18 + Vite, **JavaScript murni (tanpa TypeScript)**, tanpa state/UI library.
- PWA: `vite-plugin-pwa` (Workbox). IndexedDB via **Dexie** — skema terpusat di `src/db/db.js`, semua akses lewat modul `src/db/`.
- Backend: **Cloudflare Workers + Hono**, DB **D1** (SQLite, skema di `schema.sql`). Deploy: `npm run deploy`. Auth PBKDF2 (Web Crypto) + HMAC JWT — tanpa dependency native (bcrypt/express/better-sqlite3 dilarang di Workers).
- Node ≥ 20 (untuk tooling), Node tidak menjalankan backend.

## Aturan kerja

1. **Offline-first adalah kontrak**: jalur transaksi kasir TIDAK BOLEH menyentuh jaringan. Uji setiap perubahan dengan DevTools → Network: Offline.
2. **Uang = integer rupiah penuh** (tanpa sen). Tanpa float aritmetika uang. Helper: `src/lib/money.js`.
3. **ID = UUID v4** untuk semua data buatan client. Jangan pernah menyentuh asumsi ID autoincrement server.
4. **Sync engine (`src/sync/sync.js`) adalah jantungnya.** Perubahan di situ wajib idempoten: jalankan dua kali tidak boleh menduplikasi. Semua mutasi outbox lewat `src/db/outbox.js`, jangan tulis store langsung dari komponen.
5. Struktur file ikuti ARCHITECTURE.md §2. Jangan buat folder baru tanpa alasan.
6. Setiap fungsi non-trivial (perhitungan uang, resolusi konflik, parsing sync response) punya satu test/assert kecil di `*_test.js` tanpa framework (`node --test` atau assert script). Lainnya tidak perlu.
7. Komentar hanya untuk `ponytail:` (perekat yang disengaja). Sisanya kode harus jelas sendiri.
8. Pesan UI bahasa Indonesia, konsisten dengan DESIGN.md.

## Definisi "selesai" untuk setiap task TASKS.md

- `npm run dev` jalan; alur yang disentuh teruji offline (airplane mode).
- Acceptance criteria item REQUIREMENTS.md terkait tercentang.
- Lint/build bersih (`npm run build` tanpa error).
- Sync tetap idempoten setelah perubahan (reload di tengah sync tidak merusak data).

## Anti-pattern yang dilarang di repo ini

- Menambah dependency untuk masalah <20 baris (cek dulu: apa yang sudah terpasang?).
- State global baru (Redux/Zustand/React Query) — context cukup.
- Fetch tanpa timeout di `src/sync/api.js` — semua request network lewat helper itu.
- Menulis ke IndexedDB dari komponen React — hanya lewat modul `src/db/`.
- Menyimpan token/JWT di localStorage — di IndexedDB `users` sesuai skema.
