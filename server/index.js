require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// Cloudflare/nginx経由のプロキシを信頼
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

// セキュリティヘッダー（CSP等）
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      frameSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// HTTPS強制（Cloudflare経由）
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, 'https://' + req.headers.host + req.url);
  }
  next();
});

// CORS制限（許可するオリジンを限定）
var allowedOrigins = [
  process.env.WEB_APP_URL || 'https://health.biz-terrace.org',
  'https://health.biz-terrace.org',
  'https://stdun.biz-terrace.org',
  'http://localhost:3001'
];
app.use(function(req, res, next) {
  // 採用チャットBOTは別途CORS処理するのでスキップ
  if (req.path.startsWith('/api/recruit-chat')) return next();
  cors({
    origin: function(origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })(req, res, next);
});

// Cloudflare/nginx経由の実クライアントIPを取得
function getClientIp(req) {
  return req.headers['cf-connecting-ip']
    || req.headers['x-real-ip']
    || req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.ip;
}

// レート制限（IP単位）
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 3000, keyGenerator: getClientIp, standardHeaders: true, legacyHeaders: false, validate: false, message: { success: false, msg: 'リクエスト制限を超えました。しばらくしてから再試行してください。' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, keyGenerator: getClientIp, standardHeaders: true, legacyHeaders: false, validate: false, message: { success: false, msg: 'ログイン試行回数を超えました。15分後に再試行してください。' } });
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/admin-login', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静的ファイル配信 (HTML はキャッシュ無効化)
app.use(express.static(path.join(__dirname, '..', 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// APIルート
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/themes', require('./routes/themes'));
app.use('/api/avatar-challenge', require('./routes/avatar-challenge'));
app.use('/api/checkup', require('./routes/checkup'));
app.use('/api/bp', require('./routes/blood-pressure'));
app.use('/api/buddy-topics', require('./routes/buddy-topics'));
// 採用チャットBOTは公開エンドポイント（CORSはnginxで処理）
app.use('/api/recruit-chat', require('./routes/recruit-chat'));
app.use('/api/box', require('./routes/box-manager'));
app.use('/api/aquarium', require('./routes/aquarium'));

// ===== 行動トラッキング（実データ収集基盤） =====
const { getDb } = require('./services/db');
(function initEventLog() {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS event_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    event TEXT NOT NULL,
    target TEXT DEFAULT '',
    value TEXT DEFAULT '',
    duration INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_event_log_user ON event_log(user_id, created_at DESC)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_event_log_event ON event_log(event, created_at DESC)`);
})();

app.post('/api/track', (req, res) => {
  try {
    const { uid, events } = req.body;
    if (!uid || !events || !Array.isArray(events)) return res.json({ ok: false });
    const db = getDb();
    const stmt = db.prepare('INSERT INTO event_log (user_id, event, target, value, duration) VALUES (?, ?, ?, ?, ?)');
    const insertMany = db.transaction((evts) => {
      for (const e of evts) {
        stmt.run(uid, e.event || '', e.target || '', e.value || '', e.duration || 0);
      }
    });
    insertMany(events.slice(0, 50)); // 1回最大50件
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false }); }
});

// トラッキングデータ集計（管理者用）
app.get('/api/track/summary', (req, res) => {
  try {
    const db = getDb();
    const days = parseInt(req.query.days) || 7;
    // イベント種別ごとの件数
    const byEvent = db.prepare(`SELECT event, COUNT(*) as cnt, COUNT(DISTINCT user_id) as users FROM event_log WHERE created_at > datetime('now', '-' || ? || ' days') GROUP BY event ORDER BY cnt DESC`).all(days);
    // 日別アクティブユーザー
    const daily = db.prepare(`SELECT date(created_at) as d, COUNT(DISTINCT user_id) as users, COUNT(*) as events FROM event_log WHERE created_at > datetime('now', '-' || ? || ' days') GROUP BY d ORDER BY d`).all(days);
    // 離脱予兆（7日以上アクセスなし）
    const atRisk = db.prepare(`SELECT user_id, MAX(created_at) as last_seen FROM event_log GROUP BY user_id HAVING last_seen < datetime('now', '-7 days')`).all();
    res.json({ success: true, byEvent, daily, atRisk });
  } catch (e) { res.json({ success: false }); }
});

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// アプリバージョン（クライアント強制更新用）
// サーバー起動時にindex.htmlのバージョンを自動更新
(function autoUpdateAppVersion() {
  const fs = require('fs');
  const path = require('path');
  const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
  try {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const newVer = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '_' + pad(now.getHours()) + pad(now.getMinutes());
    const updated = html.replace(/data-app-version="[^"]*"/, 'data-app-version="' + newVer + '"');
    if (updated !== html) {
      fs.writeFileSync(htmlPath, updated, 'utf8');
      console.log('[AutoVersion] Updated to', newVer);
    }
  } catch (e) {
    console.log('[AutoVersion] Skip:', e.message);
  }
})();

app.get('/api/version', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  try {
    const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
    const match = html.match(/data-app-version="([^"]+)"/);
    res.json({ version: match ? match[1] : '' });
  } catch (e) {
    res.json({ version: '' });
  }
});

const { authAdmin } = require('./middleware/auth');

// 手動バックアップAPI（管理者用・認証必須）
app.post('/api/admin/backup', authAdmin, (req, res) => {
  const { runBackup } = require('./services/backup');
  runBackup().then(r => res.json(r)).catch(e => res.json({ success: false, error: e.message }));
});

// バックアップ状態確認API（認証必須）
app.get('/api/admin/backup-status', authAdmin, (req, res) => {
  const fs = require('fs');
  const { execSync } = require('child_process');
  const backupDir = path.join(__dirname, '..', 'backup');
  const boxDir = 'health-backup';

  // ローカルバックアップ一覧
  let localFiles = [];
  try {
    if (fs.existsSync(backupDir)) {
      localFiles = fs.readdirSync(backupDir)
        .filter(f => f.match(/^health_.*\.db$/))
        .map(f => {
          const stat = fs.statSync(path.join(backupDir, f));
          return { name: f, sizeKB: Math.round(stat.size / 1024), date: new Date(stat.mtimeMs).toISOString() };
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    }
  } catch (e) {}

  // Boxファイル一覧
  let boxFiles = [];
  try {
    const out = execSync(`rclone lsjson box:${boxDir}/ --no-modtime 2>/dev/null || echo "[]"`, { timeout: 15000 }).toString().trim();
    boxFiles = JSON.parse(out).map(f => ({ name: f.Name, sizeKB: Math.round(f.Size / 1024) }));
  } catch (e) {}

  res.json({
    success: true,
    schedule: 'Node.js内蔵 毎日 2:00',
    latest: localFiles[0] || null,
    localFiles: localFiles.slice(0, 10),
    boxFiles: boxFiles.slice(0, 10)
  });
});

// Box Developer Token更新API（認証必須）
app.post('/api/admin/box-token', authAdmin, (req, res) => {
  const { token } = req.body;
  if (!token) return res.json({ success: false, msg: 'トークンを入力してください' });
  process.env.BOX_DEVELOPER_TOKEN = token;
  // .envファイルも更新
  const fs = require('fs');
  const envPath = path.join(__dirname, '..', '.env');
  let env = fs.readFileSync(envPath, 'utf8');
  env = env.replace(/BOX_DEVELOPER_TOKEN=.*/, 'BOX_DEVELOPER_TOKEN=' + token);
  fs.writeFileSync(envPath, env);
  res.json({ success: true, msg: 'Boxトークンを更新しました' });
});

// 日次自動バックアップ（毎日深夜2:00）
function scheduleBackup() {
  const now = new Date();
  const next = new Date();
  next.setHours(2, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = next - now;
  console.log(`次回バックアップ: ${next.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
  setTimeout(() => {
    const { runBackup } = require('./services/backup');
    runBackup().then(() => scheduleBackup());
  }, delay);
}
scheduleBackup();

// 週間食事分析（毎週月曜 7:00 JST）
function scheduleFoodWeekly() {
  const now = new Date();
  const next = new Date();
  // 次の月曜7:00 JST（UTC-2:00→7:00 JST = 22:00 UTC前日日曜）
  // JSTで計算
  const jstNow = new Date(now.getTime() + 9 * 3600000);
  const jstNext = new Date(jstNow);
  const dayOfWeek = jstNext.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? (jstNow.getHours() >= 7 ? 7 : 0) : 8 - dayOfWeek;
  jstNext.setDate(jstNext.getDate() + daysUntilMonday);
  jstNext.setHours(7, 0, 0, 0);
  const utcNext = new Date(jstNext.getTime() - 9 * 3600000);
  const delay = Math.max(utcNext - now, 60000);
  console.log(`次回食事分析: ${jstNext.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} (${Math.round(delay/3600000)}h後)`);
  setTimeout(() => {
    const { runWeeklyFoodAnalysis } = require('./services/food-weekly');
    runWeeklyFoodAnalysis().then(() => scheduleFoodWeekly()).catch(e => { console.error('食事分析エラー:', e.message); scheduleFoodWeekly(); });
  }, delay);
}
scheduleFoodWeekly();

// 週次ボイスインサイト（毎週月曜 7:30 JST — 食事分析の30分後）
function scheduleVoiceInsight() {
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 3600000);
  const jstNext = new Date(jstNow);
  const dayOfWeek = jstNext.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? (jstNow.getHours() >= 8 ? 7 : 0) : 8 - dayOfWeek;
  jstNext.setDate(jstNext.getDate() + daysUntilMonday);
  jstNext.setHours(7, 30, 0, 0);
  const utcNext = new Date(jstNext.getTime() - 9 * 3600000);
  const delay = Math.max(utcNext - now, 60000);
  console.log(`次回インサイト: ${jstNext.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} (${Math.round(delay/3600000)}h後)`);
  setTimeout(() => {
    const { runWeeklyVoiceInsight } = require('./services/voice-insight');
    runWeeklyVoiceInsight().then(() => scheduleVoiceInsight()).catch(e => { console.error('インサイトエラー:', e.message); scheduleVoiceInsight(); });
  }, delay);
}
scheduleVoiceInsight();

// 週次ふりかえりレポート（毎週月曜 8:00 JST — インサイトの30分後）
function scheduleWeeklyReflection() {
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 3600000);
  const jstNext = new Date(jstNow);
  const dayOfWeek = jstNext.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? (jstNow.getHours() >= 8 ? 7 : 0) : 8 - dayOfWeek;
  jstNext.setDate(jstNext.getDate() + daysUntilMonday);
  jstNext.setHours(8, 0, 0, 0);
  const utcNext = new Date(jstNext.getTime() - 9 * 3600000);
  const delay = Math.max(utcNext - now, 60000);
  console.log(`次回ふりかえり: ${jstNext.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} (${Math.round(delay/3600000)}h後)`);
  setTimeout(() => {
    const { runWeeklyReflection } = require('./services/weekly-reflection');
    runWeeklyReflection().then(() => scheduleWeeklyReflection()).catch(e => { console.error('ふりかえりエラー:', e.message); scheduleWeeklyReflection(); });
  }, delay);
}
scheduleWeeklyReflection();

// SPA フォールバック (管理画面)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

// アンバサダー画面
app.get('/ambassador', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'ambassador.html'));
});

// システムガイド（簡易版）
app.get('/guide', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'guide.html'));
});

// システムガイド（詳細版 — 旧版）
app.get('/guide-full', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'guide-full.html'));
});

// ナレッジベース
app.get('/knowledge', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'knowledge.html'));
});

// ホワイトペーパー
app.get('/whitepaper', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'whitepaper.html'));
});

// SPA フォールバック (ユーザー画面)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return;
  if (req.path.startsWith('/uploads/')) return res.status(404).end();
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`健康プロジェクト サーバー起動: http://localhost:${PORT}`);
});
