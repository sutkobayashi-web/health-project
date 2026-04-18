const express = require('express');
const router = express.Router();
const { getDb } = require('../services/db');
const { callGeminiVision } = require('../services/ai');
const { authUser: jwtAuthUser } = require('../middleware/auth');
const { awardMarigan } = require('../services/marigan');

// ============================================================
// CoWell 海の探索RPG API
// ============================================================

// JWT検証 + session_token照合（同時ログイン防止）。req.uid を後方互換で残す。
function authUser(req, res, next) {
  jwtAuthUser(req, res, function() {
    req.uid = req.user && req.user.uid;
    if (!req.uid) return res.status(401).json({ success: false, msg: '認証が必要です' });
    next();
  });
}

// ---------- RPGステージマスタ ----------
const RPG_AREAS = [
  // 第1章: はじまりの浅瀬
  { id: '1-1', chapter: 1, name: '光の浅瀬', stepsRequired: 0,      bgColor: '#0ea5e9', depth: '0m',  bgFile: 'area_1-1', desc: '光が降り注ぐ幻想の水中庭園。冒険はここから' },
  { id: '1-2', chapter: 1, name: '岩陰の入り江', stepsRequired: 20000,  bgColor: '#0891b2', depth: '3m',  bgFile: 'area_1-2', desc: '岩の隙間に何かが隠れている' },
  { id: '1-3', chapter: 1, name: '浅瀬の珊瑚棚', stepsRequired: 50000,  bgColor: '#0284c7', depth: '8m',  bgFile: 'area_1-3', desc: '色とりどりの珊瑚が広がる' },
  // 第2章: 珊瑚礁の迷宮
  { id: '2-1', chapter: 2, name: '珊瑚の門', stepsRequired: 100000, bgColor: '#0369a1', depth: '15m', bgFile: 'area_2-1', desc: '巨大な珊瑚のアーチが出迎える' },
  { id: '2-2', chapter: 2, name: '色彩の回廊', stepsRequired: 140000, bgColor: '#075985', depth: '25m', bgFile: 'area_2-2', desc: '虹色の魚が群れをなして泳ぐ' },
  { id: '2-3', chapter: 2, name: '珊瑚の宮殿', stepsRequired: 190000, bgColor: '#0c4a6e', depth: '35m', bgFile: 'area_2-3', desc: '珊瑚礁の奥深く、神秘的な空間' },
  // 第3章: 外洋の試練
  { id: '3-1', chapter: 3, name: '大海原の入口', stepsRequired: 250000, bgColor: '#1e3a5f', depth: '50m', bgFile: 'area_3-1', desc: '珊瑚礁を抜け、果てしない海が広がる' },
  { id: '3-2', chapter: 3, name: '潮流の道', stepsRequired: 310000, bgColor: '#1e3050', depth: '80m', bgFile: 'area_3-2', desc: '強い潮流が渦巻く海域' },
  { id: '3-3', chapter: 3, name: '外洋の果て', stepsRequired: 370000, bgColor: '#172554', depth: '120m', bgFile: 'area_3-3', desc: '光が届きにくくなってきた' },
  // 第4章: 深海への招待
  { id: '4-1', chapter: 4, name: '薄暮の境界', stepsRequired: 420000, bgColor: '#0f172a', depth: '200m', bgFile: 'area_4-1', desc: '太陽の光が消え、別世界が始まる' },
  { id: '4-2', chapter: 4, name: '静寂の深淵', stepsRequired: 490000, bgColor: '#0a0f1a', depth: '500m', bgFile: 'area_4-2', desc: '音のない世界。かすかに光るものが...' },
  { id: '4-3', chapter: 4, name: '発光生物の園', stepsRequired: 550000, bgColor: '#050a14', depth: '800m', bgFile: 'area_4-3', desc: '闇の中に無数の光が瞬く' },
  // 第5章: 海溝の神殿
  { id: '5-1', chapter: 5, name: '海溝の入口', stepsRequired: 600000, bgColor: '#030712', depth: '2000m', bgFile: 'area_5-1', desc: '世界で最も深い場所への入口' },
  { id: '5-2', chapter: 5, name: '神殿の回廊', stepsRequired: 680000, bgColor: '#020510', depth: '5000m', bgFile: 'area_5-2', desc: '太古の遺跡のような地形が続く' },
  { id: '5-3', chapter: 5, name: '伝説の間', stepsRequired: 780000, bgColor: '#010308', depth: '10000m', bgFile: 'area_5-3', desc: '誰も辿り着いたことのない場所' },
];

const CHAPTER_NAMES = {
  1: 'はじまりの浅瀬',
  2: '珊瑚礁の迷宮',
  3: '外洋の試練',
  4: '深海への招待',
  5: '海溝の神殿',
};

