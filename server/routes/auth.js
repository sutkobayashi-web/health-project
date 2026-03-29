const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../services/db');
const { generateToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// レガシーSHA256（既存パスワード検証用、新規はbcrypt）
function hashPasswordSHA256(raw) {
  if (!raw) return '';
  return crypto.createHash('sha256').update(raw.toString()).digest('hex');
}

// bcryptハッシュ生成
function hashPassword(raw) {
  return bcrypt.hashSync(raw, 10);
}

// パスワード検証（bcrypt優先、SHA256フォールバックで自動マイグレーション）
function verifyPassword(raw, storedHash, db, table, idColumn, idValue) {
  // bcryptハッシュの場合
  if (storedHash && storedHash.startsWith('$2')) {
    return bcrypt.compareSync(raw, storedHash);
  }
  // SHA256ハッシュの場合（レガシー）→ 一致したらbcryptに自動更新
  const sha256 = hashPasswordSHA256(raw);
  if (storedHash === sha256) {
    const newHash = hashPassword(raw);
    try {
      db.prepare(`UPDATE ${table} SET password_hash = ? WHERE ${idColumn} = ?`).run(newHash, idValue);
    } catch (e) { /* マイグレーション失敗は無視、次回ログイン時に再試行 */ }
    return true;
  }
  return false;
}

// Rate Limiter（ログイン用）
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { success: false, msg: 'ログイン試行回数が多すぎます。15分後に再試行してください。' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate Limiter（パスワードリセット用）
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, msg: 'リセット試行回数が多すぎます。1時間後に再試行してください。' },
  standardHeaders: true,
  legacyHeaders: false
});

// ユーザー登録
router.post('/register', loginLimiter, (req, res) => {
  try {
    const { nickname, password, avatar, inviterId, realName, department, birthDate, buddyType } = req.body;
    if (!nickname || !password || typeof password !== 'string' || password.length < 6) {
      return res.json({ success: false, msg: 'ニックネームとパスワード(6文字以上)を入力してください' });
    }
    if (nickname.length > 50) return res.json({ success: false, msg: 'ニックネームが長すぎます' });

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE nickname = ?').get(nickname.trim());
    if (existing) return res.json({ success: false, msg: '使用済みニックネーム' });

    const uid = uuidv4();
    const passwordHash = hashPassword(password.trim());
    db.prepare(`INSERT INTO users (id, nickname, password_hash, avatar, inviter_id, real_name, department, birth_date, buddy_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(uid, nickname.trim(), passwordHash, avatar || '😀', inviterId || '', realName || '', department || '', birthDate || '', buddyType || 'gentle');

    const token = generateToken({ uid, nickname: nickname.trim(), type: 'user' });
    res.json({ success: true, uid, nickname: nickname.trim(), avatar: avatar || '😀', inviteCount: 0, department, birthDate, buddyType: buddyType || 'gentle', token });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// ユーザーログイン
router.post('/login', loginLimiter, (req, res) => {
  try {
    const { nickname, password } = req.body;
    if (!nickname || !password) return res.json({ success: false, msg: '入力してください' });
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE nickname = ?').get(nickname.trim());
    if (!user) return res.json({ success: false, msg: '認証失敗' });

    if (!verifyPassword(password.trim(), user.password_hash, db, 'users', 'id', user.id)) {
      return res.json({ success: false, msg: '認証失敗' });
    }

    const inviteCount = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE inviter_id = ?').get(user.id).cnt;
    const token = generateToken({ uid: user.id, nickname: user.nickname, type: 'user' });
    res.json({ success: true, uid: user.id, nickname: user.nickname, avatar: user.avatar, inviteCount, department: user.department || '', birthDate: user.birth_date || '', buddyType: user.buddy_type || 'gentle', token });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 管理者（大学関係者含む）新規登録
router.post('/admin-register', loginLimiter, (req, res) => {
  try {
    const { name, email, password, dept, isUniversity, universityOrg } = req.body;
    if (!name || !email || !password) return res.json({ success: false, msg: '氏名・メール・パスワードを入力してください' });
    if (typeof password !== 'string' || password.length < 6) return res.json({ success: false, msg: 'パスワードは6文字以上で入力してください' });

    const db = getDb();
    const existing = db.prepare('SELECT id FROM core_members WHERE email = ?').get(email.trim().toLowerCase());
    if (existing) return res.json({ success: false, msg: '既に登録されているメールアドレスです' });
    const passwordHash = hashPassword(password.trim());
    const role = isUniversity ? 'observer' : 'member';
    db.prepare(`INSERT INTO core_members (name, dept, email, password_hash, avatar, role, is_exec, is_university, university_org, status)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending')`).run(name.trim(), dept || '', email.trim().toLowerCase(), passwordHash, '🛡️', role, isUniversity ? 1 : 0, universityOrg || '');
    res.json({
      success: true, msg: '登録申請を受け付けました。推進メンバーの承認をお待ちください。',
      pending: true
    });
  } catch (e) {
    res.json({ success: false, msg: 'エラー: ' + e.message });
  }
});

// 大学関係者一覧取得
router.get('/university-members', (req, res) => {
  try {
    const db = getDb();
    const members = db.prepare('SELECT id, name, email, dept, university_org, role FROM core_members WHERE is_university = 1 ORDER BY id DESC').all();
    res.json(members);
  } catch (e) { res.json([]); }
});

// 管理者ログイン
router.post('/admin-login', loginLimiter, (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ success: false, msg: '入力してください' });
    const db = getDb();
    const member = db.prepare('SELECT * FROM core_members WHERE email = ?').get(email.trim().toLowerCase());
    if (!member) return res.json({ success: false, msg: '認証失敗' });

    // パスワード検証（bcrypt + SHA256レガシー自動マイグレーション）
    if (!member.password_hash || member.password_hash.length === 0) {
      return res.json({ success: false, msg: '認証失敗' });
    }
    if (!verifyPassword(password.trim(), member.password_hash, db, 'core_members', 'id', member.id)) {
      return res.json({ success: false, msg: '認証失敗' });
    }

    // 承認チェック
    if (member.status === 'pending') {
      return res.json({ success: false, msg: '登録申請は承認待ちです。推進メンバーの承認をお待ちください。' });
    }

    let role = member.role || 'member';
    const isExec = (role === 'exec' || member.is_exec === 1);
    let avatar = member.avatar || '🛡️';
    if (avatar.length > 4 || avatar.match(/\d{4}/)) avatar = '🛡️';
    const isUniversity = member.is_university === 1;
    const token = generateToken({ email: member.email, name: member.name, type: 'admin', role, isExec, isUniversity });
    res.json({
      success: true,
      profile: { name: member.name, dept: member.dept, email: member.email, avatar, role, isExec, isUniversity },
      token
    });
  } catch (e) {
    res.json({ success: false, msg: 'エラー: ' + e.message });
  }
});

