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
    // マイグレーション: vote_cycles に advisor_comment, exec_comment カラムを追加
    const vcCols = db.prepare("PRAGMA table_info(vote_cycles)").all();
    if (!vcCols.find(c => c.name === 'advisor_comment')) {
      db.exec("ALTER TABLE vote_cycles ADD COLUMN advisor_comment TEXT DEFAULT ''");
    }
    if (!vcCols.find(c => c.name === 'exec_comment')) {
      db.exec("ALTER TABLE vote_cycles ADD COLUMN exec_comment TEXT DEFAULT ''");
    }
    // マイグレーション: チャット既読管理テーブル
    db.exec(`CREATE TABLE IF NOT EXISTS chat_read_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_email TEXT NOT NULL,
      post_id TEXT NOT NULL,
      last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(member_email, post_id)
    )`);
    // マイグレーション: AI使用量ログテーブル
    db.exec(`CREATE TABLE IF NOT EXISTS ai_usage_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      function_name TEXT NOT NULL,
      tokens_in INTEGER DEFAULT 0,
      tokens_out INTEGER DEFAULT 0,
      success INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
  }
  return db;
}

module.exports = { getDb };
