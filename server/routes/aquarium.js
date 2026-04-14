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

  db.exec(`CREATE TABLE IF NOT EXISTS step_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    step_date TEXT NOT NULL,
    steps INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, step_date)
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
    // 初回: 自動で卵を付与 + 過去の食事投稿を餌カウントに反映
    const pastMeals = db.prepare("SELECT COUNT(*) as cnt FROM posts WHERE user_id = ? AND category LIKE '%食事%'").get(req.uid);
    const pastFeedCount = pastMeals ? pastMeals.cnt : 0;
    const shouldHatch = pastFeedCount >= 3; // 過去に3食以上 → 即孵化
    db.prepare(`INSERT INTO user_aquarium (user_id, status, egg_started_at, generation, total_feeds)
      VALUES (?, ?, ?, 1, ?)`)
      .run(req.uid, shouldHatch ? 'alive' : 'egg', new Date().toISOString(), pastFeedCount);
    if (shouldHatch) {
      db.prepare(`UPDATE user_aquarium SET hatched_at = datetime('now'), growth_stage = 2, days_alive = 1 WHERE user_id = ?`).run(req.uid);
    }
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
    // 孵化！最初は全員「稚魚」（species_id=0）
    // 種類は食事の蓄積で後から決まる
    speciesId = 0;
    newStatus = 'alive';
  }

  // 成長判定
  let newGrowthStage = aq.growth_stage || 1;
  let growthEvent = null;
  if (newStatus === 'alive') {
    const daysAlive = (aq.days_alive || 0);
    const feeds = totalFeeds;
    const consec = consecutive;
    const prevStage = aq.growth_stage || 1;

    if (prevStage === 1 && daysAlive >= 1) {
      newGrowthStage = 2; growthEvent = { stage: 2, msg: '稚魚に成長したよ！まだ透明で小さいけど...これからどんな魚になるかな？' };
    }
    if (prevStage === 2 && feeds >= 10 && consec >= 5) {
      // ★ Stage 3で種類が決まる！食事蓄積で進化分岐
      speciesId = determineFishSpecies(req.uid, db);
      newGrowthStage = 3;
      const sp = FISH_SPECIES.find(s => s.id === speciesId);
      growthEvent = { stage: 3, msg: '体に色がついてきた！...この子は「' + (sp ? sp.name : '魚') + '」だ！\nあなたの食事から生まれた姿だよ', speciesId: speciesId };
      // 図鑑に登録
      try { db.prepare('INSERT OR IGNORE INTO fish_discovery (user_id, species_id) VALUES (?, ?)').run(req.uid, speciesId); } catch(e) {}
    }
    if (prevStage === 3 && daysAlive >= 21 && feeds >= 25) {
      // Stage 4: 食事が変わっていれば種類も変化する可能性
      const newSpecies = determineFishSpecies(req.uid, db);
      if (newSpecies !== speciesId && newSpecies !== aq.fish_species_id) {
        speciesId = newSpecies;
        const sp = FISH_SPECIES.find(s => s.id === speciesId);
        newGrowthStage = 4; growthEvent = { stage: 4, msg: '食事が変わって...姿も変わった！「' + (sp ? sp.name : '魚') + '」に進化したよ！', speciesId: speciesId };
        try { db.prepare('INSERT OR IGNORE INTO fish_discovery (user_id, species_id) VALUES (?, ?)').run(req.uid, speciesId); } catch(e) {}
      } else {
        newGrowthStage = 4; growthEvent = { stage: 4, msg: '若魚に成長！体つきがしっかりしてきた' };
      }
    }
    if (prevStage === 4 && daysAlive >= 45 && bs >= 60 && consec >= 7) {
      newGrowthStage = 5; growthEvent = { stage: 5, msg: '成魚になったよ！立派に育ったね' };
    }
    if (prevStage === 5 && daysAlive >= 75 && aq.checkup_count >= 2) {
      newGrowthStage = 6; growthEvent = { stage: 6, msg: '大人の魚になった。一緒に過ごした日々の証だね' };
    }
    if (prevStage === 6 && daysAlive >= 120 && newClarity > 60 && newHealth > 60) {
      newGrowthStage = 7; growthEvent = { stage: 7, msg: '伝説の魚に...！あなたのおかげで最高の姿になったよ' };
    }
  }

  db.prepare(`UPDATE user_aquarium SET
    water_clarity=?, water_ph=?, ammonia=?, oxygen=?,
    fish_health=?, fish_size=?, fish_color=?, fish_speed=?, fish_stress=?,
    obesity_risk=?, hypertension_risk=?, diabetes_risk=?, liver_risk=?,
    total_feeds=?, consecutive_feed_days=?, last_feed_date=?,
    status=?, fish_species_id=?, growth_stage=?,
    hatched_at = CASE WHEN ? = 'alive' AND status = 'egg' THEN datetime('now') ELSE hatched_at END,
    updated_at=datetime('now')
    WHERE user_id=?`).run(
    newClarity, aq.water_ph, newAmmonia, newOxygen,
    newHealth, newSize, newColor, newSpeed, newStress,
    newObesity, newHp, newDiabetes, newLiver,
    totalFeeds, consecutive, feedDate,
    newStatus, speciesId, newGrowthStage,
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
    voice = '卵が割れた！小さな稚魚が生まれたよ！\nまだ透明で何の魚かわからないけど...\nこれからのごはんで、どんな魚になるか決まるんだ';
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

  // 成長イベントがあれば声を上書き
  if (growthEvent) {
    voice = growthEvent.msg;
    reaction = 'evolution';
  }

  res.json({
    success: true,
    reaction,
    voice,
    hatched: newStatus === 'alive' && aq.status === 'egg',
    species: newStatus === 'alive' ? FISH_SPECIES.find(s => s.id === speciesId) : null,
    deltas: { clarity: clarityDelta, color: colorDelta, health: healthDelta, size: sizeDelta },
    growthEvent: growthEvent,
  });
});

// ---------- API: 手動で餌をあげる ----------
router.post('/manual-feed', authUser, (req, res) => {
  const db = getDb();
  const aq = db.prepare('SELECT * FROM user_aquarium WHERE user_id = ?').get(req.uid);
  if (!aq || aq.status === 'dead') return res.json({ success: false });
  if (aq.status === 'egg') return res.json({ success: true, voice: '卵にごはんの匂いを届けたよ！' });

  const feedDate = today();
  if (aq.last_feed_date === feedDate) return res.json({ success: true, already: true, voice: '今日はもうごはんあげたよ！😊' });

  // 手動餌: フレーク程度だが、アクセスした証（連続日数は維持）
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const consecutive = (aq.last_feed_date === yesterday) ? (aq.consecutive_feed_days || 0) + 1 : 1;

  const newColor = clamp(aq.fish_color + 0.3, 0, 100);
  const newHealth = clamp(aq.fish_health + 0.5, 0, 100);
  const newMood = clamp(aq.mental_risk - 2, 0, 100);

  db.prepare(`UPDATE user_aquarium SET
    fish_color=?, fish_health=?, mental_risk=?,
    last_feed_date=?, total_feeds=total_feeds+1, consecutive_feed_days=?,
    updated_at=datetime('now')
    WHERE user_id=?`).run(newColor, newHealth, newMood, feedDate, consecutive, req.uid);

  // 今日の手動餌ログが無ければ追加（ON CONFLICTはUNIQUE制約不要の方式に変更）
  const existingManual = db.prepare("SELECT id FROM aquarium_feed_log WHERE user_id=? AND feed_date=? AND feed_type='manual'").get(req.uid, feedDate);
  if (!existingManual) {
    db.prepare(`INSERT INTO aquarium_feed_log (user_id, feed_date, feed_type) VALUES (?,?,?)`).run(req.uid, feedDate, 'manual');
  }

  let voice = '';
  if (consecutive >= 7) {
    voice = 'ごはんありがとう！' + consecutive + '日連続だね！\n毎日来てくれて嬉しいよ✨';
  } else if (consecutive >= 3) {
    voice = 'ごはんありがとう！\n' + consecutive + '日連続！この調子！';
  } else {
    voice = 'ごはんありがとう！\n今日も元気に泳ぐよ🐟';
  }

  res.json({ success: true, voice, consecutive });
});

// ---------- API: 水換え（1日1回） ----------
router.post('/water-change', authUser, (req, res) => {
  const db = getDb();
  const aq = db.prepare('SELECT * FROM user_aquarium WHERE user_id = ?').get(req.uid);
  if (!aq || aq.status !== 'alive') return res.json({ success: false });

  // 今日すでに水換え済みかチェック
  const todayDate = today();
  const lastChange = db.prepare('SELECT feed_date FROM aquarium_feed_log WHERE user_id = ? AND feed_type = ? ORDER BY feed_date DESC LIMIT 1').get(req.uid, 'water_change');
  if (lastChange && lastChange.feed_date === todayDate) {
    return res.json({ success: true, already: true, voice: '今日はもう水換えしたよ！💧' });
  }

  // 水質レベルを1段階上げる（20%刻み）
  const currentLevel = Math.floor(aq.water_clarity / 20); // 0-4
  const newLevel = Math.min(4, currentLevel + 1);
  const newClarity = clamp(newLevel * 20 + 10, 0, 100); // 10,30,50,70,90
  const newAmmonia = clamp(aq.ammonia - 10, 0, 100);

  db.prepare(`UPDATE user_aquarium SET water_clarity=?, ammonia=?, updated_at=datetime('now') WHERE user_id=?`)
    .run(newClarity, newAmmonia, req.uid);

  db.prepare(`INSERT INTO aquarium_feed_log (user_id, feed_date, feed_type) VALUES (?,?,?)`)
    .run(req.uid, todayDate, 'water_change');

  const levelNames = ['Lv1 危険','Lv2 汚い','Lv3 普通','Lv4 良好','Lv5 きれい'];
  const voice = '水換えしたよ！水質が' + (levelNames[newLevel] || '') + 'になった💧';

  res.json({ success: true, voice, newClarity, level: newLevel + 1 });
});

// ---------- API: 3要素チェック（食事+運動+野菜で最高ランク） ----------
router.post('/full-recovery', authUser, (req, res) => {
  const db = getDb();
  const aq = db.prepare('SELECT * FROM user_aquarium WHERE user_id = ?').get(req.uid);
  if (!aq || aq.status !== 'alive') return res.json({ success: false });

  const todayDate = today();
  // 今日の食事投稿があるか
  const hasMeal = db.prepare("SELECT 1 FROM aquarium_feed_log WHERE user_id=? AND feed_date=? AND feed_type='user_meal'").get(req.uid, todayDate);
  // 今日の歩数があるか（3000歩以上）
  const hasSteps = db.prepare("SELECT steps FROM step_log WHERE user_id=? AND step_date=?").get(req.uid, todayDate);
  const stepsOk = hasSteps && hasSteps.steps >= 3000;
  // 今日の食事に野菜スコア50以上があるか
  const hasVeg = db.prepare("SELECT 1 FROM aquarium_feed_log WHERE user_id=? AND feed_date=? AND feed_type='user_meal' AND vegetable_score>=50").get(req.uid, todayDate);

  if (hasMeal && stepsOk && hasVeg) {
    db.prepare(`UPDATE user_aquarium SET water_clarity=95, ammonia=5, oxygen=90, updated_at=datetime('now') WHERE user_id=?`).run(req.uid);
    return res.json({ success: true, fullRecovery: true, voice: '食事・運動・野菜の3つが揃った！\n水がキラキラに輝いてるよ✨' });
  }

  res.json({
    success: true, fullRecovery: false,
    hasMeal: !!hasMeal, hasSteps: stepsOk, hasVeg: !!hasVeg,
    voice: '3要素が揃うと水質が最高に！\n' +
      (hasMeal ? '✅' : '⬜') + ' 食事投稿\n' +
      (stepsOk ? '✅' : '⬜') + ' 歩数3000歩以上\n' +
      (hasVeg ? '✅' : '⬜') + ' 野菜を含む食事'
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

  // 大往生判定（180日以上 + Stage 6以上 + 健康状態良好）
  if ((aq.days_alive || 0) + daysSince >= 180 && aq.growth_stage >= 6 && aq.fish_health > 50) {
    newStatus = 'dead';
    deathCause = 'old_age';
    voice = (aq.fish_name || '') + 'は180日間の幸せな生涯を終えました。\nあなたと過ごした毎日が、全てでした。\n...ありがとう';
    // 履歴に記録（大往生）
    db.prepare(`INSERT INTO aquarium_history
      (user_id, generation, fish_species_id, fish_name, days_alive, growth_stage, death_cause, total_feeds, checkup_count, rewards)
      VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(req.uid, aq.generation, aq.fish_species_id, aq.fish_name, (aq.days_alive||0)+daysSince, aq.growth_stage, deathCause, aq.total_feeds, aq.checkup_count, '["grand_farewell"]');
  }
  // 疾病死判定（Stage 3の病気を30日以上放置）
  else if (!deathCause && (aq.obesity_risk > 90 || aq.hypertension_risk > 90 || aq.diabetes_risk > 90 || aq.liver_risk > 90)) {
    const diseaseName = aq.obesity_risk > 90 ? 'obesity' : aq.hypertension_risk > 90 ? 'hypertension' : aq.diabetes_risk > 90 ? 'diabetes' : 'liver';
    const diseaseLabel = {obesity:'肥満',hypertension:'高血圧',diabetes:'糖尿病',liver:'脂肪肝'}[diseaseName];
    newStatus = 'dead';
    deathCause = diseaseName;
    voice = '...' + (aq.fish_name || '') + 'は' + diseaseLabel + 'で旅立ちました。\nもっと早く気づいていれば...';
    db.prepare(`INSERT INTO aquarium_history
      (user_id, generation, fish_species_id, fish_name, days_alive, growth_stage, death_cause, total_feeds, checkup_count)
      VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(req.uid, aq.generation, aq.fish_species_id, aq.fish_name, (aq.days_alive||0)+daysSince, aq.growth_stage, deathCause, aq.total_feeds, aq.checkup_count);
  }
  // 放置死判定
  else if (daysSince >= 10) {
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

// ---------- 魚種決定ロジック（直近10回の食事で判定） ----------
function determineFishSpecies(userId, db) {
  const logs = db.prepare(`SELECT * FROM aquarium_feed_log WHERE user_id = ? AND feed_type = 'user_meal' ORDER BY created_at DESC LIMIT 10`).all(userId);

  if (logs.length < 3) return 2; // デフォルト: グッピー（最も普通）

  const avg = (key) => logs.reduce((s, l) => s + (Number(l[key]) || 0), 0) / logs.length;
  const avgBalance = avg('balance_score');
  const avgVeg = avg('vegetable_score');
  const avgFat = avg('fat_ratio');
  const avgProtein = avg('protein_ratio');
  const avgSodium = avg('sodium');
  const avgCalories = avg('calories');
  const avgAlcohol = avg('alcohol_cal');
  const avgFiber = avg('fiber_score');
  const count = logs.length;

  // === アンコモン判定（食事が一定以上蓄積されている場合） ===
  if (count >= 7) {
    if (avgBalance >= 70 && avgVeg > 50) return 9;            // エンゼルフィッシュ（野菜+バランス）
    if (avgProtein > 0.20 && avgFat < 0.30) return 10;        // ベタ（高タンパク低脂質）
    if (avgFat < 0.25 && avgBalance >= 60) return 11;         // グラミー（脂質控えめ）
    if (avgBalance >= 70) return 12;                          // カージナルテトラ（バランス優秀）
    if (avgFiber > 3) return 14;                              // オトシンクルス（食物繊維多い）
  }

  // === コモン判定 ===
  if (avgBalance >= 65) return 1;           // ネオンテトラ（バランス良好）
  if (avgVeg > 45) return 3;               // メダカ（野菜寄り）
  if (avgProtein > 0.20) return 5;         // ゼブラダニオ（肉多め）
  if (avgFat > 0.32) return 8;             // ドジョウ（脂質多い）
  if (avgCalories < 550) return 7;         // コリドラス（カロリー控えめ）
  if (avgCalories > 750) return 4;         // プラティ（高カロリー）
  if (avgSodium < 2200) return 6;          // アカヒレ（塩分少なめ）
  return 2;                                 // グッピー（標準）
}

// ---------- 歩数記録 ----------
router.post('/steps', authUser, (req, res) => {
  const db = getDb();
  const { steps } = req.body;
  const stepCount = parseInt(steps) || 0;
  if (stepCount < 0 || stepCount > 200000) return res.status(400).json({ error: '歩数が不正です' });

  const stepDate = today();

  // 歩数ログ保存
  db.prepare(`INSERT INTO step_log (user_id, step_date, steps) VALUES (?,?,?)
    ON CONFLICT(user_id, step_date) DO UPDATE SET steps=?, created_at=datetime('now')`)
    .run(req.uid, stepDate, stepCount, stepCount);

  // アクアリウムに反映
  const aq = db.prepare('SELECT * FROM user_aquarium WHERE user_id = ?').get(req.uid);
  if (aq && aq.status === 'alive') {
    // 歩数によるボーナス
    let speedDelta = 0, colorDelta = 0, healthDelta = 0, energyBonus = 0;
    if (stepCount >= 10000) {
      speedDelta = 8; colorDelta = 5; healthDelta = 3; energyBonus = 10;
    } else if (stepCount >= 7000) {
      speedDelta = 5; colorDelta = 3; healthDelta = 2; energyBonus = 6;
    } else if (stepCount >= 5000) {
      speedDelta = 3; colorDelta = 2; healthDelta = 1; energyBonus = 4;
    } else if (stepCount >= 3000) {
      speedDelta = 2; colorDelta = 1; healthDelta = 0.5; energyBonus = 2;
    } else if (stepCount >= 1000) {
      speedDelta = 1; colorDelta = 0.5; healthDelta = 0; energyBonus = 1;
    }

    // 肥満リスク軽減
    const obesityReduce = stepCount >= 5000 ? -2 : stepCount >= 3000 ? -1 : 0;
    // 糖尿病リスク軽減
    const diabetesReduce = stepCount >= 7000 ? -2 : stepCount >= 5000 ? -1 : 0;
    // メンタル改善
    const mentalReduce = stepCount >= 3000 ? -3 : stepCount >= 1000 ? -1 : 0;

    db.prepare(`UPDATE user_aquarium SET
      fish_speed = MIN(100, fish_speed + ?),
      fish_color = MIN(100, fish_color + ?),
      fish_health = MIN(100, fish_health + ?),
      oxygen = MIN(100, oxygen + ?),
      obesity_risk = MAX(0, obesity_risk + ?),
      diabetes_risk = MAX(0, diabetes_risk + ?),
      mental_risk = MAX(0, mental_risk + ?),
      updated_at = datetime('now')
      WHERE user_id = ?`).run(
      speedDelta, colorDelta, healthDelta, energyBonus,
      obesityReduce, diabetesReduce, mentalReduce,
      req.uid
    );

    // 反応メッセージ
    let voice = '';
    if (stepCount >= 10000) {
      voice = 'すごい！' + stepCount.toLocaleString() + '歩！\n水の中を全速力で泳ぎたい気分！✨';
    } else if (stepCount >= 7000) {
      voice = stepCount.toLocaleString() + '歩！体が軽い！\nウロコがキラキラしてきた気がする';
    } else if (stepCount >= 5000) {
      voice = stepCount.toLocaleString() + '歩、いい感じ！\n今日は元気に泳げそうだよ';
    } else if (stepCount >= 3000) {
      voice = stepCount.toLocaleString() + '歩だね。\nちょっと体がほぐれた感じがする';
    } else if (stepCount >= 1000) {
      voice = stepCount.toLocaleString() + '歩か。\nもう少し歩くともっと元気になれるかも';
    } else {
      voice = stepCount.toLocaleString() + '歩...ちょっと少ないかな。\n僕も底でじっとしちゃうよ';
    }

    res.json({ success: true, steps: stepCount, voice, deltas: { speed: speedDelta, color: colorDelta, health: healthDelta } });
  } else {
    res.json({ success: true, steps: stepCount, voice: '歩数を記録したよ！' });
  }
});

router.get('/steps', authUser, (req, res) => {
  const db = getDb();
  const recent = db.prepare('SELECT step_date, steps FROM step_log WHERE user_id = ? ORDER BY step_date DESC LIMIT 30').all(req.uid);
  const todaySteps = db.prepare('SELECT steps FROM step_log WHERE user_id = ? AND step_date = ?').get(req.uid, today());
  const weekTotal = db.prepare(`SELECT SUM(steps) as total FROM step_log WHERE user_id = ? AND step_date >= date('now','-7 days')`).get(req.uid);
  res.json({
    success: true,
    today: todaySteps ? todaySteps.steps : null,
    week_total: weekTotal ? weekTotal.total : 0,
    recent,
  });
});

// ---------- 魚種マスタ取得 ----------
router.get('/species', (req, res) => {
  res.json(FISH_SPECIES);
});

// ---------- ゲスト魚（他人の魚が遊びに来る） ----------
router.get('/visitors', authUser, (req, res) => {
  const db = getDb();
  try {
    // 自分のアクアリウム
    const myAq = db.prepare('SELECT * FROM user_aquarium WHERE user_id = ?').get(req.uid);
    if (!myAq || myAq.status !== 'alive') return res.json({ success: true, visitors: [] });

    // 他のユーザーの生きている魚を取得
    const others = db.prepare(`SELECT ua.*, u.nickname FROM user_aquarium ua
      JOIN users u ON ua.user_id = u.id
      WHERE ua.user_id != ? AND ua.status = 'alive' AND ua.fish_health > 30 AND ua.fish_species_id > 0
      ORDER BY ua.fish_health DESC`).all(req.uid);

    if (!others.length) return res.json({ success: true, visitors: [] });

    // 水質に応じた滞在時間（秒）
    const myClarity = myAq.water_clarity || 50;
    const stayBase = myClarity > 70 ? 120 : myClarity > 40 ? 45 : 15; // 良好:2分、注意:45秒、危険:15秒

    // 元気な魚ほど訪問しやすい（上位から2匹選出）
    const candidates = others.filter(o => o.fish_health > 30);
    const shuffled = candidates.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(2, shuffled.length));

    const visitors = selected.map(v => {
      const species = FISH_SPECIES.find(s => s.id === v.fish_species_id);
      // ゲストの元気度で滞在時間にボーナス
      const guestBonus = v.fish_health > 70 ? 1.5 : 1.0;
      const stayDuration = Math.round(stayBase * guestBonus);

      return {
        nickname: v.nickname || '???',
        fish_name: v.fish_name || '名前なし',
        species_name: species ? species.name : '魚',
        species_id: v.fish_species_id,
        hue: species ? species.hue : 200,
        fish_health: Math.round(v.fish_health),
        fish_color: Math.round(v.fish_color),
        fish_size: Math.round(v.fish_size),
        fish_speed: Math.round(v.fish_speed),
        growth_stage: v.growth_stage,
        stay_duration: stayDuration, // 秒
      };
    });

    res.json({ success: true, visitors, my_clarity: myClarity });
  } catch(e) {
    res.json({ success: true, visitors: [] });
  }
});

// ---------- 遊びに行く（自分の魚を相手の水槽に送る） ----------
router.post('/visit', authUser, (req, res) => {
  const db = getDb();
  try {
    const { targetUid } = req.body;
    if (!targetUid || targetUid === req.uid) return res.json({ success: false, msg: '自分には遊びに行けません' });

    // 自分の魚
    const myAq = db.prepare('SELECT * FROM user_aquarium WHERE user_id = ?').get(req.uid);
    if (!myAq || myAq.status !== 'alive') return res.json({ success: false, msg: '魚が元気な時だけ遊びに行けます' });
    const myUser = db.prepare('SELECT nickname FROM users WHERE id = ?').get(req.uid);

    // 相手の魚
    const targetAq = db.prepare('SELECT * FROM user_aquarium WHERE user_id = ?').get(targetUid);
    if (!targetAq || targetAq.status !== 'alive') return res.json({ success: false, msg: '相手の魚がいません' });
    const targetUser = db.prepare('SELECT nickname FROM users WHERE id = ?').get(targetUid);

    // 水質に応じた滞在時間
    const targetClarity = targetAq.water_clarity || 50;
    const stayDuration = targetClarity > 70 ? 120 : targetClarity > 40 ? 60 : 20;

    const species = FISH_SPECIES.find(s => s.id === myAq.fish_species_id);

    // 訪問通知を相手に送る（buddy_messagesに記録）
    db.prepare(`INSERT INTO buddy_messages (user_id, role, content, created_at) VALUES (?, 'ai', ?, datetime('now'))`)
      .run(targetUid, '🐟 ' + (myAq.fish_name || myUser.nickname + 'の魚') + 'が遊びに来たよ！しばらく一緒に泳いでいくみたい。');

    // トラッキング用: 訪問ログ
    try {
      db.exec(`CREATE TABLE IF NOT EXISTS visit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visitor_uid TEXT NOT NULL,
        host_uid TEXT NOT NULL,
        stay_duration INTEGER DEFAULT 60,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
      db.prepare('INSERT INTO visit_log (visitor_uid, host_uid, stay_duration) VALUES (?, ?, ?)').run(req.uid, targetUid, stayDuration);
    } catch(e) {}

    res.json({
      success: true,
      visitor: {
        nickname: myUser.nickname,
        fish_name: myAq.fish_name || '名前なし',
        species_name: species ? species.name : '魚',
        species_id: myAq.fish_species_id,
        hue: species ? species.hue : 200,
        fish_health: Math.round(myAq.fish_health),
        fish_color: Math.round(myAq.fish_color),
        fish_size: Math.round(myAq.fish_size),
        fish_speed: Math.round(myAq.fish_speed),
        stay_duration: stayDuration,
      },
      target_nickname: targetUser.nickname,
      target_clarity: targetClarity,
      msg: (myAq.fish_name || 'あなたの魚') + 'が' + targetUser.nickname + 'の水槽に遊びに行ったよ！'
    });
  } catch(e) {
    res.json({ success: false, msg: e.message });
  }
});

