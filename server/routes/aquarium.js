const express = require('express');
const router = express.Router();
const { getDb } = require('../services/db');

// ============================================================
// CoWell アクアリウム API
// ============================================================

// 認証ミドルウェア（簡易版）
function authUser(req, res, next) {
  const uid = req.headers['x-user-id'] || req.query.uid || req.body?.uid;
  if (!uid) return res.status(401).json({ error: '認証が必要です' });
  req.uid = uid;
  next();
}

// ---------- 魚種マスタ ----------
const FISH_SPECIES = [
  // コモン (8種)
  { id: 1, name: 'ネオンテトラ', rank: 'common', hue: 200, accent: 0, desc: '青赤の蛍光ライン', hint: 'バランスの良い食事で出会える' },
  { id: 2, name: 'グッピー', rank: 'common', hue: 30, accent: 280, desc: '大きな尾びれがカラフル', hint: '普通の食事を続けると出会える' },
  { id: 3, name: 'メダカ', rank: 'common', hue: 45, accent: 20, desc: '小さくて素朴', hint: '和食寄りの食事で出会える' },
  { id: 4, name: 'プラティ', rank: 'common', hue: 25, accent: 350, desc: 'オレンジ色で元気', hint: '洋食寄りの食事で出会える' },
  { id: 5, name: 'ゼブラダニオ', rank: 'common', hue: 210, accent: 50, desc: '縞模様で俊敏', hint: '肉が多めの食事で出会える' },
  { id: 6, name: 'アカヒレ', rank: 'common', hue: 0, accent: 200, desc: '赤いヒレが特徴', hint: '質素な食事で出会える' },
  { id: 7, name: 'コリドラス', rank: 'common', hue: 35, accent: 35, desc: '底でちょこちょこ動く', hint: 'カロリー控えめの食事で出会える' },
  { id: 8, name: 'ドジョウ', rank: 'common', hue: 30, accent: 30, desc: 'ユーモラスな動き', hint: '不規則な食事パターンで出会える' },
  // アンコモン (8種)
  { id: 9, name: 'エンゼルフィッシュ', rank: 'uncommon', hue: 0, accent: 45, desc: '三角形で優雅', hint: '野菜率50%以上を5日続けると...' },
  { id: 10, name: 'ベタ', rank: 'uncommon', hue: 240, accent: 350, desc: '巨大なヒレと原色', hint: 'タンパク質豊富な食事を5日続けると...' },
  { id: 11, name: 'グラミー', rank: 'uncommon', hue: 180, accent: 30, desc: 'パステルカラーの長いヒゲ', hint: '脂質控えめの食事を7日続けると...' },
  { id: 12, name: 'カージナルテトラ', rank: 'uncommon', hue: 210, accent: 0, desc: 'ネオンより鮮やかな赤青', hint: 'バランススコア70以上を5日続けると...' },
  { id: 13, name: 'ラスボラ', rank: 'uncommon', hue: 15, accent: 200, desc: '群泳が美しい', hint: '朝食を3日連続で記録すると...' },
  { id: 14, name: 'オトシンクルス', rank: 'uncommon', hue: 80, accent: 60, desc: 'ガラス面の掃除屋', hint: '食物繊維が多い食事を5日続けると...' },
  { id: 15, name: 'クラウンローチ', rank: 'uncommon', hue: 40, accent: 20, desc: '虎模様で面白い動き', hint: '3食すべて記録する日を3日作ると...' },
  { id: 16, name: 'チェリーバルブ', rank: 'uncommon', hue: 350, accent: 350, desc: 'チェリーレッドの小さな魚', hint: '果物を含む食事を3回記録すると...' },
  // レア (6種)
  { id: 17, name: 'ディスカス', rank: 'rare', hue: 280, accent: 50, desc: '熱帯魚の王様', hint: 'バランス80以上を14日連続で達成すると...' },
  { id: 18, name: '琉金', rank: 'rare', hue: 5, accent: 45, desc: '赤白の丸くて優雅な金魚', hint: '和食中心の食事を10日続けると...' },
  { id: 19, name: 'クマノミ', rank: 'rare', hue: 25, accent: 0, desc: 'イソギンチャクと暮らす', hint: '3カ国以上の料理を7日間で食べると...' },
  { id: 20, name: 'ヤマトヌマエビ', rank: 'rare', hue: 120, accent: 90, desc: '透明な体の掃除屋', hint: '塩分控えめの食事を14日続けると...' },
  { id: 21, name: 'コバルトブルーラミレジィ', rank: 'rare', hue: 220, accent: 180, desc: '宝石のような青', hint: '野菜率60%以上を14日続けると...' },
  { id: 22, name: 'アピストグラマ', rank: 'rare', hue: 300, accent: 120, desc: '虹色のヒレ', hint: 'カルシウム食品を含む食事を10日続けると...' },
  // 超レア (4種)
  { id: 23, name: '錦鯉', rank: 'ultra', hue: 5, accent: 45, desc: '巨大で金赤白の豪華模様', hint: '和食の達人を21日間続けると...' },
  { id: 24, name: 'アロワナ', rank: 'ultra', hue: 50, accent: 0, desc: '銀色に輝く龍の風格', hint: '高タンパク低脂質を30日続けると...' },
  { id: 25, name: '淡水エイ', rank: 'ultra', hue: 190, accent: 160, desc: '水底を滑る神秘的な姿', hint: 'バランス85以上を30日連続で達成すると...' },
  { id: 26, name: 'タツノオトシゴ', rank: 'ultra', hue: 45, accent: 150, desc: '直立で泳ぐユニークな姿', hint: '全3食記録を21日続けると...' },
  // 伝説 (4種)
  { id: 27, name: 'リュウグウノツカイ', rank: 'legend', hue: 210, accent: 50, desc: '超長い銀色の幻想的な姿', hint: '大往生を達成してから...' },
  { id: 28, name: 'マンタ', rank: 'legend', hue: 220, accent: 200, desc: '巨大なヒレで優雅に泳ぐ', hint: '大往生2回と全健診受診で...' },
  { id: 29, name: 'ミニクジラ', rank: 'legend', hue: 200, accent: 210, desc: '潮を吹く水槽の主', hint: '大往生3回を達成すると...' },
  { id: 30, name: 'フェニックスフィッシュ', rank: 'legend', hue: 15, accent: 45, desc: '炎の赤金、不死鳥の魚', hint: '死から蘇り、大往生を達成すると...' },
];

