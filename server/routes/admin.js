const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../services/db');
const { callGroqApi, callAIWithFallback, parsePostScore, evaluateVoiceByAI } = require('../services/ai');
const { authAdmin } = require('../middleware/auth');

const router = express.Router();

// 全管理APIに認証を適用
router.use(authAdmin);

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
    db.prepare("SELECT post_id, COUNT(*) as cnt FROM member_chats GROUP BY post_id").all()
      .forEach(r => { chatCounts[r.post_id] = r.cnt; });
    // ユーザーの最新アバターを取得
    const userAvatars = {};
    db.prepare('SELECT id, avatar FROM users').all().forEach(u => { userAvatars[u.id] = u.avatar; });

    const result = posts.map(r => {
      const parsed = parsePostScore(r.analysis);
      let isTarget = true, isPlanned = false;
      if (parsed.score) {
        if (parsed.score.hasOwnProperty('is_target')) isTarget = parsed.score.is_target;
        if (parsed.score.hasOwnProperty('is_planned')) isPlanned = parsed.score.is_planned;
      }
      let nurse = '', nutri = '';
      const normalizedText = parsed.text.replace(/【AI栄養士】/g, '【AI食事アドバイザー】').replace(/【AI保健師】/g, '【AIヘルスアドバイザー】').replace(/【AI産業医】/g, '【AIメディカルアドバイザー】');
      if (normalizedText.includes('【AIヘルスアドバイザー】')) {
        const p = normalizedText.split('【AIヘルスアドバイザー】');
        if (p[0].includes('【AI食事アドバイザー】')) nutri = p[0].replace('【AI食事アドバイザー】', '').trim();
        nurse = p[1] ? p[1].trim() : '';
      } else { nurse = normalizedText; }
      const likesArr = r.likes ? r.likes.split(',').filter(x => x) : [];
      const demotesArr = r.demotes ? r.demotes.split(',').filter(x => x) : [];
      const dateStr = new Date(r.created_at + 'Z').toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
      const latestAvatar = userAvatars[r.user_id] || r.avatar;
      return [r.id, r.post_id, r.content, r.analysis, r.nickname, latestAvatar, likesArr.length, r.post_id, r.category, r.status, r.user_id, r.image_url, nurse, nutri, dateStr, chatCounts[r.post_id] || 0, isTarget, isPlanned, demotesArr.length, r.admin_read_at || null];
    });
    res.json(result);
  } catch (e) { res.json([]); }
});

