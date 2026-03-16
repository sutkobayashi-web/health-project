const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'db', 'health.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    // スキーマ初期化
    const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
    db.exec(schema);
    // マイグレーション: core_members に status カラムがなければ追加
    const cols = db.prepare("PRAGMA table_info(core_members)").all();
    if (!cols.find(c => c.name === 'status')) {
      db.exec("ALTER TABLE core_members ADD COLUMN status TEXT DEFAULT 'approved'");
    }
  }
  return db;
}

module.exports = { getDb };