// ---------- DB初期化 ----------
function initAquariumTables() {
  const db = getDb();

  db.exec(`CREATE TABLE IF NOT EXISTS user_aquarium (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    fish_species_id INTEGER DEFAULT 0,
    fish_name TEXT DEFAULT '',
    status TEXT DEFAULT 'egg',
    egg_started_at TEXT,
    hatched_at TEXT,
    died_at TEXT,
    death_cause TEXT DEFAULT '',
    water_clarity REAL DEFAULT 85,
    water_temp REAL DEFAULT 26,
    water_ph REAL DEFAULT 7.0,
    ammonia REAL DEFAULT 10,
    oxygen REAL DEFAULT 75,
    algae REAL DEFAULT 15,
    fish_health REAL DEFAULT 80,
    fish_size REAL DEFAULT 10,
    fish_color REAL DEFAULT 60,
    fish_speed REAL DEFAULT 60,
    fish_stress REAL DEFAULT 20,
    obesity_risk REAL DEFAULT 0,
    hypertension_risk REAL DEFAULT 0,
    diabetes_risk REAL DEFAULT 0,
    liver_risk REAL DEFAULT 0,
    mental_risk REAL DEFAULT 0,
    growth_stage INTEGER DEFAULT 1,
    generation INTEGER DEFAULT 1,
    days_alive INTEGER DEFAULT 0,
    consecutive_feed_days INTEGER DEFAULT 0,
    total_feeds INTEGER DEFAULT 0,
    last_feed_date TEXT DEFAULT '',
    last_access_date TEXT DEFAULT '',
    checkup_count INTEGER DEFAULT 0,
    last_checkup_date TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS aquarium_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    generation INTEGER DEFAULT 1,
    fish_species_id INTEGER,
    fish_name TEXT,
    days_alive INTEGER DEFAULT 0,
    growth_stage INTEGER DEFAULT 1,
    death_cause TEXT DEFAULT '',
    total_feeds INTEGER DEFAULT 0,
    checkup_count INTEGER DEFAULT 0,
    rewards TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS aquarium_feed_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    feed_date TEXT NOT NULL,
    feed_type TEXT DEFAULT 'flake',
    balance_score REAL DEFAULT 0,
    calories REAL DEFAULT 0,
    fat_ratio REAL DEFAULT 0,
    vegetable_score REAL DEFAULT 0,
    sodium REAL DEFAULT 0,
    alcohol_cal REAL DEFAULT 0,
    protein_ratio REAL DEFAULT 0,
    fiber_score REAL DEFAULT 0,
    one_word TEXT DEFAULT '',
    water_clarity_delta REAL DEFAULT 0,
    fish_color_delta REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS aquarium_checkup_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    checkup_date TEXT NOT NULL,
    result TEXT DEFAULT '{}',
    diseases_found TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS fish_discovery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    species_id INTEGER NOT NULL,
    discovered_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, species_id)
  )`);
}

