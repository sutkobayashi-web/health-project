const express = require('express');
const { getDb } = require('../services/db');
const { callGroqApi } = require('../services/ai');

const router = express.Router();

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

    // AI企画書生成
    const sysPrompt = `あなたはプロの健康経営コンサルタントです。以下のデータに基づき、統合型の健康アクションプラン企画書を作成してください。Markdown形式。
・プラン名: ${planTitle}\n・テーマ: ${theme}\n・背景: ${background}\n・スコア: ${JSON.stringify(scores)}
構成: 1.現状分析 2.経営的意義 3.アクションプラン詳細 4.実行ロードマップ 5.KPI・効果測定指標`;
    let proposalText = await callGroqApi(sysPrompt, '企画書を作成してください');
    if (!proposalText) proposalText = 'AI生成に失敗しました';

    const planId = 'plan_' + Date.now();
    const s = scores;
    const total = Number(s.legal) + Number(s.risk) + Number(s.freq) + Number(s.urgency) + Number(s.safety) + Number(s.value) + Number(s.needs);

    db.prepare(`INSERT INTO action_plans (plan_id, title, category, score_legal, score_risk, score_freq, score_urgency, score_safety, score_value, score_needs, total_score, source_post_id, status, proposal_draft)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(planId, planTitle, '統合テーマ', s.legal, s.risk, s.freq, s.urgency, s.safety, s.value, s.needs, total, 'Theme_Based', STATUS.CANDIDATE, proposalText);

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
    const sysPrompt = `あなたは日本トップクラスの健康経営コンサルタントです。クライアントは専門知識のない事務職中心です。
以下の【課題テーマ】と【背景】をもとに、3つの異なるアプローチ（スモールスタート案、ゲーミフィケーション案、根本解決案）で具体的な「健康施策アイデア」を提案してください。
【課題テーマ】: "${theme}"\n【背景】: "${background}"`;
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

module.exports = router;
