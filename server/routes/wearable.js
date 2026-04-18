const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb } = require('../services/db');
const { authUser: jwtAuthUser } = require('../middleware/auth');
const { applyStepsForUser } = require('./aquarium');

// ============================================================
// ウェアラブル連携 API (Phase 1: Fitbit 歩数同期)
// ============================================================

function authUser(req, res, next) {
  jwtAuthUser(req, res, function() {
    req.uid = req.user && req.user.uid;
    if (!req.uid) return res.status(401).json({ success: false, msg: '認証が必要です' });
    next();
  });
}

// ---------- テーブル初期化 ----------
(function init() {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS wearable_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_user_id TEXT,
    access_token TEXT,
    refresh_token TEXT,
    expires_at INTEGER,
    scope TEXT,
    connected_at TEXT DEFAULT (datetime('now')),
    last_sync_at TEXT,
    UNIQUE(user_id, provider)
  )`);
})();

// OAuth state 一時保管 (10分)
const pendingStates = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of pendingStates) if (v.exp < now) pendingStates.delete(k);
}, 60000).unref();

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fitbitConfig() {
  return {
    clientId: process.env.FITBIT_CLIENT_ID,
    clientSecret: process.env.FITBIT_CLIENT_SECRET,
    redirectUri: process.env.FITBIT_REDIRECT_URI || 'https://health.biz-terrace.org/api/wearable/fitbit/callback',
  };
}

// ---------- 連携状態 ----------
router.get('/status', authUser, (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT provider, connected_at, last_sync_at FROM wearable_accounts WHERE user_id = ?').get(req.uid);
  res.json({
    success: true,
    connected: !!row,
    provider: row ? row.provider : null,
    connected_at: row ? row.connected_at : null,
    last_sync_at: row ? row.last_sync_at : null,
  });
});

// ---------- Fitbit 認可URL発行 ----------
router.get('/fitbit/authorize', authUser, (req, res) => {
  const cfg = fitbitConfig();
  if (!cfg.clientId || !cfg.clientSecret) {
    return res.status(500).json({ success: false, msg: 'Fitbit設定が未構成です' });
  }
  const codeVerifier = base64url(crypto.randomBytes(48));
  const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest());
  const state = base64url(crypto.randomBytes(24));
  pendingStates.set(state, { user_id: req.uid, code_verifier: codeVerifier, exp: Date.now() + 10 * 60 * 1000 });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope: 'activity',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });
  res.json({ success: true, authorize_url: 'https://www.fitbit.com/oauth2/authorize?' + params.toString() });
});

// ---------- Fitbit コールバック ----------
router.get('/fitbit/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.redirect('/?fitbit=error&reason=' + encodeURIComponent(String(error)));
  if (!code || !state) return res.redirect('/?fitbit=invalid');
  const session = pendingStates.get(state);
  if (!session) return res.redirect('/?fitbit=expired');
  pendingStates.delete(state);

  try {
    const cfg = fitbitConfig();
    const basic = Buffer.from(cfg.clientId + ':' + cfg.clientSecret).toString('base64');
    const body = new URLSearchParams({
      client_id: cfg.clientId,
      grant_type: 'authorization_code',
      redirect_uri: cfg.redirectUri,
      code: String(code),
      code_verifier: session.code_verifier,
    });
    const resp = await fetch('https://api.fitbit.com/oauth2/token', {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error('[Fitbit] token exchange failed', data);
      return res.redirect('/?fitbit=token_error');
    }
    const expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in || 28800);
    const db = getDb();
    db.prepare(`INSERT INTO wearable_accounts
      (user_id, provider, provider_user_id, access_token, refresh_token, expires_at, scope, connected_at)
      VALUES (?, 'fitbit', ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, provider) DO UPDATE SET
        provider_user_id = excluded.provider_user_id,
        access_token     = excluded.access_token,
        refresh_token    = excluded.refresh_token,
        expires_at       = excluded.expires_at,
        scope            = excluded.scope,
        connected_at     = datetime('now')`)
      .run(session.user_id, data.user_id || '', data.access_token, data.refresh_token, expiresAt, data.scope || 'activity');
    res.redirect('/?fitbit=success');
  } catch (e) {
    console.error('[Fitbit] callback error', e);
    res.redirect('/?fitbit=error');
  }
});

// ---------- トークンリフレッシュ ----------
async function refreshAccessToken(account) {
  const cfg = fitbitConfig();
  const basic = Buffer.from(cfg.clientId + ':' + cfg.clientSecret).toString('base64');
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: account.refresh_token });
  const resp = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error('Fitbit refresh失敗: ' + (data.errors && data.errors[0] && data.errors[0].message || resp.status));
  const expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in || 28800);
  getDb().prepare('UPDATE wearable_accounts SET access_token=?, refresh_token=?, expires_at=? WHERE user_id=? AND provider=?')
    .run(data.access_token, data.refresh_token, expiresAt, account.user_id, account.provider);
  return data.access_token;
}

async function getValidToken(account) {
  const now = Math.floor(Date.now() / 1000);
  if (account.expires_at && account.expires_at > now + 60) return account.access_token;
  return refreshAccessToken(account);
}

// ---------- Fitbit 歩数同期 ----------
router.post('/fitbit/sync', authUser, async (req, res) => {
  try {
    const db = getDb();
    const account = db.prepare("SELECT * FROM wearable_accounts WHERE user_id = ? AND provider = 'fitbit'").get(req.uid);
    if (!account) return res.status(400).json({ success: false, msg: 'Fitbit未連携' });

    const token = await getValidToken(account);
    const resp = await fetch('https://api.fitbit.com/1/user/-/activities/steps/date/today/1d.json', {
      headers: { 'Authorization': 'Bearer ' + token, 'Accept-Language': 'ja_JP' },
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error('[Fitbit] sync error', data);
      return res.status(502).json({ success: false, msg: 'Fitbit APIエラー', detail: data });
    }
    const raw = data['activities-steps'] && data['activities-steps'][0] && data['activities-steps'][0].value;
    const steps = parseInt(raw || '0', 10);

    db.prepare("UPDATE wearable_accounts SET last_sync_at = datetime('now') WHERE user_id = ? AND provider = 'fitbit'").run(req.uid);

    // 既存の歩数→冒険進行ロジックに合流
    if (steps < 0 || steps > 200000) {
      return res.status(400).json({ success: false, msg: '歩数値が範囲外', steps });
    }
    const result = applyStepsForUser(req.uid, steps);
    res.json(Object.assign({ source: 'fitbit', fitbit_date: data['activities-steps'][0].dateTime }, result));
  } catch (e) {
    console.error('[Fitbit] sync exception', e);
    res.status(500).json({ success: false, msg: e.message });
  }
});

// ---------- Fitbit 連携解除 ----------
router.post('/fitbit/disconnect', authUser, async (req, res) => {
  const db = getDb();
  const account = db.prepare("SELECT * FROM wearable_accounts WHERE user_id = ? AND provider = 'fitbit'").get(req.uid);
  if (account && account.access_token) {
    try {
      const cfg = fitbitConfig();
      const basic = Buffer.from(cfg.clientId + ':' + cfg.clientSecret).toString('base64');
      await fetch('https://api.fitbit.com/oauth2/revoke', {
        method: 'POST',
        headers: { 'Authorization': 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: account.access_token }),
      });
    } catch (e) { /* 失効APIは落ちてもDB側を消す */ }
  }
  db.prepare("DELETE FROM wearable_accounts WHERE user_id = ? AND provider = 'fitbit'").run(req.uid);
  res.json({ success: true });
});

module.exports = router;
