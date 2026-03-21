const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../services/db');
const { callGroqApi, callGeminiVision, parsePostScore, EVIDENCE_BASE } = require('../services/ai');

const router = express.Router();

// 投稿一覧取得
router.get('/public', (req, res) => {
  try {
    const pageIndex = parseInt(req.query.page) || 0;
    const viewerUid = req.query.uid || '';
    const limit = 10;
    const offset = pageIndex * limit;
    const db = getDb();

    const posts = db.prepare(`SELECT * FROM posts WHERE status IN ('open','public','resolved','planned') ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(limit + 1, offset);
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

      return {
        id: p.post_id, row: p.id,
        date: new Date(p.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }),
        content: (p.content || '').replace(/^【写真】/, ''),
        analysis: parsed.text,
        nickname: p.nickname || '匿名', avatar: p.avatar || '🙂',
        imageUrl: p.image_url || '', category: p.category || '相談', authorRank: rank,
        likeCount: likesArr.length,
        isLiked: likesArr.includes(viewerUid),
        authorUid: p.user_id,
        empathyCounts: empathyCountsByPost[p.post_id] || null
      };
    });
    res.json({ posts: mappedPosts, hasNext });
  } catch (e) {
    res.json({ posts: [], hasNext: false, error: e.toString() });
  }
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
    let aiFullRes = await callGroqApi(sys, content);
    if (!aiFullRes || !aiFullRes.includes('///SCORE///')) {
      aiFullRes = `【AIヘルスアドバイザー】\n${dName}さん、投稿ありがとうございます！\n///SCORE///\n{"is_target":true, "legal": 1, "risk": 1, "freq": 1, "urgency": 1, "safety": 1, "value": 1, "needs": 1}`;
    }

    db.prepare(`INSERT INTO posts (post_id, user_id, content, analysis, nickname, avatar, status, category, department, birth_date)
      VALUES (?, ?, ?, ?, ?, ?, 'open', '相談', ?, ?)`).run(pid, uid, content, aiFullRes, dName, decodeURIComponent(avatar), department, birthDate);

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

    // 画像保存
    let imageUrl = '';
    try {
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const fileName = `food_${Date.now()}.jpg`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, Buffer.from(imageBase64, 'base64'));
      imageUrl = `/uploads/${fileName}`;
    } catch (e) { imageUrl = '(保存失敗)'; }

    // Gemini Vision で栄養分析
    const nutSys = `あなたはベテラン食事アドバイザーです。国立長寿医療研究センター「栄養改善パック」（2020）に基づき、投稿された食事画像を分析してください。

【分析の観点】
- 主菜: たんぱく質源の有無と推定量（目標: 1.0g/kg体重/日、毎食均等が理想）
- 副菜: 野菜量の推定（目標: 1日350g、緑黄色:淡色=1:2）
- 主食・主菜・副菜の3品構成になっているか
- ビタミン・ミネラル源（特にビタミンD）の有無
- 1日3食のうちこの食事の位置づけ
- CANフレームワーク（Convenient・Attractive・Normative）の観点で改善提案があれば簡潔に
- ★★★マークダウン記法（**太字**や###見出し等）は絶対に使わない。強調したい語句は【】で囲むこと★★★`;
    let nutRes = await callGeminiVision(nutSys, imageBase64, mimeType);
    if (!nutRes || nutRes === '通信エラー') nutRes = '解析できませんでした。';

    // Groq でヘルスアドバイザーコメント
    const nurseSys = `あなたはエビデンスに基づく健康支援を行うAIヘルスアドバイザーです。相手:${dName}。つぶやき:「${comment}」食事分析:「${nutRes}」。
栄養改善パック（2020）の基準に照らし、良い点を具体的に褒め、改善点があれば1つだけスモールステップで提案してください。
行動変容技法「モニタリング&フィードバック」として、食事記録の継続を励ましてください。エビデンスのない助言はしないこと。
★★★マークダウン記法（**太字**や###見出し等）は絶対に使わない。強調したい語句は【】で囲むこと★★★
★★★回答の最後に必ず「📚 出典:」として根拠となるガイドライン名を明記すること★★★`;
    let nurseRes = await callGroqApi(nurseSys, '声かけ');
    if (!nurseRes) nurseRes = `${dName}さん、食事の投稿ありがとうございます！`;

    const finalForDb = `【AI食事アドバイザー】\n${nutRes}\n\n【AIヘルスアドバイザー】\n${nurseRes}\n///SCORE///\n{"is_target":false, "legal":1,"risk":1,"freq":1,"urgency":1,"safety":1,"value":1,"needs":1}`;
    const pid = 'post_' + uuidv4().substring(0, 8);
    const status = isPublic ? 'open' : 'private';

    db.prepare(`INSERT INTO posts (post_id, user_id, content, analysis, nickname, avatar, status, category, department, birth_date, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, '🍱 食事・栄養', ?, ?, ?)`).run(pid, uid, `【写真】${comment}`, finalForDb, dName, decodeURIComponent(avatar), status, department, birthDate, imageUrl);

    res.json({ success: true, analysis: { nutrition: nutRes, nurse: nurseRes }, imageUrl });
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
    const responses = db.prepare('SELECT * FROM empathy_responses WHERE post_id = ? ORDER BY created_at DESC').all(req.params.postId);
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

    const aiResult = await callGroqApi('JSON出力専門AI。指定JSON形式のみ出力。', prompt);
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

  const aiResult = await callGroqApi('JSON出力専門AI。指定JSON形式のみ出力。', prompt);
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

module.exports = router;