// サーバー起動時に初期化
initAquariumTables();

// ---------- ユーティリティ ----------
function today() { return new Date().toISOString().split('T')[0]; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ---------- API: アクアリウム情報取得 ----------
router.get('/', authUser, (req, res) => {
  const db = getDb();
  let aq = db.prepare('SELECT * FROM user_aquarium WHERE user_id = ?').get(req.uid);

  if (!aq) {
    // 初回: 自動で卵を付与
    db.prepare(`INSERT INTO user_aquarium (user_id, status, egg_started_at, generation) VALUES (?, 'egg', ?, 1)`)
      .run(req.uid, new Date().toISOString());
    aq = db.prepare('SELECT * FROM user_aquarium WHERE user_id = ?').get(req.uid);
  }

  // 最終アクセス更新
  db.prepare(`UPDATE user_aquarium SET last_access_date = ?, updated_at = datetime('now') WHERE user_id = ?`)
    .run(today(), req.uid);

  // 魚種情報を付加
  const species = aq.fish_species_id ? FISH_SPECIES.find(s => s.id === aq.fish_species_id) : null;

  // 発見済み魚種
  const discovered = db.prepare('SELECT species_id FROM fish_discovery WHERE user_id = ?').all(req.uid).map(r => r.species_id);

  // 世代履歴
  const history = db.prepare('SELECT * FROM aquarium_history WHERE user_id = ? ORDER BY generation DESC').all(req.uid);

  res.json({
    success: true,
    aquarium: aq,
    species: species,
    discovered: discovered,
    history: history,
    all_species: FISH_SPECIES.map(s => ({
      id: s.id, name: s.name, rank: s.rank, desc: s.desc,
      hint: discovered.includes(s.id) ? null : s.hint,
      discovered: discovered.includes(s.id),
    })),
  });
});

// ---------- API: 卵に名前をつける ----------
router.post('/name-egg', authUser, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: '名前を入力してください' });
  const db = getDb();
  db.prepare(`UPDATE user_aquarium SET fish_name = ?, updated_at = datetime('now') WHERE user_id = ?`)
    .run(name.trim(), req.uid);
  res.json({ success: true });
});

