/**
 * 週間食事分析サービス
 * 毎週月曜朝に実行：先週の食事投稿をユーザーごとに集計し、
 * AI栄養分析 → ユーザーに通知 + 管理者用レポート保存
 */
const { getDb } = require('./db');
const { callAIWithFallback, EVIDENCE_BASE } = require('./ai');
const { v4: uuidv4 } = require('uuid');

async function runWeeklyFoodAnalysis() {
  const db = getDb();
  const now = new Date();
  console.log('[food-weekly] 週間食事分析開始:', now.toISOString());

  // 先週の月曜〜日曜を算出
  var dayOfWeek = now.getDay(); // 0=日, 1=月
  var lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - dayOfWeek - 6); // 先週月曜
  lastMonday.setHours(0, 0, 0, 0);
  var lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  var weekStart = lastMonday.toISOString().slice(0, 10);
  var weekEnd = lastSunday.toISOString().slice(0, 10);
  var weekLabel = weekStart + ' 〜 ' + weekEnd;
  console.log('[food-weekly] 対象期間:', weekLabel);

  // 既にこの週のレポートがあるかチェック
  var existing = db.prepare("SELECT COUNT(*) as c FROM food_weekly_reports WHERE week_start = ?").get(weekStart);
  if (existing.c > 0) {
    console.log('[food-weekly] この週のレポートは既に生成済み。スキップ');
    return { skipped: true, reason: 'already_generated' };
  }

  // 先週の食事投稿をユーザーごとに集計
  var foodPosts = db.prepare(`
    SELECT user_id, nickname, content, analysis, created_at FROM posts
    WHERE (content LIKE '【写真】%' OR COALESCE(category,'') LIKE '%食事%' OR COALESCE(category,'') LIKE '%栄養%')
    AND date(created_at) >= ? AND date(created_at) <= ?
    ORDER BY user_id, created_at ASC
  `).all(weekStart, weekEnd);

  if (foodPosts.length === 0) {
    console.log('[food-weekly] 先週の食事投稿がありません');
    return { skipped: true, reason: 'no_posts' };
  }

  // ユーザーごとにグループ化
  var byUser = {};
  foodPosts.forEach(function(p) {
    if (!byUser[p.user_id]) byUser[p.user_id] = { nickname: p.nickname, posts: [] };
    byUser[p.user_id].posts.push(p);
  });

  var results = [];
  var userIds = Object.keys(byUser);

  for (var i = 0; i < userIds.length; i++) {
    var uid = userIds[i];
    var userData = byUser[uid];

    // レートリミット対策
    if (i > 0) await new Promise(function(r) { setTimeout(r, 3000); });

    try {
      var report = await generateUserFoodReport(uid, userData, weekLabel, weekStart);
      results.push({ uid: uid, nickname: userData.nickname, success: true });
      console.log('[food-weekly] ' + userData.nickname + ': レポート生成完了');
    } catch (e) {
      console.error('[food-weekly] ' + userData.nickname + ': 失敗 -', e.message);
      results.push({ uid: uid, nickname: userData.nickname, success: false, error: e.message });
    }
  }

  console.log('[food-weekly] 完了:', results.filter(function(r) { return r.success; }).length + '/' + results.length + '件');
  return { success: true, results: results };
}

async function generateUserFoodReport(uid, userData, weekLabel, weekStart) {
  var db = getDb();

  // 食事投稿の内容とAI分析をまとめる
  var mealSummary = userData.posts.map(function(p, idx) {
    var content = (p.content || '').replace(/^【写真】/, '').substring(0, 120);
    // AI分析からケアコメント部分を抽出
    var aiComment = '';
    if (p.analysis) {
      var parts = p.analysis.split('///SCORE///');
      aiComment = (parts[0] || '').substring(0, 150);
    }
    var date = p.created_at ? p.created_at.substring(5, 10) : '';
    return '[' + date + '] ' + content + (aiComment ? ' → AI: ' + aiComment.substring(0, 80) : '');
  }).join('\n');

  var prompt = EVIDENCE_BASE + '\n\n' +
    'あなたは管理栄養士です。以下は' + userData.nickname + 'さんの1週間(' + weekLabel + ')の食事記録です。\n\n' +
    '【食事記録(' + userData.posts.length + '食分)】\n' + mealSummary + '\n\n' +
    '以下の形式で週間栄養分析レポートを作成してください。\n' +
    '★★★マークダウン記法（**太字**や###見出し等）は絶対に使わない★★★\n\n' +
    '【出力形式】\n' +
    '1. 今週の食事傾向（2〜3文で全体の傾向を述べる）\n' +
    '2. 五大栄養素バランス評価\n' +
    '   - たんぱく質（推定摂取状況と過不足）\n' +
    '   - 脂質（揚げ物・油脂の頻度）\n' +
    '   - 炭水化物（主食の偏り）\n' +
    '   - ビタミン（緑黄色野菜・果物の摂取頻度）\n' +
    '   - ミネラル（カルシウム・鉄分の摂取状況）\n' +
    '3. 🧂 塩分分析（重要）\n' +
    '   - 1週間の推定塩分摂取傾向（多い/適正/少ない）\n' +
    '   - 塩分が多い原因の特定（味噌汁、漬物、加工食品、惣菜、ラーメン等）\n' +
    '   - 目標: 1日7.5g未満（男性）、1食2.5g未満\n' +
    '4. 良かった点（具体的に1〜2つ褒める）\n' +
    '5. 来週の心がけ（減塩のコツを含む。具体的で実践しやすいアドバイスを2〜3つ。スモールステップで）\n' +
    '6. 📚 出典: 根拠となるガイドライン名\n\n' +
    '温かく励ましつつ、エビデンスに基づいた具体的なアドバイスをお願いします。特に塩分については運輸業のドライバーはコンビニ弁当・惣菜中心の食生活が多いため、具体的な減塩提案を重視してください。';

  var aiResult = await callAIWithFallback('管理栄養士として週間食事分析レポートを作成してください。', prompt);
  if (!aiResult) throw new Error('AI分析失敗');

  // food_weekly_reportsに保存
  var reportId = 'fwr_' + uuidv4().substring(0, 8);
  db.prepare(`INSERT INTO food_weekly_reports (report_id, user_id, nickname, week_start, week_end, meal_count, report_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`).run(
    reportId, uid, userData.nickname, weekStart,
    new Date(new Date(weekStart).getTime() + 6 * 86400000).toISOString().slice(0, 10),
    userData.posts.length, aiResult
  );

  // ユーザーへ個人通知
  var noticeId = 'notice_' + uuidv4().substring(0, 8);
  var noticeContent = '【週間食事レポート ' + weekLabel + '】\n\n' +
    userData.nickname + 'さんの今週の食事分析です（' + userData.posts.length + '食分）\n\n' + aiResult;
  db.prepare(`INSERT INTO notices (notice_id, content, sender, target_id, status, created_at)
    VALUES (?, ?, '🥗 AI栄養士', ?, 'unread', datetime('now'))`).run(noticeId, noticeContent, uid);

  return { reportId: reportId, reportText: aiResult };
}

module.exports = { runWeeklyFoodAnalysis };
