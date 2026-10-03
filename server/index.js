import express from 'express'
import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'

const DB_FILE = new URL('./data.db', import.meta.url).pathname
mkdirSync(new URL('./', import.meta.url).pathname, { recursive: true })
const dbSqlite = new Database(DB_FILE)
dbSqlite.pragma('journal_mode = WAL')
dbSqlite.pragma('foreign_keys = ON')

dbSqlite.exec(`
CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('kasir','admin')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS products (
  uuid TEXT PRIMARY KEY,
  barcode TEXT UNIQUE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  cost INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS transactions (
  uuid TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  receipt_no TEXT NOT NULL,
  cashier TEXT NOT NULL,
  total INTEGER NOT NULL,
  discount INTEGER NOT NULL DEFAULT 0,
  paid INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  items TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS stock_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_uuid TEXT NOT NULL REFERENCES products(uuid),
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  txn_uuid TEXT,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS conflicts (
  txn_uuid TEXT PRIMARY KEY,
  resolution TEXT,
  resolved_by TEXT,
  at TEXT
);
`)

const app = express()
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true }))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Mini POS server :${PORT}`))