// ---------- API: 食事を与える（食事記録と連動）----------
router.post('/feed', authUser, (req, res) => {
  const db = getDb();
  const aq = db.prepare('SELECT * FROM user_aquarium WHERE user_id = ?').get(req.uid);
  if (!aq) return res.status(404).json({ error: 'アクアリウムがありません' });
  if (aq.status === 'dead') return res.json({ success: false, message: '魚は旅立ちました', dead: true });

  const { balance_score, calories, fat_ratio, vegetable_score, sodium,
          alcohol_cal, protein_ratio, fiber_score, one_word } = req.body;

  const bs = Number(balance_score) || 50;
  const feedDate = today();
  const feedType = 'user_meal';

  // 投入ボーナス（投稿した時点で基本ボーナス）
  let clarityDelta = 1;
  let colorDelta = 0.5;
  let healthDelta = 1;
  let sizeDelta = 0;
  let speedDelta = 0;
  let stressDelta = -1;
  let ammoniaDelta = 0;
  let oxygenDelta = 0;

  // バランス良好 → 水質改善 + 色UP
  if (bs >= 80) {
    clarityDelta += 4; colorDelta += 3; speedDelta += 2; sizeDelta += 0.5;
    oxygenDelta += 2; ammoniaDelta -= 3;
  } else if (bs >= 50) {
    clarityDelta += 2; colorDelta += 1; speedDelta += 1; sizeDelta += 0.2;
  }

  // 野菜 → 水草効果（水質浄化）
  const veg = Number(vegetable_score) || 0;
  if (veg > 60) { oxygenDelta += 3; ammoniaDelta -= 2; clarityDelta += 2; colorDelta += 1; }

  // 脂質過多 → 水が濁る
  const fat = Number(fat_ratio) || 0;
  if (fat > 0.35) { ammoniaDelta += 5; clarityDelta -= 4; sizeDelta += 0.5; }

  // 塩分過多 → pH異常
  const na = Number(sodium) || 0;
  if (na > 3000) { stressDelta += 4; speedDelta -= 2; }

  // アルコール → 水が黄色く
  const alc = Number(alcohol_cal) || 0;
  if (alc > 200) { clarityDelta -= 5; ammoniaDelta += 4; }

  // タンパク質バランス良好
  const prot = Number(protein_ratio) || 0;
  if (prot > 0.15 && prot < 0.25) { speedDelta += 2; colorDelta += 1; }

  // 疾病リスク蓄積
  let obesityDelta = fat > 0.35 ? 3 : (bs > 70 ? -1 : 0);
  let hpDelta = na > 3000 ? 4 : (na < 2000 ? -1 : 0);
  let diabetesDelta = bs < 40 ? 2 : (bs > 70 ? -1 : 0);
  let liverDelta = alc > 200 ? 5 : (alc === 0 ? -1 : 0);

  // パラメータ更新
  const newClarity = clamp(aq.water_clarity + clarityDelta, 0, 100);
  const newColor = clamp(aq.fish_color + colorDelta, 0, 100);
  const newHealth = clamp(aq.fish_health + healthDelta, 0, 100);
  const newSize = clamp(aq.fish_size + sizeDelta, 10, 100);
  const newSpeed = clamp(aq.fish_speed + speedDelta, 0, 100);
  const newStress = clamp(aq.fish_stress + stressDelta, 0, 100);
  const newAmmonia = clamp(aq.ammonia + ammoniaDelta, 0, 100);
  const newOxygen = clamp(aq.oxygen + oxygenDelta, 0, 100);
  const newObesity = clamp(aq.obesity_risk + obesityDelta, 0, 100);
  const newHp = clamp(aq.hypertension_risk + hpDelta, 0, 100);
  const newDiabetes = clamp(aq.diabetes_risk + diabetesDelta, 0, 100);
  const newLiver = clamp(aq.liver_risk + liverDelta, 0, 100);

  // 連続日数
  let consecutive = aq.consecutive_feed_days || 0;
  if (aq.last_feed_date === feedDate) {
    // 同日2回目以降 → 連続日数は変えない
  } else {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    consecutive = (aq.last_feed_date === yesterday) ? consecutive + 1 : 1;
  }

  // 卵の孵化判定（食事記録3回で孵化）
  const totalFeeds = (aq.total_feeds || 0) + 1;
  let newStatus = aq.status;
  let speciesId = aq.fish_species_id;

  if (aq.status === 'egg' && totalFeeds >= 3) {
    // 孵化！食事パターンで魚種決定
    speciesId = determineFishSpecies(req.uid, db);
    newStatus = 'alive';
    // 図鑑に登録
    try {
      db.prepare('INSERT OR IGNORE INTO fish_discovery (user_id, species_id) VALUES (?, ?)').run(req.uid, speciesId);
    } catch(e) {}
  }

  db.prepare(`UPDATE user_aquarium SET
    water_clarity=?, water_ph=?, ammonia=?, oxygen=?,
    fish_health=?, fish_size=?, fish_color=?, fish_speed=?, fish_stress=?,
    obesity_risk=?, hypertension_risk=?, diabetes_risk=?, liver_risk=?,
    total_feeds=?, consecutive_feed_days=?, last_feed_date=?,
    status=?, fish_species_id=?,
    hatched_at = CASE WHEN ? = 'alive' AND status = 'egg' THEN datetime('now') ELSE hatched_at END,
    updated_at=datetime('now')
    WHERE user_id=?`).run(
    newClarity, aq.water_ph, newAmmonia, newOxygen,
    newHealth, newSize, newColor, newSpeed, newStress,
    newObesity, newHp, newDiabetes, newLiver,
    totalFeeds, consecutive, feedDate,
    newStatus, speciesId,
    newStatus,
    req.uid
  );

  // フィードログ記録
  db.prepare(`INSERT INTO aquarium_feed_log
    (user_id, feed_date, feed_type, balance_score, calories, fat_ratio, vegetable_score, sodium, alcohol_cal, protein_ratio, fiber_score, one_word, water_clarity_delta, fish_color_delta)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(req.uid, feedDate, feedType, bs, calories||0, fat||0, veg, na, alc, prot, Number(fiber_score)||0, one_word||'', clarityDelta, colorDelta);

  // リアクション判定
  let reaction = 'eat_happy';
  if (bs >= 80) reaction = 'eat_delighted';
  else if (bs < 40) reaction = 'eat_meh';
  if (fat > 0.4) reaction = 'eat_oily';
  if (na > 4000) reaction = 'eat_salty';

  // 天の声
  let voice = '';
  if (newStatus === 'alive' && aq.status === 'egg') {
    const sp = FISH_SPECIES.find(s => s.id === speciesId);
    voice = `卵が割れた！${sp ? sp.name : '魚'}が生まれたよ！\nあなたの最初の3日間のごはんから生まれた命だよ`;
    reaction = 'hatch';
  } else if (bs >= 80) {
    voice = 'おっ、今日はごちそうだ！\nすごく嬉しそうに食べてるよ✨';
  } else if (fat > 0.4) {
    voice = 'おいしそうに食べてるけど...\n水がちょっと濁ったかな';
  } else if (na > 3000) {
    voice = 'のどが渇いたみたい...\n水の流れが少し悪くなったかも';
  } else if (alc > 200) {
    voice = '...水が少し黄色くなったね。\n明日はきれいな水に戻るといいな';
  } else {
    voice = '嬉しそうに食べてるよ。\nあなたのごはんが一番おいしいんだって';
  }

  res.json({
    success: true,
    reaction,
    voice,
    hatched: newStatus === 'alive' && aq.status === 'egg',
    species: newStatus === 'alive' ? FISH_SPECIES.find(s => s.id === speciesId) : null,
    deltas: { clarity: clarityDelta, color: colorDelta, health: healthDelta, size: sizeDelta },
  });
});

// ---------- API: フレーク自動投入 ----------
router.post('/flake', authUser, (req, res) => {
  const db = getDb();
  const aq = db.prepare('SELECT * FROM user_aquarium WHERE user_id = ?').get(req.uid);
  if (!aq || aq.status === 'dead' || aq.status === 'egg') return res.json({ success: false });

  const feedDate = today();
  if (aq.last_feed_date === feedDate) return res.json({ success: false, message: '今日はすでに食事済み' });

  // フレークは最低限の維持
  const newColor = clamp(aq.fish_color - 0.5, 0, 100);
  const newClarity = clamp(aq.water_clarity - 1, 0, 100);

  db.prepare(`UPDATE user_aquarium SET
    fish_color=?, water_clarity=?, last_feed_date=?,
    total_feeds=total_feeds+1, consecutive_feed_days=0,
    updated_at=datetime('now')
    WHERE user_id=?`).run(newColor, newClarity, feedDate, req.uid);

  db.prepare(`INSERT INTO aquarium_feed_log (user_id, feed_date, feed_type) VALUES (?,?,?)`)
    .run(req.uid, feedDate, 'flake');

  res.json({
    success: true,
    reaction: 'eat_plain',
    voice: '今日は普通のフレーク。\nちょっと物足りなそうかな',
  });
});

// ---------- API: 日次減衰（バッチ or アクセス時に呼ぶ） ----------
router.post('/daily-decay', authUser, (req, res) => {
  const db = getDb();
  const aq = db.prepare('SELECT * FROM user_aquarium WHERE user_id = ?').get(req.uid);
  if (!aq || aq.status === 'dead' || aq.status === 'egg') return res.json({ success: false });

  const lastAccess = aq.last_access_date || today();
  const daysSince = Math.floor((Date.now() - new Date(lastAccess + 'T00:00:00').getTime()) / 86400000);

  if (daysSince <= 0) return res.json({ success: true, days_since: 0 });

  // 減衰計算
  let clarityLoss = 2 * daysSince;
  let ammoniaGain = 1 * daysSince;
  let oxygenLoss = 1 * daysSince;
  let algaeGain = 0.5 * daysSince;
  let healthLoss = 0;
  let stressGain = 0;
  let mentalGain = 0;
  let voice = '';

  if (daysSince >= 2) { clarityLoss += 3; stressGain += 3; mentalGain += 5 * daysSince; }
  if (daysSince >= 4) { oxygenLoss += 8; healthLoss += 5; }
  if (daysSince >= 7) { healthLoss += 10; }

  const newClarity = clamp(aq.water_clarity - clarityLoss, 5, 100);
  const newAmmonia = clamp(aq.ammonia + ammoniaGain, 0, 100);
  const newOxygen = clamp(aq.oxygen - oxygenLoss, 0, 100);
  const newAlgae = clamp(aq.algae + algaeGain, 0, 100);
  const newHealth = clamp(aq.fish_health - healthLoss, 0, 100);
  const newStress = clamp(aq.fish_stress + stressGain, 0, 100);
  const newMental = clamp(aq.mental_risk + mentalGain, 0, 100);

  let newStatus = aq.status;
  let deathCause = '';

  // 死亡判定
  if (daysSince >= 10) {
    newStatus = 'dead';
    deathCause = 'neglect';
    voice = '...水の中が、静かになったね。\nでもまた、卵がもらえるよ';
    // 履歴に記録
    db.prepare(`INSERT INTO aquarium_history
      (user_id, generation, fish_species_id, fish_name, days_alive, growth_stage, death_cause, total_feeds, checkup_count)
      VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(req.uid, aq.generation, aq.fish_species_id, aq.fish_name, aq.days_alive, aq.growth_stage, deathCause, aq.total_feeds, aq.checkup_count);
  } else if (daysSince >= 7) {
    voice = '水槽が大変なことに...\n魚が病気になりました';
  } else if (daysSince >= 4) {
    voice = '魚が水面でパクパクしてる...\n酸素が足りないみたい';
  } else if (daysSince >= 2) {
    voice = '水槽の水が少し濁ってきたよ';
  }

  db.prepare(`UPDATE user_aquarium SET
    water_clarity=?, ammonia=?, oxygen=?, algae=?,
    fish_health=?, fish_stress=?, mental_risk=?,
    status=?, death_cause=?,
    died_at = CASE WHEN ? = 'dead' THEN datetime('now') ELSE died_at END,
    days_alive = days_alive + ?,
    updated_at=datetime('now')
    WHERE user_id=?`).run(
    newClarity, newAmmonia, newOxygen, newAlgae,
    newHealth, newStress, newMental,
    newStatus, deathCause,
    newStatus,
    daysSince,
    req.uid
  );

  res.json({ success: true, days_since: daysSince, status: newStatus, voice, death_cause: deathCause });
});

