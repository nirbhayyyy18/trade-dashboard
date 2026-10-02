import Database from "better-sqlite3";
import path from "path";

const dbPath = path.resolve("trades.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS pull_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_id TEXT NOT NULL UNIQUE,
    client TEXT NOT NULL,
    symbol TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    timestamp TEXT NOT NULL,
    pull_run_id INTEGER,
    FOREIGN KEY (pull_run_id)
      REFERENCES pull_runs(id)
  );

  CREATE INDEX IF NOT EXISTS idx_trades_timestamp
  ON trades(timestamp);

  CREATE INDEX IF NOT EXISTS idx_trades_pull_run_id
  ON trades(pull_run_id);
`);

export default db;