// 投稿の管理者既読マーク
router.post('/inbox-mark-read', (req, res) => {
  try {
    const { postId } = req.body;
    if (!postId) return res.json({ success: false });
    const db = getDb();
    db.prepare("UPDATE posts SET admin_read_at = datetime('now') WHERE post_id = ? AND admin_read_at IS NULL").run(postId);
    res.json({ success: true });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 解決済み取得
router.get('/resolved', (req, res) => {
  try {
    const db = getDb();
    const posts = db.prepare("SELECT * FROM posts WHERE status = 'resolved' ORDER BY created_at DESC").all();
    const result = posts.map(r => {
      const dateStr = new Date(r.created_at + 'Z').toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
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
        timestamp: new Date(d.created_at + 'Z').toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }),
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
      timestamp: new Date(d.created_at + 'Z').toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }),
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

// チャット未読数取得（全投稿の未読チャット数を一括取得）
router.get('/chat-unread/:email', (req, res) => {
  try {
    const db = getDb();
    const email = req.params.email;
    // admin_discussions の未読数をpost別に集計
    const rows = db.prepare(`
      SELECT d.voice_id AS post_id,
             COUNT(*) AS unread_count,
             MAX(d.created_at) AS latest_at,
             (SELECT comment FROM admin_discussions WHERE voice_id = d.voice_id ORDER BY created_at DESC LIMIT 1) AS latest_message,
             (SELECT member_name FROM admin_discussions WHERE voice_id = d.voice_id ORDER BY created_at DESC LIMIT 1) AS latest_member
      FROM admin_discussions d
      LEFT JOIN chat_read_status r ON r.post_id = d.voice_id AND r.member_email = ?
      WHERE d.role != 'AI_Council'
        AND (r.last_read_at IS NULL OR d.created_at > r.last_read_at)
      GROUP BY d.voice_id
    `).all(email);
    // member_chats の未読も含める
    const mcRows = db.prepare(`
      SELECT c.post_id,
             COUNT(*) AS unread_count,
             MAX(c.created_at) AS latest_at,
             (SELECT message FROM member_chats WHERE post_id = c.post_id ORDER BY created_at DESC LIMIT 1) AS latest_message,
             (SELECT member_name FROM member_chats WHERE post_id = c.post_id ORDER BY created_at DESC LIMIT 1) AS latest_member
      FROM member_chats c
      LEFT JOIN chat_read_status r ON r.post_id = ('mc_' || c.post_id) AND r.member_email = ?
      WHERE (r.last_read_at IS NULL OR c.created_at > r.last_read_at)
      GROUP BY c.post_id
    `).all(email);
    // マージ
    const result = {};
    rows.forEach(r => { result[r.post_id] = { unread: r.unread_count, latest: r.latest_message, member: r.latest_member, at: r.latest_at }; });
    mcRows.forEach(r => {
      if (result[r.post_id]) { result[r.post_id].unread += r.unread_count; }
      else { result[r.post_id] = { unread: r.unread_count, latest: r.latest_message, member: r.latest_member, at: r.latest_at }; }
    });
    res.json({ success: true, unread: result });
  } catch (e) { res.json({ success: true, unread: {} }); }
});

// チャット既読マーク
router.post('/chat-mark-read', (req, res) => {
  try {
    const { email, postId } = req.body;
    if (!email || !postId) return res.json({ success: false });
    const db = getDb();
    db.prepare(`INSERT INTO chat_read_status (member_email, post_id, last_read_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(member_email, post_id) DO UPDATE SET last_read_at = datetime('now')
    `).run(email, postId);
    res.json({ success: true });
  } catch (e) { res.json({ success: false }); }
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
      id: e.id,
      memberName: e.member_name,
      scores: { legal: e.legal, risk: e.risk, freq: e.freq, urgency: e.urgency, safety: e.safety, value: e.value, needs: e.needs },
      comment: e.comment,
      date: new Date(e.created_at + 'Z').toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })
    })));
  } catch (e) { res.json([]); }
});

