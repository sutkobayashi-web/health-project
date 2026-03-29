require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { authAdmin } = require('./middleware/auth');
const { sanitizeInput } = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// ========== セキュリティ: Helmet (HTTPセキュリティヘッダー) ==========
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://generativelanguage.googleapis.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// ========== セキュリティ: CORS ==========
app.use(cors({
  origin: isProduction
    ? ['https://health.biz-terrace.org']
    : ['http://localhost:3001'],
  credentials: true
}));

// ========== セキュリティ: Rate Limiting ==========
// 認証エンドポイント用（ブルートフォース対策）
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15分
  max: 15,                     // 15分あたり15回まで
  message: { success: false, msg: 'ログイン試行回数が多すぎます。15分後に再試行してください。' },
  standardHeaders: true,
  legacyHeaders: false
});

// パスワードリセット用（より厳しく）
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1時間
  max: 5,                     // 1時間あたり5回まで
  message: { success: false, msg: 'リセット試行回数が多すぎます。1時間後に再試行してください。' },
  standardHeaders: true,
  legacyHeaders: false
});

// API全体用
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1分
  max: 300,                    // 1分あたり300リクエスト
  message: { success: false, msg: 'リクエストが多すぎます。しばらく待ってから再試行してください。' },
  standardHeaders: true,
  legacyHeaders: false
});

// ミドルウェア
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ========== セキュリティ: 入力サニタイズ ==========
app.use(sanitizeInput);

// ========== セキュリティ: API Rate Limiting ==========
app.use('/api', apiLimiter);

// 静的ファイル配信 (HTML はキャッシュ無効化)
app.use(express.static(path.join(__dirname, '..', 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// APIルート（認証Rate Limiterを適用）
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/chat', require('./routes/chat'));

// ヘルスチェック（バージョン情報は非公開）
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 手動バックアップAPI（管理者認証必須）
app.post('/api/admin/backup', authAdmin, (req, res) => {
  const { runBackup } = require('./services/backup');
  runBackup().then(r => res.json(r)).catch(e => res.json({ success: false, error: e.message }));
});

// Box Developer Token更新API（管理者認証必須）
app.post('/api/admin/box-token', authAdmin, (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string' || token.length > 500) {
    return res.json({ success: false, msg: 'トークンを入力してください' });
  }
  process.env.BOX_DEVELOPER_TOKEN = token;
  // .envファイルも更新
  const fs = require('fs');
  const envPath = path.join(__dirname, '..', '.env');
  try {
    let env = fs.readFileSync(envPath, 'utf8');
    env = env.replace(/BOX_DEVELOPER_TOKEN=.*/, 'BOX_DEVELOPER_TOKEN=' + token);
    fs.writeFileSync(envPath, env);
    res.json({ success: true, msg: 'Boxトークンを更新しました' });
  } catch (e) {
    res.json({ success: false, msg: 'トークン更新エラー: ' + e.message });
  }
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

// SPA フォールバック (管理画面)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

// ナレッジベース
app.get('/knowledge', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'knowledge.html'));
});

// SPA フォールバック (ユーザー画面)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return;
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`健康プロジェクト サーバー起動: http://localhost:${PORT}`);
});