// 管理者パスワードリセット（メール＋氏名で本人確認）
router.post('/admin-reset-password', resetLimiter, (req, res) => {
  try {
    const { email, name, newPassword } = req.body;
    if (!email || !name) return res.json({ success: false, msg: 'メールアドレスと氏名を入力してください' });
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.json({ success: false, msg: '新しいパスワードは6文字以上で入力してください' });
    }
    const db = getDb();
    const member = db.prepare('SELECT * FROM core_members WHERE email = ? AND name = ?').get(email.trim().toLowerCase(), name.trim());
    if (!member) return res.json({ success: false, msg: '入力情報が一致するアカウントが見つかりません' });
    const newHash = hashPassword(newPassword.trim());
    db.prepare('UPDATE core_members SET password_hash = ? WHERE id = ?').run(newHash, member.id);
    res.json({ success: true, msg: 'パスワードを再設定しました。新しいパスワードでログインしてください。' });
  } catch (e) {
    res.json({ success: false, msg: 'エラー: ' + e.message });
  }
});

// パスワードリセット（ニックネーム＋部署＋生年月日で本人確認）
router.post('/reset-password', resetLimiter, (req, res) => {
  try {
    const { nickname, department, birthDate, newPassword } = req.body;
    if (!nickname || !department || !birthDate) return res.json({ success: false, msg: 'ニックネーム・部署・生年月日をすべて入力してください' });
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.json({ success: false, msg: '新しいパスワードは6文字以上で入力してください' });
    }
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE nickname = ? AND department = ? AND birth_date = ?').get(nickname.trim(), department, birthDate);
    if (!user) return res.json({ success: false, msg: '入力情報が一致するアカウントが見つかりません' });
    const newHash = hashPassword(newPassword.trim());
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

// バディータイプ変更
router.post('/update-buddy', (req, res) => {
  try {
    const { uid, buddyType } = req.body;
    const validTypes = ['gentle', 'cheerful', 'strict', 'funny', 'calm'];
    if (!uid || !validTypes.includes(buddyType)) return res.json({ success: false, msg: '無効なバディータイプです' });
    const db = getDb();
    db.prepare('UPDATE users SET buddy_type = ? WHERE id = ?').run(buddyType, uid);
    res.json({ success: true, buddyType });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

module.exports = router;