// ---------- RPG魚種マスタ ----------
const RPG_FISH = [
  // 第1章の魚
  { id: 1,  name: 'メダカ',           area: '1-1', rarity: 'common',   hue: 45,  desc: '小さくて素朴。冒険の始まりを祝ってくれる', encounterRate: 0.7 },
  { id: 2,  name: 'ハゼ',             area: '1-1', rarity: 'common',   hue: 30,  desc: '砂地でじっとこちらを見ている', encounterRate: 0.6 },
  { id: 3,  name: 'グッピー',          area: '1-2', rarity: 'common',   hue: 280, desc: '大きな尾びれがカラフル', encounterRate: 0.6 },
  { id: 4,  name: 'ネオンテトラ',       area: '1-2', rarity: 'common',   hue: 200, desc: '青赤の蛍光ラインが美しい', encounterRate: 0.5 },
  { id: 5,  name: 'プラティ',          area: '1-3', rarity: 'common',   hue: 25,  desc: 'オレンジ色で元気に泳ぐ', encounterRate: 0.5 },
  { id: 6,  name: 'ゼブラダニオ',       area: '1-3', rarity: 'common',   hue: 210, desc: '縞模様の俊敏な魚', encounterRate: 0.4 },
  // 第2章の魚
  { id: 7,  name: 'カクレクマノミ',     area: '2-1', rarity: 'uncommon', hue: 25,  desc: 'イソギンチャクの影から顔を出す', encounterRate: 0.5 },
  { id: 8,  name: 'チョウチョウウオ',   area: '2-1', rarity: 'uncommon', hue: 50,  desc: '蝶のように優雅にひらひら', encounterRate: 0.4 },
  { id: 9,  name: 'ルリスズメダイ',     area: '2-2', rarity: 'uncommon', hue: 220, desc: '宝石のような青い輝き', encounterRate: 0.4 },
  { id: 10, name: 'ハタタテハゼ',       area: '2-2', rarity: 'uncommon', hue: 15,  desc: '旗のような背びれを立てて泳ぐ', encounterRate: 0.35 },
  { id: 11, name: 'マンダリンフィッシュ', area: '2-3', rarity: 'rare',    hue: 160, desc: '極彩色の模様を持つ宝石魚', encounterRate: 0.25 },
  { id: 12, name: 'ナンヨウハギ',       area: '2-3', rarity: 'uncommon', hue: 210, desc: '青と黄色の鮮やかなコントラスト', encounterRate: 0.35 },
  // 第3章の魚
  { id: 13, name: 'ウミガメ',          area: '3-1', rarity: 'rare',    hue: 120, desc: '悠然と泳ぐ太古の旅人', encounterRate: 0.25 },
  { id: 14, name: 'トビウオ',          area: '3-1', rarity: 'uncommon', hue: 200, desc: '海面すれすれを滑空する', encounterRate: 0.4 },
  { id: 15, name: 'エンゼルフィッシュ',  area: '3-2', rarity: 'rare',    hue: 0,   desc: '三角形で優雅な姿', encounterRate: 0.2 },
  { id: 16, name: 'カジキ',            area: '3-2', rarity: 'rare',    hue: 220, desc: '鋭い剣を持つスピードの王', encounterRate: 0.15 },
  { id: 17, name: 'マンタ',            area: '3-3', rarity: 'ultra',   hue: 220, desc: '巨大なヒレで優雅に空を飛ぶように', encounterRate: 0.1 },
  { id: 18, name: 'イルカ',            area: '3-3', rarity: 'rare',    hue: 200, desc: '知性溢れる瞳でこちらを見る', encounterRate: 0.2 },
  // 第4章の魚
  { id: 19, name: 'チョウチンアンコウ',  area: '4-1', rarity: 'rare',    hue: 30,  desc: '頭の光で闇を照らす', encounterRate: 0.2 },
  { id: 20, name: 'ハッチェットフィッシュ', area: '4-1', rarity: 'uncommon', hue: 200, desc: '鉈のような形の不思議な魚', encounterRate: 0.3 },
  { id: 21, name: 'リュウグウノツカイ',  area: '4-2', rarity: 'ultra',   hue: 210, desc: '超長い銀色の幻想的な姿', encounterRate: 0.08 },
  { id: 22, name: 'ダイオウイカ',       area: '4-2', rarity: 'ultra',   hue: 350, desc: '巨大な目がこちらを見据える', encounterRate: 0.08 },
  { id: 23, name: 'ホタルイカ',         area: '4-3', rarity: 'rare',    hue: 250, desc: '青く発光する小さな光の群れ', encounterRate: 0.2 },
  { id: 24, name: 'クラゲ',            area: '4-3', rarity: 'rare',    hue: 280, desc: '幻想的に光るゆらめく生命体', encounterRate: 0.2 },
  // 第5章の魚
  { id: 25, name: 'シーラカンス',       area: '5-1', rarity: 'ultra',   hue: 190, desc: '生きた化石。太古から変わらぬ姿', encounterRate: 0.08 },
  { id: 26, name: 'メンダコ',           area: '5-1', rarity: 'rare',    hue: 350, desc: '耳のようなヒレで泳ぐ深海のアイドル', encounterRate: 0.15 },
  { id: 27, name: 'フェニックスフィッシュ', area: '5-2', rarity: 'legend', hue: 15,  desc: '炎の赤金に輝く伝説の魚', encounterRate: 0.04 },
  { id: 28, name: '金龍',              area: '5-2', rarity: 'legend',  hue: 50,  desc: '黄金に輝く龍の風格', encounterRate: 0.04 },
  { id: 29, name: '海神の使い',         area: '5-3', rarity: 'legend',  hue: 180, desc: '海の全てを知る神秘の存在', encounterRate: 0.03 },
  { id: 30, name: '虹のクジラ',         area: '5-3', rarity: 'legend',  hue: 300, desc: '虹色に輝く世界最大の生命体', encounterRate: 0.03 },
  // === 拡張 第1章 ===
  { id: 31, name: 'アユ',              area: '1-1', rarity: 'common',   hue: 100, desc: '清流を駆ける香魚', encounterRate: 0.65 },
  { id: 32, name: 'ドジョウ',           area: '1-1', rarity: 'common',   hue: 30,  desc: '砂底をぬるりと這う', encounterRate: 0.6 },
  { id: 33, name: 'モツゴ',             area: '1-2', rarity: 'common',   hue: 50,  desc: 'クチボソとも呼ばれる小魚', encounterRate: 0.55 },
  { id: 34, name: 'タナゴ',             area: '1-2', rarity: 'common',   hue: 320, desc: '虹色の光沢を持つ淡水の宝石', encounterRate: 0.5 },
  { id: 35, name: 'メバル',             area: '1-3', rarity: 'common',   hue: 0,   desc: '岩陰でじっと潮を待つ', encounterRate: 0.5 },
  { id: 36, name: 'カサゴ',             area: '1-3', rarity: 'common',   hue: 15,  desc: 'ゴツゴツした岩のような魚', encounterRate: 0.45 },
  // === 拡張 第2章 ===
  { id: 37, name: 'ベラ',               area: '2-1', rarity: 'uncommon', hue: 140, desc: '七色に輝くサンゴ礁の住人', encounterRate: 0.45 },
  { id: 38, name: 'キンチャクダイ',      area: '2-1', rarity: 'uncommon', hue: 50,  desc: '黄と紺の貴族的な装い', encounterRate: 0.4 },
  { id: 39, name: 'ハナダイ',           area: '2-2', rarity: 'uncommon', hue: 330, desc: '桃色に煌めく群れ', encounterRate: 0.4 },
  { id: 40, name: 'ニシキベラ',         area: '2-2', rarity: 'uncommon', hue: 200, desc: '錦の名にふさわしい鮮やかさ', encounterRate: 0.38 },
  { id: 41, name: 'タツノオトシゴ',      area: '2-3', rarity: 'rare',    hue: 30,  desc: '海の妖精、海藻に巻きつく', encounterRate: 0.22 },
  { id: 42, name: 'ピグミーシーホース', area: '2-3', rarity: 'rare',    hue: 350, desc: '指先サイズの極小妖精', encounterRate: 0.18 },
  // === 拡張 第3章 ===
  { id: 43, name: 'マグロ',             area: '3-1', rarity: 'uncommon', hue: 220, desc: '海原を疾走する流線形', encounterRate: 0.4 },
  { id: 44, name: 'カツオ',             area: '3-1', rarity: 'uncommon', hue: 200, desc: '黒潮に乗って群れで現れる', encounterRate: 0.4 },
  { id: 45, name: 'シイラ',             area: '3-2', rarity: 'rare',    hue: 60,  desc: '虹色に輝くマヒマヒ', encounterRate: 0.22 },
  { id: 46, name: 'バショウカジキ',     area: '3-2', rarity: 'rare',    hue: 230, desc: '帆のような背びれを広げて疾走', encounterRate: 0.15 },
  { id: 47, name: 'ジンベエザメ',       area: '3-3', rarity: 'ultra',   hue: 200, desc: '水玉模様の海の巨人', encounterRate: 0.08 },
  { id: 48, name: 'シャチ',             area: '3-3', rarity: 'ultra',   hue: 0,   desc: '海の頂点に立つ知性', encounterRate: 0.07 },
  // === 拡張 第4章 ===
  { id: 49, name: 'ミドリフサアンコウ',  area: '4-1', rarity: 'rare',    hue: 130, desc: '緑色の房を揺らす深海の住人', encounterRate: 0.18 },
  { id: 50, name: 'ヨロイザメ',         area: '4-1', rarity: 'rare',    hue: 240, desc: '硬い鱗の鎧を纏う', encounterRate: 0.18 },
  { id: 51, name: 'メガマウス',         area: '4-2', rarity: 'ultra',   hue: 250, desc: '巨大な口を持つ謎多きサメ', encounterRate: 0.07 },
  { id: 52, name: 'デメニギス',         area: '4-2', rarity: 'ultra',   hue: 180, desc: '透明な頭の中に光る目', encounterRate: 0.06 },
  { id: 53, name: 'ラブカ',             area: '4-3', rarity: 'rare',    hue: 320, desc: '生きた化石、古代鮫の系譜', encounterRate: 0.15 },
  { id: 54, name: 'ヌタウナギ',         area: '4-3', rarity: 'rare',    hue: 350, desc: '粘液で身を守る原始の魚', encounterRate: 0.18 },
  // === 拡張 第5章 ===
  { id: 55, name: '生命の源',           area: '5-1', rarity: 'ultra',   hue: 150, desc: '海底熱水から生まれし古の存在', encounterRate: 0.06 },
  { id: 56, name: '深淵の蝶',           area: '5-1', rarity: 'ultra',   hue: 280, desc: '蝶のように舞う発光生命体', encounterRate: 0.06 },
  { id: 57, name: '時を渡る者',         area: '5-2', rarity: 'legend',  hue: 200, desc: '永遠を泳ぐと言われる伝承の魚', encounterRate: 0.03 },
  { id: 58, name: '月の魚',             area: '5-2', rarity: 'legend',  hue: 240, desc: '月光に同期して輝きを変える', encounterRate: 0.03 },
  { id: 59, name: '創世の鱗',           area: '5-3', rarity: 'legend',  hue: 50,  desc: '海の始まりを記憶する巨魚', encounterRate: 0.025 },
  { id: 60, name: '宇宙鯨',             area: '5-3', rarity: 'legend',  hue: 270, desc: '星々を背に泳ぐ宇宙のクジラ', encounterRate: 0.02 },
  // === 拡張第3弾 第1章浅瀬 ===
  { id: 61, name: 'ヒトデ',             area: '1-1', rarity: 'common',   hue: 30,  desc: '砂底でゆっくり広がる星形', encounterRate: 0.55 },
  { id: 62, name: 'ヤドカリ',           area: '1-2', rarity: 'common',   hue: 25,  desc: '貝殻を背負ってトコトコ歩く', encounterRate: 0.5 },
  { id: 63, name: 'ウニ',               area: '1-3', rarity: 'common',   hue: 280, desc: '黒紫の棘がびっしり、岩陰の住人', encounterRate: 0.45 },
  // === 拡張第3弾 第2章珊瑚礁 ===
  { id: 64, name: 'アオウミウシ',       area: '2-1', rarity: 'uncommon', hue: 220, desc: '青と黄のコントラストが眩しい海の宝石', encounterRate: 0.4 },
  { id: 65, name: 'オウギチョウチョウウオ', area: '2-2', rarity: 'uncommon', hue: 50, desc: '扇形のヒレが優雅', encounterRate: 0.4 },
  { id: 66, name: 'モンガラカワハギ',   area: '2-3', rarity: 'rare',    hue: 200, desc: '幾何学模様を纏う気難しい魚', encounterRate: 0.22 },
  { id: 67, name: 'ブダイ',             area: '2-3', rarity: 'rare',    hue: 180, desc: '珊瑚をかじる青緑のおじさん顔', encounterRate: 0.22 },
  // === 拡張第3弾 第3章外洋 ===
  { id: 68, name: 'アオウミガメ',       area: '3-1', rarity: 'rare',    hue: 130, desc: '遥かな海を旅する穏やかな旅人', encounterRate: 0.2 },
  { id: 69, name: 'タイマイ',           area: '3-2', rarity: 'rare',    hue: 30,  desc: '鼈甲色の甲羅、サンゴ礁の旅人', encounterRate: 0.2 },
  { id: 70, name: 'バンドウイルカ',     area: '3-2', rarity: 'rare',    hue: 200, desc: '群れで遊ぶように泳ぐ知性派', encounterRate: 0.2 },
  { id: 71, name: 'ザトウクジラ',       area: '3-3', rarity: 'ultra',   hue: 220, desc: '海面に飛び上がる巨人、歌うように泳ぐ', encounterRate: 0.06 },
  { id: 72, name: 'マッコウクジラ',     area: '3-3', rarity: 'ultra',   hue: 240, desc: '深海まで潜るクジラの王', encounterRate: 0.06 },
  // === 拡張第3弾 第4章深海(クラゲ祭り) ===
  { id: 73, name: 'ミズクラゲ',         area: '4-1', rarity: 'common',   hue: 200, desc: '透き通る水のような月輪', encounterRate: 0.5 },
  { id: 74, name: 'アカクラゲ',         area: '4-1', rarity: 'uncommon', hue: 0,   desc: '赤い縞模様の優雅な舞', encounterRate: 0.35 },
  { id: 75, name: 'タコクラゲ',         area: '4-2', rarity: 'rare',    hue: 250, desc: '丸い傘とチョコっとした触手', encounterRate: 0.2 },
  { id: 76, name: 'アンドンクラゲ',     area: '4-2', rarity: 'rare',    hue: 270, desc: '四角い箱型のクラゲ', encounterRate: 0.2 },
  { id: 77, name: 'ミミックダコ',       area: '4-3', rarity: 'rare',    hue: 30,  desc: '何にでも化ける深海のトリックスター', encounterRate: 0.18 },
  // === 拡張第3弾 第5章海淵伝説 ===
  { id: 78, name: 'リュウグウオウ',     area: '5-1', rarity: 'legend',  hue: 50,  desc: '海の都の主、龍宮の王', encounterRate: 0.025 },
  { id: 79, name: '神話のクジラ',       area: '5-2', rarity: 'legend',  hue: 280, desc: '神話の海を漂うとされる伝承の鯨', encounterRate: 0.02 },
  // 昭和のおやじは主人公(hero_type_21)として移動済み
];

