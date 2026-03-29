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
    // マイグレーション: buddy_type カラム追加
    try { db.exec("ALTER TABLE users ADD COLUMN buddy_type TEXT DEFAULT 'gentle'"); } catch (e) { /* already exists */ }
  }
  return db;
}

module.exports = { getDb };
