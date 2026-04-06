/**
 * 週次ボイスインサイト分析サービス
 * 毎週月曜朝に実行：先週の全バディー会話＋投稿＋食事データを匿名分析し、
 * 推進メンバー向けに「会社にとって有益な情報」をレポートとして届ける
 */
const { getDb } = require('./db');
const { callAIWithFallback, EVIDENCE_BASE } = require('./ai');
const { v4: uuidv4 } = require('uuid');

async function runWeeklyVoiceInsight() {
  const db = getDb();
  const now = new Date();
  console.log('[voice-insight] 週次インサイト分析開始:', now.toISOString());

  // 先週の月曜〜日曜
  var dayOfWeek = now.getDay();
  var lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - dayOfWeek - 6);
  lastMonday.setHours(0, 0, 0, 0);
  var lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  var weekStart = lastMonday.toISOString().slice(0, 10);
  var weekEnd = lastSunday.toISOString().slice(0, 10);
  var weekLabel = weekStart + '〜' + weekEnd;

  try {
    // ========================================
    // 1. バディー会話（全ユーザー匿名）
    // ========================================
    var buddyMessages = [];
    try {
      buddyMessages = db.prepare(`
        SELECT bm.user_id, bm.role, bm.content, bm.created_at
        FROM buddy_messages bm
        WHERE date(bm.created_at) >= ? AND date(bm.created_at) <= ?
        ORDER BY bm.user_id, bm.created_at
      `).all(weekStart, weekEnd);
    } catch(e) { console.log('[voice-insight] buddy_messages取得エラー:', e.message); }

    // 全ユーザーのニックネーム一覧を取得（匿名化用）
    var allNicknames = [];
    try {
      var users = db.prepare('SELECT nickname, real_name FROM users').all();
      users.forEach(function(u) {
        if (u.nickname) allNicknames.push(u.nickname);
        if (u.real_name) allNicknames.push(u.real_name);
      });
      // 長い名前から先に置換（部分一致防止）
      allNicknames.sort(function(a, b) { return b.length - a.length; });
    } catch(e) {}

    // テキストから実名・ニックネームを除去する関数
    function anonymizeText(text) {
      var result = text;
      allNicknames.forEach(function(name) {
        if (name && name.length >= 2) {
          result = result.split(name).join('○○');
        }
      });
      // 「○○さん」の重複を整理
      result = result.replace(/○○さん/g, '○○さん');
      return result;
    }

    // ユーザーごとに会話をグループ化（匿名: 社員A, 社員Bなど）
    var userConversations = {};
    var userIdMap = {};
    var userCounter = 0;
    buddyMessages.forEach(function(m) {
      if (!userIdMap[m.user_id]) {
        userCounter++;
        userIdMap[m.user_id] = '社員' + String.fromCharCode(64 + userCounter); // 社員A, 社員B...
      }
      var anonId = userIdMap[m.user_id];
      if (!userConversations[anonId]) userConversations[anonId] = [];
      userConversations[anonId].push({
        role: m.role === 'assistant' ? 'バディー' : anonId,
        content: anonymizeText(m.content)
      });
    });

    // 会話要約（長すぎるので、ユーザーの発言だけ抽出）
    var allUserVoices = [];
    Object.keys(userConversations).forEach(function(anonId) {
      var userMsgs = userConversations[anonId]
        .filter(function(m) { return m.role !== 'バディー'; })
        .map(function(m) { return m.content; })
        .filter(function(c) { return c.length > 5 && !c.startsWith('[MOOD_LOG]'); }); // 短すぎるもの・気分ログは除外
      if (userMsgs.length > 0) {
        allUserVoices.push(anonId + ': ' + userMsgs.join(' / '));
      }
    });

    // ========================================
    // 2. 投稿（相談・提案）
    // ========================================
    var posts = [];
    try {
      posts = db.prepare(`
        SELECT content, category FROM posts
        WHERE date(created_at) >= ? AND date(created_at) <= ?
          AND category != '🍱 食事・栄養'
          AND COALESCE(category,'') NOT LIKE '%要対応%'
        ORDER BY created_at
      `).all(weekStart, weekEnd);
    } catch(e) {}

    // ========================================
    // 3. 食事傾向（全社集計）
    // ========================================
    var foodStats = { count: 0, avgCal: 0, avgSalt: 0, avgVeg: 0, alcoholCount: 0 };
    try {
      var foodPosts = db.prepare(`
        SELECT nutrition_scores FROM posts
        WHERE date(created_at) >= ? AND date(created_at) <= ?
          AND category = '🍱 食事・栄養'
          AND nutrition_scores IS NOT NULL
      `).all(weekStart, weekEnd);

      foodStats.count = foodPosts.length;
      var totalCal = 0, totalSalt = 0, totalVeg = 0, alcCount = 0;
      foodPosts.forEach(function(p) {
        try {
          var s = JSON.parse(p.nutrition_scores);
          if (s.calories) totalCal += s.calories.value || 0;
          if (s.salt) totalSalt += s.salt.value || 0;
          if (s.vitamin) totalVeg += s.vitamin.value || 0;
          if (s.has_alcohol) alcCount++;
        } catch(e) {}
      });
      if (foodStats.count > 0) {
        foodStats.avgCal = Math.round(totalCal / foodStats.count);
        foodStats.avgSalt = (totalSalt / foodStats.count).toFixed(1);
        foodStats.avgVeg = Math.round(totalVeg / foodStats.count);
        foodStats.alcoholCount = alcCount;
      }
    } catch(e) {}

    // ========================================
    // 4. 参加状況
    // ========================================
    var totalUsers = 0;
    var activeUsers = 0;
    var streakUsers = 0;
    try {
      totalUsers = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
      activeUsers = db.prepare('SELECT COUNT(DISTINCT user_id) as cnt FROM posts WHERE date(created_at) >= ?').get(weekStart).cnt;
      streakUsers = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE streak_count >= 7').get().cnt;
    } catch(e) {}

    // ========================================
    // 5. AI分析: インサイトレポート生成
    // ========================================
    var voiceData = allUserVoices.length > 0
      ? allUserVoices.slice(0, 30).join('\n') // 最大30人分
      : '（今週のバディー会話データなし）';

    var postData = posts.length > 0
      ? posts.map(function(p) { return anonymizeText(p.content.substring(0, 100)); }).join('\n')
      : '（今週の相談投稿なし）';

    var prompt = `あなたは企業の健康経営コンサルタントです。以下は運輸会社（トラックドライバー中心、平均年齢50代）の健康アプリ「CoWell」の先週（${weekLabel}）のデータです。

★★★最重要ルール: レポートに個人名・ニックネーム・ハンドルネームを絶対に含めないこと。「社員A」「ある社員」「複数の社員」等の匿名表現のみ使用すること★★★

【バディーとの会話（匿名・要約）】
${voiceData}

【相談・提案の投稿】
${postData}

【食事データ（全社集計）】
- 食事投稿数: ${foodStats.count}件
- 平均カロリー: ${foodStats.avgCal}kcal/食（目標450-650）
- 平均塩分: ${foodStats.avgSalt}g/食（目標2.5g未満）
- 平均野菜量: ${foodStats.avgVeg}g/食（目標120g）
- アルコール検出: ${foodStats.alcoholCount}件

【参加状況】
- 全社員: ${totalUsers}人
- 今週アクティブ: ${activeUsers}人（参加率${totalUsers > 0 ? Math.round(activeUsers / totalUsers * 100) : 0}%）
- 7日以上連続記録: ${streakUsers}人

以下の形式でインサイトレポートを作成してください。

★★★マークダウン記法は絶対に使わない。強調は【】で囲む★★★

【出力形式】
1. 📊 今週の全体像（2〜3文で要約）

2. 🔍 発見したシグナル（3〜5項目）
   会話や投稿から読み取れる傾向・共通の悩み・潜在的な問題を具体的に。
   「○人が同じことを言っている」「○○の話題が急増」等のデータに基づく指摘。

3. 💡 改善提案（2〜3項目）
   会話の中から出てきた「こうだったらいいのに」を拾い上げる。
   社員の言葉をそのまま引用しつつ、会社としてのアクションを提案。

4. ⚠️ 要注意シグナル（0〜2項目）
   メンタルヘルス、過労、安全面で気になる兆候があれば。
   なければ「特になし」でOK。

5. 🍽️ 食事傾向サマリー（2〜3文）
   全社の栄養データから読み取れる傾向と具体的な改善アクション。

6. 📈 来週のアクション提案（1〜2項目）
   推進メンバーが具体的に動けるアクション。`;

    var report = await callAIWithFallback(
      '企業の健康経営コンサルタントとして、社員の会話・食事・参加データから経営に有益なインサイトを抽出してください。',
      prompt
    );

    if (!report) {
      console.log('[voice-insight] AI分析失敗');
      return;
    }

    // ========================================
    // 6. レポート保存＆通知
    // ========================================

    // voice_insight_reportsテーブル
    try {
      db.exec(`CREATE TABLE IF NOT EXISTS voice_insight_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id TEXT UNIQUE NOT NULL,
        week_start TEXT,
        week_end TEXT,
        report_text TEXT,
        conversation_count INTEGER DEFAULT 0,
        post_count INTEGER DEFAULT 0,
        food_count INTEGER DEFAULT 0,
        active_users INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    } catch(e) {}

    var reportId = 'vir_' + uuidv4().substring(0, 8);
    db.prepare(`INSERT INTO voice_insight_reports
      (report_id, week_start, week_end, report_text, conversation_count, post_count, food_count, active_users)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      reportId, weekStart, weekEnd, report, Object.keys(userConversations).length, posts.length, foodStats.count, activeUsers
    );

    // 推進メンバーのみに通知（一般社員には配信しない）
    try {
      var noticeContent = '【週次ボイスインサイト ' + weekLabel + '】\n\n' +
        '社員' + Object.keys(userConversations).length + '人の会話 + 投稿' + posts.length + '件 + 食事' + foodStats.count + '件を匿名分析しました。\n\n' +
        report;

      var noticeId = 'notice_vi_' + Date.now();
      db.prepare("INSERT INTO notices (notice_id, content, sender, target_id, status) VALUES (?, ?, '📊 ボイスインサイト', 'ADMIN', 'unread')").run(
        noticeId, noticeContent
      );
    } catch(e) { console.log('[voice-insight] 通知送信エラー:', e.message); }

    console.log('[voice-insight] 完了: ' + reportId + ' (会話' + Object.keys(userConversations).length + '人, 投稿' + posts.length + '件, 食事' + foodStats.count + '件)');

  } catch (e) {
    console.error('[voice-insight] エラー:', e.message);
  }
}

module.exports = { runWeeklyVoiceInsight };