// ---------- みんなの水槽 ----------
router.get('/shared-tank', authUser, (req, res) => {
  const db = getDb();
  try {
    const allFish = db.prepare(`SELECT ua.*, u.nickname FROM user_aquarium ua
      JOIN users u ON ua.user_id = u.id
      WHERE ua.status = 'alive'
      ORDER BY ua.fish_health DESC`).all();

    const eggRows = db.prepare(`SELECT ua.*, u.nickname FROM user_aquarium ua
      JOIN users u ON ua.user_id = u.id
      WHERE ua.status = 'egg'`).all();

    // 水槽全体の水質 = 全員の平均
    let avgClarity = 50, avgHealth = 50;
    if (allFish.length > 0) {
      avgClarity = Math.round(allFish.reduce((s, f) => s + (f.water_clarity || 50), 0) / allFish.length);
      avgHealth = Math.round(allFish.reduce((s, f) => s + (f.fish_health || 50), 0) / allFish.length);
    }

    const fish = allFish.map(f => {
      const species = FISH_SPECIES.find(s => s.id === f.fish_species_id);
      return {
        type: 'fish',
        user_id: f.user_id,
        nickname: f.nickname || '???',
        fish_name: f.fish_name || '名前なし',
        species_name: species ? species.name : '魚',
        species_id: f.fish_species_id,
        hue: species ? species.hue : 200,
        rank: species ? species.rank : 'common',
        fish_health: Math.round(f.fish_health),
        fish_color: Math.round(f.fish_color),
        fish_size: Math.round(f.fish_size),
        fish_speed: Math.round(f.fish_speed),
        growth_stage: f.growth_stage,
        days_alive: f.days_alive,
        is_mine: f.user_id === req.uid,
      };
    });

    const eggs = eggRows.map(e => ({
      type: 'egg',
      user_id: e.user_id,
      nickname: e.nickname || '???',
      fish_name: e.fish_name || '',
      total_feeds: e.total_feeds || 0,
      is_mine: e.user_id === req.uid,
    }));

    res.json({
      success: true,
      fish,
      eggs,
      total: allFish.length + eggRows.length,
      avg_clarity: avgClarity,
      avg_health: avgHealth,
      healthy_count: allFish.filter(f => f.fish_health > 70).length,
      sick_count: allFish.filter(f => f.fish_health < 40).length,
    });
  } catch(e) {
    res.json({ success: false, error: e.message });
  }
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
