-- =============================================
-- 健康プロジェクト SQLiteスキーマ
-- GAS Spreadsheet → SQLite マッピング
-- =============================================

-- Users シート → users テーブル
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  nickname TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar TEXT DEFAULT '😀',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  inviter_id TEXT,
  real_name TEXT,
  department TEXT,
  birth_date TEXT
);

-- CoreMembers シート → core_members テーブル
CREATE TABLE IF NOT EXISTS core_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  dept TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  phone TEXT,
  avatar TEXT DEFAULT '🛡️',
  role TEXT DEFAULT 'member',
  is_exec INTEGER DEFAULT 0
);

-- Posts シート → posts テーブル
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  analysis TEXT,
  nickname TEXT,
  avatar TEXT,
  reply TEXT,
  status TEXT DEFAULT 'open',
  category TEXT DEFAULT '相談',
  department TEXT,
  birth_date TEXT,
  image_url TEXT,
  likes TEXT DEFAULT '',
  demotes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Admin_Discussion シート → admin_discussions テーブル
CREATE TABLE IF NOT EXISTS admin_discussions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voice_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  role TEXT DEFAULT 'Admin',
  comment TEXT NOT NULL,
  avatar TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- TeamEvaluations シート → team_evaluations テーブル
CREATE TABLE IF NOT EXISTS team_evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  legal INTEGER DEFAULT 1,
  risk INTEGER DEFAULT 1,
  freq INTEGER DEFAULT 1,
  urgency INTEGER DEFAULT 1,
  safety INTEGER DEFAULT 1,
  value INTEGER DEFAULT 1,
  needs INTEGER DEFAULT 1,
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, member_name)
);

-- ActionPlans シート → action_plans テーブル
CREATE TABLE IF NOT EXISTS action_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT '統合テーマ',
  score_legal INTEGER DEFAULT 1,
  score_risk INTEGER DEFAULT 1,
  score_freq INTEGER DEFAULT 1,
  score_urgency INTEGER DEFAULT 1,
  score_safety INTEGER DEFAULT 1,
  score_value INTEGER DEFAULT 1,
  score_needs INTEGER DEFAULT 1,
  total_score INTEGER DEFAULT 7,
  source_post_id TEXT,
  status TEXT DEFAULT 'candidate',
  proposal_draft TEXT,
  ai_log TEXT,
  member_comments TEXT DEFAULT '[]',
  owner TEXT,
  deadline TEXT,
  kpi_target TEXT,
  kpi_current TEXT,
  approval_log TEXT DEFAULT '[]',
  execution_log TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notices シート → notices テーブル
CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notice_id TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  sender TEXT DEFAULT '事務局',
  target_id TEXT NOT NULL,
  status TEXT DEFAULT 'unread',
  reply TEXT,
  read_at DATETIME,
  admin_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
