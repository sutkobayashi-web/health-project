require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静的ファイル配信 (HTML はキャッシュ無効化)
app.use(express.static(path.join(__dirname, '..', 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
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

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// 手動バックアップAPI（管理者用）
app.post('/api/admin/backup', (req, res) => {
  const { runBackup } = require('./services/backup');
  runBackup().then(r => res.json(r)).catch(e => res.json({ success: false, error: e.message }));
});

// Box Developer Token更新API
app.post('/api/admin/box-token', (req, res) => {
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
