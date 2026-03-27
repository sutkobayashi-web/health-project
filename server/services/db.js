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
    // マイグレーション: users に session_token カラム追加（同時ログイン防止）
    const userCols = db.prepare("PRAGMA table_info(users)").all();
    if (!userCols.find(c => c.name === 'session_token')) {
      db.exec("ALTER TABLE users ADD COLUMN session_token TEXT");
    }
    // マイグレーション: ユーザー投稿既読管理（新着バッジ用）
    db.exec(`CREATE TABLE IF NOT EXISTS post_read_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      last_read_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, post_id)
    )`);
    // マイグレーション: 週間食事分析レポート
    db.exec(`CREATE TABLE IF NOT EXISTS food_weekly_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      nickname TEXT,
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      meal_count INTEGER DEFAULT 0,
      report_text TEXT NOT NULL,
      admin_comment TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )`);
    // マイグレーション: 週間食事レポートへの推進メンバー議論
    db.exec(`CREATE TABLE IF NOT EXISTS food_report_chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id TEXT NOT NULL,
      member_name TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
    // マイグレーション: 健診閲覧ログ
    db.exec(`CREATE TABLE IF NOT EXISTS checkup_access_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`);

    // buddyカラム追加
    try { db.exec("ALTER TABLE users ADD COLUMN buddy_data TEXT DEFAULT ''"); } catch(e) {}

    // マイグレーション: バディーチャット履歴テーブル
    db.exec(`CREATE TABLE IF NOT EXISTS buddy_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS notice_reads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notice_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(notice_id, user_id)
    )`);
  }
  return db;
}

module.exports = { getDb };
