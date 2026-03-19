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
  is_exec INTEGER DEFAULT 0,
  is_university INTEGER DEFAULT 0,
  university_org TEXT DEFAULT '',
  status TEXT DEFAULT 'approved'
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

-- PlanEndorsements: 企画書メンバー合議テーブル
CREATE TABLE IF NOT EXISTS plan_endorsements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id TEXT NOT NULL,
  member_email TEXT NOT NULL,
  member_name TEXT NOT NULL,
  vote TEXT NOT NULL DEFAULT 'pending',
  comment TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(plan_id, member_email)
);

-- Chat Memos: AIチャット応答のメモ保存
CREATE TABLE IF NOT EXISTS chat_memos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  memo_text TEXT NOT NULL,
  source_message TEXT,
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

-- Empathy responses: 共感＋3問回答
CREATE TABLE IF NOT EXISTS empathy_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  empathy_type TEXT NOT NULL,
  answer1 TEXT NOT NULL,
  answer2 TEXT NOT NULL,
  answer3 TEXT NOT NULL,
  free_comment TEXT DEFAULT '',
  is_member INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, user_id)
);

-- =============================================
-- 凝集型健康アクションプラン v2
-- =============================================

-- テーマ（AIクラスタリング結果）
CREATE TABLE IF NOT EXISTS themes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  theme_id TEXT UNIQUE NOT NULL,
  cycle_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '💡',
  post_ids TEXT DEFAULT '[]',
  post_count INTEGER DEFAULT 0,
  dept_distribution TEXT DEFAULT '{}',
  severity_avg REAL DEFAULT 0,
  keywords TEXT DEFAULT '[]',
  representative_voices TEXT DEFAULT '[]',
  status TEXT DEFAULT 'candidate',
  vote_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- テーマ投票
CREATE TABLE IF NOT EXISTS theme_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  theme_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  comment TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(theme_id, user_id)
);

-- 投票サイクル管理
CREATE TABLE IF NOT EXISTS vote_cycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cycle_number INTEGER UNIQUE NOT NULL,
  title TEXT DEFAULT '',
  status TEXT DEFAULT 'collecting',
  voting_start DATETIME,
  voting_end DATETIME,
  selected_theme_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- チャレンジ（アクションプラン v2）
CREATE TABLE IF NOT EXISTS challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_id TEXT UNIQUE NOT NULL,
  theme_id TEXT,
  cycle_number INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '💪',
  period_start DATE,
  period_end DATE,
  duration_days INTEGER DEFAULT 30,
  target_participation_rate REAL DEFAULT 0.5,
  kpi_definitions TEXT DEFAULT '[]',
  ranking_config TEXT DEFAULT '{}',
  badge_config TEXT DEFAULT '[]',
  ambassador_advice_plan TEXT,
  ambassador_advice_mid TEXT,
  ambassador_advice_final TEXT,
  ai_draft TEXT,
  status TEXT DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- チャレンジ参加者
CREATE TABLE IF NOT EXISTS challenge_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  nickname TEXT,
  avatar TEXT,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active',
  pre_survey TEXT DEFAULT '{}',
  post_survey TEXT DEFAULT '{}',
  UNIQUE(challenge_id, user_id)
);

-- KPI記録（日次/週次）
CREATE TABLE IF NOT EXISTS kpi_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  record_date DATE NOT NULL,
  answers TEXT DEFAULT '{}',
  comment TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(challenge_id, user_id, record_date)
);

-- バッジ
CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  badge_type TEXT NOT NULL,
  badge_name TEXT,
  earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(challenge_id, user_id, badge_type)
);

-- アンバサダー
CREATE TABLE IF NOT EXISTS ambassadors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  organization TEXT,
  role TEXT DEFAULT '保健師',
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- アンバサダー助言
CREATE TABLE IF NOT EXISTS ambassador_advices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ambassador_id INTEGER,
  challenge_id TEXT NOT NULL,
  advice_type TEXT NOT NULL,
  content TEXT NOT NULL,
  ai_summary_snapshot TEXT,
  member_response TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
