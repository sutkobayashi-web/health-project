/**
 * 週次ふりかえりレポート（一般社員向け）
 * 毎週月曜 8:00 JST に実行：個人の1週間の活動をバディーがまとめて届ける
 */
const { getDb } = require('./db');
const { callAIWithFallback } = require('./ai');
const { v4: uuidv4 } = require('uuid');

async function runWeeklyReflection() {
  const db = getDb();
  const now = new Date();
  console.log('[weekly-reflection] 週次ふりかえり開始:', now.toISOString());

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
  var weekLabel = weekStart + ' 〜 ' + weekEnd;

  // テーブル作成
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS weekly_reflection_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      week_start TEXT,
      week_end TEXT,
      report_text TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
  } catch(e) {}

  // 重複チェック
  var existing = db.prepare("SELECT COUNT(*) as c FROM weekly_reflection_reports WHERE week_start = ?").get(weekStart);
  if (existing && existing.c > 0) {
    console.log('[weekly-reflection] 今週分は生成済み、スキップ');
    return;
  }

  // 全ユーザー取得
  var users = db.prepare("SELECT id, nickname, department, streak_count FROM users").all();
  console.log('[weekly-reflection] 対象ユーザー:', users.length, '人');

  var generated = 0;

  for (var i = 0; i < users.length; i++) {
    var user = users[i];
    try {
      // 1. 体調ログ
      var moodLogs = [];
      try {
        moodLogs = db.prepare(`
          SELECT content, created_at FROM buddy_messages
          WHERE user_id = ? AND role = 'user' AND content LIKE '[MOOD_LOG]%'
            AND date(created_at) >= ? AND date(created_at) <= ?
          ORDER BY created_at
        `).all(user.id, weekStart, weekEnd);
      } catch(e) {}

      var moodSummary = '';
      if (moodLogs.length > 0) {
        var moodCounts = { great: 0, normal: 0, tired: 0, bad: 0 };
        moodLogs.forEach(function(m) {
          var mood = m.content.replace('[MOOD_LOG] ', '').trim();
          if (moodCounts[mood] !== undefined) moodCounts[mood]++;
        });
        moodSummary = '体調記録: 元気' + moodCounts.great + '回 / 普通' + moodCounts.normal + '回 / 疲れ' + moodCounts.tired + '回 / しんどい' + moodCounts.bad + '回';
      }

      // 2. バディー会話数
      var chatCount = 0;
      try {
        var r = db.prepare(`
          SELECT COUNT(*) as cnt FROM buddy_messages
          WHERE user_id = ? AND role = 'user' AND content NOT LIKE '[MOOD_LOG]%'
            AND date(created_at) >= ? AND date(created_at) <= ?
        `).get(user.id, weekStart, weekEnd);
        chatCount = r.cnt;
      } catch(e) {}

      // 3. 食事投稿数
      var foodCount = 0;
      try {
        var r2 = db.prepare(`
          SELECT COUNT(*) as cnt FROM posts
          WHERE user_id = ? AND category = '🍱 食事・栄養'
            AND date(created_at) >= ? AND date(created_at) <= ?
        `).get(user.id, weekStart, weekEnd);
        foodCount = r2.cnt;
      } catch(e) {}

      // 4. チャレンジ参加状況
      var challengeInfo = '';
      try {
        var entries = db.prepare(`
          SELECT c.title FROM challenge_entries ce
          JOIN challenges c ON ce.challenge_id = c.challenge_id
          WHERE ce.user_id = ? AND c.status = 'active'
        `).all(user.id);
        if (entries.length > 0) {
          challengeInfo = '参加中チャレンジ: ' + entries.map(function(e) { return e.title; }).join('、');
        }
      } catch(e) {}

      // 5. アプリ利用日数（バディーにアクセスした日数）
      var activeDays = 0;
      try {
        var r3 = db.prepare(`
          SELECT COUNT(DISTINCT date(created_at)) as cnt FROM buddy_messages
          WHERE user_id = ? AND date(created_at) >= ? AND date(created_at) <= ?
        `).get(user.id, weekStart, weekEnd);
        activeDays = r3.cnt;
      } catch(e) {}

      // 活動がほぼない人はスキップ（アクセス0日）
      if (activeDays === 0) continue;

      // 6. AI でふりかえり生成
      var dept = user.department || '';
      var deptHint = '';
      if (dept === '配送スタッフ') deptHint = 'ドライバーなので腰・運転疲れ・食事の偏りに配慮';
      else if (dept === '倉庫スタッフ') deptHint = '倉庫作業なので体力・腰・水分補給に配慮';
      else if (dept === '製造スタッフ') deptHint = '製造作業なのでケガ予防・立ち仕事の疲れに配慮';
      else if (dept === '事務スタッフ') deptHint = '事務なので目の疲れ・肩こり・運動不足に配慮';

      var dataText = '【' + (user.nickname || 'さん') + 'さんの先週（' + weekLabel + '）】\n';
      dataText += '- アプリ利用: ' + activeDays + '日 / 7日\n';
      dataText += '- バディーとの会話: ' + chatCount + '回\n';
      dataText += '- 食事記録: ' + foodCount + '食\n';
      dataText += '- 連続記録: ' + (user.streak_count || 0) + '日\n';
      if (moodSummary) dataText += '- ' + moodSummary + '\n';
      if (challengeInfo) dataText += '- ' + challengeInfo + '\n';
      if (deptHint) dataText += '- 職種: ' + dept + '（' + deptHint + '）\n';

      var prompt = `あなたはヘルスバディーです。以下のデータを元に、${user.nickname || ''}さんの1週間のふりかえりメッセージを作ってください。

${dataText}

【ルール】
- バディーの口調（友達感覚、タメ語OK、絵文字適度）
- マークダウン記法は使わない。強調は【】で囲む
- 3〜5行で短くまとめる
- まず良かったことを褒める（利用日数、食事記録、連続記録など）
- 次に来週のちょっとした提案を1つだけ（押し付けない、軽く）
- 活動が少ない人にもネガティブにならず「来てくれただけで十分」のスタンス
- 最後は「来週も一緒にがんばろう」的な一言で締める`;

      var report = await callAIWithFallback(
        'ヘルスバディーとして個人の週次ふりかえりを書いてください。',
        prompt
      );

      if (!report) continue;

      // 保存
      var reportId = 'wr_' + uuidv4().substring(0, 8);
      db.prepare(`INSERT INTO weekly_reflection_reports (report_id, user_id, week_start, week_end, report_text)
        VALUES (?, ?, ?, ?, ?)`).run(reportId, user.id, weekStart, weekEnd, report);

      // 通知（個人宛）
      var noticeId = 'notice_wr_' + uuidv4().substring(0, 8);
      var noticeContent = '【1週間のふりかえり ' + weekLabel + '】\n\n' + report;
      db.prepare(`INSERT INTO notices (notice_id, content, sender, target_id, status, created_at)
        VALUES (?, ?, '📝 バディーのふりかえり', ?, 'unread', datetime('now'))`).run(noticeId, noticeContent, user.id);

      // バディーチャットにもお知らせ
      try {
        var buddyMsg = '📝 ' + (user.nickname || '') + 'さん、先週1週間のふりかえりをまとめたよ！\n🔔 お知らせから見てみてね';
        db.prepare('INSERT INTO buddy_messages (user_id, role, content) VALUES (?, ?, ?)').run(user.id, 'assistant', buddyMsg);
      } catch(e) {}

      generated++;

      // API制限回避のため少し間隔を空ける
      await new Promise(function(resolve) { setTimeout(resolve, 2000); });

    } catch(e) {
      console.log('[weekly-reflection] ' + user.nickname + 'エラー:', e.message);
    }
  }

  console.log('[weekly-reflection] 完了: ' + generated + '人分生成');
}

module.exports = { runWeeklyReflection };
