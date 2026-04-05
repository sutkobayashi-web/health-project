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

    // Gemini Vision で栄養分析
    const nutSys = `あなたはベテラン食事アドバイザーです。国立長寿医療研究センター「栄養改善パック」（2020）に基づき、投稿された食事画像を簡潔に分析してください。

【回答ルール】
- 推定カロリーを冒頭に記載（例: 約650kcal）
- 良い点1つ、改善ポイント1つを簡潔に（各1〜2行）
- 栄養バランスの詳細はレーダーチャートで表示するため、文章では繰り返さない
- 全体で100〜150字程度に収める
- ★★★マークダウン記法は使わない。強調は【】で囲む★★★

【重要】テキストの最後に以下のJSON形式で推定栄養データを必ず出力。
///NUTRIENTS///
{"calories":{"value":数値,"unit":"kcal"},"protein":{"value":数値,"unit":"g"},"fat":{"value":数値,"unit":"%"},"carbs":{"value":数値,"unit":"%"},"vitamin":{"value":数値,"unit":"g"},"mineral":{"value":数値,"unit":"mg"},"salt":{"value":数値,"unit":"g"}}

各項目のvalueは推定実数値（小数点1桁まで）:
- calories: 推定カロリー（kcal）。目標: 450-650kcal/食
- protein: 推定たんぱく質量（g）。目標: 20g/食
- fat: 推定脂質エネルギー比（%）。目標: 20-30%
- carbs: 推定炭水化物エネルギー比（%）。目標: 50-65%
- vitamin: 推定野菜量（g）。目標: 120g/食（1日350g）
- mineral: 推定カルシウム量（mg）。目標: 227mg/食（1日680mg）
- salt: 推定塩分量（g）。目標: 2.5g未満/食（1日7.5g未満）`;
    let nutResRaw = await callGeminiVision(nutSys, imageBase64, mimeType);
    if (!nutResRaw || nutResRaw === '通信エラー') nutResRaw = '解析できませんでした。';

    // 栄養スコアJSONを抽出
    let nutrientScores = null;
    let nutRes = nutResRaw;
    const nutMatch = nutResRaw.match(/\/\/\/NUTRIENTS\/\/\/\s*(\{[\s\S]*?\})/);
    if (nutMatch) {
      try { nutrientScores = JSON.parse(nutMatch[1]); } catch(e) {}
      nutRes = nutResRaw.replace(/\/\/\/NUTRIENTS\/\/\/[\s\S]*$/, '').trim();
    }

    // Groq でヘルスアドバイザーコメント
    const nurseSys = `あなたはAIヘルスアドバイザーです。相手:${dName}。つぶやき:「${comment}」食事分析:「${nutRes}」。
良い点を1つ褒め、改善があれば1つだけ具体的に提案。食事記録の継続を一言で励ます。
全体で80〜120字程度。マークダウン不可。強調は【】。最後に「📚 出典:」でガイドライン名を明記。`;
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

    res.json({ success: true, analysis: { nutrition: nutRes, nurse: nurseRes, nutrientScores }, imageUrl, marigan: mariganResult });
  } catch (e) {
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

module.exports = router;
