const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../services/db');
const { callGroqApi, EVIDENCE_BASE } = require('../services/ai');
const router = express.Router();

// ============================================================
// テーマ・投票サイクル管理
// ============================================================

// 現在のサイクル取得
router.get('/current-cycle', (req, res) => {
  try {
    const db = getDb();
    const cycle = db.prepare("SELECT * FROM vote_cycles ORDER BY cycle_number DESC LIMIT 1").get();
    if (!cycle) return res.json({ success: true, cycle: null });
    const themes = db.prepare("SELECT * FROM themes WHERE cycle_number = ? ORDER BY vote_count DESC").all(cycle.cycle_number);
    // ユーザーの投票状況
    const uid = req.query.uid || '';
    let myVotes = [];
    if (uid) {
      myVotes = db.prepare("SELECT theme_id FROM theme_votes WHERE user_id = ? AND theme_id IN (SELECT theme_id FROM themes WHERE cycle_number = ?)").all(uid, cycle.cycle_number).map(r => r.theme_id);
    }
    const totalUsers = db.prepare("SELECT COUNT(*) as cnt FROM users").get().cnt;
    const totalVoters = db.prepare("SELECT COUNT(DISTINCT user_id) as cnt FROM theme_votes WHERE theme_id IN (SELECT theme_id FROM themes WHERE cycle_number = ?)").get(cycle.cycle_number).cnt;
    res.json({ success: true, cycle, themes, myVotes, totalUsers, totalVoters });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// テーマに投票
router.post('/vote', (req, res) => {
  try {
    const { themeId, userId, comment } = req.body;
    if (!themeId || !userId) return res.json({ success: false, msg: '必須項目が不足' });
    const db = getDb();
    // 同一サイクルの投票数チェック（上限2票）
    const theme = db.prepare("SELECT * FROM themes WHERE theme_id = ?").get(themeId);
    if (!theme) return res.json({ success: false, msg: 'テーマが見つかりません' });
    const cycle = theme.cycle_number;
    const myVotes = db.prepare("SELECT COUNT(*) as cnt FROM theme_votes WHERE user_id = ? AND theme_id IN (SELECT theme_id FROM themes WHERE cycle_number = ?)").get(userId, cycle).cnt;
    // 既に同テーマに投票済みかチェック
    const existing = db.prepare("SELECT id FROM theme_votes WHERE theme_id = ? AND user_id = ?").get(themeId, userId);
    if (existing) {
      // 投票取消
      db.prepare("DELETE FROM theme_votes WHERE theme_id = ? AND user_id = ?").run(themeId, userId);
      db.prepare("UPDATE themes SET vote_count = vote_count - 1 WHERE theme_id = ?").run(themeId);
      return res.json({ success: true, action: 'removed' });
    }
    if (myVotes >= 2) return res.json({ success: false, msg: '1サイクルにつき2票までです' });
    db.prepare("INSERT INTO theme_votes (theme_id, user_id, comment) VALUES (?, ?, ?)").run(themeId, userId, comment || '');
    db.prepare("UPDATE themes SET vote_count = vote_count + 1 WHERE theme_id = ?").run(themeId);
    res.json({ success: true, action: 'voted' });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 投票コメント一覧
router.get('/vote-comments/:themeId', (req, res) => {
  try {
    const db = getDb();
    const comments = db.prepare(`
      SELECT tv.comment, tv.created_at, u.nickname, u.avatar
      FROM theme_votes tv LEFT JOIN users u ON tv.user_id = u.id
      WHERE tv.theme_id = ? AND tv.comment != '' ORDER BY tv.created_at DESC
    `).all(req.params.themeId);
    res.json({ success: true, comments });
  } catch (e) {
    res.json({ success: false, comments: [] });
  }
});

// ============================================================
// 管理者: AIテーマ凝集
// ============================================================
router.post('/generate-themes', async (req, res) => {
  try {
    const db = getDb();
    // 直近3ヶ月の投稿を取得
    const posts = db.prepare(`
      SELECT post_id, content, analysis, department, category, created_at
      FROM posts WHERE status IN ('open','public') AND created_at > datetime('now', '-3 months')
      ORDER BY created_at DESC
    `).all();
    if (posts.length < 3) return res.json({ success: false, msg: '投稿が少なすぎます（最低3件必要）' });

    // 共感データを集計（投稿ごと）
    const empathyByPost = {};
    db.prepare('SELECT post_id, empathy_type, COUNT(*) as cnt FROM empathy_responses GROUP BY post_id, empathy_type').all()
      .forEach(r => {
        if (!empathyByPost[r.post_id]) empathyByPost[r.post_id] = { total: 0, types: {} };
        empathyByPost[r.post_id].types[r.empathy_type] = r.cnt;
        empathyByPost[r.post_id].total += r.cnt;
      });

    // 推進メンバーコメント（投稿ごと）
    const memberCommentsByPost = {};
    try {
      db.prepare('SELECT post_id, member_name, comment FROM member_comments ORDER BY created_at ASC').all()
        .forEach(r => {
          if (!memberCommentsByPost[r.post_id]) memberCommentsByPost[r.post_id] = [];
          memberCommentsByPost[r.post_id].push(`${r.member_name}: ${r.comment}`);
        });
    } catch(e) {}

    // メンバーチャット（投稿ごと）
    const memberChatsByPost = {};
    try {
      db.prepare('SELECT post_id, member_name, message FROM member_chats ORDER BY created_at ASC').all()
        .forEach(r => {
          if (!memberChatsByPost[r.post_id]) memberChatsByPost[r.post_id] = [];
          memberChatsByPost[r.post_id].push(`${r.member_name}: ${r.message}`);
        });
    } catch(e) {}

    // AI自動7軸評価（投稿ごと）
    const autoEvalByPost = {};
    try {
      db.prepare('SELECT post_id, legal, risk, freq, urgency, safety, value_score, needs, total_score, reasoning FROM auto_evaluations').all()
        .forEach(r => { autoEvalByPost[r.post_id] = r; });
    } catch(e) {}

    // 投稿サマリー（全データ統合）
    const postSummaries = posts.slice(0, 100).map((p, i) => {
      const content = (p.content || '').replace(/^【写真】/, '').substring(0, 150);
      const emp = empathyByPost[p.post_id];
      const empStr = emp ? `共感${emp.total}件(${Object.entries(emp.types).map(([k,v])=>`${k}:${v}`).join(',')})` : '共感0';
      const mc = memberCommentsByPost[p.post_id];
      const mcStr = mc ? `メンバーコメント${mc.length}件: ${mc.slice(0,2).join(' / ').substring(0, 80)}` : '';
      const chat = memberChatsByPost[p.post_id];
      const chatStr = chat ? `メンバー議論${chat.length}件: ${chat.slice(0,2).join(' / ').substring(0, 80)}` : '';
      const ev = autoEvalByPost[p.post_id];
      const evStr = ev ? `AI評価:合計${ev.total_score}/35(法${ev.legal}危${ev.risk}頻${ev.freq}急${ev.urgency}安${ev.safety}値${ev.value_score}需${ev.needs}) ${(ev.reasoning||'').substring(0,50)}` : '';
      return `[${i+1}] ${p.department || '不明'}部署 | ${content} | ${empStr}${mcStr ? ' | ' + mcStr : ''}${chatStr ? ' | ' + chatStr : ''}${evStr ? ' | ' + evStr : ''}`;
    }).join('\n');

    const prompt = `あなたは健康経営アナリストです。以下の社員の声を、共感データ・推進メンバーの議論・AI評価を総合的に考慮して、3〜5個の健康テーマに分類してください。

★★★重要★★★
- 共感数が多い投稿ほど重要度が高い
- 「ヤバい(yabai)」「専門家に相談すべき(senmon)」の共感が多い投稿は緊急性が高い
- 「会社が動けば(kaisha)」「一緒に取り組みたい(issho)」の共感が多いテーマは施策効果が高い
- 推進メンバーのコメントや議論で指摘された課題を優先的にテーマ化
- AI7軸評価の合計スコアが高い投稿を含むテーマのseverityを高く

【社員の声（${posts.length}件・共感データ・メンバー議論・AI評価付き）】
${postSummaries}

【出力形式】JSON配列のみ。他のテキスト不要。
[
  {
    "name": "テーマ名（短く）",
    "icon": "絵文字1つ",
    "description": "このテーマが重要な理由（共感データやメンバー議論を踏まえて2〜3文）",
    "keywords": ["キーワード1", "キーワード2", "キーワード3"],
    "post_indices": [1, 3, 7],
    "severity": 3.5,
    "representative_voices": ["代表的な声1を30文字以内で", "代表的な声2を30文字以内で", "代表的な声3を30文字以内で"]
  }
]`;

    const aiResult = await callGroqApi('JSON出力専門AI。指定JSON形式のみ出力。', prompt);
    if (!aiResult) return res.json({ success: false, msg: 'AI生成失敗' });
    const jsonMatch = aiResult.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return res.json({ success: false, msg: 'AI出力形式エラー' });

    const themesData = JSON.parse(jsonMatch[0]);

    // サイクル番号を取得
    const lastCycle = db.prepare("SELECT MAX(cycle_number) as n FROM vote_cycles").get();
    const cycleNum = (lastCycle.n || 0) + 1;

    // サイクルレコード作成
    db.prepare("INSERT INTO vote_cycles (cycle_number, title, status) VALUES (?, ?, 'candidate')").run(cycleNum, `第${cycleNum}回テーマ投票`);

    // テーマレコード作成
    const themes = [];
    for (const t of themesData) {
      const tid = 'theme_' + uuidv4().substring(0, 8);
      const postIds = (t.post_indices || []).map(i => posts[i - 1]?.post_id).filter(Boolean);
      // 部署分布を計算
      const deptDist = {};
      postIds.forEach(pid => {
        const p = posts.find(x => x.post_id === pid);
        if (p && p.department) deptDist[p.department] = (deptDist[p.department] || 0) + 1;
      });

      db.prepare(`INSERT INTO themes (theme_id, cycle_number, name, description, icon, post_ids, post_count, dept_distribution, severity_avg, keywords, representative_voices, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'candidate')`)
        .run(tid, cycleNum, t.name, t.description, t.icon || '💡', JSON.stringify(postIds), postIds.length, JSON.stringify(deptDist), t.severity || 3, JSON.stringify(t.keywords || []), JSON.stringify(t.representative_voices || []));
      themes.push({ theme_id: tid, ...t });
    }

    res.json({ success: true, cycleNumber: cycleNum, themes });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 管理者: テーマ候補を修正
// 投票なしで直接テーマ決定
router.post('/direct-decide', (req, res) => {
  try {
    const { cycleNumber, themeId } = req.body;
    const db = getDb();
    db.prepare("UPDATE vote_cycles SET status = 'finalized', selected_theme_id = ? WHERE cycle_number = ?").run(themeId, cycleNumber);
    db.prepare("UPDATE themes SET status = 'selected' WHERE theme_id = ?").run(themeId);
    db.prepare("UPDATE themes SET status = 'archived' WHERE cycle_number = ? AND theme_id != ?").run(cycleNumber, themeId);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// テーマ削除
router.post('/delete-theme', (req, res) => {
  try {
    const { themeId } = req.body;
    const db = getDb();
    db.prepare("DELETE FROM theme_votes WHERE theme_id = ?").run(themeId);
    db.prepare("DELETE FROM themes WHERE theme_id = ?").run(themeId);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

router.post('/update-theme', (req, res) => {
  try {
    const { themeId, name, description, icon } = req.body;
    const db = getDb();
    db.prepare("UPDATE themes SET name = ?, description = ?, icon = ? WHERE theme_id = ?").run(name, description, icon || '💡', themeId);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 管理者: 投票開始
// ステータス変更（汎用）
router.post('/change-status', (req, res) => {
  try {
    const { cycleNumber, status } = req.body;
    const db = getDb();
    db.prepare("UPDATE vote_cycles SET status = ? WHERE cycle_number = ?").run(status, cycleNumber);
    res.json({ success: true });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 保健師助言を確認→役員承認へ
router.post('/submit-advisor-advice', (req, res) => {
  try {
    const { cycleNumber, advisorComment } = req.body;
    const db = getDb();
    db.prepare("UPDATE vote_cycles SET status = 'exec_approval', advisor_comment = ? WHERE cycle_number = ?").run(advisorComment || '', cycleNumber);
    res.json({ success: true });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 役員承認/差戻し
router.post('/exec-approve', (req, res) => {
  try {
    const { cycleNumber, execComment, decision } = req.body;
    const db = getDb();
    if (decision === 'approved') {
      // 承認→投票開始可能状態（votingではなくapprovedにして手動で投票開始）
      db.prepare("UPDATE vote_cycles SET status = 'voting', exec_comment = ? WHERE cycle_number = ?").run(execComment || '', cycleNumber);
      // テーマも投票状態に
      db.prepare("UPDATE themes SET status = 'voting' WHERE cycle_number = ?").run(cycleNumber);
      // 投票期間を設定（7日間）
      const now = new Date().toISOString();
      const end = new Date(Date.now() + 7 * 86400000).toISOString();
      db.prepare("UPDATE vote_cycles SET voting_start = ?, voting_end = ? WHERE cycle_number = ?").run(now, end, cycleNumber);
    } else {
      // 差戻し→候補に戻す
      db.prepare("UPDATE vote_cycles SET status = 'candidate', exec_comment = ? WHERE cycle_number = ?").run(execComment || '', cycleNumber);
    }
    res.json({ success: true });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

router.post('/start-voting', (req, res) => {
  try {
    const { cycleNumber, durationDays } = req.body;
    const db = getDb();
    const days = durationDays || 7;
    const now = new Date().toISOString();
    const end = new Date(Date.now() + days * 86400000).toISOString();
    db.prepare("UPDATE vote_cycles SET status = 'voting', voting_start = ?, voting_end = ? WHERE cycle_number = ?").run(now, end, cycleNumber);
    db.prepare("UPDATE themes SET status = 'voting' WHERE cycle_number = ?").run(cycleNumber);
    res.json({ success: true, votingEnd: end });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 管理者: 投票終了 → テーマ確定
router.post('/finalize-voting', (req, res) => {
  try {
    const { cycleNumber } = req.body;
    const db = getDb();
    const winner = db.prepare("SELECT * FROM themes WHERE cycle_number = ? ORDER BY vote_count DESC LIMIT 1").get(cycleNumber);
    if (!winner) return res.json({ success: false, msg: 'テーマが見つかりません' });
    db.prepare("UPDATE vote_cycles SET status = 'finalized', selected_theme_id = ? WHERE cycle_number = ?").run(winner.theme_id, cycleNumber);
    db.prepare("UPDATE themes SET status = 'selected' WHERE theme_id = ?").run(winner.theme_id);
    db.prepare("UPDATE themes SET status = 'archived' WHERE cycle_number = ? AND theme_id != ?").run(cycleNumber, winner.theme_id);
    res.json({ success: true, winner });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// サイクル削除
router.post('/delete-cycle', (req, res) => {
  try {
    const { cycleNumber } = req.body;
    const db = getDb();
    // テーマIDを取得
    const themeIds = db.prepare("SELECT theme_id FROM themes WHERE cycle_number = ?").all(cycleNumber).map(t => t.theme_id);
    // 投票削除
    themeIds.forEach(tid => {
      db.prepare("DELETE FROM theme_votes WHERE theme_id = ?").run(tid);
    });
    // テーマ削除
    db.prepare("DELETE FROM themes WHERE cycle_number = ?").run(cycleNumber);
    // チャレンジ・参加者・KPI・バッジ削除
    const challenges = db.prepare("SELECT challenge_id FROM challenges WHERE cycle_number = ?").all(cycleNumber);
    challenges.forEach(c => {
      db.prepare("DELETE FROM kpi_records WHERE challenge_id = ?").run(c.challenge_id);
      db.prepare("DELETE FROM challenge_participants WHERE challenge_id = ?").run(c.challenge_id);
      db.prepare("DELETE FROM badges WHERE challenge_id = ?").run(c.challenge_id);
      db.prepare("DELETE FROM ambassador_advices WHERE challenge_id = ?").run(c.challenge_id);
    });
    db.prepare("DELETE FROM challenges WHERE cycle_number = ?").run(cycleNumber);
    // サイクル削除
    db.prepare("DELETE FROM vote_cycles WHERE cycle_number = ?").run(cycleNumber);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// ============================================================
// AIアクションプラン自動生成
// ============================================================
router.post('/generate-challenge', async (req, res) => {
  try {
    const { themeId } = req.body;
    const db = getDb();
    const theme = db.prepare("SELECT * FROM themes WHERE theme_id = ?").get(themeId);
    if (!theme) return res.json({ success: false, msg: 'テーマが見つかりません' });

    // テーマに紐づく投稿を取得
    const postIds = JSON.parse(theme.post_ids || '[]');
    let voices = '';
    if (postIds.length > 0) {
      const posts = db.prepare(`SELECT content, department FROM posts WHERE post_id IN (${postIds.map(() => '?').join(',')})`)
        .all(...postIds);
      voices = posts.map(p => `- ${p.department || ''}部署: ${(p.content || '').substring(0, 100)}`).join('\n');
    }

    // 投票コメントを取得
    const voteComments = db.prepare(`
      SELECT tv.comment, u.nickname FROM theme_votes tv
      LEFT JOIN users u ON tv.user_id = u.id
      WHERE tv.theme_id = ? AND tv.comment != ''
    `).all(themeId);
    const commentsText = voteComments.map(c => `- ${c.nickname || '匿名'}: ${c.comment}`).join('\n') || '（なし）';

    const prompt = `あなたはエビデンスに基づく健康経営プランナーです。社員の声と投票で選ばれたテーマに基づき、参加型アクションプラン（チャレンジ）を設計してください。

★★★最重要★★★
以下のエビデンス基盤を必ず根拠として使用し、チャレンジの設計理由をevidence_basedフィールドに明記すること。
エビデンスのない施策を提案してはいけない。

${EVIDENCE_BASE}

【テーマ】${theme.name}
【テーマ説明】${theme.description}
【該当する声の数】${theme.post_count}件
【社員の声】
${voices || '（詳細なし）'}
【投票時のコメント】
${commentsText}

【設計要件】
- 期間: 30日間
- 任意参加（強制しない、楽しく続けられる設計）
- 毎日30秒で完了する記録項目（選択式2〜3問）
- ランキングで競争要素を入れる
- 具体的で実行可能なアクション
- EASTフレームワーク（Easy, Attractive, Social, Timely）に沿った行動変容設計
- COM-Bモデル（Capability・Opportunity・Motivation → Behavior）で設計根拠を整理

【出力形式】JSONのみ。
{
  "title": "キャッチーなチャレンジ名",
  "description": "チャレンジの概要説明（3〜4文。エビデンスに基づく目的を含める）",
  "icon": "絵文字1つ",
  "evidence_based": "このチャレンジの設計根拠（どのエビデンス・フレームワークに基づいているか。例: 栄養改善パック2020のPFC基準、EASTのEasy原則でハードルを下げた設計、COM-BのMotivation向上にランキング要素を活用等）",
  "east_design": {"easy": "ハードルを下げた点", "attractive": "楽しさ・魅力の工夫", "social": "仲間と取り組む仕掛け", "timely": "タイミングの工夫"},
  "kpi_definitions": [
    {"question": "質問文", "type": "choice", "options": ["選択肢1","選択肢2","選択肢3","選択肢4"], "is_ranking": true, "ranking_type": "cumulative"},
    {"question": "質問文", "type": "choice", "options": ["😫","😐","😊","🤩"], "is_ranking": false},
    {"question": "今日やったこと", "type": "multi_check", "options": ["項目1","項目2","項目3","項目4"], "is_ranking": false}
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
    if (!aiResult) return res.json({ success: false, msg: 'AI生成失敗' });
    const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.json({ success: false, msg: 'AI出力解析失敗' });

    const plan = JSON.parse(jsonMatch[0]);
    const cid = 'ch_' + uuidv4().substring(0, 8);
    const cycleNum = theme.cycle_number;

    db.prepare(`INSERT INTO challenges (challenge_id, theme_id, cycle_number, title, description, icon, duration_days, kpi_definitions, badge_config, ai_draft, status)
      VALUES (?, ?, ?, ?, ?, ?, 30, ?, ?, ?, 'draft')`)
      .run(cid, themeId, cycleNum, plan.title, plan.description, plan.icon || '💪',
        JSON.stringify(plan.kpi_definitions || []),
        JSON.stringify(plan.badges || []),
        JSON.stringify(plan));

    res.json({ success: true, challengeId: cid, plan });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// ============================================================
// チャレンジ管理
// ============================================================

// チャレンジ一覧
router.get('/challenges', (req, res) => {
  try {
    const db = getDb();
    const challenges = db.prepare("SELECT * FROM challenges ORDER BY created_at DESC").all();
    const result = challenges.map(c => {
      const pCount = db.prepare("SELECT COUNT(*) as cnt FROM challenge_participants WHERE challenge_id = ? AND status = 'active'").get(c.challenge_id).cnt;
      return { ...c, participantCount: pCount, kpi_definitions: JSON.parse(c.kpi_definitions || '[]'), badge_config: JSON.parse(c.badge_config || '[]') };
    });
    res.json({ success: true, challenges: result });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// チャレンジ詳細（ユーザー向け）
router.get('/challenge/:id', (req, res) => {
  try {
    const db = getDb();
    const uid = req.query.uid || '';
    const c = db.prepare("SELECT * FROM challenges WHERE challenge_id = ?").get(req.params.id);
    if (!c) return res.json({ success: false, msg: 'チャレンジが見つかりません' });

    const participants = db.prepare("SELECT cp.*, u.nickname, u.avatar FROM challenge_participants cp LEFT JOIN users u ON cp.user_id = u.id WHERE cp.challenge_id = ? AND cp.status = 'active'").all(c.challenge_id);
    const myParticipation = uid ? db.prepare("SELECT * FROM challenge_participants WHERE challenge_id = ? AND user_id = ?").get(c.challenge_id, uid) : null;
    const totalUsers = db.prepare("SELECT COUNT(*) as cnt FROM users").get().cnt;

    // 今日の記録チェック
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = uid ? db.prepare("SELECT * FROM kpi_records WHERE challenge_id = ? AND user_id = ? AND record_date = ?").get(c.challenge_id, uid, today) : null;

    // バッジ
    const myBadges = uid ? db.prepare("SELECT * FROM badges WHERE challenge_id = ? AND user_id = ?").all(c.challenge_id, uid) : [];

    // アンバサダー助言
    const advices = db.prepare("SELECT aa.*, a.name as ambassador_name, a.organization, a.role as ambassador_role FROM ambassador_advices aa LEFT JOIN ambassadors a ON aa.ambassador_id = a.id WHERE aa.challenge_id = ? ORDER BY aa.created_at DESC").all(c.challenge_id);

    res.json({
      success: true, challenge: { ...c, kpi_definitions: JSON.parse(c.kpi_definitions || '[]'), badge_config: JSON.parse(c.badge_config || '[]') },
      participants, myParticipation, totalUsers,
      todayRecord: todayRecord ? { ...todayRecord, answers: JSON.parse(todayRecord.answers || '{}') } : null,
      myBadges, advices
    });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// チャレンジにエントリー
router.post('/join', (req, res) => {
  try {
    const { challengeId, userId, nickname, avatar } = req.body;
    const db = getDb();
    db.prepare(`INSERT INTO challenge_participants (challenge_id, user_id, nickname, avatar, status)
      VALUES (?, ?, ?, ?, 'active') ON CONFLICT(challenge_id, user_id) DO UPDATE SET status='active', joined_at=CURRENT_TIMESTAMP`)
      .run(challengeId, userId, nickname, avatar);
    // 初参加バッジチェック
    const firstBadge = db.prepare("SELECT id FROM badges WHERE user_id = ? AND badge_type = 'first_join'").get(userId);
    if (!firstBadge) {
      db.prepare("INSERT OR IGNORE INTO badges (challenge_id, user_id, badge_type, badge_name) VALUES (?, ?, 'first_join', '初参加')").run(challengeId, userId);
    }
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// KPI記録
router.post('/record', (req, res) => {
  try {
    const { challengeId, userId, answers, comment } = req.body;
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    db.prepare(`INSERT INTO kpi_records (challenge_id, user_id, record_date, answers, comment)
      VALUES (?, ?, ?, ?, ?) ON CONFLICT(challenge_id, user_id, record_date) DO UPDATE SET answers=excluded.answers, comment=excluded.comment`)
      .run(challengeId, userId, today, JSON.stringify(answers), comment || '');

    // バッジチェック
    checkAndAwardBadges(db, challengeId, userId);

    // 今日の記録数
    const todayCount = db.prepare("SELECT COUNT(*) as cnt FROM kpi_records WHERE challenge_id = ? AND record_date = ?").get(challengeId, today).cnt;

    res.json({ success: true, todayRecordCount: todayCount });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// バッジ付与チェック
function checkAndAwardBadges(db, challengeId, userId) {
  const records = db.prepare("SELECT record_date FROM kpi_records WHERE challenge_id = ? AND user_id = ? ORDER BY record_date ASC").all(challengeId, userId);
  if (records.length === 0) return;

  // 初記録バッジ
  if (records.length === 1) {
    db.prepare("INSERT OR IGNORE INTO badges (challenge_id, user_id, badge_type, badge_name) VALUES (?, ?, 'first_record', '初記録')").run(challengeId, userId);
  }

  // 連続記録チェック
  let streak = 1;
  let maxStreak = 1;
  let hadGap = false;
  for (let i = 1; i < records.length; i++) {
    const prev = new Date(records[i - 1].record_date);
    const curr = new Date(records[i].record_date);
    const diff = (curr - prev) / 86400000;
    if (diff === 1) {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      if (diff >= 3) hadGap = true;
      streak = 1;
    }
  }

  if (maxStreak >= 7) db.prepare("INSERT OR IGNORE INTO badges (challenge_id, user_id, badge_type, badge_name) VALUES (?, ?, 'streak_7', '7日連続')").run(challengeId, userId);
  if (maxStreak >= 14) db.prepare("INSERT OR IGNORE INTO badges (challenge_id, user_id, badge_type, badge_name) VALUES (?, ?, 'streak_14', '14日連続')").run(challengeId, userId);

  // カムバックバッジ（3日以上空いた後に復帰）
  if (hadGap && records.length >= 4) {
    db.prepare("INSERT OR IGNORE INTO badges (challenge_id, user_id, badge_type, badge_name) VALUES (?, ?, 'comeback', 'カムバック')").run(challengeId, userId);
  }

  // 皆勤賞チェック
  const challenge = db.prepare("SELECT period_start, duration_days FROM challenges WHERE challenge_id = ?").get(challengeId);
  if (challenge && challenge.period_start && records.length >= challenge.duration_days) {
    db.prepare("INSERT OR IGNORE INTO badges (challenge_id, user_id, badge_type, badge_name) VALUES (?, ?, 'perfect', '皆勤賞')").run(challengeId, userId);
  }
}

// ランキング取得
router.get('/ranking/:challengeId', (req, res) => {
  try {
    const db = getDb();
    const cid = req.params.challengeId;
    const challenge = db.prepare("SELECT * FROM challenges WHERE challenge_id = ?").get(cid);
    if (!challenge) return res.json({ success: false, msg: 'チャレンジが見つかりません' });

    const kpiDefs = JSON.parse(challenge.kpi_definitions || '[]');
    const rankingDef = kpiDefs.find(k => k.is_ranking);

    // 全参加者の全記録を取得
    const records = db.prepare(`
      SELECT kr.user_id, kr.record_date, kr.answers, kr.comment,
             cp.nickname, cp.avatar
      FROM kpi_records kr
      JOIN challenge_participants cp ON kr.challenge_id = cp.challenge_id AND kr.user_id = cp.user_id
      WHERE kr.challenge_id = ? AND cp.status = 'active'
      ORDER BY kr.record_date ASC
    `).all(cid);

    // ユーザーごとに集計
    const userStats = {};
    records.forEach(r => {
      if (!userStats[r.user_id]) {
        userStats[r.user_id] = { userId: r.user_id, nickname: r.nickname || '匿名', avatar: r.avatar || '😀', totalValue: 0, recordCount: 0, streak: 0, maxStreak: 0, dates: [], lastDate: null };
      }
      const s = userStats[r.user_id];
      s.recordCount++;
      s.dates.push(r.record_date);

      // ランキング対象KPIの値を集計
      if (rankingDef) {
        const ans = JSON.parse(r.answers || '{}');
        const val = ans['q0'] || ans[Object.keys(ans)[0]] || '';
        const numVal = parseFloat(String(val).replace(/[^0-9.]/g, ''));
        if (!isNaN(numVal)) s.totalValue += numVal;
      }
    });

    // 連続記録を計算
    Object.values(userStats).forEach(s => {
      s.dates.sort();
      let streak = 1;
      for (let i = 1; i < s.dates.length; i++) {
        const diff = (new Date(s.dates[i]) - new Date(s.dates[i - 1])) / 86400000;
        if (diff === 1) { streak++; s.maxStreak = Math.max(s.maxStreak, streak); }
        else streak = 1;
      }
      if (s.dates.length === 1) s.maxStreak = 1;
      // 現在の連続記録
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (s.dates.includes(today) || s.dates.includes(yesterday)) {
        let cs = 0;
        for (let i = s.dates.length - 1; i >= 0; i--) {
          const expected = new Date(Date.now() - (s.dates.length - 1 - i) * 86400000).toISOString().split('T')[0];
          if (s.dates[i] <= today) { cs++; } else break;
        }
        s.streak = cs;
      }
    });

    // 各ランキングを生成
    const rankings = {
      total: Object.values(userStats).sort((a, b) => b.totalValue - a.totalValue),
      streak: Object.values(userStats).sort((a, b) => b.maxStreak - a.maxStreak),
      records: Object.values(userStats).sort((a, b) => b.recordCount - a.recordCount),
    };

    // 最近のコメント
    const recentComments = db.prepare(`
      SELECT kr.comment, kr.record_date, cp.nickname, cp.avatar
      FROM kpi_records kr
      JOIN challenge_participants cp ON kr.challenge_id = cp.challenge_id AND kr.user_id = cp.user_id
      WHERE kr.challenge_id = ? AND kr.comment != '' AND cp.status = 'active'
      ORDER BY kr.created_at DESC LIMIT 10
    `).all(cid);

    res.json({ success: true, rankings, recentComments, kpiDefs });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 自分の推移データ
router.get('/my-progress/:challengeId/:userId', (req, res) => {
  try {
    const db = getDb();
    const records = db.prepare("SELECT * FROM kpi_records WHERE challenge_id = ? AND user_id = ? ORDER BY record_date ASC")
      .all(req.params.challengeId, req.params.userId);
    const badges = db.prepare("SELECT * FROM badges WHERE challenge_id = ? AND user_id = ?")
      .all(req.params.challengeId, req.params.userId);
    res.json({
      success: true,
      records: records.map(r => ({ ...r, answers: JSON.parse(r.answers || '{}') })),
      badges
    });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// チャレンジのエントリー受付開始（管理者）
router.post('/start-recruiting', (req, res) => {
  try {
    const { challengeId } = req.body;
    const db = getDb();
    db.prepare("UPDATE challenges SET status = 'recruiting' WHERE challenge_id = ?").run(challengeId);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// チャレンジを開始（管理者）
router.post('/start-challenge', (req, res) => {
  try {
    const { challengeId } = req.body;
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const c = db.prepare("SELECT duration_days FROM challenges WHERE challenge_id = ?").get(challengeId);
    const endDate = new Date(Date.now() + (c.duration_days || 30) * 86400000).toISOString().split('T')[0];
    db.prepare("UPDATE challenges SET status = 'active', period_start = ?, period_end = ? WHERE challenge_id = ?").run(today, endDate, challengeId);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// チャレンジ更新（管理者）
router.post('/update-challenge', (req, res) => {
  try {
    const { challengeId, title, description, icon, kpiDefinitions, durationDays } = req.body;
    const db = getDb();
    db.prepare("UPDATE challenges SET title = ?, description = ?, icon = ?, kpi_definitions = ?, duration_days = ? WHERE challenge_id = ?")
      .run(title, description, icon || '💪', JSON.stringify(kpiDefinitions || []), durationDays || 30, challengeId);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// アンバサダー助言の追加
router.post('/ambassador-advice', (req, res) => {
  try {
    const { ambassadorId, challengeId, adviceType, content } = req.body;
    const db = getDb();
    db.prepare("INSERT INTO ambassador_advices (ambassador_id, challenge_id, advice_type, content) VALUES (?, ?, ?, ?)")
      .run(ambassadorId || null, challengeId, adviceType, content);
    // チャレンジテーブルにも保存
    const col = adviceType === 'plan_review' ? 'ambassador_advice_plan' : adviceType === 'midterm' ? 'ambassador_advice_mid' : 'ambassador_advice_final';
    db.prepare(`UPDATE challenges SET ${col} = ? WHERE challenge_id = ?`).run(content, challengeId);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// KPIダッシュボード（管理者向け）
router.get('/dashboard/:challengeId', (req, res) => {
  try {
    const db = getDb();
    const cid = req.params.challengeId;
    const c = db.prepare("SELECT * FROM challenges WHERE challenge_id = ?").get(cid);
    if (!c) return res.json({ success: false, msg: 'チャレンジが見つかりません' });

    const totalUsers = db.prepare("SELECT COUNT(*) as cnt FROM users").get().cnt;
    const participants = db.prepare("SELECT COUNT(*) as cnt FROM challenge_participants WHERE challenge_id = ? AND status = 'active'").get(cid).cnt;
    const participationRate = totalUsers > 0 ? Math.round(participants / totalUsers * 100) : 0;

    // 今週の記録者数
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const weeklyActive = db.prepare("SELECT COUNT(DISTINCT user_id) as cnt FROM kpi_records WHERE challenge_id = ? AND record_date >= ?").get(cid, weekAgo).cnt;
    const continuationRate = participants > 0 ? Math.round(weeklyActive / participants * 100) : 0;

    // 日別の記録数推移
    const dailyRecords = db.prepare("SELECT record_date, COUNT(*) as cnt FROM kpi_records WHERE challenge_id = ? GROUP BY record_date ORDER BY record_date ASC").all(cid);

    // 部署別参加者数
    const deptStats = db.prepare(`
      SELECT u.department, COUNT(*) as cnt FROM challenge_participants cp
      JOIN users u ON cp.user_id = u.id WHERE cp.challenge_id = ? AND cp.status = 'active'
      GROUP BY u.department
    `).all(cid);

    res.json({
      success: true,
      challenge: { ...c, kpi_definitions: JSON.parse(c.kpi_definitions || '[]') },
      stats: { totalUsers, participants, participationRate, weeklyActive, continuationRate, dailyRecords, deptStats }
    });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

module.exports = router;
