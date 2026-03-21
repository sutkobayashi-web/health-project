const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../services/db');
const { callGroqApi, EVIDENCE_BASE } = require('../services/ai');

const router = express.Router();

// 投稿者へ結果通知を送る（フィードバックループ）
function notifyOriginalPoster(db, planId, message) {
  try {
    const plan = db.prepare('SELECT source_post_id, title FROM action_plans WHERE plan_id = ?').get(planId);
    if (!plan || !plan.source_post_id || plan.source_post_id === 'Theme_Based') return;
    // source_post_idが複数ある場合もカバー（カンマ区切り想定）
    const postIds = plan.source_post_id.split(',').map(s => s.trim());
    const notified = new Set();
    postIds.forEach(pid => {
      const post = db.prepare('SELECT user_id, nickname FROM posts WHERE post_id = ?').get(pid);
      if (post && post.user_id && !notified.has(post.user_id)) {
        notified.add(post.user_id);
        const noticeId = 'feedback_' + Date.now() + '_' + post.user_id.substring(0, 4);
        const content = `${post.nickname || 'あなた'}さんの声が施策につながりました！\n\n【${plan.title}】\n${message}\n\nあなたの投稿が職場の健康づくりに貢献しています。ありがとうございます！`;
        db.prepare('INSERT INTO notices (notice_id, content, sender, target_id) VALUES (?,?,?,?)').run(noticeId, content, '健康推進チーム', post.user_id);
      }
    });
  } catch (e) {
    console.error('notifyOriginalPoster error:', e.message);
  }
}

const STATUS = {
  CANDIDATE: 'candidate', MEMBER_REVIEW: 'member_review', EXEC_PENDING: 'exec_pending',
  APPROVED: 'approved', REJECTED: 'rejected', IN_EXECUTION: 'in_execution',
  MEASURING: 'measuring', COMPLETED: 'completed'
};

// 企画書候補一覧
router.get('/candidates', (req, res) => {
  try {
    const db = getDb();
    const plans = db.prepare(`SELECT * FROM action_plans WHERE status IN (?, ?) ORDER BY created_at DESC`).all(STATUS.CANDIDATE, STATUS.MEMBER_REVIEW);
    res.json(plans.map(r => ({
      id: r.plan_id, title: r.title, category: r.category,
      score: r.total_score, x: r.score_needs, y: r.total_score - r.score_needs,
      sourcePid: r.source_post_id, status: r.status,
      draft: r.proposal_draft || 'ドラフトなし',
      scores: { legal: r.score_legal, risk: r.score_risk, freq: r.score_freq, urgency: r.score_urgency, safety: r.score_safety, value: r.score_value, needs: r.score_needs },
      aiLog: r.ai_log || '', comments: r.member_comments || '[]'
    })));
  } catch (e) { res.json([]); }
});

// アーカイブ済み一覧
router.get('/archived', (req, res) => {
  try {
    const db = getDb();
    const plans = db.prepare(`SELECT * FROM action_plans WHERE status IN ('done',?,?,?,?) ORDER BY total_score DESC`)
      .all(STATUS.APPROVED, STATUS.IN_EXECUTION, STATUS.MEASURING, STATUS.COMPLETED);
    res.json(plans.map(r => ({
      id: r.plan_id, title: r.title, category: r.category,
      draft: r.proposal_draft || 'ドラフトなし',
      scores: { legal: r.score_legal, risk: r.score_risk, freq: r.score_freq, urgency: r.score_urgency, safety: r.score_safety, value: r.score_value, needs: r.score_needs },
      score: r.total_score, sourcePid: r.source_post_id, status: r.status,
      date: r.created_at ? new Date(r.created_at).toLocaleDateString('ja-JP') : '',
      aiLog: r.ai_log || '', owner: r.owner || '', deadline: r.deadline || '',
      kpiTarget: r.kpi_target || '', kpiCurrent: r.kpi_current || ''
    })));
  } catch (e) { res.json([]); }
});

