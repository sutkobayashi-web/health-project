/**
 * GAS版健康アプリからの投稿データ移行スクリプト
 *
 * 使い方: node server/scripts/migrate-gas-posts.js
 *
 * - 既存ユーザーがいなければ仮ユーザーとして作成
 * - post_idの重複はスキップ（安全に再実行可能）
 * - Google Drive画像URLはそのまま保持
 */

const path = require('path');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'db', 'health.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// スキーマ初期化
const fs = require('fs');
const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
db.exec(schema);

// ========== 移行データ ==========
const posts = [
  {
    user_id: '38db0216-0f3c-4f2a-a27c-4845f083fb34',
    content: '【写真】昨日の夕食',
    analysis: `【AI栄養士】\n朝寝坊さん、こんにちは！ベテラン管理栄養士です。品数が非常に豊富で、健康への意識の高さが伝わる素晴らしい献立ですね！\n\n1. **【推定カロリー・栄養素】**\nエネルギーは約1,000kcal。卵、豚肉、ツナ、海藻、乳製品と食材が多彩です。タンパク質をしっかり約40g確保できており、活動的な一日のエネルギー源として炭水化物とのバランスも良好です。\n\n2. **【良い点】**\nもずく酢を取り入れているのが満点です！水溶性食物繊維が血糖値の急上昇を抑えてくれます。さらにヤクルト1000での腸内環境ケア、特茶による脂肪代謝への配慮など、機能性食品を賢く組み合わせていますね。\n\n3. **【不足しているもの】**\nこれだけ揃っていると惜しいのが、ビタミンCとカルシウムです。また、おかずが充実している分、全体の塩分が少し高めになりがちです。\n\n4. **【ちょい足し提案】**\nコンビニの**「カットフルーツ（特にキウイやパイナップル）」**を食後にぜひ。ビタミンCを補い、果物に含まれる酵素がタンパク質の消化吸収を助けてくれますよ！\n\n【AI保健師】\n朝寝坊さんへ、こんにちは！品数が非常に豊富で、健康への意識の高さが伝わる素晴らしい食事内容に感銘を受けました。\n///SCORE///\n{"legal":1,"risk":1,"freq":1,"urgency":1,"safety":1,"value":1,"needs":1}`,
    nickname: '朝寝坊', avatar: '🙂', post_id: 'post_3769aecb', status: 'open',
    category: '🍱 食事・栄養', department: 'その他', birth_date: '1958-12-14',
    image_url: 'https://drive.google.com/thumbnail?id=1GBfRa598HOYWJxA5REVgZVPR4an_baeI&sz=w1000'
  },
  {
    user_id: '38db0216-0f3c-4f2a-a27c-4845f083fb34',
    content: '【写真】本日のお昼',
    analysis: `【AI栄養士】\n朝寝坊さん、お疲れ様です！ベテラン管理栄養士として、今日のお弁当をしっかり分析させていただきますね。\n\n1. **【推定カロリー・栄養素】**\n約720kcal。白米のボリュームがあり、炭水化物が多めな構成です。唐揚げやミートボールなどの揚げ物・加工肉により脂質も高めですが、鶏・魚・肉と多様なタンパク質（推定25g前後）が確保されています。\n\n2. **【良い点】**\n主菜がバラエティ豊かで、複数の食材からアミノ酸を摂取できている点が素晴らしいです！\n\n3. **【不足しているもの】**\n緑黄色野菜が圧倒的に不足しています。\n\n4. **【ちょい足し提案】**\nコンビニの**「カップサラダ」や「スティック野菜」**を追加しましょう。\n\n【AI保健師】\n朝寝坊さんへ、こんにちは！\n///SCORE///\n{"legal":1,"risk":1,"freq":1,"urgency":1,"safety":1,"value":1,"needs":1}`,
    nickname: '朝寝坊', avatar: '🙂', post_id: 'post_870ef332', status: 'open',
    category: '🍱 食事・栄養', department: 'その他', birth_date: '1958-12-14',
    image_url: 'https://drive.google.com/thumbnail?id=1sTGJIBzRh2hNrBU1sw8t1mGW--guOJU9&sz=w1000'
  },
  {
    user_id: 'd161e8fe-686a-4033-8ae4-ced196929f9f',
    content: '【写真】本日の昼食です。\nコンビニの豆腐バーとミックスサンド',
    analysis: `【AI栄養士】\nこんにちは、ベテラン管理栄養士です。\n豆腐バーとミックスサンドの栄養分析です。\n\n### 【合計の栄養量】\n* エネルギー：471 kcal\n* たんぱく質：21.2 g\n* 脂質：26.9 g\n* 炭水化物：37.7 g\n* 食塩相当量：2.3 g\n\nタンパク質がしっかり摂れています！カロリーと糖質は控えめ。脂質と塩分には注意が必要です。野菜（食物繊維とビタミン）が不足しているので、サラダやスープを追加することをお勧めします。\n\n【AI保健師】\n管理太郎さん、こんにちは！今日の選択は賢い選択でしたので、ぜひ続けてみてくださいね！\n///SCORE///\n{"is_target":false, "legal":1,"risk":1,"freq":1,"urgency":1,"safety":1,"value":1,"needs":1}`,
    nickname: '管理太郎', avatar: '🙊', post_id: 'post_3e9d9040', status: 'open',
    category: '🍱 食事・栄養', department: '管理者', birth_date: '1980-09-14',
    image_url: 'https://drive.google.com/thumbnail?id=1VC7bG4OYoUBtuwsnM3gliCGLJL1blrf3&sz=w1000'
  },
  {
    user_id: '38db0216-0f3c-4f2a-a27c-4845f083fb34',
    content: '【写真】10日の晩酌',
    analysis: `【AI栄養士】\n朝寝坊さん、お疲れ様です！約850〜950kcal。高タンパク・低糖質な居酒屋風の構成です。鮭のビタミンD、タコのタウリン、海藻のフコイダン、豆腐の大豆イソフラボンと抗酸化成分が勢揃い。ヤクルト1000での腸活意識も100点満点。\n\n【AI保健師】\n朝寝坊さんへ、今日もお疲れ様です！\n///SCORE///\n{"legal":1,"risk":1,"freq":1,"urgency":1,"safety":1,"value":1,"needs":1}`,
    nickname: '朝寝坊', avatar: '🙂', post_id: 'post_b66dc312', status: 'open',
    category: '🍱 食事・栄養', department: 'その他', birth_date: '1958-12-14',
    image_url: 'https://drive.google.com/thumbnail?id=1dMQAhY95dPZjv0Caed-6HrctP_zvaoiw&sz=w1000'
  },
  {
    user_id: '38db0216-0f3c-4f2a-a27c-4845f083fb34',
    content: '【写真】11日の昼食',
    analysis: `【AI栄養士】\n朝寝坊さん、お疲れ様です！約680kcal。副菜の種類が非常に豊富で海藻類を副菜に取り入れている点が素晴らしいです！緑黄色野菜が少し足りません。\n\n【AI保健師】\n朝寝坊さんへ、こんにちは！\n///SCORE///\n{"legal":1,"risk":1,"freq":1,"urgency":1,"safety":1,"value":1,"needs":1}`,
    nickname: '朝寝坊', avatar: '🙂', post_id: 'post_a15e1595', status: 'open',
    category: '🍱 食事・栄養', department: 'その他', birth_date: '1958-12-14',
    image_url: 'https://drive.google.com/thumbnail?id=1lYJAAdzrCFHtvEfoeQw3yn5BGR2Zb0eH&sz=w1000'
  },
  {
    user_id: '38db0216-0f3c-4f2a-a27c-4845f083fb34',
    content: '【写真】11日の晩酌',
    analysis: `【AI栄養士】\n朝寝坊さん、お疲れ様です！約720kcal。イカや鶏肉の高タンパク・低脂質な食材。もずくやオクラから水溶性食物繊維。塩分がやや過剰になりがち。\n\n【AI保健師】\n朝寝坊さんへ、今日もお疲れ様です！\n///SCORE///\n{"legal":1,"risk":1,"freq":1,"urgency":1,"safety":1,"value":1,"needs":1}`,
    nickname: '朝寝坊', avatar: '🙂', post_id: 'post_49eb28c5', status: 'open',
    category: '🍱 食事・栄養', department: 'その他', birth_date: '1958-12-14',
    image_url: 'https://drive.google.com/thumbnail?id=1vScko7rXpcmLIlt0kKqL-F8eaS1TAiR-&sz=w1000'
  },
  {
    user_id: '38db0216-0f3c-4f2a-a27c-4845f083fb34',
    content: '【写真】12日に昼食',
    analysis: `【AI栄養士】\n朝寝坊さん、こんにちは。約620kcal。ひじき煮、お豆、魚の香草焼きなどおかずの品目数が非常に豊富です！加熱調理中心のためビタミンCが不足。\n\n【AI保健師】\n朝寝坊さんへ、こんにちは。\n///SCORE///\n{"legal":1,"risk":1,"freq":1,"urgency":1,"safety":1,"value":1,"needs":1}`,
    nickname: '朝寝坊', avatar: '🙂', post_id: 'post_e505dc9e', status: 'open',
    category: '🍱 食事・栄養', department: 'その他', birth_date: '1958-12-14',
    image_url: 'https://drive.google.com/thumbnail?id=1AJCNx9abFDxgATJA9cXntAnQmr3fn1JA&sz=w1000'
  },
  {
    user_id: '38db0216-0f3c-4f2a-a27c-4845f083fb34',
    content: '【写真】昨日の夕飯',
    analysis: `【AI栄養士】\n朝寝坊さん、こんにちは！約850〜900kcal。タンパク質は30g以上。植物性と動物性のタンパク質を同時に摂ることでアミノ酸スコアが向上。カリウムとビタミンCが不足。\n\n【AI保健師】\n朝寝坊さんへ、こんにちは！\n///SCORE///\n{"legal":1,"risk":1,"freq":1,"urgency":1,"safety":1,"value":1,"needs":1}`,
    nickname: '朝寝坊', avatar: '🙂', post_id: 'post_435b7714', status: 'open',
    category: '🍱 食事・栄養', department: 'その他', birth_date: '1958-12-14',
    image_url: 'https://drive.google.com/thumbnail?id=1SaPXONMRZVXtrvDLfXddnQbMGyQ1z904&sz=w1000'
  },
  {
    user_id: '38db0216-0f3c-4f2a-a27c-4845f083fb34',
    content: '【写真】今日の昼食',
    analysis: `【AI栄養士】\n朝寝坊さん、お疲れ様です！約680kcal。副菜の種類が多く、多品目の食材を摂取できている点が素晴らしいです！タンパク質が全体的に少なめ。温泉卵をプラスしましょう！\n\n【AI保健師】\n朝寝坊さんへ、こんにちは！\n///SCORE///\n{"legal":1,"risk":1,"freq":1,"urgency":1,"safety":1,"value":1,"needs":1}`,
    nickname: '朝寝坊', avatar: '🙂', post_id: 'post_1b1d540a', status: 'open',
    category: '🍱 食事・栄養', department: 'その他', birth_date: '1958-12-14',
    image_url: 'https://drive.google.com/thumbnail?id=1kKEK_bLjT0kWK0_aRhIxnS5vngSXYbUD&sz=w1000'
  },
  {
    user_id: '3ffda852-18a1-4663-b67b-39a3332e0d46',
    content: '【写真】今日のモーニングです。\nミックスサンド\nコーヒー(ブラック)',
    analysis: `【AI栄養士】\nアッキーさん、お疲れ様です！約290〜310kcal。ミックスサンドは卵・ハム・ツナと複数のタンパク源が一度に摂れます。ブラックコーヒーでポリフェノール。食物繊維とビタミンC・ミネラルが不足。\n\n【AI保健師】\nアッキーさんへ、食事分析をさせていただきました。海藻サラダやめかぶ・もずく酢を追加することをお勧めします。\n///SCORE///\n{"is_target":false, "legal":1,"risk":1,"freq":1,"urgency":1,"safety":1,"value":1,"needs":1}`,
    nickname: 'アッキー', avatar: '🙂', post_id: 'post_ccfecd80', status: 'open',
    category: '🍱 食事・栄養', department: '管理者', birth_date: '1970-04-07',
    image_url: 'https://drive.google.com/thumbnail?id=1JqknfyZ1897kEaEwzJWgssLdA_PHVni3&sz=w1000'
  },
  {
    user_id: '38db0216-0f3c-4f2a-a27c-4845f083fb34',
    content: '【写真】13日の晩酌、ご飯なし',
    analysis: `【AI栄養士】\n朝寝坊さん、お疲れ様です！約780kcal。タンパク質が非常に豊富。枝豆、豆腐、スープの肉と多角的に摂取。キムチやヤクルトで菌活。塩分がやや過多。\n\n【AI保健師】\n朝寝坊さんへ、昨日の晩酌はどうでしたか？\n///SCORE///\n{"legal":1,"risk":1,"freq":1,"urgency":1,"safety":1,"value":1,"needs":1}`,
    nickname: '朝寝坊', avatar: '🙂', post_id: 'post_380687ed', status: 'open',
    category: '🍱 食事・栄養', department: 'その他', birth_date: '1958-12-14',
    image_url: 'https://drive.google.com/thumbnail?id=1COturx_wYfnaMqlxlRjOfuW32wRA7jwq&sz=w1000'
  },
  {
    user_id: '38db0216-0f3c-4f2a-a27c-4845f083fb34',
    content: '【写真】昨日の晩酌、ご飯なし、週２休肝日（休刊日以外はご飯は食べません。）',
    analysis: `【AI栄養士】\n朝寝坊さん、お疲れ様です！約800〜850kcal。トマトのリコピン、緑黄色野菜のビタミンACE、タコのタウリンが肝臓をサポート。ヤクルト1000での菌活も賢い選択。\n\n【AI保健師】\n朝寝坊さんへ、こんにちは！\n///SCORE///\n{"legal":1,"risk":1,"freq":1,"urgency":1,"safety":1,"value":1,"needs":1}`,
    nickname: '朝寝坊', avatar: '🙂', post_id: 'post_6b0d3093', status: 'open',
    category: '🍱 食事・栄養', department: 'その他', birth_date: '1958-12-14',
    image_url: 'https://drive.google.com/thumbnail?id=1D-xZotJB7OHUf_hO3TDsrqukuc_GrbS8&sz=w1000'
  },
  {
    user_id: '38db0216-0f3c-4f2a-a27c-4845f083fb34',
    content: '粗毎日ウォーキング（6000～7000歩）スクワット30回実施しているが体重が中々思うように減らないBMI消滅に繋がらない・・どうして？',
    analysis: '',
    nickname: '朝寝坊', avatar: '🙂', post_id: 'post_99e66aee', status: 'open',
    category: '相談', department: 'その他', birth_date: '1958-12-14',
    image_url: ''
  },
  {
    user_id: '38db0216-0f3c-4f2a-a27c-4845f083fb34',
    content: '【写真】本日の晩酌のお供、ナムルは食べず明日にしました、ご飯なし、晩酌後ヤクルト1000（１本）',
    analysis: `【AI栄養士】\n朝寝坊さん、お疲れ様です！約1,000〜1,100kcal（ビール込）。タンパク質の多角取りが素晴らしい！もずくや椎茸で水溶性食物繊維。塩分が過剰になりがち。\n\n【AI保健師】\n朝寝坊さんへ、今日もお疲れ様です！\n///SCORE///\n{"legal":1,"risk":1,"freq":1,"urgency":1,"safety":1,"value":1,"needs":1}`,
    nickname: '朝寝坊', avatar: '🙂', post_id: 'post_1b2243d1', status: 'open',
    category: '🍱 食事・栄養', department: 'その他', birth_date: '1958-12-14',
    image_url: 'https://drive.google.com/thumbnail?id=1KzQ38-NcYaxrU6ad-FRCkokJwa5czjtk&sz=w1000'
  },
  {
    user_id: '38db0216-0f3c-4f2a-a27c-4845f083fb34',
    content: '【写真】本日の昼食',
    analysis: `【AI栄養士】\n朝寝坊さん、こんにちは。約650〜700kcal。副菜の種類が非常に豊富。切り干し大根は食物繊維やカルシウムの貴重な供給源。ビタミンCが不足気味。\n\n【AI保健師】\n朝寝坊さんへ、こんにちは。\n///SCORE///\n{"legal":1,"risk":1,"freq":1,"urgency":1,"safety":1,"value":1,"needs":1}`,
    nickname: '朝寝坊', avatar: '🙂', post_id: 'post_38f2206c', status: 'open',
    category: '🍱 食事・栄養', department: 'その他', birth_date: '1958-12-14',
    image_url: 'https://drive.google.com/thumbnail?id=1bn7oNrxJNJq0zC1UI3eSblQCAIjqNuoL&sz=w1000'
  },
  {
    user_id: 'd161e8fe-686a-4033-8ae4-ced196929f9f',
    content: '【写真】本日の昼食',
    analysis: `【AI栄養士】\nお疲れ様です。のり弁当ですね。揚げ物が3種類重なっているため脂質が高め。きんぴらごぼうで食物繊維を補っていますが緑黄色野菜が不足。\n\n【AI保健師】\n管理太郎さん、こんにちは！午後も頑張りましょう！\n///SCORE///\n{"is_target":false, "legal":1,"risk":1,"freq":1,"urgency":1,"safety":1,"value":1,"needs":1}`,
    nickname: '管理太郎', avatar: '🙊', post_id: 'post_1440ab80', status: 'open',
    category: '🍱 食事・栄養', department: '管理者', birth_date: '1980-09-14',
    image_url: 'https://drive.google.com/thumbnail?id=1rBu7vd-nfXy6f_VUbBE78mqVY5KsTmST&sz=w1000'
  },
  {
    user_id: '3ffda852-18a1-4663-b67b-39a3332e0d46',
    content: '【写真】今日のランチです。\n助六寿司\nオニオンサラダ\nコーヒーゼリー\nジョア\n緑茶',
    analysis: `【AI栄養士】\nアッキーさん、こんにちは！約650〜700kcal。炭水化物中心。ジョアでカルシウムとビタミンD補給。野菜サラダで血糖値上昇を抑制。タンパク質がやや不足。半熟ゆでたまごをプラス！\n\n【AI保健師】\nアッキーさんへ、こんにちは！素敵な選択ですね。\n///SCORE///\n{"is_target":false, "legal":1,"risk":1,"freq":1,"urgency":1,"safety":1,"value":1,"needs":1}`,
    nickname: 'アッキー', avatar: '🙂', post_id: 'post_a8aa6652', status: 'open',
    category: '🍱 食事・栄養', department: '管理者', birth_date: '1970-04-07',
    image_url: 'https://drive.google.com/thumbnail?id=1vz7SJdGp1UcDZVyo8tznyF8uLp9AA-lF&sz=w1000'
  }
];

