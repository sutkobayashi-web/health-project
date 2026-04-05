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
    SELECT user_id, nickname, content, analysis, nutrition_scores, created_at FROM posts
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

  // 食事投稿の内容とAI分析をまとめる + 個別スコアを収集
  var mealScores = [];
  var mealSummary = userData.posts.map(function(p, idx) {
    var content = (p.content || '').replace(/^【写真】/, '').substring(0, 120);
    var aiComment = '';
    if (p.analysis) {
      var parts = p.analysis.split('///SCORE///');
      aiComment = (parts[0] || '').substring(0, 150);
      // ///NUTRIENTS/// からスコアを抽出（DB未保存の過去投稿対応）
      var nutMatch = p.analysis.match(/\/\/\/NUTRIENTS\/\/\/\s*(\{[\s\S]*?\})/);
      if (nutMatch) { try { mealScores.push(JSON.parse(nutMatch[1])); } catch(e) {} }
    }
    // nutrition_scoresカラムから取得（新しい投稿）
    if (p.nutrition_scores && !mealScores[mealScores.length - 1]) {
      try { mealScores.push(JSON.parse(p.nutrition_scores)); } catch(e) {}
    }
    var date = p.created_at ? p.created_at.substring(5, 10) : '';
    return '[' + date + '] ' + content + (aiComment ? ' → AI: ' + aiComment.substring(0, 80) : '');
  }).join('\n');

  // 実データから平均栄養値を計算（新形式: {key:{value,unit}} / 旧形式: {key:number} 両対応）
  var avgScores = null;
  if (mealScores.length > 0) {
    var allKeys = ['calories','protein','fat','carbs','vitamin','mineral','salt'];
    var sums = {}; var counts = {};
    allKeys.forEach(function(k) { sums[k] = 0; counts[k] = 0; });
    mealScores.forEach(function(s) {
      allKeys.forEach(function(k) {
        var v = s[k];
        if (v === undefined || v === null) return;
        // 新形式: {value:X, unit:"..."} / 旧形式: 数値そのまま
        var num = (typeof v === 'object' && v.value !== undefined) ? Number(v.value) : Number(v);
        if (!isNaN(num)) { sums[k] += num; counts[k]++; }
      });
    });
    avgScores = {};
    var unitMap = {calories:'kcal',protein:'g',fat:'%',carbs:'%',vitamin:'g',mineral:'mg',salt:'g'};
    allKeys.forEach(function(k) {
      if (counts[k] > 0) {
        avgScores[k] = { value: Math.round(sums[k] / counts[k] * 10) / 10, unit: unitMap[k] };
      }
    });
    console.log('[food-weekly] ' + userData.nickname + ': ' + mealScores.length + '食分の実データから平均算出');
  }

  var prompt = EVIDENCE_BASE + '\n\n' +
    'あなたはAI栄養アドバイザーです。以下は' + userData.nickname + 'さんの1週間(' + weekLabel + ')の食事記録です。\n\n' +
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
    '温かく励ましつつ、エビデンスに基づいた具体的なアドバイスをお願いします。特に塩分については運輸業のドライバーはコンビニ弁当・惣菜中心の食生活が多いため、具体的な減塩提案を重視してください。\n\n' +
    '★★★重要: レポート本文の最後に、必ず以下の形式で1食あたりの推定平均栄養データを出力すること★★★\n' +
    '///WEEKLY_SCORE///{"calories":{"value":数値,"unit":"kcal"},"protein":{"value":数値,"unit":"g"},"fat":{"value":数値,"unit":"%"},"carbs":{"value":数値,"unit":"%"},"vitamin":{"value":数値,"unit":"g"},"mineral":{"value":数値,"unit":"mg"},"salt":{"value":数値,"unit":"g"}}\n' +
    '各valueは1食あたりの推定平均実数値（小数点1桁）:\n' +
    '- calories: 推定カロリー(kcal) 目標450-650\n' +
    '- protein: たんぱく質(g) 目標20\n' +
    '- fat: 脂質エネルギー比(%) 目標20-30\n' +
    '- carbs: 炭水化物エネルギー比(%) 目標50-65\n' +
    '- vitamin: 野菜量(g) 目標120\n' +
    '- mineral: カルシウム(mg) 目標227\n' +
    '- salt: 塩分(g) 目標2.5未満\n' +
    '食事記録の内容から総合的に推定すること。';

  var aiResult = await callAIWithFallback('AI栄養アドバイザーとして週間食事分析レポートを作成してください。', prompt);
  if (!aiResult) throw new Error('AI分析失敗');

  // スコアのパース（AI出力からのフォールバック用）
  var reportText = aiResult;
  var nutritionScores = null;
  if (aiResult.indexOf('///WEEKLY_SCORE///') !== -1) {
    var scoreParts = aiResult.split('///WEEKLY_SCORE///');
    reportText = scoreParts[0].trim();
    try {
      nutritionScores = JSON.parse(scoreParts[1].trim());
    } catch(e) { console.error('[food-weekly] スコアパース失敗:', e.message); }
  }
  // 実データ平均スコアがあればそちらを優先
  if (avgScores) {
    nutritionScores = avgScores;
    console.log('[food-weekly] ' + userData.nickname + ': 実データ平均スコアを使用:', JSON.stringify(avgScores));
  }

  // nutrition_scoresカラムが無ければ追加
  try { db.prepare("ALTER TABLE food_weekly_reports ADD COLUMN nutrition_scores TEXT").run(); } catch(e) { /* already exists */ }

  // food_weekly_reportsに保存
  var reportId = 'fwr_' + uuidv4().substring(0, 8);
  db.prepare(`INSERT INTO food_weekly_reports (report_id, user_id, nickname, week_start, week_end, meal_count, report_text, nutrition_scores, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`).run(
    reportId, uid, userData.nickname, weekStart,
    new Date(new Date(weekStart).getTime() + 6 * 86400000).toISOString().slice(0, 10),
    userData.posts.length, reportText, nutritionScores ? JSON.stringify(nutritionScores) : null
  );

  // ユーザーへ個人通知（スコアタグを埋め込み — 表示側でレーダーチャートに変換）
  var noticeId = 'notice_' + uuidv4().substring(0, 8);
  var scoreTag = nutritionScores ? '\n\n<!--NUTRITION_RADAR:' + JSON.stringify(nutritionScores) + '-->' : '';
  var noticeContent = '【週間食事レポート ' + weekLabel + '】\n\n' +
    userData.nickname + 'さんの今週の食事分析です（' + userData.posts.length + '食分）\n\n' + reportText + scoreTag;
  db.prepare(`INSERT INTO notices (notice_id, content, sender, target_id, status, created_at)
    VALUES (?, ?, '🥗 AI栄養アドバイザー', ?, 'unread', datetime('now'))`).run(noticeId, noticeContent, uid);

  // バディーチャットにお知らせメッセージを挿入
  try {
    var buddyMsg = '📩 ' + userData.nickname + 'さん、今週の食事レポートが届いてるよ！\n' +
      '先週の' + userData.posts.length + '食分を分析した栄養バランスレーダーチャート付きだよ🎯\n' +
      'お知らせ（画面下の🔔）を開いてチェックしてみてね！';
    db.prepare('INSERT INTO buddy_messages (user_id, role, content) VALUES (?, ?, ?)').run(uid, 'assistant', buddyMsg);
  } catch(e) { /* バディーメッセージ挿入失敗は無視 */ }

  return { reportId: reportId, reportText: reportText, nutritionScores: nutritionScores };
}

module.exports = { runWeeklyFoodAnalysis };
