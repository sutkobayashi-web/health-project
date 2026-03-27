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
app.use('/api/buddy-topics', require('./routes/buddy-topics'));
// 採用チャットBOTは公開エンドポイント（CORSはnginxで処理）
app.use('/api/recruit-chat', require('./routes/recruit-chat'));

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// アプリバージョン（クライアント強制更新用）
app.get('/api/version', (req, res) => {
  res.json({ version: '20260327d' });
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

// SPA フォールバック (管理画面)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

// アンバサダー画面
app.get('/ambassador', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'ambassador.html'));
});

// システムガイド
app.get('/guide', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'guide.html'));
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
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return;
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`健康プロジェクト サーバー起動: http://localhost:${PORT}`);
});
