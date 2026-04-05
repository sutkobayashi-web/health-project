/**
 * 豚三郎の週次ふりかえりレポートをテスト配信するスクリプト
 * Usage: node server/scripts/test-reflection.js
 */
const path = require('path');

// .env読み込み
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const db = require('better-sqlite3')(path.join(__dirname, '..', 'db', 'health.db'));

// DB初期化（weekly-reflection.jsと同じ）
db.exec(`CREATE TABLE IF NOT EXISTS weekly_reflection_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  week_start TEXT,
  week_end TEXT,
  report_text TEXT,
  created_at TEXT DEFAULT (datetime('now'))
)`);

// getDb()をモック
const dbModule = require('../services/db');
dbModule.getDb = () => db;

const { callAIWithFallback } = require('../services/ai');
const { v4: uuidv4 } = require('uuid');

async function testReflection() {
  var uid = 'd23e8551-660a-4688-8de5-97e1c22e8bf6';
  var user = db.prepare("SELECT id, nickname, department, streak_count FROM users WHERE id = ?").get(uid);
  console.log('ユーザー:', user.nickname, '/', user.department);

  // 先週の範囲
  var now = new Date();
  var dayOfWeek = now.getDay();
  var lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - dayOfWeek - 6);
  lastMonday.setHours(0, 0, 0, 0);
  var lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  var weekStart = lastMonday.toISOString().slice(0, 10);
  var weekEnd = lastSunday.toISOString().slice(0, 10);
  var weekLabel = weekStart + ' 〜 ' + weekEnd;
  console.log('期間:', weekLabel);

  // データ収集
  var moodLogs = db.prepare(`SELECT content FROM buddy_messages WHERE user_id = ? AND role = 'user' AND content LIKE '[MOOD_LOG]%' AND date(created_at) >= ? AND date(created_at) <= ?`).all(uid, weekStart, weekEnd);
  var moodSummary = '';
  if (moodLogs.length > 0) {
    var moodCounts = { great: 0, normal: 0, tired: 0, bad: 0 };
    moodLogs.forEach(function(m) {
      var mood = m.content.replace('[MOOD_LOG] ', '').trim();
      if (moodCounts[mood] !== undefined) moodCounts[mood]++;
    });
    moodSummary = '体調記録: 元気' + moodCounts.great + '回 / 普通' + moodCounts.normal + '回 / 疲れ' + moodCounts.tired + '回 / しんどい' + moodCounts.bad + '回';
  }

  var chatCount = db.prepare(`SELECT COUNT(*) as cnt FROM buddy_messages WHERE user_id = ? AND role = 'user' AND content NOT LIKE '[MOOD_LOG]%' AND date(created_at) >= ? AND date(created_at) <= ?`).get(uid, weekStart, weekEnd).cnt;
  var foodCount = db.prepare(`SELECT COUNT(*) as cnt FROM posts WHERE user_id = ? AND category = '🍱 食事・栄養' AND date(created_at) >= ? AND date(created_at) <= ?`).get(uid, weekStart, weekEnd).cnt;
  var activeDays = db.prepare(`SELECT COUNT(DISTINCT date(created_at)) as cnt FROM buddy_messages WHERE user_id = ? AND date(created_at) >= ? AND date(created_at) <= ?`).get(uid, weekStart, weekEnd).cnt;

  var challengeInfo = '';
  try {
    var entries = db.prepare(`SELECT c.title FROM challenge_entries ce JOIN challenges c ON ce.challenge_id = c.challenge_id WHERE ce.user_id = ? AND c.status = 'active'`).all(uid);
    if (entries.length > 0) challengeInfo = '参加中チャレンジ: ' + entries.map(e => e.title).join('、');
  } catch(e) {}

  console.log('--- データ ---');
  console.log('利用日数:', activeDays, '日');
  console.log('会話:', chatCount, '回');
  console.log('食事:', foodCount, '食');
  console.log('体調:', moodSummary || 'なし');
  console.log('チャレンジ:', challengeInfo || 'なし');
  console.log('連続記録:', user.streak_count, '日');

  // AI生成
  var dataText = '【' + user.nickname + 'さんの先週（' + weekLabel + '）】\n';
  dataText += '- アプリ利用: ' + activeDays + '日 / 7日\n';
  dataText += '- バディーとの会話: ' + chatCount + '回\n';
  dataText += '- 食事記録: ' + foodCount + '食\n';
  dataText += '- 連続記録: ' + (user.streak_count || 0) + '日\n';
  if (moodSummary) dataText += '- ' + moodSummary + '\n';
  if (challengeInfo) dataText += '- ' + challengeInfo + '\n';
  dataText += '- 職種: ' + user.department + '\n';

  var prompt = `あなたはヘルスバディーです。以下のデータを元に、${user.nickname}さんの1週間のふりかえりメッセージを作ってください。

${dataText}

【ルール】
- バディーの口調（友達感覚、タメ語OK、絵文字適度）
- マークダウン記法は使わない。強調は【】で囲む
- 3〜5行で短くまとめる
- まず良かったことを褒める（利用日数、食事記録、連続記録など）
- 次に来週のちょっとした提案を1つだけ（押し付けない、軽く）
- 活動が少ない人にもネガティブにならず「来てくれただけで十分」のスタンス
- 最後は「来週も一緒にがんばろう」的な一言で締める`;

  console.log('\n--- AI生成中... ---');
  var report = await callAIWithFallback(
    'ヘルスバディーとして個人の週次ふりかえりを書いてください。',
    prompt
  );

  if (!report) {
    console.log('AI生成失敗');
    return;
  }

  console.log('\n--- レポート ---');
  console.log(report);

  // 保存
  var reportId = 'wr_test_' + uuidv4().substring(0, 8);
  db.prepare(`INSERT INTO weekly_reflection_reports (report_id, user_id, week_start, week_end, report_text) VALUES (?, ?, ?, ?, ?)`).run(reportId, uid, weekStart, weekEnd, report);

  var noticeId = 'notice_wr_' + uuidv4().substring(0, 8);
  var noticeContent = '【1週間のふりかえり ' + weekLabel + '】\n\n' + report;
  db.prepare(`INSERT INTO notices (notice_id, content, sender, target_id, status, created_at) VALUES (?, ?, '📝 バディーのふりかえり', ?, 'unread', datetime('now'))`).run(noticeId, noticeContent, uid);

  // バディーチャットにお知らせ
  var buddyMsg = '📝 ' + user.nickname + 'さん、先週1週間のふりかえりをまとめたよ！\n🔔 お知らせから見てみてね';
  db.prepare('INSERT INTO buddy_messages (user_id, role, content) VALUES (?, ?, ?)').run(uid, 'assistant', buddyMsg);

  console.log('\n配信完了！お知らせとバディーチャットに届けました。');
}

testReflection().catch(e => console.error(e));
