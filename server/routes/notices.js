const express = require('express');
const { getDb } = require('../services/db');

const router = express.Router();

// ユーザー向け全通知取得（個別＋全体、新しい順）
router.get('/all/:uid', (req, res) => {
  try {
    const db = getDb();
    const uid = req.params.uid;
    const notices = db.prepare("SELECT * FROM notices WHERE (target_id = ? OR target_id = 'ALL') AND content NOT LIKE '【BUDDY】%' ORDER BY created_at DESC LIMIT 50").all(uid);
    const result = notices.map(n => ({
      id: n.notice_id,
      date: new Date(n.created_at + 'Z').toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }),
      sender: n.sender,
      message: n.content,
      isPersonal: n.target_id !== 'ALL',
      status: n.status,
      reply: n.reply || '',
      readAt: n.read_at || null
    }));
    res.json(result);
  } catch (e) { res.json([]); }
});

// バディー経由メッセージ取得（【BUDDY】プレフィックス付き・未読のみ）
router.get('/buddy/:uid', (req, res) => {
  try {
    const db = getDb();
    const uid = req.params.uid;
    const notices = db.prepare("SELECT * FROM notices WHERE (target_id = ? OR target_id = 'ALL') AND content LIKE '【BUDDY】%' AND (status IS NULL OR status != 'buddy_read') ORDER BY created_at DESC LIMIT 5").all(uid);
    const result = notices.map(n => ({
      id: n.notice_id,
      date: new Date(n.created_at + 'Z').toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }),
      sender: n.sender,
      message: n.content,
      isPersonal: n.target_id !== 'ALL',
    }));
    res.json(result);
  } catch (e) { res.json([]); }
});

// バディーメッセージ既読マーク
router.post('/buddy-read', (req, res) => {
  try {
    const { noticeIds } = req.body;
    if (!noticeIds || noticeIds.length === 0) return res.json({ success: true });
    const db = getDb();
    const stmt = db.prepare("UPDATE notices SET status = 'buddy_read' WHERE notice_id = ?");
    noticeIds.forEach(id => stmt.run(id));
    res.json({ success: true });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// お知らせ保存
router.post('/save', (req, res) => {
  try {
    const { content, isBroadcast, targetUid, sender } = req.body;
    const db = getDb();
    const noticeId = 'notice_' + Date.now();
    const target = isBroadcast ? 'ALL' : targetUid;
    const senderName = sender || '事務局';
    db.prepare('INSERT INTO notices (notice_id, content, sender, target_id) VALUES (?,?,?,?)').run(noticeId, content, senderName, target);
    res.json({ success: true, msg: 'お知らせを送信しました' });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 未読個別通知取得
router.get('/unread/:uid', (req, res) => {
  try {
    const db = getDb();
    const notice = db.prepare("SELECT * FROM notices WHERE target_id = ? AND status != 'read' ORDER BY created_at DESC LIMIT 1").get(req.params.uid);
    if (notice) {
      res.json({
        id: notice.notice_id,
        date: new Date(notice.created_at + 'Z').toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }),
        message: notice.content
      });
    } else { res.json(null); }
  } catch (e) { res.json(null); }
});

// 最新通知取得
router.get('/latest/:uid', (req, res) => {
  try {
    const db = getDb();
    const uid = req.params.uid;
    const notice = db.prepare("SELECT * FROM notices WHERE target_id = 'ALL' OR target_id = ? ORDER BY created_at DESC LIMIT 1").get(uid);
    if (notice) {
      res.json({
        id: notice.notice_id,
        date: new Date(notice.created_at + 'Z').toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }),
        sender: notice.sender, message: notice.content
      });
    } else { res.json(null); }
  } catch (e) { res.json(null); }
});

// 既読マーク
router.post('/mark-read', (req, res) => {
  try {
    const { noticeId, replyText } = req.body;
    if (!noticeId) return res.json({ success: false, msg: 'noticeId missing' });
    const db = getDb();
    const result = db.prepare("UPDATE notices SET status = 'read', reply = ?, read_at = CURRENT_TIMESTAMP, admin_read = 0 WHERE notice_id = ?").run(replyText || '', noticeId);
    console.log('[mark-read]', noticeId, 'changes:', result.changes);
    res.json({ success: true, changes: result.changes });
  } catch (e) { console.error('[mark-read error]', e.message); res.json({ success: false, msg: e.message }); }
});

// 全体通知の既読マーク（ユーザーごと）
router.post('/mark-broadcast-read', (req, res) => {
  try {
    const { noticeIds, uid } = req.body;
    if (!uid || !noticeIds || !Array.isArray(noticeIds)) return res.json({ success: false, msg: 'params missing' });
    const db = getDb();
    const stmt = db.prepare('INSERT OR IGNORE INTO notice_reads (notice_id, user_id) VALUES (?, ?)');
    noticeIds.forEach(nid => stmt.run(nid, uid));
    res.json({ success: true });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 全体通知の既読一覧取得
router.get('/broadcast-reads/:uid', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT notice_id FROM notice_reads WHERE user_id = ?').all(req.params.uid);
    res.json(rows.map(r => r.notice_id));
  } catch (e) { res.json([]); }
});

// 管理者既読マーク
router.post('/admin-read', (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE notices SET admin_read = 1 WHERE notice_id = ?').run(req.body.noticeId);
    res.json({ success: true });
  } catch (e) { res.json({ success: false }); }
});

// 管理者用個別通知一覧
router.get('/admin-list', (req, res) => {
  try {
    const db = getDb();
    const notices = db.prepare("SELECT * FROM notices WHERE target_id != 'ALL' ORDER BY created_at DESC").all();
    const users = db.prepare('SELECT id, nickname FROM users').all();
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u.nickname; });

    let unreadCount = 0;
    const list = notices.map(n => {
      if (n.status === 'read' && !n.admin_read) unreadCount++;
      return {
        id: n.notice_id,
        date: new Date(n.created_at + 'Z').toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }),
        targetName: userMap[n.target_id] || '不明', content: n.content,
        status: n.status, reply: n.reply,
        readAt: n.read_at ? new Date(n.read_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }) : '',
        adminRead: !!n.admin_read
      };
    });
    res.json({ list, unreadCount });
  } catch (e) { res.json({ list: [], unreadCount: 0 }); }
});

module.exports = router;