// ---------- API: 水質検査（健診） ----------
router.post('/checkup', authUser, (req, res) => {
  const db = getDb();
  const aq = db.prepare('SELECT * FROM user_aquarium WHERE user_id = ?').get(req.uid);
  if (!aq || aq.status === 'dead') return res.json({ success: false });

  const diseases = [];
  if (aq.obesity_risk > 70) diseases.push({ name: '肥満傾向', stage: aq.obesity_risk > 85 ? 3 : 2, param: 'obesity_risk' });
  else if (aq.obesity_risk > 50) diseases.push({ name: '肥満傾向', stage: 1, param: 'obesity_risk' });

  if (aq.hypertension_risk > 70) diseases.push({ name: '高血圧', stage: aq.hypertension_risk > 85 ? 3 : 2, param: 'hypertension_risk' });
  else if (aq.hypertension_risk > 50) diseases.push({ name: '高血圧', stage: 1, param: 'hypertension_risk' });

  if (aq.diabetes_risk > 70) diseases.push({ name: '糖尿病予備群', stage: aq.diabetes_risk > 85 ? 3 : 2, param: 'diabetes_risk' });
  else if (aq.diabetes_risk > 50) diseases.push({ name: '糖尿病予備群', stage: 1, param: 'diabetes_risk' });

  if (aq.liver_risk > 70) diseases.push({ name: '脂肪肝', stage: aq.liver_risk > 85 ? 3 : 2, param: 'liver_risk' });
  else if (aq.liver_risk > 50) diseases.push({ name: '脂肪肝', stage: 1, param: 'liver_risk' });

  if (aq.mental_risk > 70) diseases.push({ name: 'メンタル不調', stage: aq.mental_risk > 85 ? 3 : 2, param: 'mental_risk' });
  else if (aq.mental_risk > 50) diseases.push({ name: 'メンタル不調', stage: 1, param: 'mental_risk' });

  const result = {
    clarity: aq.water_clarity,
    ammonia: aq.ammonia,
    ph: aq.water_ph,
    oxygen: aq.oxygen,
    overall: diseases.length === 0 ? 'A' : diseases.some(d => d.stage >= 3) ? 'D' : diseases.some(d => d.stage >= 2) ? 'C' : 'B',
    diseases,
  };

  db.prepare(`UPDATE user_aquarium SET checkup_count = checkup_count + 1, last_checkup_date = ?, updated_at = datetime('now') WHERE user_id = ?`)
    .run(today(), req.uid);

  db.prepare('INSERT INTO aquarium_checkup_log (user_id, checkup_date, result, diseases_found) VALUES (?,?,?,?)')
    .run(req.uid, today(), JSON.stringify(result), JSON.stringify(diseases));

  let voice = '';
  if (diseases.length === 0) {
    voice = '水質検査の結果、すべて正常！\n良い状態を維持しているね';
  } else {
    const critical = diseases.filter(d => d.stage >= 2);
    if (critical.length) {
      voice = `検査で気になる項目が...\n${critical.map(d => d.name).join('、')}に注意が必要です`;
    } else {
      voice = `概ね良好ですが、${diseases[0].name}が少し気になります\n早めに気づけてよかった`;
    }
  }

  res.json({ success: true, result, voice });
});