// テーマから企画書作成
router.post('/create-theme', async (req, res) => {
  try {
    const { planTitle, theme, background, scores, postIds } = req.body;
    const db = getDb();

    // 関連投稿にis_plannedフラグ設定
    if (postIds && postIds.length > 0) {
      postIds.forEach(pid => {
        const post = db.prepare('SELECT analysis FROM posts WHERE post_id = ?').get(pid);
        if (post && post.analysis && post.analysis.includes('///SCORE///')) {
          const parts = post.analysis.split('///SCORE///');
          try {
            const s = JSON.parse(parts[1].trim());
            s.is_planned = true;
            db.prepare('UPDATE posts SET analysis = ? WHERE post_id = ?').run(parts[0] + '\n///SCORE///\n' + JSON.stringify(s), pid);
          } catch (e) {}
        }
      });
    }

    // 関連投稿の原文・共感データを収集
    let postContext = '';
    if (postIds && postIds.length > 0) {
      const postDetails = postIds.map(pid => {
        const p = db.prepare('SELECT content, nickname, category FROM posts WHERE post_id = ?').get(pid);
        if (!p) return null;
        let empathy = '';
        try {
          const responses = db.prepare('SELECT empathy_type, answer1, answer2, answer3, free_comment FROM empathy_responses WHERE post_id = ?').all(pid);
          if (responses.length > 0) {
            const typeCounts = {};
            const comments = [];
            responses.forEach(r => {
              typeCounts[r.empathy_type] = (typeCounts[r.empathy_type] || 0) + 1;
              if (r.free_comment) comments.push(r.free_comment);
            });
            empathy = `共感${responses.length}件(${Object.entries(typeCounts).map(([k,v]) => k + ':' + v).join(', ')})`;
            if (comments.length > 0) empathy += ` コメント:${comments.slice(0, 5).join('／')}`;
          }
        } catch (e) {}
        return `- [${p.nickname}] ${p.content.substring(0, 100)}${empathy ? ' → ' + empathy : ''}`;
      }).filter(Boolean);
      if (postDetails.length > 0) postContext = `\n\n【社員の生の声（関連投稿）】\n${postDetails.join('\n')}`;
    }

    // 既存プラン一覧（重複回避）
    let existingPlans = '';
    try {
      const existing = db.prepare('SELECT title FROM action_plans WHERE status != ?').all('done');
      if (existing.length > 0) {
        existingPlans = `\n\n【既存プラン（これらと重複しない独自の切り口で作成すること）】\n${existing.map(p => '- ' + p.title).join('\n')}`;
      }
    } catch (e) {}

    // AI企画書生成
    const sysPrompt = `あなたはプロの健康経営コンサルタントです。以下のデータに基づき、統合型の健康アクションプラン企画書を作成してください。Markdown形式。
・プラン名: ${planTitle}\n・テーマ: ${theme}\n・背景: ${background}\n・スコア: ${JSON.stringify(scores)}${postContext}${existingPlans}

【重要な指示】
- 社員の生の声がある場合、その具体的な状況・悩みに即した施策にすること（汎用的な内容にしない）
- 既存プランと切り口・アプローチが重複しないようにすること

構成: 1.現状分析 2.経営的意義 3.アクションプラン詳細 4.実行ロードマップ 5.KPI・効果測定指標`;
    let proposalText = await callGroqApi(sysPrompt, '企画書を作成してください');
    if (!proposalText) proposalText = 'AI生成に失敗しました';

    const planId = 'plan_' + Date.now();
    const s = scores;
    const total = Number(s.legal) + Number(s.risk) + Number(s.freq) + Number(s.urgency) + Number(s.safety) + Number(s.value) + Number(s.needs);

    db.prepare(`INSERT INTO action_plans (plan_id, title, category, score_legal, score_risk, score_freq, score_urgency, score_safety, score_value, score_needs, total_score, source_post_id, status, proposal_draft)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(planId, planTitle, '統合テーマ', s.legal, s.risk, s.freq, s.urgency, s.safety, s.value, s.needs, total, 'Theme_Based', STATUS.CANDIDATE, proposalText);

    // 関連投稿の投稿者に通知
    if (postIds && postIds.length > 0) {
      postIds.forEach(pid => {
        const post = db.prepare('SELECT user_id, nickname FROM posts WHERE post_id = ?').get(pid);
        if (post && post.user_id) {
          const nid = 'feedback_' + Date.now() + '_' + post.user_id.substring(0, 4);
          db.prepare('INSERT INTO notices (notice_id, content, sender, target_id) VALUES (?,?,?,?)').run(nid,
            `${post.nickname || 'あなた'}さんの声が企画候補に選ばれました！\n\n【${planTitle}】\n健康推進メンバーがあなたの投稿をもとに施策を検討しています。`,
            '健康推進チーム', post.user_id);
        }
      });
    }
    res.json({ success: true, msg: '企画書を生成し保存しました！', proposal: proposalText });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// ドラフト更新
router.post('/update-draft', (req, res) => {
  try {
    const { planId, newDraft, newTitle } = req.body;
    const db = getDb();
    if (newTitle) {
      db.prepare('UPDATE action_plans SET proposal_draft = ?, title = ? WHERE plan_id = ?').run(newDraft, newTitle, planId);
    } else {
      db.prepare('UPDATE action_plans SET proposal_draft = ? WHERE plan_id = ?').run(newDraft, planId);
    }
    res.json({ success: true, msg: 'タイトルと本文を保存しました！' });
  } catch (e) { res.json({ success: false, msg: '保存エラー: ' + e.message }); }
});

// アーカイブ
router.post('/archive', (req, res) => {
  try {
    const db = getDb();
    db.prepare("UPDATE action_plans SET status = 'done' WHERE plan_id = ?").run(req.body.planId);
    res.json({ success: true, msg: 'アーカイブしました' });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 差し戻し
router.post('/remand', (req, res) => {
  try {
    const db = getDb();
    const plan = db.prepare('SELECT source_post_id FROM action_plans WHERE plan_id = ?').get(req.body.planId);
    db.prepare('DELETE FROM action_plans WHERE plan_id = ?').run(req.body.planId);
    if (plan && plan.source_post_id && plan.source_post_id !== 'Theme_Based') {
      db.prepare("UPDATE posts SET status = 'open' WHERE post_id = ?").run(plan.source_post_id);
    }
    res.json({ success: true, msg: '評価フェーズに差し戻しました' });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 候補へ戻す
router.post('/revert-to-candidate', (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE action_plans SET status = ? WHERE plan_id = ?').run(STATUS.CANDIDATE, req.body.planId);
    res.json({ success: true, msg: '「企画候補」に差し戻しました！' });
  } catch (e) { res.json({ success: false, msg: 'エラー: ' + e.message }); }
});

// 役員上申
router.post('/submit-to-exec', (req, res) => {
  try {
    const db = getDb();
    const plan = db.prepare('SELECT approval_log FROM action_plans WHERE plan_id = ?').get(req.body.planId);
    let log = [];
    try { log = JSON.parse(plan.approval_log || '[]'); } catch (e) {}
    log.push({ action: 'submitted', by: 'admin', date: new Date().toISOString(), note: '推進メンバーから役員へ上申' });
    db.prepare('UPDATE action_plans SET status = ?, approval_log = ? WHERE plan_id = ?').run(STATUS.EXEC_PENDING, JSON.stringify(log), req.body.planId);
    res.json({ success: true, msg: '役員決裁へ上申しました！' });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 役員決裁一覧
router.get('/exec-pending', (req, res) => {
  try {
    const db = getDb();
    const plans = db.prepare('SELECT * FROM action_plans WHERE status = ?').all(STATUS.EXEC_PENDING);
    res.json(plans.map(r => ({
      id: r.plan_id, title: r.title, category: r.category, score: r.total_score,
      draft: r.proposal_draft || '',
      scores: { legal: r.score_legal, risk: r.score_risk, freq: r.score_freq, urgency: r.score_urgency, safety: r.score_safety, value: r.score_value, needs: r.score_needs },
      date: r.created_at ? new Date(r.created_at).toLocaleDateString('ja-JP') : '',
      aiLog: r.ai_log || '', approvalLog: r.approval_log || '[]'
    })));
  } catch (e) { res.json([]); }
});

// 役員決裁処理
router.post('/exec-decision', (req, res) => {
  try {
    const { planId, decision, comment, approverName } = req.body;
    const db = getDb();
    const plan = db.prepare('SELECT approval_log FROM action_plans WHERE plan_id = ?').get(planId);
    let log = [];
    try { log = JSON.parse(plan.approval_log || '[]'); } catch (e) {}
    log.push({ action: decision, by: approverName || '役員', date: new Date().toISOString(), comment: comment || '' });
    db.prepare('UPDATE action_plans SET approval_log = ? WHERE plan_id = ?').run(JSON.stringify(log), planId);

    let newStatus, msg;
    if (decision === 'approved') { newStatus = STATUS.APPROVED; msg = '承認しました。全社展開の準備に進みます。'; }
    else if (decision === 'rejected') { newStatus = STATUS.REJECTED; msg = '却下しました。'; }
    else if (decision === 'conditional') { newStatus = STATUS.CANDIDATE; msg = '条件付き差戻しを行いました。'; }
    else return res.json({ success: false, msg: '不明な決裁区分' });

    db.prepare('UPDATE action_plans SET status = ? WHERE plan_id = ?').run(newStatus, planId);
    // 承認時に投稿者へ通知
    if (decision === 'approved') {
      notifyOriginalPoster(db, planId, '役員決裁で承認されました！まもなく全社展開が始まります。');
    }
    res.json({ success: true, msg });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 実行計画設定
router.post('/set-execution', (req, res) => {
  try {
    const { planId, owner, deadline, kpiTarget } = req.body;
    const db = getDb();
    const plan = db.prepare('SELECT execution_log FROM action_plans WHERE plan_id = ?').get(planId);
    let execLog = [];
    try { execLog = JSON.parse(plan.execution_log || '[]'); } catch (e) {}
    execLog.push({ action: 'started', date: new Date().toISOString(), note: `担当: ${owner}, 期限: ${deadline}` });
    db.prepare('UPDATE action_plans SET status = ?, owner = ?, deadline = ?, kpi_target = ?, execution_log = ? WHERE plan_id = ?')
      .run(STATUS.IN_EXECUTION, owner, deadline, kpiTarget, JSON.stringify(execLog), planId);
    // 投稿者へ展開開始を通知
    notifyOriginalPoster(db, planId, `全社展開が始まりました！\n担当: ${owner}\n期限: ${deadline}`);

    // 承認済みプランからチャレンジを自動生成（非同期）
    generateChallengeFromPlan(db, planId).catch(e => console.error('auto challenge generation:', e.message));

    res.json({ success: true, msg: '全社展開を開始しました！' });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// KPI更新
router.post('/update-kpi', (req, res) => {
  try {
    const { planId, kpiCurrent, note } = req.body;
    const db = getDb();
    const plan = db.prepare('SELECT execution_log FROM action_plans WHERE plan_id = ?').get(planId);
    let execLog = [];
    try { execLog = JSON.parse(plan.execution_log || '[]'); } catch (e) {}
    execLog.push({ action: 'kpi_update', date: new Date().toISOString(), value: kpiCurrent, note: note || '' });
    db.prepare('UPDATE action_plans SET kpi_current = ?, execution_log = ? WHERE plan_id = ?').run(kpiCurrent, JSON.stringify(execLog), planId);
    res.json({ success: true, msg: 'KPIを更新しました' });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 効果ヒアリング送信（全ユーザーまたは関連投稿者に通知）
router.post('/send-hearing', (req, res) => {
  try {
    const { planId, targetScope } = req.body; // targetScope: 'all' or 'related'
    const db = getDb();
    const plan = db.prepare('SELECT title, source_post_id FROM action_plans WHERE plan_id = ?').get(planId);
    if (!plan) return res.json({ success: false, msg: 'プランが見つかりません' });

    const hearingMsg = `【効果ヒアリング:${planId}】\n「${plan.title}」が始まって変化はありましたか？\n\n良かった点・まだ足りない点・新たな気づきなど、あなたの声を聞かせてください。\n\n※投稿画面から自由にコメントできます`;

    if (targetScope === 'all') {
      // 全ユーザーに送信
      const noticeId = 'hearing_' + Date.now();
      db.prepare('INSERT INTO notices (notice_id, content, sender, target_id) VALUES (?,?,?,?)').run(noticeId, hearingMsg, '健康推進チーム', 'ALL');
      res.json({ success: true, msg: '全社員にヒアリング通知を送信しました' });
    } else {
      // 関連投稿者のみ
      let count = 0;
      if (plan.source_post_id && plan.source_post_id !== 'Theme_Based') {
        const postIds = plan.source_post_id.split(',').map(s => s.trim());
        const notified = new Set();
        postIds.forEach(pid => {
          const post = db.prepare('SELECT user_id FROM posts WHERE post_id = ?').get(pid);
          if (post && post.user_id && !notified.has(post.user_id)) {
            notified.add(post.user_id);
            const nid = 'hearing_' + Date.now() + '_' + count;
            db.prepare('INSERT INTO notices (notice_id, content, sender, target_id) VALUES (?,?,?,?)').run(nid, hearingMsg, '健康推進チーム', post.user_id);
            count++;
          }
        });
      }
      res.json({ success: true, msg: `${count}名の関連投稿者にヒアリング通知を送信しました` });
    }
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 効果ヒアリング回答の集計（ヒアリング送信後に投稿された声を紐付けて集計）
router.get('/hearing-results/:planId', async (req, res) => {
  try {
    const db = getDb();
    const planId = req.params.planId;
    const plan = db.prepare('SELECT * FROM action_plans WHERE plan_id = ?').get(planId);
    if (!plan) return res.json({ success: false, msg: 'プランが見つかりません' });

    // ヒアリング通知の送信日時を取得
    let hearingSentAt = null;
    try {
      const notice = db.prepare("SELECT created_at FROM notices WHERE content LIKE ? ORDER BY created_at DESC LIMIT 1")
        .get(`%効果ヒアリング:${planId}%`);
      if (notice) hearingSentAt = notice.created_at;
    } catch (e) {}

    if (!hearingSentAt) return res.json({ success: true, responses: [], summary: null, msg: 'ヒアリング未送信です' });

    // ヒアリング送信後の投稿を収集（全投稿から関連しそうなものを取得）
    const recentPosts = db.prepare(`
      SELECT post_id, content, nickname, analysis, created_at
      FROM posts WHERE created_at >= ? AND status IN ('open','public')
      ORDER BY created_at DESC LIMIT 50
    `).all(hearingSentAt);

    if (recentPosts.length === 0) return res.json({ success: true, responses: [], summary: '回答はまだありません' });

    // AIで関連する投稿をフィルタ＆サマリ生成
    const postsText = recentPosts.map((p, i) => `[${i+1}] ${p.nickname}: ${(p.content || '').substring(0, 100)}`).join('\n');
    const aiPrompt = `以下はヒアリング送信後の社員投稿です。プラン「${plan.title}」に対する効果フィードバックに該当するものを抽出し、要約してください。

【投稿一覧】
${postsText}

出力形式:JSONのみ。
{"related_indices": [該当する投稿番号], "positive": ["良かった点1", "良かった点2"], "negative": ["改善点1"], "summary": "全体要約（2〜3文）"}`;

    const aiResult = await callGroqApi('JSON出力専門AI。指定JSON形式のみ出力。', aiPrompt);
    let summary = { related_indices: [], positive: [], negative: [], summary: '集計中' };
    if (aiResult) {
      const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { summary = JSON.parse(jsonMatch[0]); } catch (e) {}
      }
    }

    const relatedPosts = (summary.related_indices || []).map(i => recentPosts[i - 1]).filter(Boolean);
    res.json({ success: true, responses: relatedPosts, summary, hearingSentAt });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// コメント保存
router.post('/comment', (req, res) => {
  try {
    const { planId, name, comment } = req.body;
    const db = getDb();
    const plan = db.prepare('SELECT member_comments FROM action_plans WHERE plan_id = ?').get(planId);
    let comments = [];
    try { comments = JSON.parse(plan.member_comments || '[]'); } catch (e) {}
    comments.push({ name, text: comment, date: new Date().toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }) });
    db.prepare('UPDATE action_plans SET member_comments = ? WHERE plan_id = ?').run(JSON.stringify(comments), planId);
    res.json({ success: true, comments });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// メンバー検討に回す
router.post('/submit-to-review', (req, res) => {
  try {
    const db = getDb();
    const { planId } = req.body;
    db.prepare('UPDATE action_plans SET status = ? WHERE plan_id = ?').run(STATUS.MEMBER_REVIEW, planId);
    // 全承認済みメンバー分のpending投票レコードを作成
    const members = db.prepare("SELECT email, name FROM core_members WHERE status = 'approved' AND is_exec = 0").all();
    const stmt = db.prepare('INSERT OR IGNORE INTO plan_endorsements (plan_id, member_email, member_name, vote) VALUES (?,?,?,?)');
    members.forEach(m => stmt.run(planId, m.email, m.name, 'pending'));
    let log = [];
    const plan = db.prepare('SELECT approval_log FROM action_plans WHERE plan_id = ?').get(planId);
    try { log = JSON.parse(plan.approval_log || '[]'); } catch (e) {}
    log.push({ action: 'submit_review', by: 'admin', date: new Date().toISOString(), note: 'メンバー合議へ' });
    db.prepare('UPDATE action_plans SET approval_log = ? WHERE plan_id = ?').run(JSON.stringify(log), planId);
    res.json({ success: true, msg: 'メンバー検討に回しました。各メンバーの賛同を待ちます。' });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// メンバー賛同投票
router.post('/endorse', (req, res) => {
  try {
    const db = getDb();
    const { planId, memberEmail, memberName, vote, comment } = req.body;
    db.prepare('INSERT INTO plan_endorsements (plan_id, member_email, member_name, vote, comment) VALUES (?,?,?,?,?) ON CONFLICT(plan_id, member_email) DO UPDATE SET vote=?, comment=?, created_at=CURRENT_TIMESTAMP')
      .run(planId, memberEmail, memberName, vote, comment || '', vote, comment || '');
    const endorsements = db.prepare(`
      SELECT e.member_name, e.member_email, e.vote, e.comment, e.created_at,
             COALESCE(c.avatar, '') as avatar
      FROM plan_endorsements e
      LEFT JOIN core_members c ON e.member_email = c.email
      WHERE e.plan_id = ?
    `).all(planId);
    res.json({ success: true, endorsements });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 賛同状況取得
router.get('/endorsements/:planId', (req, res) => {
  try {
    const db = getDb();
    const endorsements = db.prepare(`
      SELECT e.member_name, e.member_email, e.vote, e.comment, e.created_at,
             COALESCE(c.avatar, '') as avatar
      FROM plan_endorsements e
      LEFT JOIN core_members c ON e.member_email = c.email
      WHERE e.plan_id = ?
    `).all(req.params.planId);
    res.json({ success: true, endorsements });
  } catch (e) { res.json({ success: false, endorsements: [] }); }
});

// 投票リセット（再編集後に再投票）
router.post('/reset-endorsements', (req, res) => {
  try {
    const db = getDb();
    const { planId } = req.body;
    db.prepare("UPDATE plan_endorsements SET vote = 'pending', comment = '', created_at = CURRENT_TIMESTAMP WHERE plan_id = ?").run(planId);
    let log = [];
    const plan = db.prepare('SELECT approval_log FROM action_plans WHERE plan_id = ?').get(planId);
    try { log = JSON.parse(plan.approval_log || '[]'); } catch (e) {}
    log.push({ action: 'reset_vote', by: 'admin', date: new Date().toISOString(), note: '企画書再編集後に再投票' });
    db.prepare('UPDATE action_plans SET approval_log = ? WHERE plan_id = ?').run(JSON.stringify(log), planId);
    res.json({ success: true, msg: '投票をリセットしました。メンバーに再投票を依頼します。' });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// AIログ保存
router.post('/save-ai-log', (req, res) => {
  try {
    const { planId, logStr } = req.body;
    const db = getDb();
    db.prepare('UPDATE action_plans SET ai_log = ? WHERE plan_id = ?').run(logStr, planId);
    res.json({ success: true, msg: '保存成功' });
  } catch (e) { res.json({ success: false, msg: 'エラー: ' + e.message }); }
});

// AIブレスト
router.post('/brainstorm', async (req, res) => {
  try {
    const { theme, background } = req.body;
    const db = getDb();
    let existingInfo = '';
    try {
      const existing = db.prepare('SELECT title FROM action_plans WHERE status != ?').all('done');
      if (existing.length > 0) {
        existingInfo = `\n\n【既存プラン（これらと異なる切り口で提案すること）】\n${existing.map(p => '- ' + p.title).join('\n')}`;
      }
    } catch (e) {}
    const sysPrompt = `あなたは日本トップクラスの健康経営コンサルタントです。クライアントは専門知識のない事務職中心です。
以下の【課題テーマ】と【背景】をもとに、3つの異なるアプローチ（スモールスタート案、ゲーミフィケーション案、根本解決案）で具体的な「健康施策アイデア」を提案してください。
【課題テーマ】: "${theme}"\n【背景】: "${background}"${existingInfo}`;
    const result = await callGroqApi(sysPrompt, 'この課題に対する施策アイデアを3パターン提案してください。');
    res.json({ success: true, idea: result || 'アイデア生成に失敗しました' });
  } catch (e) { res.json({ success: false, msg: 'アイデア生成エラー: ' + e.message }); }
});

// AIリファイン
router.post('/refine', async (req, res) => {
  try {
    const { planId, currentDraft, feedbackData, currentTitle } = req.body;
    const sysPrompt = `あなたはプロの健康経営コンサルタントです。
現在、企画書のドラフトに対して、担当者から「修正指示」が入りました。
修正指示を反映させた「最終決定版」の企画書として、タイトルと本文の両方をブラッシュアップしてください。

【現在のタイトル】${currentTitle}
【現在のドラフト】${currentDraft}
【修正指示 (セクション別)】${JSON.stringify(feedbackData || {})}

【出力形式】
///TITLE///
(タイトル)
///COMMENT///
(修正意図コメント)
///DRAFT///
(本文Markdown)`;
    const resText = await callGroqApi(sysPrompt, '修正指示に従って、タイトルと本文を仕上げてください。');
    if (!resText) return res.json({ success: false, msg: 'AI生成に失敗しました' });

    let newTitle = currentTitle, aiComment = '修正完了しました', newDraft = resText;
    const mTitle = resText.match(/\/\/\/TITLE\/\/\/([\s\S]*?)\/\/\/COMMENT/);
    const mComment = resText.match(/\/\/\/COMMENT\/\/\/([\s\S]*?)\/\/\/DRAFT/);
    const mDraft = resText.match(/\/\/\/DRAFT\/\/\/([\s\S]*)/);
    if (mTitle && mDraft) {
      newTitle = mTitle[1].trim();
      if (mComment) aiComment = mComment[1].trim();
      newDraft = mDraft[1].trim();
    }

    const db = getDb();
    db.prepare('UPDATE action_plans SET proposal_draft = ?, title = ? WHERE plan_id = ?').run(newDraft, newTitle, planId);
    res.json({ success: true, newTitle, newDraft, aiComment, msg: 'タイトルと本文を書き直しました！' });
  } catch (e) { res.json({ success: false, msg: 'AIエラー: ' + e.message }); }
});

// 承認済みプランからチャレンジを自動生成
async function generateChallengeFromPlan(db, planId) {
  const plan = db.prepare('SELECT * FROM action_plans WHERE plan_id = ?').get(planId);
  if (!plan) return;

  // 関連投稿の声を取得
  let voices = '';
  if (plan.source_post_id && plan.source_post_id !== 'Theme_Based') {
    const postIds = plan.source_post_id.split(',').map(s => s.trim());
    const posts = postIds.map(pid => db.prepare('SELECT content, department FROM posts WHERE post_id = ?').get(pid)).filter(Boolean);
    voices = posts.map(p => `- ${p.department || ''}部署: ${(p.content || '').substring(0, 100)}`).join('\n');
  }

  const prompt = `承認済みアクションプランに基づき、全社員向けの参加型チャレンジを設計してください。

${EVIDENCE_BASE}

【プラン名】${plan.title}
【企画書概要】${(plan.proposal_draft || '').substring(0, 500)}
【社員の声】
${voices || '（なし）'}

【設計要件】
- 期間: 30日間
- 任意参加、楽しく続けられる設計
- 毎日30秒で完了する記録項目（選択式2〜3問）
- ランキングで競争要素
- EASTフレームワーク＋COM-Bモデル準拠

【出力形式】JSONのみ。
{
  "title": "キャッチーなチャレンジ名",
  "description": "概要（3〜4文）",
  "icon": "絵文字1つ",
  "evidence_based": "設計根拠",
  "kpi_definitions": [
    {"question": "質問文", "type": "choice", "options": ["選択肢1","選択肢2","選択肢3","選択肢4"], "is_ranking": true, "ranking_type": "cumulative"},
    {"question": "質問文", "type": "choice", "options": ["😫","😐","😊","🤩"], "is_ranking": false}
  ],
  "badges": [
    {"type": "first_record", "name": "初記録", "condition": "初めて記録した"},
    {"type": "streak_7", "name": "7日連続", "condition": "7日連続で記録"},
    {"type": "streak_14", "name": "14日連続", "condition": "14日連続で記録"},
    {"type": "perfect", "name": "皆勤賞", "condition": "全日記録達成"},
    {"type": "comeback", "name": "カムバック", "condition": "3日以上休んで復帰"}
  ]
}`;

  const aiResult = await callGroqApi('JSON出力専門AI。指定JSON形式のみ出力。', prompt);
  if (!aiResult) return;
  const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return;

  const challenge = JSON.parse(jsonMatch[0]);
  const cid = 'ch_' + uuidv4().substring(0, 8);

  db.prepare(`INSERT INTO challenges (challenge_id, theme_id, cycle_number, title, description, icon, duration_days, kpi_definitions, badge_config, ai_draft, status)
    VALUES (?, ?, 0, ?, ?, ?, 30, ?, ?, ?, 'draft')`)
    .run(cid, planId, challenge.title, challenge.description, challenge.icon || '💪',
      JSON.stringify(challenge.kpi_definitions || []),
      JSON.stringify(challenge.badges || []),
      JSON.stringify(challenge));

  // プランにチャレンジIDを紐付け
  db.prepare('UPDATE action_plans SET ai_log = ? WHERE plan_id = ?')
    .run(JSON.stringify({ challengeId: cid, generatedAt: new Date().toISOString() }), planId);
}

module.exports = router;
