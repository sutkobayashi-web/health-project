const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../services/db');
const { callGroqApi, parsePostScore, evaluateVoiceByAI } = require('../services/ai');
const { authAdmin } = require('../middleware/auth');

const router = express.Router();

const STATUS = {
  CANDIDATE: 'candidate', MEMBER_REVIEW: 'member_review', EXEC_PENDING: 'exec_pending',
  APPROVED: 'approved', REJECTED: 'rejected', IN_EXECUTION: 'in_execution',
  MEASURING: 'measuring', COMPLETED: 'completed'
};

// Inbox取得(open投稿)
router.get('/inbox', (req, res) => {
  try {
    const db = getDb();
    const posts = db.prepare("SELECT * FROM posts WHERE status = 'open' ORDER BY created_at DESC").all();
    const chatCounts = {};
    db.prepare('SELECT voice_id, COUNT(*) as cnt FROM admin_discussions GROUP BY voice_id').all()
      .forEach(r => { chatCounts[r.voice_id] = r.cnt; });

    const result = posts.map(r => {
      const parsed = parsePostScore(r.analysis);
      let isTarget = true, isPlanned = false;
      if (parsed.score) {
        if (parsed.score.hasOwnProperty('is_target')) isTarget = parsed.score.is_target;
        if (parsed.score.hasOwnProperty('is_planned')) isPlanned = parsed.score.is_planned;
      }
      let nurse = '', nutri = '';
      if (parsed.text.includes('【AI保健師】')) {
        const p = parsed.text.split('【AI保健師】');
        if (p[0].includes('【AI栄養士】')) nutri = p[0].replace('【AI栄養士】', '').trim();
        nurse = p[1] ? p[1].trim() : '';
      } else { nurse = parsed.text; }
      const likesArr = r.likes ? r.likes.split(',').filter(x => x) : [];
      const demotesArr = r.demotes ? r.demotes.split(',').filter(x => x) : [];
      const dateStr = new Date(r.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
      return [r.id, r.post_id, r.content, r.analysis, r.nickname, r.avatar, likesArr.length, r.post_id, r.category, r.status, r.user_id, r.image_url, nurse, nutri, dateStr, chatCounts[r.post_id] || 0, isTarget, isPlanned, demotesArr.length];
    });
    res.json(result);
  } catch (e) { res.json([]); }
});

// 解決済み取得
router.get('/resolved', (req, res) => {
  try {
    const db = getDb();
    const posts = db.prepare("SELECT * FROM posts WHERE status = 'resolved' ORDER BY created_at DESC").all();
    const result = posts.map(r => {
      const dateStr = new Date(r.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
      return [r.id, r.post_id, r.content, r.analysis, r.nickname, r.avatar, 0, r.post_id, r.category, r.status, r.user_id, r.image_url, '', '', dateStr, 0, false, false, 0];
    });
    res.json(result);
  } catch (e) { res.json([]); }
});

// ディスカッションログ取得
router.get('/discussion/:voiceId', (req, res) => {
  try {
    const db = getDb();
    const voiceId = req.params.voiceId;
    const memberMap = {};
    db.prepare('SELECT name, avatar FROM core_members').all().forEach(m => { memberMap[m.name.trim()] = m.avatar; });
    const logs = db.prepare("SELECT * FROM admin_discussions WHERE voice_id = ? AND role != 'member_comment' ORDER BY created_at").all(voiceId);
    const result = logs.map(d => {
      let av = memberMap[d.member_name.trim()];
      if (!av && d.avatar) av = d.avatar;
      if (d.role === 'AI_Council') av = d.avatar;
      return {
        row: d.id, member: d.member_name, role: d.role, comment: d.comment,
        timestamp: new Date(d.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }),
        avatar: av || '🤖'
      };
    });
    res.json(result);
  } catch (e) { res.json([]); }
});

// ディスカッションコメント投稿
router.post('/discussion/post', (req, res) => {
  try {
    const { voiceId, memberName, comment, role, avatar } = req.body;
    const db = getDb();
    let finalAv = avatar;
    if (!finalAv) {
      const member = db.prepare('SELECT avatar FROM core_members WHERE name = ?').get(memberName);
      if (member) finalAv = member.avatar;
    }
    db.prepare('INSERT INTO admin_discussions (voice_id, member_name, role, comment, avatar) VALUES (?, ?, ?, ?, ?)').run(voiceId, memberName, role || 'Admin', comment, finalAv || '');
    // 更新後のログを返す
    const logs = db.prepare('SELECT * FROM admin_discussions WHERE voice_id = ? ORDER BY created_at').all(voiceId);
    res.json(logs.map(d => ({
      row: d.id, member: d.member_name, role: d.role, comment: d.comment,
      timestamp: new Date(d.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }),
      avatar: d.avatar || '🤖'
    })));
  } catch (e) { res.json([]); }
});

