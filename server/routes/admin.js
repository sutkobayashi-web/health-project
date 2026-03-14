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
      return [r.id, r.post_id, r.content, r.analysis, r.nickname, r.avatar, likesArr.length, r.id, r.category, r.status, r.user_id, r.image_url, nurse, nutri, dateStr, chatCounts[r.post_id] || 0, isTarget, isPlanned, demotesArr.length];
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
      return [r.id, r.post_id, r.content, r.analysis, r.nickname, r.avatar, 0, r.id, r.category, r.status, r.user_id, r.image_url, '', '', dateStr, 0, false, false, 0];
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
    const logs = db.prepare('SELECT * FROM admin_discussions WHERE voice_id = ? ORDER BY created_at').all(voiceId);
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
    const post = db.prepare('SELECT analysis FROM posts WHERE post_id = ?').get(pid);
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
    const post = db.prepare('SELECT * FROM posts WHERE post_id = ?').get(pid);
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

module.exports = router;
