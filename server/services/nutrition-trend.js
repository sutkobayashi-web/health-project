// ============================================================
// nutrition-trend.js
// ユーザー個人の栄養摂取傾向を集計してタグ化するサービス
// 食事AIコメントへの注入 + クライアント傾向バッジ用
// ============================================================

const { getDb } = require('./db');

// 栄養素の3カテゴリ分類（クライアント側のバーチャートと整合）
//   more     : 多いほど良い (たんぱく質・野菜・カルシウム・食物繊維)
//   range    : 適量がベスト (カロリー・脂質・炭水化物)
//   less     : 少ないほど良い (塩分・アルコール)
const NUTRIENT_DEFS = [
  { key: 'calories', label: 'カロリー',  unit: 'kcal', target: 550, min: 450, max: 650, kind: 'range' },
  { key: 'protein',  label: 'たんぱく質', unit: 'g',    target: 20,                       kind: 'more'  },
  { key: 'fat',      label: '脂質',      unit: 'g',    target: 15, min: 12, max: 18,     kind: 'range' },
  { key: 'carbs',    label: '炭水化物',   unit: 'g',    target: 79, min: 69, max: 89,     kind: 'range' },
  { key: 'vitamin',  label: '野菜',      unit: 'g',    target: 120,                      kind: 'more'  },
  { key: 'mineral',  label: 'カルシウム', unit: 'mg',   target: 227,                      kind: 'more'  },
  { key: 'fiber',    label: '食物繊維',   unit: 'g',    target: 7,                        kind: 'more'  },
  { key: 'salt',     label: '塩分',      unit: 'g',    target: 2.5,                      kind: 'less'  },
  { key: 'alcohol',  label: 'アルコール', unit: 'g',    target: 20,                       kind: 'less'  }
];

// 旧形式(1-5スコア)→実数値に変換
function _convertLegacy(sc) {
  if (typeof sc.protein !== 'number' || sc.protein > 5 || sc.calories) return sc;
  return {
    calories: { value: 300 + (sc.protein || 3) * 70 },
    protein:  { value: (sc.protein || 3) * 5 },
    fat:      { value: 15 + (sc.fat || 3) * 3 },
    carbs:    { value: 35 + (sc.carbs || sc.carb || 3) * 6 },
    vitamin:  { value: (sc.vitamin || 3) * 30 },
    mineral:  { value: (sc.mineral || 3) * 55 },
    fiber:    { value: (sc.vitamin || 3) * 1.5 },
    salt:     { value: 4.0 - (sc.salt || 3) * 0.5 },
    alcohol:  { value: 0 }
  };
}

function _extractValue(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object' && raw.value !== undefined) {
    const n = Number(raw.value);
    return isNaN(n) ? null : n;
  }
  if (typeof raw === 'number') return raw;
  return null;
}