// ディスカッション削除
router.post('/discussion/delete', (req, res) => {
  try {
    const { voiceId, row, memberName } = req.body;
    const db = getDb();
    const target = db.prepare('SELECT voice_id, member_name FROM admin_discussions WHERE id = ?').get(row);
    if (target && target.voice_id === voiceId && target.member_name === memberName) {
      db.prepare('DELETE FROM admin_discussions WHERE id = ?').run(row);
      return res.json({ success: true });
    }
    res.json({ success: false, msg: '削除対象が不整合です' });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 重点ステータストグル
router.post('/toggle-target', (req, res) => {
  try {
    const { pid, currentStatus } = req.body;
    const db = getDb();
    let post = db.prepare('SELECT analysis FROM posts WHERE post_id = ?').get(pid);
    if (!post) post = db.prepare('SELECT analysis FROM posts WHERE post_id = ?').get('post_' + pid);
    if (!post) return res.json({ success: false });
    let analysis = post.analysis;
    if (analysis && analysis.includes('///SCORE///')) {
      const parts = analysis.split('///SCORE///');
      const s = JSON.parse(parts[1].trim());
      s.is_target = !currentStatus;
      db.prepare('UPDATE posts SET analysis = ? WHERE post_id = ?').run(parts[0] + '\n///SCORE///\n' + JSON.stringify(s), pid);
      return res.json({ success: true, newStatus: !currentStatus });
    }
    res.json({ success: false });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 投稿ステータス更新
router.post('/update-status', (req, res) => {
  try {
    const { pid, status } = req.body;
    const db = getDb();
    const result = db.prepare('UPDATE posts SET status = ? WHERE post_id = ?').run(status, pid);
    if (result.changes > 0) res.json({ success: true, msg: '更新しました' });
    else res.json({ success: false, msg: '不明なID' });
  } catch (e) { res.json({ success: false, msg: 'エラー' }); }
});

// チーム評価保存
router.post('/evaluation/save', (req, res) => {
  try {
    const { postId, memberName, scores, comment } = req.body;
    const db = getDb();
    const existing = db.prepare('SELECT id FROM team_evaluations WHERE post_id = ? AND member_name = ?').get(postId, memberName);
    if (existing) {
      db.prepare('UPDATE team_evaluations SET legal=?, risk=?, freq=?, urgency=?, safety=?, value=?, needs=?, comment=? WHERE id=?')
        .run(scores.legal, scores.risk, scores.freq, scores.urgency, scores.safety, scores.value, scores.needs, comment || '', existing.id);
    } else {
      db.prepare('INSERT INTO team_evaluations (post_id, member_name, legal, risk, freq, urgency, safety, value, needs, comment) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .run(postId, memberName, scores.legal, scores.risk, scores.freq, scores.urgency, scores.safety, scores.value, scores.needs, comment || '');
    }
    // 平均スコアをチェックし閾値超えで自動格上げ
    const THRESHOLD = 21; // 35点満点の60%
    const evals = db.prepare('SELECT legal, risk, freq, urgency, safety, value, needs FROM team_evaluations WHERE post_id = ?').all(postId);
    if (evals.length > 0) {
      let totalAvg = 0;
      ['legal','risk','freq','urgency','safety','value','needs'].forEach(k => {
        const sum = evals.reduce((s, e) => s + (Number(e[k]) || 0), 0);
        totalAvg += sum / evals.length;
      });
      if (totalAvg >= THRESHOLD) {
        // is_targetをtrueに設定（重点検討に格上げ）
        const post = db.prepare('SELECT analysis, post_id FROM posts WHERE post_id = ?').get(postId);
        if (!post) {
          // post_プレフィックスなしで再検索
          const post2 = db.prepare('SELECT analysis, post_id FROM posts WHERE post_id = ?').get('post_' + postId);
          if (post2) {
            let analysis = post2.analysis || '';
            if (analysis.includes('///SCORE///')) {
              const parts = analysis.split('///SCORE///');
              try { const s = JSON.parse(parts[1].trim()); s.is_target = true; db.prepare('UPDATE posts SET analysis = ? WHERE post_id = ?').run(parts[0] + '\n///SCORE///\n' + JSON.stringify(s), post2.post_id); } catch(e) {}
            }
          }
        } else {
          let analysis = post.analysis || '';
          if (analysis.includes('///SCORE///')) {
            const parts = analysis.split('///SCORE///');
            try { const s = JSON.parse(parts[1].trim()); s.is_target = true; db.prepare('UPDATE posts SET analysis = ? WHERE post_id = ?').run(parts[0] + '\n///SCORE///\n' + JSON.stringify(s), post.post_id); } catch(e) {}
          }
        }
        res.json({ success: true, msg: '評価を送信しました！平均スコアが閾値（' + THRESHOLD + '点）を超えたため、重点検討に自動格上げされました！', autoPromoted: true, avgScore: Math.round(totalAvg * 10) / 10 });
        return;
      }
    }
    res.json({ success: true, msg: '評価をチームに共有しました！' });
  } catch (e) { res.json({ success: false, msg: '保存エラー: ' + e.message }); }
});

// チーム評価取得
router.get('/evaluation/:postId', (req, res) => {
  try {
    const db = getDb();
    const evals = db.prepare('SELECT * FROM team_evaluations WHERE post_id = ?').all(req.params.postId);
    res.json(evals.map(e => ({
      memberName: e.member_name,
      scores: { legal: e.legal, risk: e.risk, freq: e.freq, urgency: e.urgency, safety: e.safety, value: e.value, needs: e.needs },
      comment: e.comment,
      date: new Date(e.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })
    })));
  } catch (e) { res.json([]); }
});

// AIシミュレーション会議
router.post('/simulate-meeting', async (req, res) => {
  try {
    const { pid, planData } = req.body;
    const sysPrompt = `あなたは企業の社内世論シミュレーターです。
【議題】に対して、以下のメンバーから数名を選んで議論してください。
メンバー: 佐藤さん(20代/ドライ), 山本部長(50代/熱血), 高橋リーダー(30代/調整), 中村さん(40代/批判), 伊藤くん(20代/意識高い), 権藤専務(60代/経営), 林さん(パート/現場), AI産業医, AI保健師, AI栄養士, AI管理課長

【議題】${planData.title} ${planData.draft}
【出力形式】
必ずJSON配列のみを出力。前後に説明文を付けないこと。avatarは必ず「絵文字1文字」。
[{"role": "AI産業医", "avatar": "🩺", "message": "..."}]`;

    const resText = await callGroqApi(sysPrompt, '議論開始');
    if (!resText) return res.json({ success: false, msg: 'AI無応答' });

    const startIdx = resText.indexOf('[');
    if (startIdx === -1) return res.json({ success: false, msg: 'AI応答にJSON配列が見つかりません' });
    let depth = 0, endIdx = -1;
    for (let i = startIdx; i < resText.length; i++) {
      if (resText[i] === '[') depth++;
      else if (resText[i] === ']') { depth--; if (depth === 0) { endIdx = i; break; } }
    }
    if (endIdx === -1) return res.json({ success: false, msg: 'JSON配列の終端が見つかりません' });
    const jsonStr = resText.substring(startIdx, endIdx + 1);

    const discussion = JSON.parse(jsonStr);
    const db = getDb();
    discussion.forEach(d => {
      let safeAvatar = d.avatar;
      if (!safeAvatar || safeAvatar.length > 4) safeAvatar = '🤖';
      db.prepare('INSERT INTO admin_discussions (voice_id, member_name, role, comment, avatar) VALUES (?,?,?,?,?)').run(pid, d.role, 'AI_Council', d.message, safeAvatar);
    });
    res.json({ success: true, discussion });
  } catch (e) { res.json({ success: false, msg: 'エラー: ' + e.message }); }
});

// AIリプライ生成
router.post('/ai-reply', async (req, res) => {
  try {
    const { pid, planTitle, humanComment } = req.body;
    const sysPrompt = `あなたは企業の社内世論AIです。人間担当者の発言に対し、11人のプールから1~2名が即座に反応してください。
【議題】${planTitle || '未定の議題'}
【人間発言】"${humanComment}"
【出力形式】JSON配列のみ。avatarは必ず「絵文字1文字」。
[{"role": "中村さん (批判)", "avatar": "👨‍💻", "message": "..."}]`;
    const resText = await callGroqApi(sysPrompt, 'リアクション生成');
    if (!resText) return res.json({ success: false });
    const match = resText.match(/\[[\s\S]*\]/);
    if (!match) return res.json({ success: false, msg: 'JSON抽出失敗' });
    const replies = JSON.parse(match[0]);
    const db = getDb();
    replies.forEach(r => {
      let safeAvatar = r.avatar;
      if (!safeAvatar || safeAvatar.length > 4) safeAvatar = '🤖';
      db.prepare('INSERT INTO admin_discussions (voice_id, member_name, role, comment, avatar) VALUES (?,?,?,?,?)').run(pid, r.role, 'AI_Council', r.message, safeAvatar);
    });
    res.json({ success: true, replies });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// AI評価
router.post('/ai-evaluate', async (req, res) => {
  const { content, discussionLog, humanScores } = req.body;
  const result = await evaluateVoiceByAI(content, discussionLog, humanScores);
  res.json(result);
});

// AIアドバイザー
router.post('/ai-advisor', async (req, res) => {
  try {
    const { content, question } = req.body;
    const sys = `あなたは健康経営の専門家であり、労働安全衛生の知識を持つAI保健師です。ユーザーの【質問】に対し、専門的な知見から評価の参考になるアドバイスを簡潔に回答してください。\n\n【声】\n${content}`;
    const result = await callGroqApi(sys, question);
    res.json({ success: true, reply: result || '申し訳ありません。AIの応答がありませんでした。' });
  } catch (e) { res.json({ success: false, reply: 'エラーが発生しました。' }); }
});

// コアメンバー数取得
router.get('/core-member-count', (req, res) => {
  try {
    const db = getDb();
    const count = db.prepare('SELECT COUNT(*) as cnt FROM core_members').get().cnt;
    res.json({ count: count || 1 });
  } catch (e) { res.json({ count: 1 }); }
});

// 投票(優先度)
router.post('/vote', (req, res) => {
  try {
    const { pid, uid, type } = req.body;
    const db = getDb();
    let post = db.prepare('SELECT * FROM posts WHERE post_id = ?').get(pid);
    if (!post) post = db.prepare('SELECT * FROM posts WHERE post_id = ?').get('post_' + pid);
    if (!post) return res.json({ success: false, msg: '投稿が見つかりません' });

    let likes = post.likes ? post.likes.split(',').filter(s => s) : [];
    let demotes = post.demotes ? post.demotes.split(',').filter(s => s) : [];
    const coreCount = db.prepare('SELECT COUNT(*) as cnt FROM core_members').get().cnt || 1;
    const threshold = Math.ceil(coreCount / 2);

    if (type === 'like') {
      if (!likes.includes(uid)) likes.push(uid);
      demotes = demotes.filter(id => id !== uid);
    } else if (type === 'demote') {
      if (!demotes.includes(uid)) demotes.push(uid);
      likes = likes.filter(id => id !== uid);
    }
    db.prepare('UPDATE posts SET likes = ?, demotes = ? WHERE post_id = ?').run(likes.join(','), demotes.join(','), pid);

    const currentVotes = (type === 'like') ? likes.length : demotes.length;
    if (currentVotes >= threshold) {
      if (type === 'like') {
        return res.json({ success: true, likeCount: likes.length, demoteCount: demotes.length, transitioned: true, msg: '過半数の合意を得たため、企画書候補へ移動しました！' });
      } else {
        return res.json({ success: true, likeCount: likes.length, demoteCount: demotes.length, transitioned: true, msg: '過半数の判断により、Inboxへ戻しました。' });
      }
    }
    res.json({ success: true, likeCount: likes.length, demoteCount: demotes.length, transitioned: false, msg: '投票を受け付けました' });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// マトリクスデータ取得
router.get('/matrix', (req, res) => {
  try {
    const db = getDb();
    const posts = db.prepare("SELECT * FROM posts WHERE status IN ('open','public')").all();
    const points = [];
    posts.forEach(r => {
      const parsed = parsePostScore(r.analysis);
      if (parsed.score && parsed.score.is_target === true) {
        const yVal = (Number(parsed.score.legal) || 1) + (Number(parsed.score.risk) || 1) + (Number(parsed.score.safety) || 1);
        const likes = r.likes ? r.likes.split(',').filter(x => x) : [];
        const demotes = r.demotes ? r.demotes.split(',').filter(x => x) : [];
        points.push({
          x: Number(parsed.score.needs) || 1, y: yVal,
          title: (r.content || '').substring(0, 10), id: r.post_id,
          isPlanned: !!parsed.score.is_planned, likeCount: likes.length,
          demoteCount: demotes.length, likers: likes, demoters: demotes
        });
      }
    });
    res.json(points);
  } catch (e) { res.json([]); }
});

// 食事傾向分析レポート生成
router.post('/food-report', async (req, res) => {
  try {
    const { userId } = req.body;
    const db = getDb();

    // ユーザー情報取得
    const user = db.prepare('SELECT nickname, department FROM users WHERE id = ?').get(userId);
    if (!user) return res.json({ success: false, msg: 'ユーザーが見つかりません' });

    // 食事投稿を全件取得（新しい順）
    const foodPosts = db.prepare("SELECT content, analysis, created_at FROM posts WHERE user_id = ? AND (content LIKE '%写真%' OR category LIKE '%食事%') ORDER BY created_at DESC LIMIT 30").all(userId);
    if (foodPosts.length < 2) return res.json({ success: false, msg: '食事投稿が2件未満のため分析できません' });

    // 食事データを整理
    const meals = foodPosts.map(p => {
      let nutrition = '';
      if (p.analysis && p.analysis.includes('【AI栄養士】')) {
        const parts = p.analysis.split('【AI栄養士】');
        nutrition = parts[1] ? parts[1].split('【AI保健師】')[0].trim() : '';
      }
      const date = new Date(p.created_at).toLocaleDateString('ja-JP');
      const comment = (p.content || '').replace(/^【写真】/, '').trim();
      return `[${date}] ${comment} → 分析: ${nutrition.substring(0, 150)}`;
    }).join('\n');

    // AI分析
    const sysPrompt = `あなたはエビデンスに基づく分析を行うベテラン管理栄養士です。以下のユーザーの食事記録を、国立長寿医療研究センター「栄養改善パック」（2020）のガイドラインに基づいて分析し、レポートを作成してください。

対象: ${user.nickname}さん（${user.department}）
記録期間の食事数: ${foodPosts.length}件

【評価基準（栄養改善パック2020）】
- たんぱく質: 1.0g/kg体重/日以上、毎食均等に摂取が理想
- 野菜: 1日350g（緑黄色:淡色=1:2）
- 1日3食、欠食しない
- BMI目標: 65歳以上は21.5〜24.9
- ビタミンD: 日光浴15分/日が目安
- フレイル予防: 低栄養・筋力低下・社会参加の3要素

【レポート構成】
1. 📊 食事の全体傾向（3行程度、上記基準との比較を含む）
2. ✅ 良い点（箇条書き2-3個、具体的な根拠を付記）
3. ⚠️ 気になる点・改善提案（箇条書き2-3個、CANフレームワーク〈Convenient・Attractive・Normative〉で実践しやすい提案）
4. 🎯 おすすめの目標（1つだけ、ゴール&スモールステップ技法で具体的かつ実践しやすいもの）
5. 💬 励ましのメッセージ（2行程度、モニタリング&フィードバックの継続を促す）

語り口は温かく、否定せず、エビデンスのない助言はしない。200-400字程度。`;

    const report = await callGroqApi(sysPrompt, `【${user.nickname}さんの食事記録】\n${meals}`);
    if (!report) return res.json({ success: false, msg: 'AIレポート生成に失敗しました' });

    // sendNow=trueの場合のみ通知送信、それ以外はプレビューのみ
    if (req.body.sendNow) {
      const memberComment = req.body.memberComment || '';
      const noticeId = 'food_report_' + Date.now();
      let noticeContent = `🥗 食事傾向レポート\n\n${user.nickname}さん、日頃の食事投稿ありがとうございます！\n${foodPosts.length}件の食事記録をもとに、AI栄養士があなたの食事傾向を分析しました。\n\n${report}`;
      if (memberComment.trim()) {
        noticeContent += `\n\n━━━━━━━━━━━━━━━━\n💬 健康推進メンバーより\n${memberComment.trim()}`;
      }
      db.prepare('INSERT INTO notices (notice_id, content, sender, target_id) VALUES (?,?,?,?)').run(noticeId, noticeContent, 'AI栄養士 + 健康推進チーム', userId);
      res.json({ success: true, sent: true, msg: `${user.nickname}さんに食事傾向レポートを送信しました（${foodPosts.length}件分析）`, report });
    } else {
      res.json({ success: true, sent: false, msg: 'プレビュー生成完了', report, nickname: user.nickname, foodCount: foodPosts.length, userId });
    }
  } catch (e) {
    res.json({ success: false, msg: 'エラー: ' + e.message });
  }
});

// ユーザー別食事投稿数取得
router.get('/food-users', (req, res) => {
  try {
    const db = getDb();
    const users = db.prepare(`
      SELECT u.id, u.nickname, u.avatar, u.department, COUNT(p.id) as food_count,
        MAX(p.created_at) as last_post
      FROM users u
      JOIN posts p ON u.id = p.user_id
      WHERE p.content LIKE '%写真%' OR p.category LIKE '%食事%'
      GROUP BY u.id
      HAVING food_count >= 2
      ORDER BY food_count DESC
    `).all();
    res.json(users.map(u => ({
      id: u.id, nickname: u.nickname, avatar: u.avatar, department: u.department,
      foodCount: u.food_count,
      lastPost: new Date(u.last_post).toLocaleDateString('ja-JP')
    })));
  } catch (e) { res.json([]); }
});

// 類似投稿の集約検索
router.post('/similar-posts', async (req, res) => {
  try {
    const { postId, content } = req.body;
    const db = getDb();
    const allPosts = db.prepare("SELECT post_id, content, nickname, created_at FROM posts WHERE post_id != ? AND status IN ('open','public','resolved') ORDER BY created_at DESC LIMIT 200").all(postId);
    if (allPosts.length === 0) return res.json({ similar: [], count: 0 });

    // AIで類似度を判定
    const postList = allPosts.slice(0, 50).map((p, i) => `[${i}] ${p.content.substring(0, 80)}`).join('\n');
    const sysPrompt = `あなたは投稿分析AIです。【対象の投稿】と似た悩み・テーマを持つ投稿の番号をJSON配列で返してください。
類似の基準: 同じ健康課題、同じ職場環境の悩み、関連する症状や要望。
出力形式: [0, 3, 7] のようにインデックス番号のみ。該当なしは [] を返す。`;
    const userPrompt = `【対象の投稿】\n${content.substring(0, 200)}\n\n【他の投稿一覧】\n${postList}`;

    const aiRes = await callGroqApi(sysPrompt, userPrompt);
    let indices = [];
    try {
      const match = aiRes.match(/\[[\d,\s]*\]/);
      if (match) indices = JSON.parse(match[0]);
    } catch (e) {}

    const similar = indices.filter(i => i < allPosts.length).map(i => ({
      postId: allPosts[i].post_id,
      content: allPosts[i].content.substring(0, 60),
      nickname: allPosts[i].nickname,
      date: new Date(allPosts[i].created_at).toLocaleDateString('ja-JP')
    }));

    res.json({ similar, count: similar.length });
  } catch (e) { res.json({ similar: [], count: 0, error: e.message }); }
});

// Inboxコメント投稿
router.post('/inbox-comment', (req, res) => {
  try {
    const { postId, memberName, comment } = req.body;
    if (!postId || !comment) return res.json({ success: false, msg: 'コメントを入力してください' });
    const db = getDb();
    db.prepare('INSERT INTO admin_discussions (voice_id, member_name, role, comment, avatar) VALUES (?,?,?,?,?)').run(postId, memberName || 'Admin', 'member_comment', comment, '');
    const comments = db.prepare("SELECT id, member_name, comment, created_at FROM admin_discussions WHERE voice_id = ? AND role = 'member_comment' ORDER BY created_at DESC").all(postId);
    res.json({ success: true, comments: comments.map(c => ({
      id: c.id,
      name: c.member_name,
      comment: c.comment,
      date: new Date(c.created_at).toLocaleString('ja-JP', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', timeZone:'Asia/Tokyo' })
    }))});
  } catch(e) { res.json({ success: false, msg: e.message }); }
});

// Inboxコメント取得
router.get('/inbox-comments/:postId', (req, res) => {
  try {
    const db = getDb();
    const comments = db.prepare("SELECT id, member_name, comment, created_at FROM admin_discussions WHERE voice_id = ? AND role = 'member_comment' ORDER BY created_at DESC").all(req.params.postId);
    res.json(comments.map(c => ({
      id: c.id,
      name: c.member_name,
      comment: c.comment,
      date: new Date(c.created_at).toLocaleString('ja-JP', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', timeZone:'Asia/Tokyo' })
    })));
  } catch(e) { res.json([]); }
});

// Inboxコメント修正
router.post('/inbox-comment-edit', (req, res) => {
  try {
    const { id, newComment } = req.body;
    if (!newComment || !newComment.trim()) return res.json({ success: false, msg: '内容を入力してください' });
    const db = getDb();
    db.prepare('UPDATE admin_discussions SET comment = ? WHERE id = ?').run(newComment.trim(), id);
    res.json({ success: true });
  } catch(e) { res.json({ success: false, msg: e.message }); }
});

// Inboxコメント削除
router.post('/inbox-comment-delete', (req, res) => {
  try {
    const { id } = req.body;
    const db = getDb();
    db.prepare('DELETE FROM admin_discussions WHERE id = ?').run(id);
    res.json({ success: true });
  } catch(e) { res.json({ success: false, msg: e.message }); }
});

module.exports = router;
