/**
 * CoWellコイン（ポイント）システム
 * 投稿・共感・書き込み等のアクションでポイントを付与し褒賞につなげる
 */
const { getDb } = require('./db');

// ポイント配分
const POINTS = {
  post: 10,          // 投稿（相談・提案）
  food_photo: 8,     // 食事写真投稿
  empathy: 5,        // 共感+3問回答
  comment: 3,        // 書き込み（フリーコメント等）
  kpi_record: 2      // チャレンジKPI記録
};

// 褒賞バッジ定義
const BADGE_TIERS = [
  { threshold: 50,  badge: 'bronze',   name: 'ブロンズ',   reward: null },
  { threshold: 150, badge: 'silver',   name: 'シルバー',   reward: null },
  { threshold: 300, badge: 'gold',     name: 'ゴールド',   reward: 'QUO 500円' },
  { threshold: 500, badge: 'platinum', name: 'プラチナ',   reward: 'QUO 1,000円' }
];

/**
 * CoWellコインを付与
 * @param {string} userId - ユーザーID
 * @param {string} action - アクション種別 (post, food_photo, empathy, comment, kpi_record)
 * @param {string} [refId] - 参照ID（post_id等、重複防止用）
 * @returns {{ success: boolean, points: number, total: number, newBadge: string|null }}
 */
function awardMarigan(userId, action, refId) {
  const db = getDb();
  const points = POINTS[action];
  if (!points) return { success: false, points: 0, total: 0, newBadge: null };

  // 重複チェック（同一アクション+参照IDの組み合わせ）
  if (refId) {
    const existing = db.prepare('SELECT id FROM marigan_log WHERE user_id = ? AND action = ? AND ref_id = ?').get(userId, action, refId);
    if (existing) return { success: false, points: 0, total: 0, newBadge: null, duplicate: true };
  }

  // ログ記録
  db.prepare('INSERT INTO marigan_log (user_id, action, points, ref_id) VALUES (?, ?, ?, ?)').run(userId, action, points, refId || null);

  // 合計更新
  db.prepare('UPDATE users SET marigan_total = COALESCE(marigan_total, 0) + ? WHERE id = ?').run(points, userId);

  // 最新合計取得
  const user = db.prepare('SELECT marigan_total, marigan_badge FROM users WHERE id = ?').get(userId);
  const total = user ? (user.marigan_total || 0) : 0;
  const currentBadge = user ? (user.marigan_badge || '') : '';

  // バッジ判定
  let newBadge = null;
  for (let i = BADGE_TIERS.length - 1; i >= 0; i--) {
    if (total >= BADGE_TIERS[i].threshold) {
      if (currentBadge !== BADGE_TIERS[i].badge) {
        newBadge = BADGE_TIERS[i];
        db.prepare('UPDATE users SET marigan_badge = ? WHERE id = ?').run(BADGE_TIERS[i].badge, userId);
      }
      break;
    }
  }

  return { success: true, points, total, newBadge };
}

/**
 * ユーザーのCoWellコイン情報取得
 */
function getMariganInfo(userId) {
  const db = getDb();
  const user = db.prepare('SELECT marigan_total, marigan_badge FROM users WHERE id = ?').get(userId);
  const total = user ? (user.marigan_total || 0) : 0;
  const badge = user ? (user.marigan_badge || '') : '';

  // 次のバッジまでの情報
  let nextTier = null;
  for (const tier of BADGE_TIERS) {
    if (total < tier.threshold) { nextTier = tier; break; }
  }

  // 直近の履歴
  const recentLog = db.prepare('SELECT action, points, created_at FROM marigan_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').all(userId);

  return { total, badge, nextTier, recentLog, POINTS, BADGE_TIERS };
}

/**
 * ランキング取得
 */
function getMariganRanking(limit) {
  const db = getDb();
  return db.prepare('SELECT id, nickname, avatar, marigan_total, marigan_badge FROM users WHERE marigan_total > 0 ORDER BY marigan_total DESC LIMIT ?').all(limit || 10);
}

module.exports = { awardMarigan, getMariganInfo, getMariganRanking, POINTS, BADGE_TIERS };