// ---------- 語り部（ナレーター）メッセージ ----------
const NARRATOR_MSGS = {
  newArea: [
    '新しい海域に入った。水の色が変わってきたぞ。',
    'お、景色が変わった。ここは「{area}」だ。',
    '...見ろ、「{area}」に辿り着いた。',
  ],
  newChapter: [
    '第{ch}章「{name}」の幕開けだ。',
    'ここから先は未知の海域...第{ch}章「{name}」に突入だ。',
  ],
  fishEncounter: [
    'お！{fish}が現れた！図鑑に記録しておこう。',
    '見ろ、{fish}だ。初めて見る種類だな。',
    '{fish}と目が合った。...仲間になったみたいだ。',
  ],
  stepsLow: [
    '今日はのんびりペースだな。',
    'ゆっくり進むのも悪くない。',
  ],
  stepsMedium: [
    'いい調子だ。海が少し進んだぞ。',
    '着実に進んでる。この調子。',
  ],
  stepsHigh: [
    'すごいペースだ！一気に沖まで出たな。',
    '快調！魚たちも驚いてるぞ。',
  ],
  stepsVeryHigh: [
    '圧巻だ...こんなに進んだのか。',
    'とんでもないペースだ！伝説の場所に近づいてるかも。',
  ],
  dailyGreeting: [
    'やあ、今日も海に出るのか。',
    'おかえり。海は相変わらずきれいだ。',
    '今日は何が見つかるかな。',
    'お、来たな。魚たちが待ってたよ。',
  ],
  rivalNearby: [
    '{name}の群れが近くにいるぞ。',
    'おっと、{name}がすぐ後ろまで来てるな。',
  ],
  rivalPassed: [
    '{name}を追い抜いた！',
  ],
};

function pickMsg(category, replacements) {
  const msgs = NARRATOR_MSGS[category];
  if (!msgs || msgs.length === 0) return '';
  let msg = msgs[Math.floor(Math.random() * msgs.length)];
  if (replacements) {
    Object.keys(replacements).forEach(k => {
      msg = msg.replace('{' + k + '}', replacements[k]);
    });
  }
  return msg;
}

