const express = require('express');
const { getDb } = require('../services/db');
const { authUser, authAdmin } = require('../middleware/auth');

const router = express.Router();

// ユーザー向け全通知取得（個別＋全体、新しい順）
router.get('/all/:uid', authUser, (req, res) => {
  try {
    const db = getDb();
    const uid = req.params.uid;
    const notices = db.prepare("SELECT * FROM notices WHERE target_id = ? OR target_id = 'ALL' ORDER BY created_at DESC LIMIT 50").all(uid);
    const result = notices.map(n => ({
      id: n.notice_id,
      date: new Date(n.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }),
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

// お知らせ保存（管理者のみ）
router.post('/save', authAdmin, (req, res) => {
  try {
    const { content, isBroadcast, targetUid } = req.body;
    const db = getDb();
    const noticeId = 'notice_' + Date.now();
    const target = isBroadcast ? 'ALL' : targetUid;
    db.prepare('INSERT INTO notices (notice_id, content, sender, target_id) VALUES (?,?,?,?)').run(noticeId, content, '事務局', target);
    res.json({ success: true, msg: 'お知らせを送信しました' });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 未読個別通知取得
router.get('/unread/:uid', authUser, (req, res) => {
  try {
    const db = getDb();
    const notice = db.prepare("SELECT * FROM notices WHERE target_id = ? AND status != 'read' ORDER BY created_at DESC LIMIT 1").get(req.params.uid);
    if (notice) {
      res.json({
        id: notice.notice_id,
        date: new Date(notice.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }),
        message: notice.content
      });
    } else { res.json(null); }
  } catch (e) { res.json(null); }
});

// 最新通知取得
router.get('/latest/:uid', authUser, (req, res) => {
  try {
    const db = getDb();
    const uid = req.params.uid;
    const notice = db.prepare("SELECT * FROM notices WHERE target_id = 'ALL' OR target_id = ? ORDER BY created_at DESC LIMIT 1").get(uid);
    if (notice) {
      res.json({
        id: notice.notice_id,
        date: new Date(notice.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }),
        sender: notice.sender, message: notice.content
      });
    } else { res.json(null); }
  } catch (e) { res.json(null); }
});

// 既読マーク
router.post('/mark-read', authUser, (req, res) => {
  try {
    const { noticeId, replyText } = req.body;
    const db = getDb();
    db.prepare("UPDATE notices SET status = 'read', reply = ?, read_at = CURRENT_TIMESTAMP, admin_read = 0 WHERE notice_id = ?").run(replyText || '', noticeId);
    res.json({ success: true });
  } catch (e) { res.json({ success: false }); }
});

// 管理者既読マーク
router.post('/admin-read', authAdmin, (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE notices SET admin_read = 1 WHERE notice_id = ?').run(req.body.noticeId);
    res.json({ success: true });
  } catch (e) { res.json({ success: false }); }
});

// 管理者用個別通知一覧
router.get('/admin-list', authAdmin, (req, res) => {
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
        date: new Date(n.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }),
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
