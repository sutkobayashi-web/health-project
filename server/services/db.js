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

    // マイグレーション: posts に admin_read_at カラム追加（管理者既読管理）
    const postCols = db.prepare("PRAGMA table_info(posts)").all();
    if (!postCols.find(c => c.name === 'admin_read_at')) {
      db.exec("ALTER TABLE posts ADD COLUMN admin_read_at DATETIME");
    }
    // 既存投稿で admin_read_at が NULL のものを既読扱いにする
    db.exec("UPDATE posts SET admin_read_at = datetime('now') WHERE admin_read_at IS NULL");

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

    db.exec(`CREATE TABLE IF NOT EXISTS buddy_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      choices TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      week_label TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      closed_at TEXT
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS buddy_topic_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      choice_index INTEGER NOT NULL,
      choice_text TEXT NOT NULL,
      comment TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(topic_id, user_id)
    )`);
  }

  // themes テーブルに action_plans カラム追加
  try { db.exec("ALTER TABLE themes ADD COLUMN action_plans TEXT DEFAULT '[]'"); } catch(e) {}

  // プラン案共感テーブル
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS plan_empathy (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      theme_id TEXT NOT NULL,
      plan_index INTEGER NOT NULL,
      member_id TEXT NOT NULL,
      empathy_type TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(theme_id, plan_index, member_id, empathy_type)
    )`);
  } catch(e) {}

  // メンバー自由提案テーブル
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS theme_custom_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      theme_id TEXT NOT NULL,
      member_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      kpi TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )`);
  } catch(e) {}
  try { db.exec("ALTER TABLE theme_custom_plans ADD COLUMN kpi TEXT DEFAULT ''"); } catch(e) {}

  // 自由提案共感テーブル
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS custom_plan_empathy (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      custom_plan_id INTEGER NOT NULL,
      member_id TEXT NOT NULL,
      empathy_type TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(custom_plan_id, member_id, empathy_type)
    )`);
  } catch(e) {}

  // テーマ共感テーブル
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS theme_empathy (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      theme_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      empathy_type TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(theme_id, member_id, empathy_type)
    )`);
  } catch(e) {}

  // テーマ議論テーブル
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS theme_discussions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      theme_id TEXT NOT NULL,
      member_name TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
  } catch(e) {}

  // システムキャッシュテーブル
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS system_cache (
      key TEXT PRIMARY KEY,
      data TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )`);
  } catch(e) {}

  // チャレンジ反応テーブル
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS challenge_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      challenge_id TEXT NOT NULL,
      reaction TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, challenge_id)
    )`);
  } catch(e) {}

  // CoWellコイン（ポイント）テーブル
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS marigan_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      points INTEGER NOT NULL,
      ref_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
  } catch(e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN marigan_total INTEGER DEFAULT 0"); } catch(e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN marigan_badge TEXT DEFAULT ''"); } catch(e) {}

  // マイグレーション: ストリーク＋木の育成システム
  try { db.exec("ALTER TABLE users ADD COLUMN streak_count INTEGER DEFAULT 0"); } catch(e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN streak_best INTEGER DEFAULT 0"); } catch(e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN last_post_date TEXT DEFAULT ''"); } catch(e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN tree_stage INTEGER DEFAULT 0"); } catch(e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN tree_type TEXT DEFAULT ''"); } catch(e) {}

  // マイグレーション: 個人情報保護フラグ（show_real_name）
  try { db.exec("ALTER TABLE core_members ADD COLUMN show_real_name INTEGER DEFAULT 0"); } catch(e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN show_real_name INTEGER DEFAULT 0"); } catch(e) {}
  // 既存の大学関係者・Exec（取締役/NPO/管理部責任者）は自動で実名表示ON
  try { db.exec("UPDATE core_members SET show_real_name = 1 WHERE (is_exec = 1 OR is_university = 1) AND show_real_name = 0"); } catch(e) {}

  return db;
}

module.exports = { getDb };
