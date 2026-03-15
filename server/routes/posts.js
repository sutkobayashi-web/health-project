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
        imageUrl: p.image_url || '', authorRank: rank,
        likeCount: likesArr.length,
        isLiked: likesArr.includes(viewerUid),
        authorUid: p.user_id
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

    const sys = `あなたはエビデンスに基づく健康支援を行うAI保健師兼アナリストです。相手:${dName}。

# エビデンス基盤
${EVIDENCE_BASE}

# タスク
1. 「${dName}さんへ」から始まる200文字以内のケアコメントを書く。
   - 行動変容技法（COM-Bモデル: Capability・Opportunity・Motivation）の観点で分析
   - 内発的動機（自律性・有能性・関係性）を引き出す声かけ
   - スモールステップで実践可能な提案があれば1つだけ
   - 助言には根拠を括弧で簡潔に付記（例:「栄養改善パック2020」）
   - エビデンスのない助言はしない
2. ///SCORE/// という区切り文字の後ろに、この投稿の7軸評価と「要評価判定」をJSONで出力。
   Format: [ケアコメント] ///SCORE/// { "is_target": true, "legal": 1, "risk": 1, "freq": 1, "urgency": 1, "safety": 1, "value": 1, "needs": 1 }`;
    let aiFullRes = await callGroqApi(sys, content);
    if (!aiFullRes || !aiFullRes.includes('///SCORE///')) {
      aiFullRes = `【AI保健師】\n${dName}さん、投稿ありがとうございます！\n///SCORE///\n{"is_target":true, "legal": 1, "risk": 1, "freq": 1, "urgency": 1, "safety": 1, "value": 1, "needs": 1}`;
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
    const nutSys = `あなたはベテラン管理栄養士です。国立長寿医療研究センター「栄養改善パック」（2020）に基づき、投稿された食事画像を分析してください。

【分析の観点】
- 主菜: たんぱく質源の有無と推定量（目標: 1.0g/kg体重/日、毎食均等が理想）
- 副菜: 野菜量の推定（目標: 1日350g、緑黄色:淡色=1:2）
- 主食・主菜・副菜の3品構成になっているか
- ビタミン・ミネラル源（特にビタミンD）の有無
- 1日3食のうちこの食事の位置づけ
- CANフレームワーク（Convenient・Attractive・Normative）の観点で改善提案があれば簡潔に`;
    let nutRes = await callGeminiVision(nutSys, imageBase64, mimeType);
    if (!nutRes || nutRes === '通信エラー') nutRes = '解析できませんでした。';

    // Groq で保健師コメント
    const nurseSys = `あなたはエビデンスに基づく健康支援を行うAI保健師です。相手:${dName}。つぶやき:「${comment}」食事分析:「${nutRes}」。
栄養改善パック（2020）の基準に照らし、良い点を具体的に褒め、改善点があれば1つだけスモールステップで提案してください。
行動変容技法「モニタリング&フィードバック」として、食事記録の継続を励ましてください。エビデンスのない助言はしないこと。`;
    let nurseRes = await callGroqApi(nurseSys, '声かけ');
    if (!nurseRes) nurseRes = `${dName}さん、食事の投稿ありがとうございます！`;

    const finalForDb = `【AI栄養士】\n${nutRes}\n\n【AI保健師】\n${nurseRes}\n///SCORE///\n{"is_target":false, "legal":1,"risk":1,"freq":1,"urgency":1,"safety":1,"value":1,"needs":1}`;
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

module.exports = router;