// 評価取消
router.post('/evaluation/delete', (req, res) => {
  try {
    const { id } = req.body;
    const db = getDb();
    db.prepare('DELETE FROM team_evaluations WHERE id = ?').run(id);
    res.json({ success: true, msg: '評価を取り消しました' });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// AIシミュレーション会議
router.post('/simulate-meeting', async (req, res) => {
  try {
    const { pid, planData } = req.body;
    const sysPrompt = `あなたは企業の社内世論シミュレーターです。
【議題】に対して、以下のメンバーから数名を選んで議論してください。
メンバー: 佐藤さん(20代/ドライ), 山本部長(50代/熱血), 高橋リーダー(30代/調整), 中村さん(40代/批判), 伊藤くん(20代/意識高い), 権藤専務(60代/経営), 林さん(パート/現場), AIメディカルアドバイザー, AIヘルスアドバイザー, AI食事アドバイザー, AI管理課長

【議題】${planData.title} ${planData.draft}
【出力形式】
必ずJSON配列のみを出力。前後に説明文を付けないこと。avatarは必ず「絵文字1文字」。
[{"role": "AIメディカルアドバイザー", "avatar": "🩺", "message": "..."}]`;

    const resText = await callAIWithFallback(sysPrompt, '議論開始');
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
    const resText = await callAIWithFallback(sysPrompt, 'リアクション生成');
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
    const sys = `あなたは健康経営の専門家であり、労働安全衛生の知識を持つAIヘルスアドバイザーです。ユーザーの【質問】に対し、専門的な知見から評価の参考になるアドバイスを簡潔に回答してください。\n\n【声】\n${content}`;
    const result = await callAIWithFallback(sys, question);
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
      if (p.analysis && p.analysis.includes('【AI食事アドバイザー】')) {
        const parts = p.analysis.split('【AI食事アドバイザー】');
        nutrition = parts[1] ? parts[1].split('【AIヘルスアドバイザー】')[0].trim() : '';
      }
      const date = new Date(p.created_at + 'Z').toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
      const comment = (p.content || '').replace(/^【写真】/, '').trim();
      return `[${date}] ${comment} → 分析: ${nutrition.substring(0, 150)}`;
    }).join('\n');

    // AI分析
    const sysPrompt = `あなたはエビデンスに基づく分析を行うベテラン食事アドバイザーです。以下のユーザーの食事記録を、国立長寿医療研究センター「栄養改善パック」（2020）のガイドラインに基づいて分析し、レポートを作成してください。

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

    const report = await callAIWithFallback(sysPrompt, `【${user.nickname}さんの食事記録】\n${meals}`);
    if (!report) return res.json({ success: false, msg: 'AIレポート生成に失敗しました' });

    // sendNow=trueの場合のみ通知送信、それ以外はプレビューのみ
    if (req.body.sendNow) {
      const memberComment = req.body.memberComment || '';
      const noticeId = 'food_report_' + Date.now();
      let noticeContent = `🥗 食事傾向レポート\n\n${user.nickname}さん、日頃の食事投稿ありがとうございます！\n${foodPosts.length}件の食事記録をもとに、AI食事アドバイザーがあなたの食事傾向を分析しました。\n\n${report}`;
      if (memberComment.trim()) {
        noticeContent += `\n\n━━━━━━━━━━━━━━━━\n💬 健康推進メンバーより\n${memberComment.trim()}`;
      }
      db.prepare('INSERT INTO notices (notice_id, content, sender, target_id) VALUES (?,?,?,?)').run(noticeId, noticeContent, 'AI食事アドバイザー + 健康推進チーム', userId);
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

// メンバー承認
router.post('/approve-member', (req, res) => {
  try {
    const { memberId } = req.body;
    const db = getDb();
    db.prepare("UPDATE core_members SET status = 'approved' WHERE id = ?").run(memberId);
    const member = db.prepare('SELECT name FROM core_members WHERE id = ?').get(memberId);
    res.json({ success: true, msg: (member ? member.name : '') + 'さんを承認しました' });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// メンバー却下（削除）
router.post('/reject-member', (req, res) => {
  try {
    const { memberId } = req.body;
    const db = getDb();
    db.prepare('DELETE FROM core_members WHERE id = ? AND status = ?').run(memberId, 'pending');
    res.json({ success: true, msg: '申請を却下しました' });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// ハートビート（オンライン状態管理）
const onlineMembers = {}; // { email: { name, avatar, lastSeen } }

router.post('/heartbeat', (req, res) => {
  const { email, name, avatar } = req.body;
  if (!email) return res.json({ success: false });
  onlineMembers[email] = { name: name || '', avatar: avatar || '🛡️', lastSeen: Date.now() };
  // 5分以上応答なしはオフライン
  const now = Date.now();
  const members = Object.entries(onlineMembers).map(([e, m]) => ({
    email: e, name: m.name, avatar: m.avatar, online: (now - m.lastSeen) < 5 * 60 * 1000
  }));
  res.json(members);
});

router.get('/members-status', (req, res) => {
  try {
    const db = getDb();
    const allMembers = db.prepare('SELECT id, name, email, avatar, is_university, university_org, dept, status FROM core_members').all();
    const now = Date.now();
    const result = allMembers.map(m => {
      let avatar = m.avatar || '🛡️';
      if (avatar.length > 4 || (avatar.match && avatar.match(/\d{4}/))) avatar = '🛡️';
      const onlineData = onlineMembers[m.email];
      return {
        id: m.id, name: m.name, email: m.email, avatar,
        dept: m.dept || '', universityOrg: m.university_org || '',
        isUniversity: m.is_university === 1,
        status: m.status || 'approved',
        online: onlineData ? (now - onlineData.lastSeen) < 5 * 60 * 1000 : false
      };
    });
    res.json(result);
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

    const aiRes = await callAIWithFallback(sysPrompt, userPrompt);
    let indices = [];
    try {
      const match = aiRes.match(/\[[\d,\s]*\]/);
      if (match) indices = JSON.parse(match[0]);
    } catch (e) {}

    const similar = indices.filter(i => i < allPosts.length).map(i => ({
      postId: allPosts[i].post_id,
      content: allPosts[i].content.substring(0, 60),
      nickname: allPosts[i].nickname,
      date: new Date(allPosts[i].created_at + 'Z').toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })
    }));

    res.json({ posts: similar, count: similar.length });
  } catch (e) { res.json({ posts: [], count: 0, error: e.message }); }
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
      date: new Date(c.created_at + 'Z').toLocaleString('ja-JP', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', timeZone:'Asia/Tokyo' })
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
      date: new Date(c.created_at + 'Z').toLocaleString('ja-JP', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', timeZone:'Asia/Tokyo' })
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

// =============================================
// メンバー管理 CRUD
// =============================================

// コアメンバー全件取得
router.get('/members-all', (req, res) => {
  try {
    const db = getDb();
    const members = db.prepare('SELECT id, name, dept, email, phone, avatar, role, is_exec, is_university, university_org, status FROM core_members ORDER BY id').all();
    res.json(members);
  } catch (e) { res.json([]); }
});

// 一般ユーザー全件取得
router.get('/users-all', (req, res) => {
  try {
    const db = getDb();
    const users = db.prepare('SELECT id, nickname, avatar, department, real_name, birth_date, created_at FROM users ORDER BY created_at DESC').all();
    const postCounts = {};
    db.prepare('SELECT user_id, COUNT(*) as cnt FROM posts GROUP BY user_id').all()
      .forEach(r => { postCounts[r.user_id] = r.cnt; });
    res.json(users.map(u => ({ ...u, post_count: postCounts[u.id] || 0 })));
  } catch (e) { res.json([]); }
});

// コアメンバー追加
router.post('/member-add', (req, res) => {
  try {
    const { name, email, dept, phone, avatar, role, is_exec, is_university, university_org, password } = req.body;
    if (!name || !email) return res.json({ success: false, msg: '氏名とメールアドレスは必須です' });
    const db = getDb();
    const existing = db.prepare('SELECT id FROM core_members WHERE email = ?').get(email.trim().toLowerCase());
    if (existing) return res.json({ success: false, msg: '既に登録済みのメールアドレスです' });
    const crypto = require('crypto');
    const passwordHash = password ? crypto.createHash('sha256').update(password.trim()).digest('hex') : '';
    db.prepare(`INSERT INTO core_members (name, dept, email, password_hash, phone, avatar, role, is_exec, is_university, university_org, status) VALUES (?,?,?,?,?,?,?,?,?,?,'approved')`)
      .run(name.trim(), dept || '', email.trim().toLowerCase(), passwordHash, phone || '', avatar || '🛡️', role || 'member', is_exec ? 1 : 0, is_university ? 1 : 0, university_org || '');
    res.json({ success: true, msg: name.trim() + 'さんを追加しました' });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// コアメンバー更新
router.post('/member-update', (req, res) => {
  try {
    const { id, name, email, dept, phone, avatar, role, is_exec, is_university, university_org, password } = req.body;
    if (!id) return res.json({ success: false, msg: 'IDが必要です' });
    const db = getDb();
    let sql = 'UPDATE core_members SET name=?, dept=?, email=?, phone=?, avatar=?, role=?, is_exec=?, is_university=?, university_org=?';
    const params = [name || '', dept || '', (email || '').trim().toLowerCase(), phone || '', avatar || '🛡️', role || 'member', is_exec ? 1 : 0, is_university ? 1 : 0, university_org || ''];
    if (password) {
      const crypto = require('crypto');
      sql += ', password_hash=?';
      params.push(crypto.createHash('sha256').update(password.trim()).digest('hex'));
    }
    sql += ' WHERE id=?';
    params.push(id);
    db.prepare(sql).run(...params);
    res.json({ success: true, msg: '更新しました' });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// コアメンバー削除
router.post('/member-delete', (req, res) => {
  try {
    const { id } = req.body;
    const db = getDb();
    const member = db.prepare('SELECT name FROM core_members WHERE id = ?').get(id);
    db.prepare('DELETE FROM core_members WHERE id = ?').run(id);
    res.json({ success: true, msg: (member ? member.name : '') + 'さんを削除しました' });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 一般ユーザー追加
router.post('/user-add', (req, res) => {
  try {
    const { nickname, password, avatar, department, real_name, birth_date } = req.body;
    if (!nickname || !password) return res.json({ success: false, msg: 'ニックネームとパスワードは必須です' });
    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE nickname = ?').get(nickname.trim());
    if (existing) return res.json({ success: false, msg: '既に使用されているニックネームです' });
    const crypto = require('crypto');
    const uid = uuidv4();
    const passwordHash = crypto.createHash('sha256').update(password.trim()).digest('hex');
    db.prepare('INSERT INTO users (id, nickname, password_hash, avatar, department, real_name, birth_date) VALUES (?,?,?,?,?,?,?)')
      .run(uid, nickname.trim(), passwordHash, avatar || '😀', department || '', real_name || '', birth_date || '');
    res.json({ success: true, msg: nickname.trim() + 'さんを追加しました' });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 一般ユーザー更新
router.post('/user-update', (req, res) => {
  try {
    const { id, nickname, avatar, department, real_name, birth_date, password } = req.body;
    if (!id) return res.json({ success: false, msg: 'IDが必要です' });
    const db = getDb();
    let sql = 'UPDATE users SET nickname=?, avatar=?, department=?, real_name=?, birth_date=?';
    const params = [nickname || '', avatar || '😀', department || '', real_name || '', birth_date || ''];
    if (password) {
      const crypto = require('crypto');
      sql += ', password_hash=?';
      params.push(crypto.createHash('sha256').update(password.trim()).digest('hex'));
    }
    sql += ' WHERE id=?';
    params.push(id);
    db.prepare(sql).run(...params);
    res.json({ success: true, msg: '更新しました' });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 一般ユーザー削除
router.post('/user-delete', (req, res) => {
  try {
    const { id } = req.body;
    const db = getDb();
    const user = db.prepare('SELECT nickname FROM users WHERE id = ?').get(id);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true, msg: (user ? user.nickname : '') + 'さんを削除しました' });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 推進メンバーコメント投稿
router.post('/member-comment', (req, res) => {
  try {
    const { postId, memberName, comment } = req.body;
    if (!postId || !memberName || !comment) return res.json({ success: false, msg: '必須項目不足' });
    const db = getDb();
    db.prepare('INSERT INTO member_comments (post_id, member_name, comment) VALUES (?, ?, ?)').run(postId, memberName, comment);
    const comments = db.prepare('SELECT * FROM member_comments WHERE post_id = ? ORDER BY created_at ASC').all(postId);
    res.json({ success: true, comments });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// メンバーコメント取得
router.get('/member-comments/:postId', (req, res) => {
  try {
    const db = getDb();
    const comments = db.prepare('SELECT * FROM member_comments WHERE post_id = ? ORDER BY created_at ASC').all(req.params.postId);
    res.json({ success: true, comments });
  } catch (e) { res.json({ success: false, comments: [] }); }
});

// メンバーチャット送信
router.post('/member-chat', (req, res) => {
  try {
    const { postId, memberName, message } = req.body;
    if (!postId || !memberName || !message) return res.json({ success: false, msg: '必須項目不足' });
    const db = getDb();
    db.prepare('INSERT INTO member_chats (post_id, member_name, message) VALUES (?, ?, ?)').run(postId, memberName, message);
    const chats = db.prepare('SELECT * FROM member_chats WHERE post_id = ? ORDER BY created_at ASC').all(postId);
    res.json({ success: true, chats });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// メンバーチャット取得
router.get('/member-chats/:postId', (req, res) => {
  try {
    const db = getDb();
    const chats = db.prepare('SELECT * FROM member_chats WHERE post_id = ? ORDER BY created_at ASC').all(req.params.postId);
    res.json({ success: true, chats });
  } catch (e) { res.json({ success: false, chats: [] }); }
});

// AI自動7軸評価を実行
// 7軸評価の共通ロジック（1投稿分）
async function evaluateSinglePost(postId) {
  const db = getDb();
  const post = db.prepare('SELECT * FROM posts WHERE post_id = ?').get(postId);
  if (!post) throw new Error('投稿が見つかりません');

  const empathyResponses = db.prepare('SELECT * FROM empathy_responses WHERE post_id = ?').all(postId);
  const empathySummary = {};
  empathyResponses.forEach(r => {
    empathySummary[r.empathy_type] = (empathySummary[r.empathy_type] || 0) + 1;
  });
  const memberComments = db.prepare('SELECT member_name, comment FROM member_comments WHERE post_id = ?').all(postId);
  const memberChats = db.prepare('SELECT member_name, message FROM member_chats WHERE post_id = ?').all(postId);

  const { callAIWithFallback, EVIDENCE_BASE } = require('../services/ai');
  const prompt = `あなたは健康経営アナリストです。以下の社員の声と、それに対する全社員の共感データ、推進メンバーの専門コメント・議論内容を総合的に分析し、7軸評価をJSON形式で出力してください。

${EVIDENCE_BASE}

【社員の声】
${post.content}

【カテゴリ】${post.category}

【共感データ（${empathyResponses.length}名が回答）】
${Object.entries(empathySummary).map(([k, v]) => `  ${k}: ${v}名`).join('\n') || '（共感なし）'}

【共感の詳細回答】
${empathyResponses.slice(0, 20).map(r => `  ${r.empathy_type} - Q1:${r.answer1} Q2:${r.answer2} Q3:${r.answer3}${r.free_comment ? ' コメント:' + r.free_comment : ''}`).join('\n') || '（なし）'}

【推進メンバーの専門コメント】
${memberComments.map(c => `  ${c.member_name}: ${c.comment}`).join('\n') || '（なし）'}

【推進メンバー同士の議論】
${memberChats.map(c => `  ${c.member_name}: ${c.message}`).join('\n') || '（なし）'}

【評価ルール】
- 共感回答数が多いほど freq を高く
- 「ヤバい」「深刻」系の共感が多いほど risk, urgency, safety を高く
- 「会社が動けば」系が多いほど value, needs を高く
- 推進メンバーが法的リスクに言及していれば legal を高く
- 推進メンバーの議論で緊急性が指摘されていれば urgency を高く
- 該当する公的ガイドラインがあればスコアを高めに
- ★★★マークダウン記法は使わない★★★

【出力形式】JSONのみ。他のテキスト不要。
{
  "legal": 3, "risk": 3, "freq": 3, "urgency": 3, "safety": 3, "value": 3, "needs": 3,
  "reasoning": "評価の根拠を2-3文で説明",
  "guideline_refs": "該当するガイドライン名（例: 厚労省「職場における腰痛予防対策指針」）"
}`;

  const aiResult = await callAIWithFallback('JSON出力専門AI。指定JSON形式のみ出力。', prompt);
  if (!aiResult) throw new Error('AI評価失敗');
  const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI出力解析失敗');

  const scores = JSON.parse(jsonMatch[0]);
  const total = (scores.legal||1) + (scores.risk||1) + (scores.freq||1) + (scores.urgency||1) + (scores.safety||1) + (scores.value||1) + (scores.needs||1);

  db.prepare(`INSERT INTO auto_evaluations (post_id, legal, risk, freq, urgency, safety, value_score, needs, total_score, reasoning, guideline_refs, source_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(post_id) DO UPDATE SET legal=excluded.legal, risk=excluded.risk, freq=excluded.freq, urgency=excluded.urgency, safety=excluded.safety, value_score=excluded.value_score, needs=excluded.needs, total_score=excluded.total_score, reasoning=excluded.reasoning, guideline_refs=excluded.guideline_refs, source_data=excluded.source_data, created_at=CURRENT_TIMESTAMP`)
    .run(postId, scores.legal||1, scores.risk||1, scores.freq||1, scores.urgency||1, scores.safety||1, scores.value||1, scores.needs||1, total, scores.reasoning||'', scores.guideline_refs||'', JSON.stringify({ empathyCount: empathyResponses.length, memberComments: memberComments.length, memberChats: memberChats.length }));

  return { scores, total, reasoning: scores.reasoning, guideline_refs: scores.guideline_refs };
}

// 単一投稿の7軸評価API
router.post('/auto-evaluate', async (req, res) => {
  try {
    const result = await evaluateSinglePost(req.body.postId);
    res.json({ success: true, ...result });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 7軸評価のバックグラウンド処理状態
var evalJobState = { running: false, evaluated: 0, failed: 0, total: 0, done: false, error: null };

// バックグラウンドで7軸評価を実行する関数
async function runEvalJob() {
  const db = getDb();
  const unevaluated = db.prepare(`
    SELECT p.post_id, p.nickname, substr(p.content, 1, 60) as content_short FROM posts p
    LEFT JOIN auto_evaluations ae ON p.post_id = ae.post_id
    WHERE p.status IN ('open','public') AND p.created_at > datetime('now', '-3 months')
    AND ae.post_id IS NULL
    AND p.content NOT LIKE '【写真】%'
    AND COALESCE(p.category,'') NOT LIKE '%食事%'
    AND COALESCE(p.category,'') NOT LIKE '%栄養%'
  `).all();

  evalJobState = { running: true, evaluated: 0, failed: 0, total: unevaluated.length, done: false, error: null };

  for (let i = 0; i < unevaluated.length; i++) {
    const row = unevaluated[i];
    if (i > 0) await new Promise(r => setTimeout(r, 6000));
    let success = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await evaluateSinglePost(row.post_id);
        evalJobState.evaluated++;
        success = true;
        break;
      } catch (e) {
        if (e.message && e.message.includes('429') && attempt < 2) {
          var wait = (attempt + 1) * 15000;
          console.log('[auto-evaluate-all] Rate limited, waiting ' + (wait/1000) + 's (attempt ' + (attempt+1) + '):', row.post_id);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        console.error('[auto-evaluate-all] Failed:', row.post_id, e.message);
        evalJobState.failed++;
        break;
      }
    }
  }
  evalJobState.running = false;
  evalJobState.done = true;
}

// 一括7軸評価API — バックグラウンド起動してすぐ返す
router.post('/auto-evaluate-all', async (req, res) => {
  try {
    if (evalJobState.running) {
      return res.json({ success: true, status: 'running', ...evalJobState });
    }

    const db = getDb();
    const unevaluated = db.prepare(`
      SELECT COUNT(*) as cnt FROM posts p
      LEFT JOIN auto_evaluations ae ON p.post_id = ae.post_id
      WHERE p.status IN ('open','public') AND p.created_at > datetime('now', '-3 months')
      AND ae.post_id IS NULL
    `).get();

    if (unevaluated.cnt === 0) {
      // 全て評価済み — 既存評価を返す
      const allEvals = db.prepare(`
        SELECT ae.*, p.nickname, substr(p.content, 1, 60) as content_short
        FROM auto_evaluations ae
        LEFT JOIN posts p ON ae.post_id = p.post_id
        ORDER BY ae.total_score DESC
      `).all();
      return res.json({ success: true, status: 'complete', evaluated: 0, failed: 0, total: 0, allEvaluations: allEvals });
    }

    // バックグラウンド起動
    runEvalJob().catch(e => { evalJobState.running = false; evalJobState.error = e.message; });

    res.json({ success: true, status: 'started', total: unevaluated.cnt });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 7軸評価の進捗確認API
router.get('/auto-evaluate-status', (req, res) => {
  try {
    const db = getDb();
    if (evalJobState.done && !evalJobState.running) {
      const allEvals = db.prepare(`
        SELECT ae.*, p.nickname, substr(p.content, 1, 60) as content_short
        FROM auto_evaluations ae
        LEFT JOIN posts p ON ae.post_id = p.post_id
        ORDER BY ae.total_score DESC
      `).all();
      res.json({ success: true, status: 'complete', ...evalJobState, allEvaluations: allEvals });
    } else {
      res.json({ success: true, status: evalJobState.running ? 'running' : 'idle', ...evalJobState });
    }
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// AI自動評価結果取得
router.get('/auto-evaluation/:postId', (req, res) => {
  try {
    const db = getDb();
    const eval_ = db.prepare('SELECT * FROM auto_evaluations WHERE post_id = ?').get(req.params.postId);
    res.json({ success: true, evaluation: eval_ || null });
  } catch (e) { res.json({ success: false, evaluation: null }); }
});

// AI使用量ダッシュボード
router.get('/ai-usage', (req, res) => {
  try {
    const db = getDb();
    // 今日
    const today = db.prepare("SELECT provider, function_name, COUNT(*) as count, SUM(tokens_in) as tokens_in, SUM(tokens_out) as tokens_out, SUM(CASE WHEN success=1 THEN 1 ELSE 0 END) as ok, SUM(CASE WHEN success=0 THEN 1 ELSE 0 END) as fail FROM ai_usage_log WHERE created_at >= date('now') GROUP BY provider, function_name ORDER BY count DESC").all();
    // 今月
    const month = db.prepare("SELECT provider, function_name, COUNT(*) as count, SUM(tokens_in) as tokens_in, SUM(tokens_out) as tokens_out FROM ai_usage_log WHERE created_at >= date('now','start of month') GROUP BY provider, function_name ORDER BY count DESC").all();
    // 日別推移（過去30日）
    const daily = db.prepare("SELECT date(created_at) as date, provider, COUNT(*) as count, SUM(tokens_in+tokens_out) as tokens FROM ai_usage_log WHERE created_at >= date('now','-30 days') GROUP BY date(created_at), provider ORDER BY date").all();
    // 合計
    const totals = db.prepare("SELECT provider, COUNT(*) as count, SUM(tokens_in) as tokens_in, SUM(tokens_out) as tokens_out FROM ai_usage_log GROUP BY provider").all();
    res.json({ success: true, today, month, daily, totals });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ===== 週間食事レポート管理 =====

// レポート一覧取得
router.get('/food-weekly-reports', (req, res) => {
  try {
    const db = getDb();
    var reports = db.prepare(`SELECT r.*,
      (SELECT COUNT(*) FROM food_report_chats WHERE report_id = r.report_id) as chat_count
      FROM food_weekly_reports r ORDER BY r.week_start DESC, r.nickname ASC`).all();
    res.json({ success: true, reports: reports });
  } catch (e) { res.json({ success: true, reports: [] }); }
});

// レポートのチャット取得
router.get('/food-report-chats/:reportId', (req, res) => {
  try {
    const db = getDb();
    var chats = db.prepare('SELECT * FROM food_report_chats WHERE report_id = ? ORDER BY created_at ASC').all(req.params.reportId);
    res.json({ success: true, chats: chats });
  } catch (e) { res.json({ success: true, chats: [] }); }
});

// レポートにチャット追加
router.post('/food-report-chat', (req, res) => {
  try {
    const db = getDb();
    var { reportId, memberName, message } = req.body;
    if (!reportId || !message) return res.json({ success: false, msg: '入力が必要です' });
    db.prepare('INSERT INTO food_report_chats (report_id, member_name, message) VALUES (?, ?, ?)').run(reportId, memberName || '管理者', message);
    res.json({ success: true });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 手動で週間食事分析を実行
router.post('/food-weekly-run', async (req, res) => {
  try {
    const { runWeeklyFoodAnalysis } = require('../services/food-weekly');
    var result = await runWeeklyFoodAnalysis();
    res.json({ success: true, ...result });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 過去の週間食事レポートにスコアを付与し、お知らせを再配信
router.post('/food-weekly-rescore', async (req, res) => {
  try {
    const { callAIWithFallback } = require('../services/ai');
    const { v4: uuidv4 } = require('uuid');
    var db = getDb();
    try { db.prepare("ALTER TABLE food_weekly_reports ADD COLUMN nutrition_scores TEXT").run(); } catch(e) { /* already exists */ }
    var reports = db.prepare("SELECT report_id, user_id, nickname, week_start, week_end, meal_count, report_text FROM food_weekly_reports WHERE nutrition_scores IS NULL").all();
    if (reports.length === 0) return res.json({ success: true, msg: 'スコア未付与のレポートはありません', count: 0 });

    var updated = 0;
    for (var i = 0; i < reports.length; i++) {
      var r = reports[i];
      if (i > 0) await new Promise(function(resolve) { setTimeout(resolve, 2000); });
      try {
        var scorePrompt = '以下の週間食事分析レポートを読み、五大栄養素+塩分の6軸スコアをJSON形式のみで出力してください。\n' +
          '出力形式: {"protein":数値,"fat":数値,"carb":数値,"vitamin":数値,"mineral":数値,"salt":数値}\n' +
          '各数値は1〜5の整数。5=理想的、4=良好、3=適量、2=やや過不足、1=要改善。塩分は逆スコア（5=少なく理想的、1=過剰）。\n' +
          'JSON以外の文章は一切出力しないこと。\n\n' +
          '【レポート】\n' + (r.report_text || '').substring(0, 2000);
        var scoreResult = await callAIWithFallback('JSONのみ出力してください。', scorePrompt);
        if (scoreResult) {
          var jsonMatch = scoreResult.match(/\{[^}]+\}/);
          if (jsonMatch) {
            var scores = JSON.parse(jsonMatch[0]);
            db.prepare("UPDATE food_weekly_reports SET nutrition_scores = ? WHERE report_id = ?").run(JSON.stringify(scores), r.report_id);
            // 既存のお知らせを更新（レーダータグ追加）
            var scoreTag = '\n\n<!--NUTRITION_RADAR:' + JSON.stringify(scores) + '-->';
            var weekLabel = r.week_start + ' 〜 ' + r.week_end;
            db.prepare("UPDATE notices SET content = content || ?, status = 'unread' WHERE target_id = ? AND content LIKE ? AND content NOT LIKE '%NUTRITION_RADAR%'")
              .run(scoreTag, r.user_id, '%週間食事レポート ' + weekLabel + '%');
            updated++;
            console.log('[rescore] ' + r.nickname + ' (' + weekLabel + '): スコア付与完了');
          }
        }
      } catch(e) { console.error('[rescore] ' + r.nickname + ': 失敗 -', e.message); }
    }
    res.json({ success: true, msg: updated + '/' + reports.length + '件のレポートにスコアを付与しました', count: updated });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

module.exports = router;
