// Web Push 通知サービス
const webpush = require('web-push');
const { getDb } = require('./db');

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_CONTACT = process.env.VAPID_CONTACT || 'mailto:noreply@example.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC, VAPID_PRIVATE);
}

function initPushTable() {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    keys_p256dh TEXT NOT NULL,
    keys_auth TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    last_sent_at TEXT DEFAULT ''
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id)');
  // ログ
  db.exec(`CREATE TABLE IF NOT EXISTS push_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    kind TEXT,
    ok INTEGER DEFAULT 1,
    err TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  )`);
}
initPushTable();

function getPublicKey() { return VAPID_PUBLIC; }

function saveSubscription(userId, sub) {
  const db = getDb();
  const keys = (sub && sub.keys) || {};
  try {
    db.prepare(`INSERT INTO push_subscriptions (user_id, endpoint, keys_p256dh, keys_auth) VALUES (?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id, keys_p256dh=excluded.keys_p256dh, keys_auth=excluded.keys_auth`)
      .run(userId, sub.endpoint, keys.p256dh || '', keys.auth || '');
    return true;
  } catch (e) {
    console.error('saveSubscription error:', e.message);
    return false;
  }
}

function removeSubscription(endpoint) {
  const db = getDb();
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
}

async function sendToUser(userId, payload, kind) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return { sent: 0, failed: 0 };
  const db = getDb();
  const subs = db.prepare('SELECT endpoint, keys_p256dh, keys_auth FROM push_subscriptions WHERE user_id = ?').all(userId);
  let sent = 0, failed = 0;
  for (const s of subs) {
    try {
      const subscription = { endpoint: s.endpoint, keys: { p256dh: s.keys_p256dh, auth: s.keys_auth } };
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      sent++;
    } catch (e) {
      failed++;
      // 410 Gone / 404 → サブスク無効 → 削除
      if (e && (e.statusCode === 410 || e.statusCode === 404)) {
        removeSubscription(s.endpoint);
      }
      try { db.prepare('INSERT INTO push_log (user_id, kind, ok, err) VALUES (?, ?, 0, ?)').run(userId, kind || '', String(e.message || '')); } catch(e2) {}
    }
  }
  try {
    if (sent > 0) db.prepare('INSERT INTO push_log (user_id, kind, ok) VALUES (?, ?, 1)').run(userId, kind || '');
    db.prepare('UPDATE push_subscriptions SET last_sent_at = datetime(\'now\') WHERE user_id = ?').run(userId);
  } catch(e) {}
  return { sent, failed };
}

async function broadcast(payload, kind) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return { sent: 0, failed: 0 };
  const db = getDb();
  const users = db.prepare('SELECT DISTINCT user_id FROM push_subscriptions').all();
  let totalSent = 0, totalFailed = 0;
  for (const u of users) {
    const r = await sendToUser(u.user_id, payload, kind || 'broadcast');
    totalSent += r.sent; totalFailed += r.failed;
  }
  return { sent: totalSent, failed: totalFailed };
}

// ===== 定時通知のスケジューラ =====
// 夕方18時JST: 記録リマインダー
function scheduleEveningReminder() {
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 3600000);
  const target = new Date(jstNow);
  target.setHours(18, 0, 0, 0);
  if (target <= jstNow) target.setDate(target.getDate() + 1);
  const utcTarget = new Date(target.getTime() - 9 * 3600000);
  const delay = Math.max(utcTarget - now, 60000);
  console.log('[Push] 次回リマインダー:', target.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
  setTimeout(() => {
    runEveningReminder().then(() => scheduleEveningReminder()).catch(() => scheduleEveningReminder());
  }, delay);
}

async function runEveningReminder() {
  try {
    const db = getDb();
    // 今日まだ歩数を記録していないユーザー
    const today = new Date().toISOString().split('T')[0];
    const subs = db.prepare(`SELECT DISTINCT ps.user_id FROM push_subscriptions ps
      LEFT JOIN step_log sl ON sl.user_id = ps.user_id AND sl.step_date = ?
      WHERE sl.id IS NULL`).all(today);
    const tips = [
      '今日の海はどんな様子だろう',
      '点呼ついでに3秒だけ',
      'きみの海で仲間が待ってる',
      '今日の一歩が、明日の景色を変える',
      '海が今日も君を待ってる',
    ];
    const body = tips[Math.floor(Math.random() * tips.length)];
    for (const s of subs) {
      await sendToUser(s.user_id, {
        title: '🌊 今日の海',
        body: body,
        tag: 'daily-reminder',
        url: '/',
      }, 'reminder');
    }
    console.log('[Push] リマインダー送信完了:', subs.length, '人');
  } catch (e) { console.error('[Push] リマインダーエラー:', e.message); }
}

module.exports = { getPublicKey, saveSubscription, removeSubscription, sendToUser, broadcast, scheduleEveningReminder };