// ========== ユーザーマッピング ==========
const userMap = {
  '38db0216-0f3c-4f2a-a27c-4845f083fb34': { nickname: '朝寝坊', avatar: '🙂', department: 'その他', birth_date: '1958-12-14' },
  'd161e8fe-686a-4033-8ae4-ced196929f9f': { nickname: '管理太郎', avatar: '🙊', department: '管理者', birth_date: '1980-09-14' },
  '3ffda852-18a1-4663-b67b-39a3332e0d46': { nickname: 'アッキー', avatar: '🙂', department: '管理者', birth_date: '1970-04-07' }
};

// ========== 実行 ==========
console.log('=== GAS投稿データ移行開始 ===\n');

// 1. ユーザー作成（存在しなければ）
const insertUser = db.prepare(`INSERT OR IGNORE INTO users (id, nickname, password_hash, avatar, department, birth_date) VALUES (?, ?, ?, ?, ?, ?)`);
const bcrypt = require('bcryptjs');

for (const [uid, info] of Object.entries(userMap)) {
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(uid);
  if (existing) {
    console.log(`  ユーザー「${info.nickname}」は既に存在 → スキップ`);
  } else {
    // 仮パスワード（ユーザーに後でリセットしてもらう）
    const tempHash = bcrypt.hashSync('temp1234', 10);
    insertUser.run(uid, info.nickname, tempHash, info.avatar, info.department, info.birth_date);
    console.log(`  ユーザー「${info.nickname}」を作成 (ID: ${uid})`);
  }
}

// 2. 投稿をインサート
console.log('\n--- 投稿データ移行 ---');
const insertPost = db.prepare(`INSERT OR IGNORE INTO posts (post_id, user_id, content, analysis, nickname, avatar, status, category, department, birth_date, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

let inserted = 0, skipped = 0;
for (const p of posts) {
  const existing = db.prepare('SELECT id FROM posts WHERE post_id = ?').get(p.post_id);
  if (existing) {
    console.log(`  [スキップ] ${p.post_id} (${p.content.substring(0, 20)}...) — 既に存在`);
    skipped++;
  } else {
    insertPost.run(p.post_id, p.user_id, p.content, p.analysis, p.nickname, p.avatar, p.status, p.category, p.department, p.birth_date, p.image_url);
    console.log(`  [追加] ${p.post_id} — ${p.nickname}: ${p.content.substring(0, 30)}`);
    inserted++;
  }
}

console.log(`\n=== 移行完了 ===`);
console.log(`  追加: ${inserted}件`);
console.log(`  スキップ: ${skipped}件`);
console.log(`  合計投稿数: ${db.prepare('SELECT COUNT(*) as cnt FROM posts').get().cnt}件`);
console.log(`  合計ユーザー数: ${db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt}人`);

db.close();