// ---------- API: 新しい卵を受け取る（死後 or 大往生後） ----------
router.post('/new-egg', authUser, (req, res) => {
  const db = getDb();
  const aq = db.prepare('SELECT * FROM user_aquarium WHERE user_id = ?').get(req.uid);
  if (!aq) return res.status(404).json({ error: 'アクアリウムがありません' });
  if (aq.status !== 'dead') return res.json({ success: false, message: 'まだ生きています' });

  const newGen = (aq.generation || 1) + 1;

  db.prepare(`UPDATE user_aquarium SET
    fish_species_id=0, fish_name='', status='egg',
    egg_started_at=datetime('now'), hatched_at=NULL, died_at=NULL, death_cause='',
    water_clarity=85, water_temp=26, water_ph=7.0, ammonia=10, oxygen=75, algae=15,
    fish_health=80, fish_size=10, fish_color=60, fish_speed=60, fish_stress=20,
    obesity_risk=0, hypertension_risk=0, diabetes_risk=0, liver_risk=0, mental_risk=0,
    growth_stage=1, generation=?, days_alive=0, consecutive_feed_days=0, total_feeds=0,
    last_feed_date='', last_checkup_date='', checkup_count=0,
    updated_at=datetime('now')
    WHERE user_id=?`).run(newGen, req.uid);

  res.json({ success: true, generation: newGen, voice: '新しい卵だよ。\n今度はどんな子が生まれるかな...' });
});

