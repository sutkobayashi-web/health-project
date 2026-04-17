/**
 * CoWellコイン（ポイント）システム
 * 投稿・共感・書き込み等のアクションでポイントを付与し褒賞につなげる
 */
const { getDb } = require('./db');

// ポイント配分（=マイル付与数）
const POINTS = {
  post: 10,              // 投稿（相談・提案）
  food_photo: 8,         // 食事写真投稿
  empathy: 5,            // 共感+3問回答
  comment: 3,            // 書き込み（フリーコメント等）
  kpi_record: 2,         // チャレンジKPI記録
  daily_walk_miles: 1    // 累計歩数 1万歩につき1マイル
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

  // ストリーク更新（投稿系アクションのみ）
  const streakActions = ['post', 'food_photo'];
  if (streakActions.includes(action)) {
    updateStreak(userId);
  }

  return { success: true, points, total, newBadge };
}

// ========================================
// ストリーク（連続記録）＋木の育成システム
// ========================================

// 木の成長ステージ定義
const TREE_STAGES = [
  { stage: 0, name: 'たね',     minDays: 0,   icon: '🌰' },
  { stage: 1, name: 'めばえ',   minDays: 1,   icon: '🌱' },
  { stage: 2, name: 'わかば',   minDays: 7,   icon: '🌿' },
  { stage: 3, name: 'そだち',   minDays: 14,  icon: '🪴' },
  { stage: 4, name: 'はなみ',   minDays: 30,  icon: '🌸' },
  { stage: 5, name: 'みのり',   minDays: 60,  icon: '🌳' },
  { stage: 6, name: 'おおき',   minDays: 90,  icon: '🎄' }
];

// 食事傾向から花の種類を決定
const TREE_TYPES = {
  fish:    { name: '海の花',   color: '#3b82f6', icon: '🌊' },
  veggie:  { name: '緑の花',   color: '#22c55e', icon: '🥬' },
  balance: { name: '虹の花',   color: '#a855f7', icon: '🌈' },
  meat:    { name: '力の花',   color: '#ef4444', icon: '🔥' },
  default: { name: '元気の花', color: '#f59e0b', icon: '✨' }
};

/**
 * ストリーク更新
 */
function updateStreak(userId) {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const user = db.prepare('SELECT streak_count, streak_best, last_post_date FROM users WHERE id = ?').get(userId);
  if (!user) return;

  const lastDate = user.last_post_date || '';
  if (lastDate === today) return; // 今日はもう記録済み

  let newStreak = 1;
  if (lastDate) {
    const lastD = new Date(lastDate + 'T00:00:00');
    const todayD = new Date(today + 'T00:00:00');
    const diffDays = Math.round((todayD - lastD) / 86400000);
    if (diffDays === 1) {
      newStreak = (user.streak_count || 0) + 1;
    }
    // diffDays > 1 → リセット（newStreak = 1のまま）
  }

  const newBest = Math.max(newStreak, user.streak_best || 0);

  // 木のステージを計算（累計最長ストリークベース）
  let treeStage = 0;
  for (let i = TREE_STAGES.length - 1; i >= 0; i--) {
    if (newBest >= TREE_STAGES[i].minDays) {
      treeStage = TREE_STAGES[i].stage;
      break;
    }
  }

  // 食事傾向から木の種類を決定
  let treeType = 'default';
  try {
    const foodPosts = db.prepare("SELECT nutrition_scores FROM posts WHERE user_id = ? AND category = '🍱 食事・栄養' AND nutrition_scores IS NOT NULL ORDER BY created_at DESC LIMIT 20").all(userId);
    if (foodPosts.length >= 3) {
      let totalProtein = 0, totalVitamin = 0, totalFat = 0, count = 0;
      foodPosts.forEach(p => {
        try {
          const scores = JSON.parse(p.nutrition_scores);
          if (scores.protein) totalProtein += scores.protein.value || 0;
          if (scores.vitamin) totalVitamin += scores.vitamin.value || 0;
          if (scores.fat) totalFat += scores.fat.value || 0;
          count++;
        } catch(e) {}
      });
      if (count > 0) {
        const avgProtein = totalProtein / count;
        const avgVitamin = totalVitamin / count;
        const avgFat = totalFat / count;
        // 野菜量（vitamin=野菜g）が平均120g以上 & たんぱく質も15g以上 → バランス型
        if (avgVitamin >= 120 && avgProtein >= 15) treeType = 'balance';
        // 野菜量が平均100g以上 → 野菜型
        else if (avgVitamin >= 100) treeType = 'veggie';
        // たんぱく質が平均25g以上で脂質高め → 肉型
        else if (avgProtein >= 25 && avgFat > 30) treeType = 'meat';
        // たんぱく質が平均20g以上 → 魚型（たんぱく質寄りだが脂質は抑えめ）
        else if (avgProtein >= 20) treeType = 'fish';
      }
    }
  } catch(e) {}

  db.prepare('UPDATE users SET streak_count = ?, streak_best = ?, last_post_date = ?, tree_stage = ?, tree_type = ? WHERE id = ?')
    .run(newStreak, newBest, today, treeStage, treeType, userId);
}

/**
 * ストリーク情報取得
 */
function getStreakInfo(userId) {
  const db = getDb();
  const user = db.prepare('SELECT streak_count, streak_best, last_post_date, tree_stage, tree_type FROM users WHERE id = ?').get(userId);
  if (!user) return { streak: 0, best: 0, lastDate: '', treeStage: 0, treeType: 'default', treeName: '🌰 たね', treeColor: '#f59e0b' };

  // 今日の日付と最終投稿日を比較してストリークが有効か判定
  const today = new Date().toISOString().slice(0, 10);
  const lastDate = user.last_post_date || '';
  let activeStreak = user.streak_count || 0;

  if (lastDate && lastDate !== today) {
    const lastD = new Date(lastDate + 'T00:00:00');
    const todayD = new Date(today + 'T00:00:00');
    const diffDays = Math.round((todayD - lastD) / 86400000);
    if (diffDays > 1) activeStreak = 0; // ストリーク切れ
  }

  const stage = TREE_STAGES[user.tree_stage || 0] || TREE_STAGES[0];
  const type = TREE_TYPES[user.tree_type || 'default'] || TREE_TYPES.default;
  const nextStage = TREE_STAGES[(user.tree_stage || 0) + 1] || null;

  return {
    streak: activeStreak,
    best: user.streak_best || 0,
    lastDate: lastDate,
    treeStage: user.tree_stage || 0,
    treeType: user.tree_type || 'default',
    treeStageName: stage.name,
    treeStageIcon: stage.icon,
    treeTypeName: type.name,
    treeTypeIcon: type.icon,
    treeColor: type.color,
    nextStage: nextStage ? { name: nextStage.name, icon: nextStage.icon, daysNeeded: nextStage.minDays } : null,
    TREE_STAGES,
    TREE_TYPES
  };
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

module.exports = { awardMarigan, getMariganInfo, getMariganRanking, getStreakInfo, updateStreak, POINTS, BADGE_TIERS, TREE_STAGES, TREE_TYPES };
