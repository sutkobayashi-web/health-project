const express = require('express');
const { getDb } = require('../services/db');

const router = express.Router();

// 未回答のactive話題を取得（ユーザー向け）
router.get('/check/:uid', (req, res) => {
  try {
    const db = getDb();
    const uid = req.params.uid;
    const topic = db.prepare(`
      SELECT * FROM buddy_topics bt
      WHERE bt.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM buddy_topic_responses btr
        WHERE btr.topic_id = bt.topic_id AND btr.user_id = ?
      )
      ORDER BY bt.created_at DESC LIMIT 1
    `).get(uid);
    if (topic) {
      res.json({
        hasTopic: true,
        topic: {
          topicId: topic.topic_id,
          title: topic.title,
          choices: JSON.parse(topic.choices),
          weekLabel: topic.week_label
        }
      });
    } else {
      res.json({ hasTopic: false });
    }
  } catch (e) { res.json({ hasTopic: false }); }
});

// ユーザー回答送信
router.post('/respond', (req, res) => {
  try {
    const { topicId, userId, choiceIndex, choiceText, comment } = req.body;
    if (!topicId || !userId || choiceIndex === undefined) {
      return res.json({ success: false, msg: '必須項目が不足しています' });
    }
    const db = getDb();
    db.prepare(
      'INSERT OR IGNORE INTO buddy_topic_responses (topic_id, user_id, choice_index, choice_text, comment) VALUES (?,?,?,?,?)'
    ).run(topicId, userId, choiceIndex, choiceText || '', comment || '');
    res.json({ success: true });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// === 管理者向け ===

// 話題一覧（集計付き）
router.get('/admin/list', (req, res) => {
  try {
    const db = getDb();
    const topics = db.prepare('SELECT * FROM buddy_topics ORDER BY created_at DESC').all();
    const totalUsers = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
    const result = topics.map(t => {
      const responses = db.prepare('SELECT * FROM buddy_topic_responses WHERE topic_id = ?').all(t.topic_id);
      const choices = JSON.parse(t.choices);
      const choiceCounts = choices.map((c, i) => ({
        text: c,
        count: responses.filter(r => r.choice_index === i).length
      }));
      return {
        topicId: t.topic_id,
        title: t.title,
        choices: choices,
        choiceCounts: choiceCounts,
        status: t.status,
        weekLabel: t.week_label,
        totalResponses: responses.length,
        totalUsers: totalUsers,
        createdAt: t.created_at,
        closedAt: t.closed_at
      };
    });
    res.json(result);
  } catch (e) { res.json([]); }
});

// 新規話題作成
router.post('/admin/create', (req, res) => {
  try {
    const { title, choices, weekLabel } = req.body;
    if (!title || !choices || choices.length === 0) {
      return res.json({ success: false, msg: 'テーマと選択肢を入力してください' });
    }
    const db = getDb();
    // 既存activeを自動クローズ
    db.prepare("UPDATE buddy_topics SET status = 'closed', closed_at = datetime('now') WHERE status = 'active'").run();
    const topicId = 'bt_' + Date.now();
    db.prepare('INSERT INTO buddy_topics (topic_id, title, choices, week_label) VALUES (?,?,?,?)').run(
      topicId, title, JSON.stringify(choices), weekLabel || ''
    );
    res.json({ success: true, topicId: topicId });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 話題を終了
router.post('/admin/close', (req, res) => {
  try {
    const { topicId } = req.body;
    const db = getDb();
    db.prepare("UPDATE buddy_topics SET status = 'closed', closed_at = datetime('now') WHERE topic_id = ?").run(topicId);
    res.json({ success: true });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 話題の詳細集計
router.get('/admin/results/:topicId', (req, res) => {
  try {
    const db = getDb();
    const topic = db.prepare('SELECT * FROM buddy_topics WHERE topic_id = ?').get(req.params.topicId);
    if (!topic) return res.json({ success: false, msg: '話題が見つかりません' });
    const responses = db.prepare(`
      SELECT btr.*, u.nickname, u.department FROM buddy_topic_responses btr
      LEFT JOIN users u ON u.id = btr.user_id
      WHERE btr.topic_id = ?
      ORDER BY btr.created_at ASC
    `).all(req.params.topicId);
    const choices = JSON.parse(topic.choices);
    const choiceDetails = choices.map((c, i) => ({
      text: c,
      count: responses.filter(r => r.choice_index === i).length,
      users: responses.filter(r => r.choice_index === i).map(r => ({
        nickname: r.nickname || '匿名',
        department: r.department || '',
        comment: r.comment || ''
      }))
    }));
    const totalUsers = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
    res.json({
      success: true,
      title: topic.title,
      weekLabel: topic.week_label,
      status: topic.status,
      choiceDetails: choiceDetails,
      totalResponses: responses.length,
      totalUsers: totalUsers,
      comments: responses.filter(r => r.comment).map(r => ({
        nickname: r.nickname || '匿名',
        choice: choices[r.choice_index] || '',
        comment: r.comment
      }))
    });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

module.exports = router;