// ---------- 魚種決定ロジック ----------
function determineFishSpecies(userId, db) {
  // 過去3日の食事ログを分析
  const logs = db.prepare(`SELECT * FROM aquarium_feed_log WHERE user_id = ? AND feed_type = 'user_meal' ORDER BY created_at DESC LIMIT 3`).all(userId);

  if (logs.length < 3) return 1; // デフォルト: ネオンテトラ

  const avgBalance = logs.reduce((s, l) => s + (l.balance_score || 0), 0) / logs.length;
  const avgVeg = logs.reduce((s, l) => s + (l.vegetable_score || 0), 0) / logs.length;
  const avgFat = logs.reduce((s, l) => s + (l.fat_ratio || 0), 0) / logs.length;
  const avgProtein = logs.reduce((s, l) => s + (l.protein_ratio || 0), 0) / logs.length;
  const avgSodium = logs.reduce((s, l) => s + (l.sodium || 0), 0) / logs.length;
  const avgCalories = logs.reduce((s, l) => s + (l.calories || 0), 0) / logs.length;

  // コモン種の分岐
  if (avgBalance >= 70) return 1;           // ネオンテトラ（バランス良好）
  if (avgVeg > 50) return 3;               // メダカ（和食/野菜寄り）
  if (avgProtein > 0.22) return 5;         // ゼブラダニオ（肉多め）
  if (avgFat > 0.35) return 8;             // ドジョウ（不規則/脂質多い）
  if (avgCalories < 500) return 7;         // コリドラス（カロリー控えめ）
  if (avgCalories > 800) return 4;         // プラティ（洋食/高カロリー）
  if (avgSodium < 2000) return 6;          // アカヒレ（質素）
  return 2;                                 // グッピー（標準）
}

// ---------- 魚種マスタ取得 ----------
router.get('/species', (req, res) => {
  res.json(FISH_SPECIES);
});

// ---------- 図鑑 ----------
router.get('/discovery', authUser, (req, res) => {
  const db = getDb();
  const discovered = db.prepare('SELECT species_id, discovered_at FROM fish_discovery WHERE user_id = ? ORDER BY discovered_at').all(req.uid);
  res.json({
    success: true,
    total: FISH_SPECIES.length,
    discovered: discovered.length,
    list: FISH_SPECIES.map(s => ({
      ...s,
      discovered: discovered.some(d => d.species_id === s.id),
      discovered_at: (discovered.find(d => d.species_id === s.id) || {}).discovered_at || null,
    })),
  });
});

module.exports = router;
