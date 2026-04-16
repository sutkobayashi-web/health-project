// Google Fit OAuth 連携 (Android向けスマホ歩数自動同期)
const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const { getDb } = require('../services/db');

const CLIENT_ID = process.env.GOOGLE_FIT_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_FIT_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_FIT_REDIRECT_URI || 'https://health.biz-terrace.org/api/fit/callback';

const SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/userinfo.email',
];

function createClient() {
  if (!CLIENT_ID || !CLIENT_SECRET) return null;
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

function initTable() {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS fit_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expiry_date INTEGER,
    email TEXT DEFAULT '',
    last_sync_at TEXT DEFAULT '',
    last_sync_steps INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
}
initTable();

// OAuth 開始
router.get('/authorize', (req, res) => {
  const uid = req.query.uid;
  if (!uid) return res.status(400).send('uid required');
  const oauth2 = createClient();
  if (!oauth2) return res.status(500).send('Google Fit未設定: GOOGLE_FIT_CLIENT_ID/SECRETを.envに追加してください');
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state: uid, // ユーザーIDをstateで渡す
  });
  res.redirect(url);
});

// OAuth コールバック
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).send('invalid callback');
  const oauth2 = createClient();
  if (!oauth2) return res.status(500).send('OAuth client not configured');
  try {
    const { tokens } = await oauth2.getToken(code);
    // メール取得
    oauth2.setCredentials(tokens);
    let email = '';
    try {
      const oauth2api = google.oauth2({ version: 'v2', auth: oauth2 });
      const me = await oauth2api.userinfo.get();
      email = me.data.email || '';
    } catch (e) {}
    const db = getDb();
    db.prepare(`INSERT INTO fit_tokens (user_id, access_token, refresh_token, expiry_date, email)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET access_token=excluded.access_token,
        refresh_token=COALESCE(excluded.refresh_token, fit_tokens.refresh_token),
        expiry_date=excluded.expiry_date, email=excluded.email`)
      .run(state, tokens.access_token || '', tokens.refresh_token || '', tokens.expiry_date || 0, email);
    // 完了画面
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>連携完了</title>
<style>body{font-family:sans-serif;background:linear-gradient(135deg,#0ea5e9,#0891b2);color:#fff;height:100vh;margin:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;}
.c{background:rgba(255,255,255,0.1);padding:30px;border-radius:20px;max-width:400px;backdrop-filter:blur(10px);}
a{background:#fff;color:#0ea5e9;padding:10px 24px;border-radius:20px;text-decoration:none;font-weight:700;display:inline-block;margin-top:14px;}</style></head>
<body><div class="c">
<div style="font-size:3rem;">✅</div>
<h2>Google Fit 連携完了</h2>
<p>明日から毎日の歩数が自動で反映されます。</p>
<p style="font-size:0.85rem;opacity:0.85;">${email ? email : ''}</p>
<a href="/">アプリに戻る</a>
</div></body></html>`);
  } catch (e) {
    console.error('Fit callback error:', e.message);
    res.status(500).send('連携エラー: ' + e.message);
  }
});

// 連携状態取得
router.get('/status', (req, res) => {
  const uid = req.query.uid || req.headers['x-user-id'];
  if (!uid) return res.json({ connected: false });
  const db = getDb();
  const row = db.prepare('SELECT email, last_sync_at, last_sync_steps FROM fit_tokens WHERE user_id = ?').get(uid);
  if (!row) return res.json({ connected: false });
  res.json({ connected: true, email: row.email, last_sync_at: row.last_sync_at, last_sync_steps: row.last_sync_steps });
});

// 連携解除
router.post('/disconnect', (req, res) => {
  const uid = req.body.uid;
  if (!uid) return res.status(400).json({ success: false });
  const db = getDb();
  db.prepare('DELETE FROM fit_tokens WHERE user_id = ?').run(uid);
  res.json({ success: true });
});

// 特定ユーザーの今日の歩数取得+記録
async function fetchAndSaveSteps(userId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM fit_tokens WHERE user_id = ?').get(userId);
  if (!row) return { success: false, msg: '未連携' };
  const oauth2 = createClient();
  if (!oauth2) return { success: false, msg: 'OAuth未設定' };
  oauth2.setCredentials({
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expiry_date: row.expiry_date,
  });
  try {
    // 今日0:00〜23:59 (JST)
    const now = new Date();
    const jstNow = new Date(now.getTime() + 9 * 3600000);
    const startOfDay = new Date(Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate()) - 9 * 3600000);
    const startMs = startOfDay.getTime();
    const endMs = startMs + 24 * 3600000 - 1;
    const fitness = google.fitness({ version: 'v1', auth: oauth2 });
    const resp = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
        bucketByTime: { durationMillis: 24 * 3600000 },
        startTimeMillis: startMs,
        endTimeMillis: endMs,
      },
    });
    let steps = 0;
    const buckets = resp.data.bucket || [];
    for (const b of buckets) {
      for (const ds of (b.dataset || [])) {
        for (const p of (ds.point || [])) {
          for (const v of (p.value || [])) {
            steps += (v.intVal || 0);
          }
        }
      }
    }
    // 歩数保存
    const today = new Date().toISOString().split('T')[0];
    db.prepare(`INSERT INTO step_log (user_id, step_date, steps) VALUES (?,?,?)
      ON CONFLICT(user_id, step_date) DO UPDATE SET steps=?, created_at=datetime('now')`)
      .run(userId, today, steps, steps);
    // fit_tokens更新
    db.prepare('UPDATE fit_tokens SET last_sync_at = datetime(\'now\'), last_sync_steps = ? WHERE user_id = ?').run(steps, userId);
    // tokenが更新されていれば保存
    const creds = oauth2.credentials;
    if (creds && (creds.access_token !== row.access_token || creds.expiry_date !== row.expiry_date)) {
      db.prepare('UPDATE fit_tokens SET access_token = ?, expiry_date = ? WHERE user_id = ?').run(creds.access_token, creds.expiry_date || 0, userId);
    }
    // adventure_progress の累計更新（簡易版: その日の歩数を加算し直す）
    // ※ 重複加算を避けるため、既存累計は再計算
    const totalRow = db.prepare('SELECT COALESCE(SUM(steps),0) as total FROM step_log WHERE user_id = ?').get(userId);
    if (totalRow) {
      // 章・エリア再計算は aquarium.js と同じロジック（簡易）
      const RPG_AREAS = require('./aquarium').RPG_AREAS_EXPORT;
      // fallbackで現エリアを歩数から
      let areaId = '1-1', chapter = 1;
      // (歩数閾値の対応表を持つのが理想だが簡易版)
      const t = totalRow.total;
      if (t >= 780000) { areaId='5-3'; chapter=5; }
      else if (t >= 680000) { areaId='5-2'; chapter=5; }
      else if (t >= 600000) { areaId='5-1'; chapter=5; }
      else if (t >= 550000) { areaId='4-3'; chapter=4; }
      else if (t >= 490000) { areaId='4-2'; chapter=4; }
      else if (t >= 420000) { areaId='4-1'; chapter=4; }
      else if (t >= 370000) { areaId='3-3'; chapter=3; }
      else if (t >= 310000) { areaId='3-2'; chapter=3; }
      else if (t >= 250000) { areaId='3-1'; chapter=3; }
      else if (t >= 190000) { areaId='2-3'; chapter=2; }
      else if (t >= 140000) { areaId='2-2'; chapter=2; }
      else if (t >= 100000) { areaId='2-1'; chapter=2; }
      else if (t >= 50000)  { areaId='1-3'; chapter=1; }
      else if (t >= 20000)  { areaId='1-2'; chapter=1; }
      db.prepare(`INSERT INTO adventure_progress (user_id, total_steps, current_area, current_chapter, last_step_date)
        VALUES (?,?,?,?,?)
        ON CONFLICT(user_id) DO UPDATE SET total_steps=excluded.total_steps, current_area=excluded.current_area, current_chapter=excluded.current_chapter, last_step_date=excluded.last_step_date, updated_at=datetime('now')`)
        .run(userId, t, areaId, chapter, today);
    }
    return { success: true, steps };
  } catch (e) {
    console.error('Fit fetch error for', userId, ':', e.message);
    return { success: false, msg: e.message };
  }
}

// 日次バッチ実行
async function runDailyBatch() {
  const db = getDb();
  const users = db.prepare('SELECT user_id FROM fit_tokens').all();
  let ok = 0, fail = 0;
  for (const u of users) {
    const r = await fetchAndSaveSteps(u.user_id);
    if (r.success) ok++; else fail++;
  }
  console.log('[Fit] 日次バッチ完了: OK', ok, '/ FAIL', fail);
}

// 毎朝6時JSTにバッチ実行
function scheduleDailyFit() {
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 3600000);
  const target = new Date(jstNow);
  target.setHours(6, 0, 0, 0);
  if (target <= jstNow) target.setDate(target.getDate() + 1);
  const utcTarget = new Date(target.getTime() - 9 * 3600000);
  const delay = Math.max(utcTarget - now, 60000);
  console.log('[Fit] 次回Fitバッチ:', target.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
  setTimeout(() => {
    runDailyBatch().then(() => scheduleDailyFit()).catch(() => scheduleDailyFit());
  }, delay);
}

// 管理者向け手動同期
router.post('/sync-now', (req, res) => {
  const uid = req.body.uid || req.headers['x-user-id'];
  if (!uid) return res.status(400).json({ success: false });
  fetchAndSaveSteps(uid).then(r => res.json(r));
});

module.exports = router;
module.exports.scheduleDailyFit = scheduleDailyFit;
module.exports.runDailyBatch = runDailyBatch;