// ---------- DB初期化 ----------
function initRpgTables() {
  const db = getDb();

  // 冒険進捗
  db.exec(`CREATE TABLE IF NOT EXISTS adventure_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    total_steps INTEGER DEFAULT 0,
    current_area TEXT DEFAULT '1-1',
    current_chapter INTEGER DEFAULT 1,
    fish_name TEXT DEFAULT '',
    avatar_hue INTEGER DEFAULT 200,
    hero_variant INTEGER DEFAULT 1,
    started_at TEXT DEFAULT (datetime('now')),
    last_step_date TEXT DEFAULT '',
    consecutive_days INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
  // 既存テーブルへの列追加（エラー無視）
  try { db.exec("ALTER TABLE adventure_progress ADD COLUMN hero_variant INTEGER DEFAULT 1"); } catch(e) {}

  // 魚発見ログ（RPG版）
  db.exec(`CREATE TABLE IF NOT EXISTS rpg_fish_discovery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    fish_id INTEGER NOT NULL,
    area_id TEXT NOT NULL,
    discovered_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, fish_id)
  )`);

  // 歩数ログ（既存を維持）
  db.exec(`CREATE TABLE IF NOT EXISTS step_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    step_date TEXT NOT NULL,
    steps INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, step_date)
  )`);

  // 語り部メッセージログ
  db.exec(`CREATE TABLE IF NOT EXISTS narrator_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    msg_type TEXT DEFAULT 'narrate',
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // ユーザー選択回答ログ（RPG問いかけ）
  db.exec(`CREATE TABLE IF NOT EXISTS user_choices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    choice_id TEXT NOT NULL,
    choice_tag TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.exec("CREATE INDEX IF NOT EXISTS idx_user_choices_user ON user_choices(user_id, created_at DESC)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_user_choices_q ON user_choices(question_id)");

  // ボトルメッセージ（章全体ブロードキャスト、匿名）
  db.exec(`CREATE TABLE IF NOT EXISTS bottles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_uid TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    message TEXT NOT NULL,
    tag TEXT DEFAULT '',
    flagged INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.exec("CREATE INDEX IF NOT EXISTS idx_bottles_chapter ON bottles(chapter, created_at DESC)");

  db.exec(`CREATE TABLE IF NOT EXISTS bottle_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bottle_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    reaction TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(bottle_id, user_id, reaction)
  )`);

  // スタンプ（指名・定型）
  db.exec(`CREATE TABLE IF NOT EXISTS stamps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_uid TEXT NOT NULL,
    to_uid TEXT NOT NULL,
    stamp_type TEXT NOT NULL,
    seen INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.exec("CREATE INDEX IF NOT EXISTS idx_stamps_to ON stamps(to_uid, seen, created_at DESC)");

  // 旧テーブルがあればデータ移行
  try {
    const hasOldTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_aquarium'").get();
    if (hasOldTable) {
      // 旧step_logデータがあればadventure_progressに集計
      const oldUsers = db.prepare("SELECT DISTINCT user_id FROM step_log").all();
      for (const u of oldUsers) {
        const exists = db.prepare("SELECT 1 FROM adventure_progress WHERE user_id = ?").get(u.user_id);
        if (!exists) {
          const totalSteps = db.prepare("SELECT COALESCE(SUM(steps), 0) as total FROM step_log WHERE user_id = ?").get(u.user_id);
          const oldAq = db.prepare("SELECT fish_name FROM user_aquarium WHERE user_id = ?").get(u.user_id);
          const fishName = oldAq ? oldAq.fish_name : '';
          const area = determineArea(totalSteps.total);
          db.prepare("INSERT OR IGNORE INTO adventure_progress (user_id, total_steps, current_area, current_chapter, fish_name) VALUES (?,?,?,?,?)")
            .run(u.user_id, totalSteps.total, area.id, area.chapter, fishName);
        }
      }
    }
  } catch (e) { /* migration skip */ }
}

function determineArea(totalSteps) {
  let currentArea = RPG_AREAS[0];
  for (const area of RPG_AREAS) {
    if (totalSteps >= area.stepsRequired) {
      currentArea = area;
    }
  }
  return currentArea;
}

function today() { return new Date().toISOString().split('T')[0]; }

initRpgTables();

// ---------- API: 冒険データ取得 ----------
router.get('/', authUser, (req, res) => {
  const db = getDb();
  let progress = db.prepare('SELECT * FROM adventure_progress WHERE user_id = ?').get(req.uid);

  if (!progress) {
    // 初回: 冒険開始
    db.prepare(`INSERT INTO adventure_progress (user_id, current_area, current_chapter) VALUES (?, '1-1', 1)`)
      .run(req.uid);
    progress = db.prepare('SELECT * FROM adventure_progress WHERE user_id = ?').get(req.uid);
  }

  const currentArea = RPG_AREAS.find(a => a.id === progress.current_area) || RPG_AREAS[0];
  const nextArea = RPG_AREAS.find(a => a.stepsRequired > progress.total_steps);

  // 発見済み魚
  const discovered = db.prepare('SELECT fish_id, area_id, discovered_at FROM rpg_fish_discovery WHERE user_id = ? ORDER BY discovered_at').all(req.uid);

  // 現在エリアの魚（泳いでいる魚）
  const areaFish = RPG_FISH.filter(f => f.area === progress.current_area);
  // + 発見済みの魚も現在のエリアで泳ぐ（最大5匹）
  const discoveredInArea = discovered
    .filter(d => d.area_id === progress.current_area)
    .map(d => RPG_FISH.find(f => f.id === d.fish_id))
    .filter(Boolean);

  // 今日の語り部メッセージ
  const todayNarrations = db.prepare("SELECT message, msg_type, created_at FROM narrator_log WHERE user_id = ? AND created_at > datetime('now', '-1 day') ORDER BY created_at DESC LIMIT 10")
    .all(req.uid);

  // 直近の歩数
  const recentSteps = db.prepare('SELECT step_date, steps FROM step_log WHERE user_id = ? ORDER BY step_date DESC LIMIT 7').all(req.uid);
  const todayStepsRow = db.prepare('SELECT steps FROM step_log WHERE user_id = ? AND step_date = ?').get(req.uid, today());
  const weekTotal = db.prepare("SELECT COALESCE(SUM(steps), 0) as total FROM step_log WHERE user_id = ? AND step_date >= date('now','-7 days')").get(req.uid);

  res.json({
    success: true,
    progress: {
      total_steps: progress.total_steps,
      current_area: progress.current_area,
      current_chapter: progress.current_chapter,
      fish_name: progress.fish_name,
      avatar_hue: progress.avatar_hue,
      hero_variant: progress.hero_variant || 1,
      consecutive_days: progress.consecutive_days,
      started_at: progress.started_at,
    },
    area: currentArea,
    chapter_name: CHAPTER_NAMES[currentArea.chapter],
    next_area: nextArea ? { id: nextArea.id, name: nextArea.name, stepsRequired: nextArea.stepsRequired, remaining: nextArea.stepsRequired - progress.total_steps } : null,
    area_fish: areaFish.map(f => ({ id: f.id, name: f.name, rarity: f.rarity, hue: f.hue, desc: f.desc, discovered: discovered.some(d => d.fish_id === f.id) })),
    discovered: discovered.map(d => d.fish_id),
    discovered_count: discovered.length,
    total_fish: RPG_FISH.length,
    narrations: todayNarrations,
    steps: {
      today: todayStepsRow ? todayStepsRow.steps : null,
      week_total: weekTotal.total,
      recent: recentSteps,
    },
    all_areas: RPG_AREAS.map(a => ({
      ...a,
      unlocked: progress.total_steps >= a.stepsRequired,
      fish_count: RPG_FISH.filter(f => f.area === a.id).length,
      discovered_count: discovered.filter(d => d.area_id === a.id).length,
    })),
  });
});

// ---------- API: 主人公の名前をつける ----------
router.post('/name-fish', authUser, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: '名前を入力してください' });
  const db = getDb();
  db.prepare('UPDATE adventure_progress SET fish_name = ?, updated_at = datetime(\'now\') WHERE user_id = ?')
    .run(name.trim(), req.uid);
  res.json({ success: true });
});

// ---------- API: 主人公の色を変える ----------
router.post('/avatar-color', authUser, (req, res) => {
  const { hue } = req.body;
  const db = getDb();
  db.prepare('UPDATE adventure_progress SET avatar_hue = ?, updated_at = datetime(\'now\') WHERE user_id = ?')
    .run(parseInt(hue) || 200, req.uid);
  res.json({ success: true });
});

// ---------- API: 主人公のパターンを変える ----------
router.post('/hero-variant', authUser, (req, res) => {
  const { variant } = req.body;
  const v = parseInt(variant);
  if (!v || v < 1 || v > 26) return res.status(400).json({ error: 'variantは1〜26' });
  const db = getDb();
  // 行がなければ作る
  const exists = db.prepare('SELECT 1 FROM adventure_progress WHERE user_id = ?').get(req.uid);
  if (!exists) {
    db.prepare("INSERT INTO adventure_progress (user_id, hero_variant) VALUES (?, ?)").run(req.uid, v);
  } else {
    db.prepare('UPDATE adventure_progress SET hero_variant = ?, updated_at = datetime(\'now\') WHERE user_id = ?').run(v, req.uid);
  }
  res.json({ success: true, variant: v });
});

// ---------- 歩数OCR ----------
router.post('/steps-ocr', authUser, async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64 || !mimeType) return res.json({ success: false, msg: '画像データが必要です' });

    const systemPrompt = `あなたは歩数を読み取る専門AIです。以下のいずれかから「今日の歩数」を正確に読み取ってください:

【対応する入力】
1. 万歩計・歩数計（ハード機器の液晶表示）
2. スマートウォッチ（Apple Watch / Garmin等）の歩数画面
3. スマホのヘルスケアアプリ画面/スクリーンショット:
   - iOS「ヘルスケア」アプリ（歩数カード、グラフ下の数値）
   - Google Fit / Android標準
   - Samsung Health
   - Fitbit アプリ
   - Huawei Health 等
4. 手書きメモ

【出力ルール】
- 必ず以下のJSON形式のみを出力してください。前後に説明文を付けないこと。
- 読み取れない場合はnullにしてください。
- steps=歩数（整数）

{"steps": 数値またはnull, "confidence": "high"または"medium"または"low", "note": "補足"}

【読取りルール】
- 画面に「今日」「Today」「本日」のラベルがあればその数値を優先
- 複数の数値があれば一番大きい「step」「歩数」のラベル付きを選ぶ
- 週合計・月合計ではなく「1日あたりの歩数」を読む
- カンマ区切り(例: 8,500)は数値として読み取る
- 数値が部分的にしか見えない場合もできるだけ推定
- 歩数を示す画像でない場合: {"steps": null, "confidence": "low", "note": "歩数が読み取れる画像ではありません"}`;

    const result = await callGeminiVision(systemPrompt, imageBase64, mimeType);
    let parsed = null;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {}

    if (parsed && parsed.steps !== null) {
      res.json({ success: true, data: parsed });
    } else {
      res.json({ success: false, msg: '数値を読み取れませんでした。手入力してください。', data: parsed });
    }
  } catch (e) {
    console.error('Steps OCR error:', e.message);
    res.json({ success: false, msg: 'エラー: ' + e.message });
  }
});

// ---------- 歩数記録 + 冒険進行 ----------
router.post('/steps', authUser, (req, res) => {
  const db = getDb();
  const { steps } = req.body;
  const stepCount = parseInt(steps) || 0;
  if (stepCount < 0 || stepCount > 200000) return res.status(400).json({ error: '歩数が不正です' });

  const stepDate = today();

  // 既存の今日の歩数を取得
  const existingSteps = db.prepare('SELECT steps FROM step_log WHERE user_id = ? AND step_date = ?').get(req.uid, stepDate);
  const previousTodaySteps = existingSteps ? existingSteps.steps : 0;
  const addedSteps = Math.max(0, stepCount - previousTodaySteps);

  // 歩数ログ保存
  db.prepare(`INSERT INTO step_log (user_id, step_date, steps) VALUES (?,?,?)
    ON CONFLICT(user_id, step_date) DO UPDATE SET steps=?, created_at=datetime('now')`)
    .run(req.uid, stepDate, stepCount, stepCount);

  // 冒険進捗を取得/作成
  let progress = db.prepare('SELECT * FROM adventure_progress WHERE user_id = ?').get(req.uid);
  if (!progress) {
    db.prepare("INSERT INTO adventure_progress (user_id) VALUES (?)").run(req.uid);
    progress = db.prepare('SELECT * FROM adventure_progress WHERE user_id = ?').get(req.uid);
  }

  const oldArea = progress.current_area;
  const oldChapter = progress.current_chapter;
  const newTotalSteps = progress.total_steps + addedSteps;

  // 連続日数
  let consecutive = progress.consecutive_days || 0;
  if (progress.last_step_date !== stepDate) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    consecutive = (progress.last_step_date === yesterday) ? consecutive + 1 : 1;
  }

  // 新しいエリア判定
  const newAreaObj = determineArea(newTotalSteps);
  const areaChanged = newAreaObj.id !== oldArea;
  const chapterChanged = newAreaObj.chapter !== oldChapter;

  // 進捗更新
  db.prepare(`UPDATE adventure_progress SET
    total_steps = ?, current_area = ?, current_chapter = ?,
    last_step_date = ?, consecutive_days = ?,
    updated_at = datetime('now')
    WHERE user_id = ?`)
    .run(newTotalSteps, newAreaObj.id, newAreaObj.chapter, stepDate, consecutive, req.uid);

  // 1万歩=1マイル 加算（lifetime累計のミリストーン到達数で重複防止）
  let milesAwarded = 0;
  try {
    const oldMilestones = Math.floor((progress.total_steps || 0) / 10000);
    const newMilestones = Math.floor(newTotalSteps / 10000);
    for (let m = oldMilestones + 1; m <= newMilestones; m++) {
      const r = awardMarigan(req.uid, 'daily_walk_miles', 'mile_' + m);
      if (r && r.success) milesAwarded += (r.points || 1);
    }
  } catch (e) { /* マイル付与失敗は冒険進行を止めない */ }

  // 語り部メッセージ生成
  const narrations = [];

  // 歩数に応じたメッセージ
  if (stepCount >= 10000) {
    narrations.push({ msg: pickMsg('stepsVeryHigh'), type: 'steps' });
  } else if (stepCount >= 7000) {
    narrations.push({ msg: pickMsg('stepsHigh'), type: 'steps' });
  } else if (stepCount >= 4000) {
    narrations.push({ msg: pickMsg('stepsMedium'), type: 'steps' });
  } else {
    narrations.push({ msg: pickMsg('stepsLow'), type: 'steps' });
  }

  // エリア変更メッセージ
  if (chapterChanged) {
    narrations.push({ msg: pickMsg('newChapter', { ch: newAreaObj.chapter, name: CHAPTER_NAMES[newAreaObj.chapter] }), type: 'chapter' });
  }
  if (areaChanged) {
    narrations.push({ msg: pickMsg('newArea', { area: newAreaObj.name }), type: 'area' });
  }

  // 魚との遭遇判定（歩数を記録したタイミングで判定）
  const encounters = [];
  if (addedSteps > 0) {
    const currentAreaFish = RPG_FISH.filter(f => f.area === newAreaObj.id);
    for (const fish of currentAreaFish) {
      // 既に発見済みかチェック
      const already = db.prepare('SELECT 1 FROM rpg_fish_discovery WHERE user_id = ? AND fish_id = ?').get(req.uid, fish.id);
      if (already) continue;

      // 遭遇確率（歩数が多いほどボーナス）
      let chance = fish.encounterRate;
      if (stepCount >= 10000) chance *= 1.5;
      else if (stepCount >= 7000) chance *= 1.3;
      else if (stepCount >= 5000) chance *= 1.1;

      if (Math.random() < chance) {
        db.prepare('INSERT OR IGNORE INTO rpg_fish_discovery (user_id, fish_id, area_id) VALUES (?, ?, ?)')
          .run(req.uid, fish.id, newAreaObj.id);
        encounters.push(fish);
        narrations.push({ msg: pickMsg('fishEncounter', { fish: fish.name }), type: 'encounter' });
      }
    }

    // 前のエリアの未発見の魚にもチャンスを与える（低確率）
    const prevAreas = RPG_AREAS.filter(a => a.stepsRequired < newAreaObj.stepsRequired);
    for (const pa of prevAreas) {
      const prevFish = RPG_FISH.filter(f => f.area === pa.id);
      for (const fish of prevFish) {
        const already = db.prepare('SELECT 1 FROM rpg_fish_discovery WHERE user_id = ? AND fish_id = ?').get(req.uid, fish.id);
        if (already) continue;
        if (Math.random() < fish.encounterRate * 0.3) {
          db.prepare('INSERT OR IGNORE INTO rpg_fish_discovery (user_id, fish_id, area_id) VALUES (?, ?, ?)')
            .run(req.uid, fish.id, pa.id);
          encounters.push(fish);
          narrations.push({ msg: pickMsg('fishEncounter', { fish: fish.name }), type: 'encounter' });
        }
      }
    }
  }

  // 語り部ログ保存
  const stmtNarrate = db.prepare('INSERT INTO narrator_log (user_id, message, msg_type) VALUES (?, ?, ?)');
  for (const n of narrations) {
    stmtNarrate.run(req.uid, n.msg, n.type);
  }

  // 次のエリアまでの残り
  const nextArea = RPG_AREAS.find(a => a.stepsRequired > newTotalSteps);

  res.json({
    success: true,
    steps: stepCount,
    added_steps: addedSteps,
    total_steps: newTotalSteps,
    area: newAreaObj,
    area_changed: areaChanged,
    chapter_changed: chapterChanged,
    chapter_name: CHAPTER_NAMES[newAreaObj.chapter],
    next_area: nextArea ? { id: nextArea.id, name: nextArea.name, remaining: nextArea.stepsRequired - newTotalSteps } : null,
    encounters: encounters.map(f => ({ id: f.id, name: f.name, rarity: f.rarity, hue: f.hue, desc: f.desc })),
    narrations: narrations,
    consecutive_days: consecutive,
    miles_awarded: milesAwarded,
  });
});

// ---------- 歩数取得 ----------
router.get('/steps', authUser, (req, res) => {
  const db = getDb();
  const recent = db.prepare('SELECT step_date, steps FROM step_log WHERE user_id = ? ORDER BY step_date DESC LIMIT 30').all(req.uid);
  const todaySteps = db.prepare('SELECT steps FROM step_log WHERE user_id = ? AND step_date = ?').get(req.uid, today());
  const weekTotal = db.prepare("SELECT COALESCE(SUM(steps), 0) as total FROM step_log WHERE user_id = ? AND step_date >= date('now','-7 days')").get(req.uid);
  res.json({
    success: true,
    today: todaySteps ? todaySteps.steps : null,
    week_total: weekTotal.total,
    recent,
  });
});

// ---------- RPG問いかけの選択回答を記録 ----------
router.post('/choice', authUser, (req, res) => {
  const { question_id, choice_id, choice_tag } = req.body;
  if (!question_id || !choice_id) return res.status(400).json({ error: '質問IDと選択IDが必要' });
  const db = getDb();
  db.prepare('INSERT INTO user_choices (user_id, question_id, choice_id, choice_tag) VALUES (?, ?, ?, ?)')
    .run(req.uid, question_id, choice_id, choice_tag || '');
  res.json({ success: true });
});

// ---------- 選択回答の集計（管理者用） ----------
router.get('/choices/stats', authUser, (req, res) => {
  const db = getDb();
  const days = parseInt(req.query.days) || 7;
  const byQuestion = db.prepare(`SELECT question_id, choice_id, choice_tag, COUNT(*) as cnt, COUNT(DISTINCT user_id) as users
    FROM user_choices WHERE created_at > datetime('now', '-' || ? || ' days')
    GROUP BY question_id, choice_id ORDER BY question_id, cnt DESC`).all(days);
  res.json({ success: true, stats: byQuestion });
});

// ---------- ボトルメッセージ送信 ----------
router.post('/bottle', authUser, (req, res) => {
  const { message, tag } = req.body;
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'メッセージが必要' });
  const trimmed = message.trim().slice(0, 50);
  if (!trimmed) return res.status(400).json({ error: 'メッセージが必要' });
  const db = getDb();
  // 1日3本までチェック
  const todayCount = db.prepare("SELECT COUNT(*) as c FROM bottles WHERE sender_uid = ? AND created_at > datetime('now','-1 day')").get(req.uid);
  if (todayCount.c >= 3) return res.json({ success: false, msg: '今日はもう3本流したよ。また明日' });
  // 禁止語フィルタ(簡易)
  const banned = ['死ね', '殺', 'バカ', 'アホ', 'ブス', 'キモ'];
  let flagged = 0;
  for (const w of banned) if (trimmed.indexOf(w) !== -1) flagged = 1;
  // 現在の章
  const prog = db.prepare('SELECT current_chapter FROM adventure_progress WHERE user_id = ?').get(req.uid);
  const chapter = prog ? prog.current_chapter : 1;
  const result = db.prepare('INSERT INTO bottles (sender_uid, chapter, message, tag, flagged) VALUES (?,?,?,?,?)').run(req.uid, chapter, trimmed, tag || '', flagged);
  res.json({ success: true, bottle_id: result.lastInsertRowid, flagged });
});

// ---------- ボトル一覧（同じ章） ----------
router.get('/bottles', authUser, (req, res) => {
  const db = getDb();
  const prog = db.prepare('SELECT current_chapter FROM adventure_progress WHERE user_id = ?').get(req.uid);
  if (!prog) return res.json({ success: true, bottles: [] });
  const chapter = prog.current_chapter;
  // 直近14日のボトル
  const bottles = db.prepare(`SELECT b.id, b.sender_uid, b.message, b.tag, b.created_at
    FROM bottles b
    WHERE b.chapter = ? AND b.flagged = 0 AND b.created_at > datetime('now','-14 days')
    ORDER BY b.created_at DESC LIMIT 50`).all(chapter);
  // 各ボトルのリアクション集計
  const result = bottles.map(b => {
    const reactions = db.prepare("SELECT reaction, COUNT(*) as c FROM bottle_reactions WHERE bottle_id = ? GROUP BY reaction").all(b.id);
    const myReactions = db.prepare("SELECT reaction FROM bottle_reactions WHERE bottle_id = ? AND user_id = ?").all(b.id, req.uid).map(r => r.reaction);
    const reactionMap = {};
    reactions.forEach(r => { reactionMap[r.reaction] = r.c; });
    return {
      id: b.id,
      message: b.message,
      tag: b.tag,
      created_at: b.created_at,
      is_mine: b.sender_uid === req.uid,
      reactions: reactionMap,
      my_reactions: myReactions,
    };
  });
  res.json({ success: true, chapter, bottles: result });
});

// ---------- ボトルにリアクション ----------
router.post('/bottle-react', authUser, (req, res) => {
  const { bottle_id, reaction, remove } = req.body;
  if (!bottle_id || !reaction) return res.status(400).json({ error: 'パラメータ不足' });
  const db = getDb();
  if (remove) {
    db.prepare('DELETE FROM bottle_reactions WHERE bottle_id = ? AND user_id = ? AND reaction = ?').run(bottle_id, req.uid, reaction);
  } else {
    try {
      db.prepare('INSERT INTO bottle_reactions (bottle_id, user_id, reaction) VALUES (?, ?, ?)').run(bottle_id, req.uid, reaction);
    } catch (e) { /* UNIQUE violation = already reacted, ignore */ }
  }
  res.json({ success: true });
});

// ---------- スタンプ送信（指名） ----------
router.post('/stamp', authUser, (req, res) => {
  const { to_uid, stamp_type } = req.body;
  if (!to_uid || !stamp_type) return res.status(400).json({ error: 'パラメータ不足' });
  if (to_uid === req.uid) return res.status(400).json({ error: '自分には送れない' });
  const allowed = ['cheer', 'like', 'thanks', 'see-you'];
  if (allowed.indexOf(stamp_type) === -1) return res.status(400).json({ error: '不正なスタンプ' });
  const db = getDb();
  const today = db.prepare("SELECT COUNT(*) as c FROM stamps WHERE from_uid = ? AND to_uid = ? AND stamp_type = ? AND created_at > datetime('now','-1 day')").get(req.uid, to_uid, stamp_type);
  if (today.c >= 1) return res.json({ success: false, msg: '今日は同じスタンプをこの人に送ったよ' });
  db.prepare('INSERT INTO stamps (from_uid, to_uid, stamp_type) VALUES (?, ?, ?)').run(req.uid, to_uid, stamp_type);
  // Push通知
  try {
    const push = require('../services/push');
    const labels = { cheer: '🎉 がんばって', like: '👍 いいね', thanks: '🙏 ありがとう', 'see-you': '🌊 また海で' };
    const sender = db.prepare('SELECT nickname FROM users WHERE id = ?').get(req.uid);
    push.sendToUser(to_uid, {
      title: '🌊 スタンプが届いた',
      body: (sender ? sender.nickname : '誰か') + 'から「' + (labels[stamp_type] || 'スタンプ') + '」',
      tag: 'stamp',
      url: '/',
    }, 'stamp').catch(() => {});
  } catch(e) {}
  res.json({ success: true });
});

// ---------- 受信スタンプ取得 ----------
router.get('/stamps-received', authUser, (req, res) => {
  const db = getDb();
  const stamps = db.prepare(`SELECT s.id, s.stamp_type, s.seen, s.created_at, u.nickname as from_nickname
    FROM stamps s LEFT JOIN users u ON s.from_uid = u.id
    WHERE s.to_uid = ? AND s.created_at > datetime('now','-14 days')
    ORDER BY s.created_at DESC LIMIT 30`).all(req.uid);
  // 未読数
  const unseen = db.prepare("SELECT COUNT(*) as c FROM stamps WHERE to_uid = ? AND seen = 0").get(req.uid);
  res.json({ success: true, stamps, unseen: unseen.c });
});

// ---------- スタンプ既読 ----------
router.post('/stamps-mark-seen', authUser, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE stamps SET seen = 1 WHERE to_uid = ? AND seen = 0').run(req.uid);
  res.json({ success: true });
});

// ============================================================
// Admin専用: 冒険ダッシュボード
// ============================================================
router.get('/admin/dashboard', (req, res) => {
  // 簡易admin認証(クエリ or ヘッダー)
  const adminToken = req.query.admin_token || req.headers['x-admin-token'];
  if (!adminToken || adminToken !== (process.env.ADMIN_TOKEN || 'cowell-admin')) {
    return res.status(403).json({ error: 'admin token required' });
  }
  const db = getDb();
  try {
    // 全ユーザー（adventure_progressを起点に）
    const users = db.prepare(`SELECT ap.user_id, ap.total_steps, ap.current_area, ap.current_chapter,
      ap.fish_name, ap.consecutive_days, ap.last_step_date, ap.started_at, ap.updated_at,
      u.nickname, u.department
      FROM adventure_progress ap LEFT JOIN users u ON ap.user_id = u.id`).all();

    // 各ユーザーのセグメント計算
    const segmented = users.map(u => {
      // 過去30日のv2投稿数
      let postsCount = 0;
      try { postsCount = db.prepare("SELECT COUNT(*) c FROM posts WHERE user_id = ? AND created_at > datetime('now','-30 days')").get(u.user_id).c; } catch(e) {}
      // 過去30日の歩数記録日数
      let stepDays = 0;
      try { stepDays = db.prepare("SELECT COUNT(*) c FROM step_log WHERE user_id = ? AND step_date >= date('now','-30 days')").get(u.user_id).c; } catch(e) {}
      // 過去30日のチャットメッセージ数
      let chatCount = 0;
      try { chatCount = db.prepare("SELECT COUNT(*) c FROM buddy_messages WHERE user_id = ? AND role='user' AND created_at > datetime('now','-30 days')").get(u.user_id).c; } catch(e) {}
      // 過去30日の選択回答数
      let choiceCount = 0;
      try { choiceCount = db.prepare("SELECT COUNT(*) c FROM user_choices WHERE user_id = ? AND created_at > datetime('now','-30 days')").get(u.user_id).c; } catch(e) {}
      // 発見魚数
      let fishCount = 0;
      try { fishCount = db.prepare('SELECT COUNT(*) c FROM rpg_fish_discovery WHERE user_id = ?').get(u.user_id).c; } catch(e) {}

      // セグメント分類
      let segment;
      const totalActivity = stepDays + postsCount + chatCount + choiceCount;
      if (totalActivity === 0) segment = 'inactive';            // 完全離脱
      else if (postsCount === 0 && stepDays >= 1) segment = 'walker_only'; // 無関心層(冒険のみ) ← 研究の核
      else if (postsCount === 0 && choiceCount > 0) segment = 'lurker';   // 選択回答のみ
      else segment = 'engaged';                                   // 意識高め層(投稿あり)

      return {
        user_id: u.user_id,
        nickname: u.nickname || '???',
        department: u.department || '',
        total_steps: u.total_steps,
        current_chapter: u.current_chapter,
        current_area: u.current_area,
        fish_name: u.fish_name || '',
        consecutive_days: u.consecutive_days || 0,
        last_step_date: u.last_step_date || '',
        last_active: u.updated_at,
        started_at: u.started_at,
        // 30日活動指標
        step_days_30d: stepDays,
        posts_30d: postsCount,
        chat_30d: chatCount,
        choices_30d: choiceCount,
        fish_discovered: fishCount,
        segment: segment,
      };
    });

    // セグメント集計
    const segCounts = { inactive: 0, walker_only: 0, lurker: 0, engaged: 0 };
    segmented.forEach(u => { segCounts[u.segment] = (segCounts[u.segment] || 0) + 1; });

    // 全体歩数推移（過去30日、日次）
    const dailySteps = db.prepare(`SELECT step_date, COUNT(DISTINCT user_id) as users, SUM(steps) as total_steps, AVG(steps) as avg_steps
      FROM step_log WHERE step_date >= date('now','-30 days')
      GROUP BY step_date ORDER BY step_date`).all();

    // 章別人数
    const chapterDist = db.prepare(`SELECT current_chapter, COUNT(*) as c FROM adventure_progress GROUP BY current_chapter`).all();

    res.json({
      success: true,
      total_users: segmented.length,
      segments: segCounts,
      users: segmented.sort((a, b) => b.total_steps - a.total_steps),
      daily_steps: dailySteps,
      chapter_distribution: chapterDist,
    });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// CSV エクスポート（研究用、匿名ID付き）
router.get('/admin/export.csv', (req, res) => {
  const adminToken = req.query.admin_token || req.headers['x-admin-token'];
  if (!adminToken || adminToken !== (process.env.ADMIN_TOKEN || 'cowell-admin')) {
    return res.status(403).send('admin token required');
  }
  const db = getDb();
  try {
    const users = db.prepare(`SELECT ap.user_id, ap.total_steps, ap.current_chapter, ap.consecutive_days,
      ap.last_step_date, ap.started_at, u.department
      FROM adventure_progress ap LEFT JOIN users u ON ap.user_id = u.id`).all();

    let csv = 'anon_id,department,total_steps,current_chapter,consecutive_days,last_step_date,started_at,step_days_30d,posts_30d,chat_30d,choices_30d,fish_discovered,segment\n';
    users.forEach((u, idx) => {
      const anonId = 'A' + String(idx + 1).padStart(4, '0');
      let stepDays = 0, posts = 0, chat = 0, choices = 0, fish = 0;
      try { stepDays = db.prepare("SELECT COUNT(*) c FROM step_log WHERE user_id = ? AND step_date >= date('now','-30 days')").get(u.user_id).c; } catch(e) {}
      try { posts = db.prepare("SELECT COUNT(*) c FROM posts WHERE user_id = ? AND created_at > datetime('now','-30 days')").get(u.user_id).c; } catch(e) {}
      try { chat = db.prepare("SELECT COUNT(*) c FROM buddy_messages WHERE user_id = ? AND role='user' AND created_at > datetime('now','-30 days')").get(u.user_id).c; } catch(e) {}
      try { choices = db.prepare("SELECT COUNT(*) c FROM user_choices WHERE user_id = ? AND created_at > datetime('now','-30 days')").get(u.user_id).c; } catch(e) {}
      try { fish = db.prepare('SELECT COUNT(*) c FROM rpg_fish_discovery WHERE user_id = ?').get(u.user_id).c; } catch(e) {}
      let segment;
      const tot = stepDays + posts + chat + choices;
      if (tot === 0) segment = 'inactive';
      else if (posts === 0 && stepDays >= 1) segment = 'walker_only';
      else if (posts === 0 && choices > 0) segment = 'lurker';
      else segment = 'engaged';
      csv += [anonId, u.department || '', u.total_steps, u.current_chapter, u.consecutive_days || 0,
        u.last_step_date || '', u.started_at, stepDays, posts, chat, choices, fish, segment].join(',') + '\n';
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="cowell_adventure_' + new Date().toISOString().slice(0,10) + '.csv"');
    res.send('\ufeff' + csv); // BOM for Excel
  } catch (e) {
    res.status(500).send('Error: ' + e.message);
  }
});

// ---------- 同じエリアの仲間を取得 ----------
router.get('/companions', authUser, (req, res) => {
  const db = getDb();
  try {
    // 自分のエリアを取得
    const me = db.prepare('SELECT current_area FROM adventure_progress WHERE user_id = ?').get(req.uid);
    if (!me) return res.json({ success: true, companions: [] });

    // 同じエリアの他ユーザー（最大10人）
    const companions = db.prepare(`SELECT ap.user_id, ap.fish_name, ap.avatar_hue, ap.hero_variant, ap.total_steps, u.nickname, u.marigan_total
      FROM adventure_progress ap
      JOIN users u ON ap.user_id = u.id
      WHERE ap.current_area = ? AND ap.user_id != ?
      ORDER BY ap.total_steps DESC LIMIT 10`).all(me.current_area, req.uid);

    res.json({
      success: true,
      area: me.current_area,
      companions: companions.map(c => ({
        user_id: c.user_id,
        nickname: c.nickname || '???',
        fish_name: c.fish_name || '',
        avatar_hue: c.avatar_hue || 200,
        hero_variant: c.hero_variant || 1,
        total_steps: c.total_steps,
        marigan_total: c.marigan_total || 0,
      })),
    });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ---------- みんなの海（共有マップ） ----------
router.get('/shared-ocean', authUser, (req, res) => {
  const db = getDb();
  try {
    const allProgress = db.prepare(`SELECT ap.*, u.nickname, u.marigan_total FROM adventure_progress ap
      JOIN users u ON ap.user_id = u.id
      ORDER BY ap.total_steps DESC`).all();

    const explorers = allProgress.map((p, idx) => {
      const area = RPG_AREAS.find(a => a.id === p.current_area) || RPG_AREAS[0];
      const discoveredCount = db.prepare('SELECT COUNT(*) as cnt FROM rpg_fish_discovery WHERE user_id = ?').get(p.user_id);
      const isEgg = !p.total_steps || p.total_steps === 0;
      return {
        user_id: p.user_id,
        nickname: p.nickname || '???',
        fish_name: p.fish_name || '',
        avatar_hue: p.avatar_hue || 200,
        hero_variant: p.hero_variant || 1,
        total_steps: p.total_steps,
        marigan_total: p.marigan_total || 0,
        current_area: p.current_area,
        area_name: area.name,
        chapter: area.chapter,
        chapter_name: CHAPTER_NAMES[area.chapter],
        depth: area.depth,
        discovered_count: discoveredCount.cnt,
        rank: idx + 1,
        is_mine: p.user_id === req.uid,
        is_egg: isEgg,
      };
    });

    res.json({
      success: true,
      explorers,
      total_explorers: explorers.length,
    });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ---------- 海の出来事(他ユーザーの孵化/投稿)を取得 ----------
router.get('/events', authUser, (req, res) => {
  const db = getDb();
  try {
    let since = req.query.since;
    // デフォルト: 直近1時間
    if (!since) since = new Date(Date.now() - 3600000).toISOString().slice(0,19).replace('T',' ');
    else since = String(since).replace('T',' ').slice(0,19);

    // 孵化: 初回step_logがsince以降のユーザー
    const hatched = db.prepare(`
      SELECT u.nickname, MIN(sl.created_at) as hatched_at, ap.hero_variant
      FROM step_log sl
      JOIN users u ON sl.user_id = u.id
      LEFT JOIN adventure_progress ap ON ap.user_id = sl.user_id
      WHERE sl.user_id != ?
      GROUP BY sl.user_id
      HAVING hatched_at > ?
      ORDER BY hatched_at DESC LIMIT 5
    `).all(req.uid, since);

    // 新規投稿(他ユーザーの公開投稿)
    const posts = db.prepare(`
      SELECT u.nickname, p.content, p.category, p.created_at
      FROM posts p JOIN users u ON p.user_id = u.id
      WHERE p.created_at > ? AND p.user_id != ?
      ORDER BY p.created_at DESC LIMIT 5
    `).all(since, req.uid);

    res.json({
      success: true,
      hatched: hatched.map(h => ({ nickname: h.nickname, hatched_at: h.hatched_at, hero_variant: h.hero_variant || 1 })),
      posts: posts.map(p => ({ nickname: p.nickname, content: (p.content || '').slice(0, 80), category: p.category, created_at: p.created_at })),
      ts: new Date().toISOString(),
    });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// ---------- 図鑑 ----------
router.get('/discovery', authUser, (req, res) => {
  const db = getDb();
  const discovered = db.prepare('SELECT fish_id, area_id, discovered_at FROM rpg_fish_discovery WHERE user_id = ? ORDER BY discovered_at').all(req.uid);
  const progress = db.prepare('SELECT total_steps FROM adventure_progress WHERE user_id = ?').get(req.uid);
  const totalSteps = progress ? progress.total_steps : 0;

  const byArea = {};
  RPG_AREAS.forEach(a => {
    byArea[a.id] = {
      area: { ...a, unlocked: totalSteps >= a.stepsRequired },
      fish: RPG_FISH.filter(f => f.area === a.id).map(f => ({
        ...f,
        discovered: discovered.some(d => d.fish_id === f.id),
        discovered_at: (discovered.find(d => d.fish_id === f.id) || {}).discovered_at || null,
      })),
    };
  });

  res.json({
    success: true,
    total: RPG_FISH.length,
    discovered: discovered.length,
    by_area: byArea,
    all_fish: RPG_FISH.map(f => ({
      id: f.id, name: f.name, area: f.area, rarity: f.rarity, hue: f.hue, desc: f.desc,
      discovered: discovered.some(d => d.fish_id === f.id),
    })),
    total_steps: totalSteps,
  });
});

// ---------- 魚種マスタ取得 ----------
router.get('/species', (req, res) => {
  res.json(RPG_FISH);
});

// ---------- エリアマスタ取得 ----------
router.get('/areas', (req, res) => {
  res.json(RPG_AREAS);
});

// ---------- ランキング（到達深度順） ----------
router.get('/ranking', authUser, (req, res) => {
  const db = getDb();
  const ranking = db.prepare(`SELECT ap.user_id, ap.total_steps, ap.current_area, ap.fish_name, ap.avatar_hue, u.nickname
    FROM adventure_progress ap JOIN users u ON ap.user_id = u.id
    ORDER BY ap.total_steps DESC LIMIT 50`).all();

  res.json({
    success: true,
    ranking: ranking.map((r, idx) => {
      const area = RPG_AREAS.find(a => a.id === r.current_area) || RPG_AREAS[0];
      return {
        rank: idx + 1,
        nickname: r.nickname,
        fish_name: r.fish_name,
        avatar_hue: r.avatar_hue,
        total_steps: r.total_steps,
        area_name: area.name,
        depth: area.depth,
        chapter: area.chapter,
        is_mine: r.user_id === req.uid,
      };
    }),
  });
});

module.exports = router;
