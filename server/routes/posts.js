const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../services/db');
const { callGroqApi, callAIWithFallback, callGeminiVision, parsePostScore, EVIDENCE_BASE } = require('../services/ai');
const { awardMarigan } = require('../services/marigan');

const router = express.Router();

// 投稿一覧取得
router.get('/public', (req, res) => {
  try {
    const pageIndex = parseInt(req.query.page) || 0;
    const viewerUid = req.query.uid || '';
    const catFilter = req.query.cat || '';
    const limit = 10;
    const offset = pageIndex * limit;
    const db = getDb();

    let catWhere = '';
    if (catFilter === 'consult') catWhere = " AND category = '相談'";
    else if (catFilter === 'food') catWhere = " AND category LIKE '%食事%'";

    const posts = db.prepare(`SELECT * FROM posts WHERE status IN ('open','public','resolved','planned')${catWhere} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(limit + 1, offset);
    const hasNext = posts.length > limit;
    const pagedPosts = posts.slice(0, limit);

    // ユーザーごとの投稿数(ランク計算用)
    const userCounts = {};
    db.prepare('SELECT user_id, COUNT(*) as cnt FROM posts GROUP BY user_id').all().forEach(r => { userCounts[r.user_id] = r.cnt; });

    // 共感カウント集計
    const empathyCountsByPost = {};
    try {
      db.prepare('SELECT post_id, empathy_type, COUNT(*) as cnt FROM empathy_responses GROUP BY post_id, empathy_type').all()
        .forEach(r => {
          if (!empathyCountsByPost[r.post_id]) empathyCountsByPost[r.post_id] = {};
          empathyCountsByPost[r.post_id][r.empathy_type] = r.cnt;
        });
    } catch (e) { /* table may not exist yet */ }
    const mappedPosts = pagedPosts.map(p => {
      const count = userCounts[p.user_id] || 0;
      let rank = 'Beginner';
      if (count >= 80) rank = 'Black';
      else if (count >= 50) rank = 'Platinum';
      else if (count >= 30) rank = 'Gold';
      else if (count >= 10) rank = 'Silver';
      else if (count >= 5) rank = 'Bronze';

      const likesArr = p.likes ? p.likes.split(',').filter(x => x) : [];
      const parsed = parsePostScore(p.analysis);

      let nutrientScores = null;
      if (p.nutrition_scores) { try { nutrientScores = JSON.parse(p.nutrition_scores); } catch(e) {} }
      return {
        id: p.post_id, row: p.id,
        date: new Date(p.created_at + 'Z').toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }),
        content: (p.content || '').replace(/^【写真】/, ''),
        analysis: parsed.text,
        nickname: p.nickname || '匿名', avatar: p.avatar || '🙂',
        imageUrl: p.image_url || '', category: p.category || '相談', authorRank: rank,
        likeCount: likesArr.length,
        isLiked: likesArr.includes(viewerUid),
        authorUid: p.user_id,
        empathyCounts: empathyCountsByPost[p.post_id] || null,
        nutrientScores: nutrientScores
      };
    });
    res.json({ posts: mappedPosts, hasNext });
  } catch (e) {
    res.json({ posts: [], hasNext: false, error: e.toString() });
  }
});

// 自分の投稿一覧
router.get('/my-posts/:uid', (req, res) => {
  try {
    const uid = req.params.uid;
    const db = getDb();
    const posts = db.prepare("SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC").all(uid);
    // チャット数（member_chats）
    const chatCounts = {};
    db.prepare("SELECT post_id, COUNT(*) as cnt FROM member_chats GROUP BY post_id").all()
      .forEach(r => { chatCounts[r.post_id] = r.cnt; });
    // 共感カウント
    const empathyCountsByPost = {};
    try {
      db.prepare('SELECT post_id, COUNT(*) as cnt FROM empathy_responses GROUP BY post_id').all()
        .forEach(r => { empathyCountsByPost[r.post_id] = r.cnt; });
    } catch (e) {}

    const result = posts.map(p => {
      const parsed = parsePostScore(p.analysis);
      let nutrientScores = null;
      if (p.nutrition_scores) { try { nutrientScores = JSON.parse(p.nutrition_scores); } catch(e) {} }
      return {
        id: p.post_id, row: p.id,
        date: new Date(p.created_at + 'Z').toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }),
        content: (p.content || '').replace(/^【写真】/, ''),
        analysis: parsed.text,
        nickname: p.nickname || '匿名', avatar: p.avatar || '🙂',
        imageUrl: p.image_url || '', category: p.category || '相談',
        chatCount: chatCounts[p.post_id] || 0,
        empathyCount: empathyCountsByPost[p.post_id] || 0,
        authorUid: p.user_id,
        nutrientScores: nutrientScores
      };
    });
    res.json({ success: true, posts: result });
  } catch (e) { res.json({ success: true, posts: [] }); }
});

// 投稿者向け: 推進メンバーチャット取得
router.get('/member-chats/:postId/:uid', (req, res) => {
  try {
    const db = getDb();
    const post = db.prepare('SELECT user_id FROM posts WHERE post_id = ?').get(req.params.postId);
    if (!post || post.user_id !== req.params.uid) {
      return res.json({ success: false, msg: '権限がありません' });
    }
    const chats = db.prepare('SELECT member_name, message, created_at FROM member_chats WHERE post_id = ? ORDER BY created_at ASC').all(req.params.postId);
    res.json({ success: true, chats });
  } catch (e) { res.json({ success: false, chats: [] }); }
});

// テキスト投稿
router.post('/submit', async (req, res) => {
  try {
    const { uid, nickname, avatar, honne, department, birthDate } = req.body;
    const db = getDb();
    const pid = 'post_' + uuidv4().substring(0, 8);
    const dName = decodeURIComponent(nickname);
    const content = decodeURIComponent(honne);

    const sys = `あなたはAIヘルスアドバイザー兼アナリストです。相手:${dName}。

# タスク（2つとも必ず実行すること）

## タスク1: ケアコメント
「${dName}さんへ」から始まるケアコメントを書く。
- エビデンスに基づく助言（栄養改善パック2020、EASTフレームワーク、CANフレームワーク等）
- スモールステップで実践可能な提案があれば1つだけ
- エビデンスのない助言はしない
- ★★★マークダウン記法（**太字**や###見出し等）は絶対に使わない。強調したい語句は【】で囲むこと★★★
- ★★★ケアコメントの最後に必ず「📚 出典:」として根拠となるガイドライン名を明記すること★★★
  例: 📚 出典: 厚生労働省「健康づくりのための睡眠ガイド2023」

## タスク2: 7軸スコア評価（★★★最重要★★★）
ケアコメントの後に、必ず ///SCORE/// と書き、その後にJSONを出力すること。
各軸は投稿内容に応じて1〜5点で適切に評価すること（全て1にしないこと）。
is_targetは健康経営施策として検討すべき投稿ならtrue、食事写真など日常報告ならfalse。

評価軸:
- legal(法的義務): 労働安全衛生法等への該当度
- risk(リスク): 放置時の健康・安全リスク
- freq(頻度): 組織内での同様の声の普遍性
- urgency(緊急性): 即座の対応が必要な度合い
- safety(安全性): 身体的・精神的安全への影響度
- value(価値): 施策としての投資対効果
- needs(ニーズ): 対象者の行動変容への寄与度

出力形式（厳守）:
[ケアコメント本文]
///SCORE///
{"is_target": true, "legal": 3, "risk": 4, "freq": 2, "urgency": 3, "safety": 4, "value": 3, "needs": 3}`;
    let aiFullRes = await callAIWithFallback(sys, content);
    if (!aiFullRes || !aiFullRes.includes('///SCORE///')) {
      aiFullRes = `【AIヘルスアドバイザー】\n${dName}さん、投稿ありがとうございます！\n///SCORE///\n{"is_target":true, "legal": 1, "risk": 1, "freq": 1, "urgency": 1, "safety": 1, "value": 1, "needs": 1}`;
    }

    db.prepare(`INSERT INTO posts (post_id, user_id, content, analysis, nickname, avatar, status, category, department, birth_date)
      VALUES (?, ?, ?, ?, ?, ?, 'open', '相談', ?, ?)`).run(pid, uid, content, aiFullRes, dName, decodeURIComponent(avatar), department, birthDate);

    // CoWellコイン付与（投稿 10pt）
    awardMarigan(uid, 'post', pid);

    // 相談投稿の場合、auto_evaluationsテーブルにも7軸スコアを保存（凝集時に再評価不要にする）
    try {
      if (aiFullRes.includes('///SCORE///')) {
        var scoreJson = aiFullRes.split('///SCORE///')[1];
        var scoreMatch = scoreJson.match(/\{[\s\S]*?\}/);
        if (scoreMatch) {
          var s = JSON.parse(scoreMatch[0]);
          var total = (s.legal||1)+(s.risk||1)+(s.freq||1)+(s.urgency||1)+(s.safety||1)+(s.value||1)+(s.needs||1);
          db.prepare(`INSERT OR IGNORE INTO auto_evaluations (post_id, legal, risk, freq, urgency, safety, value_score, needs, total_score, reasoning, guideline_refs, source_data) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
            .run(pid, s.legal||1, s.risk||1, s.freq||1, s.urgency||1, s.safety||1, s.value||1, s.needs||1, total, 'AI投稿時自動評価', '', '{}');
        }
      }
    } catch (evalErr) { /* 評価保存失敗は投稿処理に影響させない */ }

    res.json({ success: true, analysis: parsePostScore(aiFullRes).text });
  } catch (e) {
    res.json({ success: false, error: e.toString() });
  }
});

// 食事投稿
router.post('/food', async (req, res) => {
  try {
    const { uid, nickname, avatar, imageBase64, mimeType, userComment, department, birthDate, isPublic } = req.body;
    const db = getDb();
    const dName = decodeURIComponent(nickname);
    const comment = userComment || 'なし';

    // 画像保存（バリデーション付き）
    let imageUrl = '';
    try {
      const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      if (!ALLOWED_MIMES.includes(mimeType)) throw new Error('Invalid image type');
      const imgBuf = Buffer.from(imageBase64, 'base64');
      if (imgBuf.length > MAX_SIZE) throw new Error('File too large');
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const crypto = require('crypto');
      const ext = mimeType === 'image/png' ? '.png' : '.jpg';
      const fileName = 'food_' + crypto.randomBytes(8).toString('hex') + ext;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, imgBuf);
      imageUrl = `/uploads/${fileName}`;
    } catch (e) { imageUrl = '(保存失敗)'; }

    // ユーザーの過去食事履歴を取得（直近10食分）
    let userFoodHistory = '';
    let nutrientTrend = '';
    try {
      const pastPosts = db.prepare(
        `SELECT nutrition_scores, content, created_at FROM posts
         WHERE user_id = ? AND category LIKE '%食事%' AND nutrition_scores IS NOT NULL
         ORDER BY created_at DESC LIMIT 10`
      ).all(uid);
      if (pastPosts.length >= 2) {
        const keys = ['calories','protein','fat','carbs','vitamin','mineral','salt'];
        const units = {calories:'kcal',protein:'g',fat:'%',carbs:'%',vitamin:'g',mineral:'mg',salt:'g'};
        const targets = {calories:550,protein:20,fat:25,carbs:57.5,vitamin:120,mineral:227,salt:2.5};
        const sums = {}; const counts = {};
        keys.forEach(k => { sums[k] = 0; counts[k] = 0; });
        pastPosts.forEach(p => {
          try {
            let sc = JSON.parse(p.nutrition_scores);
            // 旧形式(1-5スコア)→実数値に変換
            const isLegacy = (typeof sc.protein === 'number' && sc.protein <= 5 && !sc.calories);
            if (isLegacy) {
              sc = {
                calories:{value:300+(sc.protein||3)*70}, protein:{value:(sc.protein||3)*5},
                fat:{value:15+(sc.fat||3)*3}, carbs:{value:35+(sc.carbs||sc.carb||3)*6},
                vitamin:{value:(sc.vitamin||3)*30}, mineral:{value:(sc.mineral||3)*55},
                fiber:{value:(sc.vitamin||3)*1.5}, salt:{value:4.0-(sc.salt||3)*0.5},
                alcohol:{value:0}
              };
            }
            keys.forEach(k => {
              const v = sc[k];
              const num = (v && typeof v === 'object') ? Number(v.value) : Number(v);
              if (!isNaN(num) && num > 0) { sums[k] += num; counts[k]++; }
            });
          } catch(e) {}
        });
        const trends = [];
        keys.forEach(k => {
          if (counts[k] > 0) {
            const avg = Math.round(sums[k] / counts[k] * 10) / 10;
            const tgt = targets[k];
            const ratio = avg / tgt;
            let status;
            if (k === 'salt') {
              status = avg <= tgt * 0.8 ? '良好' : avg <= tgt ? '適量' : '過剰傾向';
            } else if (k === 'fat' || k === 'carbs' || k === 'calories') {
              status = ratio >= 0.85 && ratio <= 1.15 ? '適量' : ratio < 0.85 ? '不足傾向' : '過剰傾向';
            } else {
              status = ratio >= 0.8 ? '適量' : '不足傾向';
            }
            trends.push(`${k}: 平均${avg}${units[k]}(目標${tgt}${units[k]}) → ${status}`);
          }
        });
        nutrientTrend = trends.join('\n');
        const recentMenus = pastPosts.slice(0, 5).map(p => {
          const c = (p.content || '').replace(/^【写真】/, '').substring(0, 40);
          return c || '(写真のみ)';
        }).join('、');
        userFoodHistory = `\n\n【この社員の食事傾向（直近${pastPosts.length}食の平均）】\n${nutrientTrend}\n最近の食事: ${recentMenus}`;
      }
    } catch(e) { /* 履歴取得失敗は無視 */ }

    // Gemini Vision で栄養分析
    const nutSys = `あなたは食事を見るのが好きな栄養のプロです。堅い分析ではなく、友達に「これ食べたよ」と見せられたときのような自然な反応をしてください。国立長寿医療研究センター「栄養改善パック」（2020）に基づき分析してください。

★★★最優先ルール: 成分表示・栄養成分表示ラベルの検出★★★
画像に成分表示ラベル（栄養成分表示）が写っている場合:
- ラベルから正確な数値を読み取り、冒頭に【成分表示から読み取り】と明記する
- エネルギー、たんぱく質、脂質、炭水化物、食塩相当量をそのまま使用する
- ビタミン・ミネラル・野菜量はラベルに記載がなければ商品内容から推定する
- 「推定」ではなく「実測値」として扱うこと

画像が食事写真（料理そのもの）の場合:
- 以下の【分量推定ルール】に従い、できるだけ正確に栄養素を推定する

【分量推定ルール（重要）】
写真内の基準物から料理の実際のサイズ・重量を推定すること:
1. まず基準物を特定する（以下の優先順で探す）:
   - 箸（長さ約23cm）、スプーン（大さじ約15cm、小さじ約12cm）
   - 茶碗（直径約12cm、1杯分の米飯約150g）、味噌汁椀（直径約11cm）
   - 一般的な丸皿（小皿15cm、中皿20cm、大皿26cm）、角皿、どんぶり（直径約15cm）
   - 割り箸の紙袋、コンビニのパッケージ、ペットボトル（高さ約22cm）
   - 人の手・指（成人の手幅約8-9cm）
2. 基準物との比較で各料理の面積・厚みを推定し、食品の比重から重量を算出する
3. 食品成分表（文科省）の100gあたり栄養値×推定重量で算出する
   - 白米: 168kcal/100g、たんぱく質2.5g/100g
   - 鶏もも肉（皮つき）: 204kcal/100g、たんぱく質16.6g/100g
   - 鮭切り身: 133kcal/100g、たんぱく質22.3g/100g
   - 豚バラ: 395kcal/100g、揚げ物は+50-80kcal/100g（衣・油分）
   - キャベツ千切り: 23kcal/100g、トマト: 19kcal/100g
4. 基準物が見つからない場合は、器の種類から標準サイズを推定する

【回答ルール】
- 最初に食事への素直な感想を一言（「おっ、いいバランス！」「ボリュームたっぷりだね！」等）
- カロリーを記載（ラベル読取時は「523kcal（成分表示）」、推定時は「約650kcal」）
- 良い点を1つ具体的に褒める（「◯◯が入ってるのがいいね」）
- 改善は「◯◯を足すともっと良くなるかも」程度に軽く1つだけ
- 全体で150〜250字程度。テンポよく
- ★★★マークダウン記法は使わない。強調は【】で囲む★★★

★★★絶対必須★★★ テキストの最後に以下のJSON形式で栄養データを必ず出力。数値にカンマを入れないこと。
///NUTRIENTS///
{"calories":{"value":数値,"unit":"kcal"},"protein":{"value":数値,"unit":"g"},"fat":{"value":数値,"unit":"%"},"carbs":{"value":数値,"unit":"%"},"vitamin":{"value":数値,"unit":"g"},"mineral":{"value":数値,"unit":"mg"},"salt":{"value":数値,"unit":"g"},"fiber":{"value":数値,"unit":"g"},"alcohol":{"value":数値,"unit":"g"},"has_alcohol":true/false}

各項目のvalueは実数値または推定実数値（小数点1桁まで、カンマ禁止）:
- calories: カロリー（kcal）。目標: 450-650kcal/食
- protein: たんぱく質量（g）。目標: 20g/食
- fat: 脂質エネルギー比（%）。ラベル読取時はg数から総カロリーに対する%を算出。目標: 20-30%
- carbs: 炭水化物エネルギー比（%）。ラベル読取時はg数から%を算出。目標: 50-65%
- vitamin: 野菜量（g）。目標: 120g/食
- mineral: カルシウム量（mg）。目標: 227mg/食
- salt: 食塩相当量（g）。目標: 2.5g未満/食
- fiber: 食物繊維（g）。ラベル記載あればそのまま、なければ野菜・海藻・きのこ・穀物から推定。目標: 7g/食（1日21g以上）
- alcohol: 写真に写っている酒類から推定する純アルコール量（g）。酒が無ければ0。ビール350ml=14g、日本酒1合=22g、焼酎ロック1杯=20g、ワイン1杯=12g、ハイボール1杯=7g、チューハイ350ml=14g
- has_alcohol: 画像にアルコール飲料が写っているか（true/false）。缶ビール、日本酒、焼酎、ワイン、グラス等を検出
※ラベルに糖質・飽和脂肪酸・コレステロール等が記載されていればそれらも読み取り、テキスト分析に含めること`;
    let nutResRaw = await callGeminiVision(nutSys, imageBase64, mimeType);
    if (!nutResRaw || nutResRaw === '通信エラー') nutResRaw = '解析できませんでした。';

    // 栄養スコアJSONを抽出
    let nutrientScores = null;
    let nutRes = nutResRaw;
    const nutMatch = nutResRaw.match(/\/\/\/NUTRIENTS\/\/\/\s*(\{[\s\S]*\})/);
    if (nutMatch) {
      try { nutrientScores = JSON.parse(nutMatch[1]); } catch(e) {
        // カンマ区切り数値を修正して再パース（例: 1,050 → 1050）
        try { nutrientScores = JSON.parse(nutMatch[1].replace(/"value"\s*:\s*(\d{1,3}),(\d{3})/g, '"value":$1$2')); } catch(e2) {}
      }
      nutRes = nutResRaw.replace(/\/\/\/NUTRIENTS\/\/\/[\s\S]*$/, '').trim();
    }

    // Groq でヘルスアドバイザーコメント（履歴ベースのパーソナライズ）
    const nurseSys = `あなたは食事仲間です（「アドバイザー」ではない）。相手:${dName}さん。つぶやき:「${comment}」今回の食事分析:「${nutRes}」${userFoodHistory}

【回答ルール — 相棒トーンで】
- まず「お、いいじゃん！」「うまそう！」のように食事そのものへの素直な反応から入る
- 良い点を1つ褒める（「◯◯が入ってるのがナイス」のように具体的かつ軽く）
- ${nutrientTrend ? '過去の食事傾向から変化があれば「お、前より◯◯増えてるね」と気づきを伝える' : '改善ポイントは「◯◯足すともっといいかも？」程度に軽く1つだけ'}
- 提案するときは押し付けず選択肢として:
  ・「次は【鮭の塩焼き定食】とかどう？たんぱく質もバッチリ」
  ・「コンビニなら【サラダチキン+カット野菜】の組み合わせもアリだよ」
  ・「【乾燥わかめ】を味噌汁に入れるだけでも全然違うよ」
- 「記録してくれてありがとう！」で締める（義務感を出さない）
- 全体で150〜200字程度。短くテンポよく。マークダウン不可。強調は【】
- 最後に「📚 出典:」でガイドライン名を明記`;
    let nurseRes = await callAIWithFallback(nurseSys, '声かけ');
    if (!nurseRes) nurseRes = `${dName}さん、食事の投稿ありがとうございます！`;

    const finalForDb = `【AI食事アドバイザー】\n${nutRes}\n\n【AIヘルスアドバイザー】\n${nurseRes}\n///SCORE///\n{"is_target":false, "legal":1,"risk":1,"freq":1,"urgency":1,"safety":1,"value":1,"needs":1}`;
    const pid = 'post_' + uuidv4().substring(0, 8);
    const status = isPublic ? 'open' : 'private';

    // nutrition_scoresカラムが無ければ追加
    try { db.prepare("ALTER TABLE posts ADD COLUMN nutrition_scores TEXT").run(); } catch(e) { /* already exists */ }

    db.prepare(`INSERT INTO posts (post_id, user_id, content, analysis, nickname, avatar, status, category, department, birth_date, image_url, nutrition_scores)
      VALUES (?, ?, ?, ?, ?, ?, ?, '🍱 食事・栄養', ?, ?, ?, ?)`).run(pid, uid, `【写真】${comment}`, finalForDb, dName, decodeURIComponent(avatar), status, department, birthDate, imageUrl, nutrientScores ? JSON.stringify(nutrientScores) : null);

    // CoWellコイン付与（食事写真 8pt）
    const mariganResult = awardMarigan(uid, 'food_photo', pid);

    res.json({ success: true, pid, analysis: { nutrition: nutRes, nurse: nurseRes, nutrientScores }, imageUrl, marigan: mariganResult });
  } catch (e) {
    res.json({ success: false, msg: e.toString() });
  }
});

// 晩酌記録（アルコール量更新）
router.post('/alcohol-log', (req, res) => {
  try {
    const { pid, alcoholGrams } = req.body;
    if (!pid) return res.json({ success: false, msg: 'pidが必要です' });
    const db = getDb();
    const post = db.prepare('SELECT nutrition_scores FROM posts WHERE post_id = ?').get(pid);
    if (!post) return res.json({ success: false, msg: '投稿が見つかりません' });
    let scores = {};
    if (post.nutrition_scores) {
      try { scores = JSON.parse(post.nutrition_scores); } catch(e) {}
    }
    scores.alcohol = { value: Number(alcoholGrams) || 0, unit: 'g' };
    scores.has_alcohol = true;
    db.prepare('UPDATE posts SET nutrition_scores = ? WHERE post_id = ?').run(JSON.stringify(scores), pid);
    res.json({ success: true, alcohol: scores.alcohol });
  } catch(e) {
    res.json({ success: false, msg: e.toString() });
  }
});

// いいねトグル
router.post('/like', (req, res) => {
  try {
    const { postRow, viewerUid } = req.body;
    const db = getDb();
    const post = db.prepare('SELECT id, likes FROM posts WHERE id = ?').get(postRow);
    if (!post) return res.json({ success: false, msg: '投稿が見つかりません' });

    let likes = post.likes ? post.likes.split(',').filter(x => x) : [];
    let isLiked;
    if (likes.includes(viewerUid)) {
      likes = likes.filter(id => id !== viewerUid);
      isLiked = false;
    } else {
      likes.push(viewerUid);
      isLiked = true;
    }
    db.prepare('UPDATE posts SET likes = ? WHERE id = ?').run(likes.join(','), postRow);
    res.json({ success: true, count: likes.length, isLiked });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 投稿削除
router.post('/delete', (req, res) => {
  try {
    const { postID, userUid } = req.body;
    const db = getDb();
    const result = db.prepare('DELETE FROM posts WHERE post_id = ? AND user_id = ?').run(postID, userUid);
    if (result.changes > 0) res.json({ success: true });
    else res.json({ success: false, msg: '削除対象なし' });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 投稿修正
router.post('/edit', (req, res) => {
  try {
    const { postID, userUid, newContent } = req.body;
    if (!newContent || !newContent.trim()) return res.json({ success: false, msg: '内容を入力してください' });
    const db = getDb();
    const result = db.prepare('UPDATE posts SET content = ? WHERE post_id = ? AND user_id = ?').run(newContent.trim(), postID, userUid);
    if (result.changes > 0) res.json({ success: true, msg: '修正しました' });
    else res.json({ success: false, msg: '修正対象なし' });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});


// 共感＋3問回答を送信
router.post('/empathy', async (req, res) => {
  try {
    const { postId, uid, userName, empathyType, answer1, answer2, answer3, freeComment, isMember } = req.body;
    if (!postId || !uid || !empathyType || !answer1 || !answer2 || !answer3) {
      return res.json({ success: false, msg: '必須項目が不足しています' });
    }
    const db = getDb();
    // Upsert
    db.prepare(`INSERT INTO empathy_responses (post_id, user_id, user_name, empathy_type, answer1, answer2, answer3, free_comment, is_member)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(post_id, user_id) DO UPDATE SET empathy_type=excluded.empathy_type, answer1=excluded.answer1, answer2=excluded.answer2, answer3=excluded.answer3, free_comment=excluded.free_comment, is_member=excluded.is_member, created_at=CURRENT_TIMESTAMP`)
      .run(postId, uid, userName || '匿名', empathyType, answer1, answer2, answer3, freeComment || '', isMember ? 1 : 0);
    
    // CoWellコイン付与（共感 5pt）
    if (!isMember) awardMarigan(uid, 'empathy', postId);

    // Return updated summary
    const responses = db.prepare('SELECT * FROM empathy_responses WHERE post_id = ?').all(postId);
    const summary = buildEmpathySummary(responses);
    res.json({ success: true, summary });

    // 共感3件以上で非同期スコア再計算（レスポンスをブロックしない）
    if (responses.length >= 3) {
      updateScoreFromEmpathy(db, postId, responses).catch(e => console.error('empathy score update:', e.message));
    }
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 投稿の共感サマリー取得
router.get('/empathy/:postId', (req, res) => {
  try {
    const db = getDb();
    const responses = db.prepare('SELECT * FROM empathy_responses WHERE post_id = ?').all(req.params.postId);
    const summary = buildEmpathySummary(responses);
    res.json({ success: true, summary });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 投稿の共感詳細取得（メンバー用）
router.get('/empathy-detail/:postId', (req, res) => {
  try {
    const db = getDb();
    const responses = db.prepare(`
      SELECT er.*, u.avatar FROM empathy_responses er
      LEFT JOIN users u ON er.user_id = u.id
      WHERE er.post_id = ? ORDER BY er.created_at DESC
    `).all(req.params.postId);
    const summary = buildEmpathySummary(responses);
    res.json({ success: true, responses, summary });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// ユーザーの回答済み投稿一覧を取得
router.get('/empathy-check/:uid', (req, res) => {
  try {
    const db = getDb();
    const answered = db.prepare('SELECT post_id FROM empathy_responses WHERE user_id = ?').all(req.params.uid);
    res.json({ success: true, answeredPostIds: answered.map(r => r.post_id) });
  } catch (e) {
    res.json({ success: false, answeredPostIds: [] });
  }
});

// 共感集計からAI7軸スコア変換
router.post('/empathy-to-score', async (req, res) => {
  try {
    const { postId } = req.body;
    const db = getDb();
    const post = db.prepare('SELECT * FROM posts WHERE post_id = ?').get(postId);
    if (!post) return res.json({ success: false, msg: '投稿が見つかりません' });
    
    const responses = db.prepare('SELECT * FROM empathy_responses WHERE post_id = ?').all(postId);
    if (responses.length === 0) return res.json({ success: false, msg: '共感回答がありません' });
    
    const summary = buildEmpathySummary(responses);
    const isFood = post.category === '🍱 食事・栄養';
    
    const prompt = `あなたは健康経営アナリストです。社員の共感回答データから7軸スコア(各1-5)をJSON形式で算出してください。

【投稿内容】
${post.content}

【投稿カテゴリ】${isFood ? '食事・栄養' : '相談・提案'}

【共感回答の集計】
- 回答者数: ${summary.totalCount}名
- 共感タイプ別:
${Object.entries(summary.typeCounts).map(([k,v]) => `  ${k}: ${v}名`).join('\n')}

- 設問回答の集計:
${JSON.stringify(summary.answerAggregation, null, 2)}

- 自由記入コメント:
${responses.filter(r => r.free_comment).map(r => `「${r.free_comment}」`).join('\n') || '（なし）'}

【変換ルール】
- 回答者が多いほど freq を高く
- 「ヤバい」「深刻」系の回答が多いほど risk, urgency, safety を高く
- 「会社が動けば」「参加する」系が多いほど value, needs を高く
- 法的義務に関わる内容があれば legal を高く
- 食事投稿の場合、legal は低め(1-2)に設定

出力: JSONのみ。他のテキスト不要。
{"legal":3,"risk":3,"freq":3,"urgency":3,"safety":3,"value":3,"needs":3}`;

    const aiResult = await callAIWithFallback('JSON出力専門AI。指定JSON形式のみ出力。', prompt);
    if (!aiResult) return res.json({ success: false, msg: 'AI変換失敗' });
    
    const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.json({ success: false, msg: 'AIスコア解析失敗' });
    
    const scores = JSON.parse(jsonMatch[0]);
    res.json({ success: true, scores, summary });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 共感データから投稿スコアを非同期更新
async function updateScoreFromEmpathy(db, postId, responses) {
  const post = db.prepare('SELECT * FROM posts WHERE post_id = ?').get(postId);
  if (!post || !post.analysis) return;

  const summary = buildEmpathySummary(responses);
  const isFood = post.category === '🍱 食事・栄養';

  const prompt = `社員の共感回答データから7軸スコア(各1-5)をJSON形式で算出。

【投稿内容】${post.content.substring(0, 200)}
【カテゴリ】${isFood ? '食事・栄養' : '相談・提案'}
【共感】回答${summary.totalCount}名 タイプ:${Object.entries(summary.typeCounts).map(([k,v]) => k+':'+v).join(',')}
【コメント】${responses.filter(r => r.free_comment).slice(0, 5).map(r => r.free_comment).join('／') || 'なし'}

ルール: 回答者が多い→freq高い。yabai/senmon多い→risk,urgency,safety高い。kaisha/issho多い→value,needs高い。食事→legal低め(1-2)。
出力:JSONのみ。例:{"is_target":true,"legal":2,"risk":3,"freq":4,"urgency":2,"safety":3,"value":4,"needs":3}`;

  const aiResult = await callAIWithFallback('JSON出力専門AI。指定JSON形式のみ出力。', prompt);
  if (!aiResult) return;
  const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return;

  try {
    const newScores = JSON.parse(jsonMatch[0]);
    // 既存のAIコメント部分は保持し、スコアのみ差し替え
    const parts = post.analysis.split('///SCORE///');
    const textPart = parts[0].trim();

    // 既存スコアとマージ（is_planned等のフラグを保持）
    let existingFlags = {};
    try { existingFlags = JSON.parse(parts[1].trim()); } catch (e) {}
    const merged = { ...existingFlags, ...newScores };

    db.prepare('UPDATE posts SET analysis = ? WHERE post_id = ?')
      .run(textPart + '\n///SCORE///\n' + JSON.stringify(merged), postId);
  } catch (e) {
    console.error('empathy score parse error:', e.message);
  }
}

// 共感サマリー構築ヘルパー
function buildEmpathySummary(responses) {
  const typeCounts = {};
  const answerAggregation = {};
  const memberResponses = [];
  
  responses.forEach(r => {
    // タイプ別カウント
    typeCounts[r.empathy_type] = (typeCounts[r.empathy_type] || 0) + 1;
    
    // 回答集計
    if (!answerAggregation[r.empathy_type]) {
      answerAggregation[r.empathy_type] = { q1: {}, q2: {}, q3: {} };
    }
    const agg = answerAggregation[r.empathy_type];
    agg.q1[r.answer1] = (agg.q1[r.answer1] || 0) + 1;
    agg.q2[r.answer2] = (agg.q2[r.answer2] || 0) + 1;
    agg.q3[r.answer3] = (agg.q3[r.answer3] || 0) + 1;
    
    // メンバー回答
    if (r.is_member) {
      memberResponses.push(r);
    }
  });
  
  return {
    totalCount: responses.length,
    typeCounts,
    answerAggregation,
    memberResponses,
    memberCount: memberResponses.length,
    comments: responses.filter(r => r.free_comment).map(r => ({
      userName: r.user_name,
      comment: r.free_comment,
      empathyType: r.empathy_type,
      isMember: r.is_member
    }))
  };
}

// ユーザーの投稿に対する未読コメント数を取得
router.get('/my-unread/:uid', (req, res) => {
  try {
    const db = getDb();
    const uid = req.params.uid;
    // ユーザーの投稿一覧
    const myPosts = db.prepare('SELECT post_id FROM posts WHERE user_id = ?').all(uid);
    if (!myPosts.length) return res.json({ success: true, unread: {} });

    var unread = {};
    myPosts.forEach(function(p) {
      var pid = p.post_id;
      // 既読時刻を取得
      var readStatus = db.prepare('SELECT last_read_at FROM post_read_status WHERE user_id = ? AND post_id = ?').get(uid, pid);
      var lastRead = readStatus ? readStatus.last_read_at : null;

      // member_chats（推進メンバーからのチャット）の未読数
      var chatCount = 0;
      if (lastRead) {
        chatCount = db.prepare('SELECT COUNT(*) as c FROM member_chats WHERE post_id = ? AND created_at > ?').get(pid, lastRead).c;
      } else {
        chatCount = db.prepare('SELECT COUNT(*) as c FROM member_chats WHERE post_id = ?').get(pid).c;
      }

      if (chatCount > 0) {
        unread[pid] = chatCount;
      }
    });

    res.json({ success: true, unread: unread });
  } catch (e) { res.json({ success: true, unread: {} }); }
});

// 投稿の管理者コメントを既読にする
router.post('/mark-read', (req, res) => {
  try {
    const db = getDb();
    var uid = req.body.uid;
    var postId = req.body.postId;
    if (!uid || !postId) return res.json({ success: false });
    db.prepare("INSERT INTO post_read_status (user_id, post_id, last_read_at) VALUES (?, ?, datetime('now')) ON CONFLICT(user_id, post_id) DO UPDATE SET last_read_at = datetime('now')").run(uid, postId);
    res.json({ success: true });
  } catch (e) { res.json({ success: false }); }
});

// ========================================
// 「今日の空気」ダッシュボード API
// ========================================
router.get('/atmosphere', (req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    // 今日の投稿数
    const todayPosts = db.prepare("SELECT COUNT(*) as cnt FROM posts WHERE date(created_at) = ?").get(today);

    // 今日の食事投稿数
    const todayFood = db.prepare("SELECT COUNT(*) as cnt FROM posts WHERE date(created_at) = ? AND category = '🍱 食事・栄養'").get(today);

    // 今日の相談投稿数
    const todayConsult = db.prepare("SELECT COUNT(*) as cnt FROM posts WHERE date(created_at) = ? AND category != '🍱 食事・栄養'").get(today);

    // 今日のアクティブユーザー数（投稿 or 共感した人）
    const todayActivePosters = db.prepare("SELECT COUNT(DISTINCT user_id) as cnt FROM posts WHERE date(created_at) = ?").get(today);
    const todayActiveEmpathy = db.prepare("SELECT COUNT(DISTINCT user_id) as cnt FROM empathy_responses WHERE date(created_at) = ?").get(today);
    const todayActive = Math.max((todayActivePosters ? todayActivePosters.cnt : 0), (todayActiveEmpathy ? todayActiveEmpathy.cnt : 0));

    // 全ユーザー数
    const totalUsers = db.prepare("SELECT COUNT(*) as cnt FROM users").get();

    // 今日のバディー気分回答の集計（buddy_messagesから推定）
    // 元気度は投稿率から簡易算出
    const participationRate = totalUsers.cnt > 0 ? Math.round((todayActive / totalUsers.cnt) * 100) : 0;

    // 今週の共感総数
    const weekEmpathy = db.prepare("SELECT COUNT(*) as cnt FROM empathy_responses WHERE date(created_at) >= ?").get(weekAgo);

    // 今週のごはん番長（食事投稿で最も共感をもらった人）
    const foodKing = db.prepare(`
      SELECT p.user_id, p.nickname, p.avatar, COUNT(e.id) as reaction_count
      FROM posts p
      JOIN empathy_responses e ON e.post_id = p.post_id
      WHERE p.category = '🍱 食事・栄養'
        AND date(p.created_at) >= ?
      GROUP BY p.user_id
      ORDER BY reaction_count DESC
      LIMIT 1
    `).get(weekAgo);

    // 今週の食事投稿トップ3（反応数順）
    const topFoodPosts = db.prepare(`
      SELECT p.post_id, p.nickname, p.avatar, p.image_url, p.content,
        COUNT(e.id) as reaction_count
      FROM posts p
      LEFT JOIN empathy_responses e ON e.post_id = p.post_id
      WHERE p.category = '🍱 食事・栄養'
        AND date(p.created_at) >= ?
        AND p.image_url IS NOT NULL AND p.image_url != ''
      GROUP BY p.post_id
      ORDER BY reaction_count DESC
      LIMIT 3
    `).all(weekAgo);

    // 今日のストリーク継続者数
    const streakUsers = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE streak_count >= 3").get();

    // チャレンジ参加者数
    let challengeParticipants = 0;
    try {
      const cp = db.prepare("SELECT COUNT(DISTINCT user_id) as cnt FROM challenge_participants WHERE challenge_id IN (SELECT challenge_id FROM challenges WHERE status = 'active')").get();
      challengeParticipants = cp ? cp.cnt : 0;
    } catch(e) {}

    res.json({
      success: true,
      today: {
        posts: todayPosts ? todayPosts.cnt : 0,
        food: todayFood ? todayFood.cnt : 0,
        consult: todayConsult ? todayConsult.cnt : 0,
        active: todayActive,
        totalUsers: totalUsers ? totalUsers.cnt : 0,
        participationRate: participationRate
      },
      week: {
        empathyCount: weekEmpathy ? weekEmpathy.cnt : 0,
        foodKing: foodKing || null,
        topFoodPosts: topFoodPosts || []
      },
      community: {
        streakUsers: streakUsers ? streakUsers.cnt : 0,
        challengeParticipants: challengeParticipants
      }
    });
  } catch (e) {
    console.error('[atmosphere]', e.message);
    res.json({ success: false, msg: e.message });
  }
});

module.exports = router;
