const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../services/db');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

function hashPasswordSHA256(raw) {
  if (!raw) return '';
  return crypto.createHash('sha256').update(raw.toString()).digest('hex');
}

// ユーザー登録
router.post('/register', (req, res) => {
  try {
    const { nickname, password, avatar, inviterId, realName, department, birthDate } = req.body;
    if (!nickname || !password || password.length < 4) {
      return res.json({ success: false, msg: 'ニックネームとパスワード(4文字以上)を入力してください' });
    }
    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE nickname = ?').get(nickname.trim());
    if (existing) return res.json({ success: false, msg: '使用済みニックネーム' });

    const uid = uuidv4();
    const passwordHash = hashPasswordSHA256(password.trim());
    db.prepare(`INSERT INTO users (id, nickname, password_hash, avatar, inviter_id, real_name, department, birth_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(uid, nickname.trim(), passwordHash, avatar || '😀', inviterId || '', realName || '', department || '', birthDate || '');

    const token = generateToken({ uid, nickname: nickname.trim(), type: 'user' });
    res.json({ success: true, uid, nickname: nickname.trim(), avatar: avatar || '😀', inviteCount: 0, department, birthDate, token });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// ユーザーログイン
router.post('/login', (req, res) => {
  try {
    const { nickname, password } = req.body;
    if (!nickname || !password) return res.json({ success: false, msg: '入力してください' });
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE nickname = ?').get(nickname.trim());
    if (!user) return res.json({ success: false, msg: '認証失敗' });

    const ph = hashPasswordSHA256(password.trim());
    if (user.password_hash !== ph && user.password_hash !== password.trim()) {
      return res.json({ success: false, msg: '認証失敗' });
    }
    const inviteCount = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE inviter_id = ?').get(user.id).cnt;
    const token = generateToken({ uid: user.id, nickname: user.nickname, type: 'user' });
    res.json({ success: true, uid: user.id, nickname: user.nickname, avatar: user.avatar, inviteCount, department: user.department || '', birthDate: user.birth_date || '', token });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 管理者ログイン
router.post('/admin-login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ success: false, msg: '入力してください' });
    const db = getDb();
    const member = db.prepare('SELECT * FROM core_members WHERE email = ?').get(email.trim().toLowerCase());
    if (!member) return res.json({ success: false, msg: '認証失敗' });

    // パスワード検証（ハッシュ or 平文 or 空の場合はスキップ）
    if (member.password_hash && member.password_hash.length > 0) {
      const ph = hashPasswordSHA256(password.trim());
      if (member.password_hash !== ph && member.password_hash !== password.trim()) {
        return res.json({ success: false, msg: '認証失敗' });
      }
    }

    let role = member.role || 'member';
    const isExec = (role === 'exec' || member.is_exec === 1);
    // avatarが日付等の不正値の場合はデフォルトに
    let avatar = member.avatar || '🛡️';
    if (avatar.length > 4 || avatar.match(/\d{4}/)) avatar = '🛡️';
    const token = generateToken({ email: member.email, name: member.name, type: 'admin', role, isExec });
    res.json({
      success: true,
      profile: { name: member.name, dept: member.dept, email: member.email, avatar, role, isExec },
      token
    });
  } catch (e) {
    res.json({ success: false, msg: 'エラー: ' + e.message });
  }
});

// 管理者パスワードリセット（メール＋氏名で本人確認）
router.post('/admin-reset-password', (req, res) => {
  try {
    const { email, name, newPassword } = req.body;
    if (!email || !name) return res.json({ success: false, msg: 'メールアドレスと氏名を入力してください' });
    if (!newPassword) return res.json({ success: false, msg: '新しいパスワードを入力してください' });
    const db = getDb();
    const member = db.prepare('SELECT * FROM core_members WHERE email = ? AND name = ?').get(email.trim().toLowerCase(), name.trim());
    if (!member) return res.json({ success: false, msg: '入力情報が一致するアカウントが見つかりません' });
    const newHash = hashPasswordSHA256(newPassword.trim());
    db.prepare('UPDATE core_members SET password_hash = ? WHERE id = ?').run(newHash, member.id);
    res.json({ success: true, msg: 'パスワードを再設定しました。新しいパスワードでログインしてください。' });
  } catch (e) {
    res.json({ success: false, msg: 'エラー: ' + e.message });
  }
});

// パスワードリセット（ニックネーム＋部署＋生年月日で本人確認）
router.post('/reset-password', (req, res) => {
  try {
    const { nickname, department, birthDate, newPassword } = req.body;
    if (!nickname || !department || !birthDate) return res.json({ success: false, msg: 'ニックネーム・部署・生年月日をすべて入力してください' });
    if (!newPassword || newPassword.length < 4) return res.json({ success: false, msg: '新しいパスワードは4文字以上で入力してください' });
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE nickname = ? AND department = ? AND birth_date = ?').get(nickname.trim(), department, birthDate);
    if (!user) return res.json({ success: false, msg: '入力情報が一致するアカウントが見つかりません' });
    const newHash = hashPasswordSHA256(newPassword.trim());
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);
    res.json({ success: true, msg: 'パスワードを再設定しました。新しいパスワードでログインしてください。' });
  } catch (e) {
    res.json({ success: false, msg: 'エラー: ' + e.message });
  }
});

// ユーザー統計
router.get('/stats/:uid', (req, res) => {
  try {
    const db = getDb();
    const uid = req.params.uid;
    const inviteCount = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE inviter_id = ?').get(uid).cnt;
    const postCount = db.prepare('SELECT COUNT(*) as cnt FROM posts WHERE user_id = ?').get(uid).cnt;
    let rank = 'Beginner', next = 5;
    if (postCount >= 80) { rank = 'Black'; next = 0; }
    else if (postCount >= 50) { rank = 'Platinum'; next = 80; }
    else if (postCount >= 30) { rank = 'Gold'; next = 50; }
    else if (postCount >= 10) { rank = 'Silver'; next = 30; }
    else if (postCount >= 5) { rank = 'Bronze'; next = 10; }
    res.json({ success: true, inviteCount, postCount, rank, nextTarget: next });
  } catch (e) {
    res.json({ success: false, error: e.toString() });
  }
});

module.exports = router;