// メイン: ユーザーの栄養傾向を集計
//   uid: string
//   options: { days: 7, minCount: 3 }
//   return: { count, period, items: [{key,label,avg,target,kind,status,arrow,severity}], summary, hasEnoughData }
function getUserNutritionTrend(uid, options) {
  const days = (options && options.days) || 7;
  const minCount = (options && options.minCount) || 3;

  // 直近N日の食事投稿を取得
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  let pastPosts = [];
  const db = getDb();
  try {
    pastPosts = db.prepare(
      `SELECT nutrition_scores, content, created_at
       FROM posts
       WHERE user_id = ?
         AND category LIKE '%食事%'
         AND nutrition_scores IS NOT NULL
         AND created_at >= ?
       ORDER BY created_at DESC
       LIMIT 30`
    ).all(uid, since);
  } catch (e) {
    return { count: 0, period: days, items: [], summary: '', hasEnoughData: false };
  }

  // データ不足
  if (pastPosts.length < minCount) {
    // フォールバック: 件数ベースで直近10食
    try {
      pastPosts = db.prepare(
        `SELECT nutrition_scores, content, created_at
         FROM posts
         WHERE user_id = ?
           AND category LIKE '%食事%'
           AND nutrition_scores IS NOT NULL
         ORDER BY created_at DESC
         LIMIT 10`
      ).all(uid);
    } catch (e) {}
  }

  if (pastPosts.length < 2) {
    return {
      count: pastPosts.length,
      period: days,
      items: [],
      summary: '',
      hasEnoughData: false
    };
  }

  // 集計
  const sums = {}; const counts = {};
  NUTRIENT_DEFS.forEach(d => { sums[d.key] = 0; counts[d.key] = 0; });

  pastPosts.forEach(p => {
    let sc;
    try { sc = JSON.parse(p.nutrition_scores); } catch (e) { return; }
    sc = _convertLegacy(sc);
    NUTRIENT_DEFS.forEach(d => {
      const v = _extractValue(sc[d.key]);
      if (v !== null && v >= 0) {
        // alcohol は 0 が大半なのでカウントするが、平均は0近くで問題ない
        sums[d.key] += v;
        counts[d.key]++;
      }
    });
  });

  // 各栄養素の平均と判定
  const items = [];
  NUTRIENT_DEFS.forEach(d => {
    if (counts[d.key] === 0) return;
    const avg = Math.round((sums[d.key] / counts[d.key]) * 10) / 10;
    let status, arrow, severity; // severity: 0=ok, 1=watch, 2=alert
    if (d.kind === 'less') {
      // 少ないほど良い
      if (avg <= d.target * 0.8)      { status = '良好';     arrow = '↓'; severity = 0; }
      else if (avg <= d.target)       { status = '注意';     arrow = '→'; severity = 1; }
      else                            { status = '取りすぎ'; arrow = '↑'; severity = 2; }
    } else if (d.kind === 'range') {
      // 適量がベスト
      if (avg >= d.min && avg <= d.max) { status = '適量'; arrow = '→'; severity = 0; }
      else if (avg < d.min)             { status = '不足'; arrow = '↓'; severity = 1; }
      else                              { status = '超過'; arrow = '↑'; severity = 2; }
    } else {
      // 多いほど良い
      const ratio = avg / d.target;
      if (ratio < 0.5)        { status = '不足';     arrow = '↓'; severity = 2; }
      else if (ratio < 0.8)   { status = 'やや不足'; arrow = '↓'; severity = 1; }
      else if (ratio <= 1.5)  { status = '良好';     arrow = '→'; severity = 0; }
      else                    { status = 'たっぷり'; arrow = '↑'; severity = 0; }
    }
    items.push({
      key: d.key,
      label: d.label,
      unit: d.unit,
      avg,
      target: d.target,
      kind: d.kind,
      status,
      arrow,
      severity
    });
  });

  // 注目すべきトップ3傾向（severityの高い順、同率なら多いほど良い系優先）
  const sorted = items.slice().sort((a, b) => {
    if (b.severity !== a.severity) return b.severity - a.severity;
    return a.kind === 'more' ? -1 : 1;
  });
  const highlights = sorted.filter(i => i.severity > 0).slice(0, 3);

  // 1行サマリ（バッジ用）
  const summaryParts = highlights.map(i => `${i.label}${i.arrow}`);
  const summary = summaryParts.join(' ') || '全体的に良好';

  // AIプロンプト用テキスト
  const promptLines = items.map(i =>
    `${i.label}: 平均${i.avg}${i.unit}(基準${i.target}${i.unit}) → ${i.status}`
  );

  // 直近メニュー
  const recentMenus = pastPosts.slice(0, 5).map(p => {
    const c = (p.content || '').replace(/^【写真】/, '').substring(0, 40);
    return c || '(写真のみ)';
  }).join('、');

  return {
    count: pastPosts.length,
    period: days,
    items,
    highlights,
    summary,
    hasEnoughData: pastPosts.length >= minCount,
    promptText: `\n\n【この社員の直近${pastPosts.length}食の栄養傾向】\n${promptLines.join('\n')}\n\n【特に気になる傾向】\n${highlights.map(i => `・${i.label}: ${i.status}`).join('\n') || '・なし（全体的に良好）'}\n\n【最近の食事】${recentMenus}`,
    recentMenus
  };
}

module.exports = { getUserNutritionTrend, NUTRIENT_DEFS };
