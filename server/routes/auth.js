const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../services/db');
const { generateToken, authUser } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// レガシーSHA256（既存パスワード検証用、新規はbcrypt）
function hashPasswordSHA256(raw) {
  if (!raw) return '';
  return crypto.createHash('sha256').update(raw.toString()).digest('hex');
}

// bcryptハッシュ生成
function hashPasswordBcrypt(raw) {
  return bcrypt.hashSync(raw.toString(), 10);
}

// 後方互換エイリアス
function hashPassword(raw) {
  return hashPasswordBcrypt(raw);
}

// パスワード検証（bcrypt / SHA256 / 平文に対応、一致したらbcryptに自動移行）
function verifyAndMigratePassword(db, table, idColumn, id, inputPassword, storedHash) {
  if (!storedHash || storedHash.length === 0) return true; // ハッシュ未設定はスキップ

  // bcryptハッシュの場合（$2a$ or $2b$ で始まる）
  if (storedHash.startsWith('$2')) {
    return bcrypt.compareSync(inputPassword, storedHash);
  }

  // SHA256ハッシュの場合
  const sha = hashPasswordSHA256(inputPassword);
  if (storedHash === sha) {
    // 自動移行: bcryptに書き換え
    const newHash = hashPasswordBcrypt(inputPassword);
    db.prepare(`UPDATE ${table} SET password_hash = ? WHERE ${idColumn} = ?`).run(newHash, id);
    return true;
  }

  // 平文の場合（レガシー互換）
  if (storedHash === inputPassword) {
    const newHash = hashPasswordBcrypt(inputPassword);
    db.prepare(`UPDATE ${table} SET password_hash = ? WHERE ${idColumn} = ?`).run(newHash, id);
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
    const sid = crypto.randomUUID ? crypto.randomUUID() : uuidv4();
    const passwordHash = hashPasswordBcrypt(password.trim());
    db.prepare(`INSERT INTO users (id, nickname, password_hash, avatar, inviter_id, real_name, department, birth_date, session_token, buddy_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(uid, nickname.trim(), passwordHash, avatar || '😀', inviterId || '', realName || '', department || '', birthDate || '', sid, buddyType || 'gentle');

    const token = generateToken({ uid, nickname: nickname.trim(), type: 'user', sid: sid });
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

    if (!verifyAndMigratePassword(db, 'users', 'id', user.id, password.trim(), user.password_hash)) {
      return res.json({ success: false, msg: '認証失敗' });
    }

    const inviteCount = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE inviter_id = ?').get(user.id).cnt;
    // セッションID発行（同時ログイン防止）
    const sid = crypto.randomUUID ? crypto.randomUUID() : require('uuid').v4();
    db.prepare('UPDATE users SET session_token = ? WHERE id = ?').run(sid, user.id);
    const token = generateToken({ uid: user.id, nickname: user.nickname, type: 'user', sid: sid });
    res.json({ success: true, uid: user.id, nickname: user.nickname, avatar: user.avatar, inviteCount, department: user.department || '', birthDate: user.birth_date || '', realName: user.real_name || '', buddyType: user.buddy_type || 'gentle', token });
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
    const passwordHash = hashPasswordBcrypt(password.trim());
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

    // パスワード検証（bcrypt/SHA256/平文に対応、自動移行）
    if (!verifyAndMigratePassword(db, 'core_members', 'id', member.id, password.trim(), member.password_hash)) {
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
    const newHash = hashPasswordBcrypt(newPassword.trim());
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
    const newHash = hashPasswordBcrypt(newPassword.trim());
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);
    res.json({ success: true, msg: 'パスワードを再設定しました。新しいパスワードでログインしてください。' });
  } catch (e) {
    res.json({ success: false, msg: 'エラー: ' + e.message });
  }
});

// アバター変更（認証必須）
router.post('/update-avatar', authUser, (req, res) => {
  try {
    const { uid, avatar } = req.body;
    if (!uid || !avatar) return res.json({ success: false, msg: 'uid と avatar を指定してください' });
    const db = getDb();
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, uid);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// バディーデータ保存
router.post('/save-buddy', authUser, (req, res) => {
  try {
    const { uid, buddyData } = req.body;
    if (!uid || !buddyData) return res.json({ success: false, msg: 'uid と buddyData を指定してください' });
    const db = getDb();
    db.prepare('UPDATE users SET buddy_data = ? WHERE id = ?').run(JSON.stringify(buddyData), uid);
    res.json({ success: true });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// バディーデータ取得
router.get('/get-buddy/:uid', authUser, (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT buddy_data FROM users WHERE id = ?').get(req.params.uid);
    if (row && row.buddy_data) {
      res.json({ success: true, buddyData: JSON.parse(row.buddy_data) });
    } else {
      res.json({ success: true, buddyData: null });
    }
  } catch (e) { res.json({ success: false, buddyData: null }); }
});

// 実名更新（認証必須）
router.post('/update-realname', authUser, (req, res) => {
  try {
    const { uid, realName } = req.body;
    if (!uid) return res.json({ success: false, msg: 'uidは必須です' });
    const db = getDb();
    db.prepare('UPDATE users SET real_name = ? WHERE id = ?').run(realName || '', uid);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// プロフィール更新（ニックネーム・部署、認証必須）
router.post('/update-profile', authUser, (req, res) => {
  try {
    const { uid, nickname, department } = req.body;
    if (!uid || !nickname) return res.json({ success: false, msg: 'uidとニックネームは必須です' });
    const db = getDb();
    // ニックネーム重複チェック（自分以外）
    const existing = db.prepare('SELECT id FROM users WHERE nickname = ? AND id != ?').get(nickname, uid);
    if (existing) return res.json({ success: false, msg: 'そのニックネームは既に使われています' });
    db.prepare('UPDATE users SET nickname = ?, department = ? WHERE id = ?').run(nickname, department || '', uid);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// パスワード変更
router.post('/change-password', (req, res) => {
  try {
    const { uid, birthDate, newPassword } = req.body;
    if (!uid || !birthDate) return res.json({ success: false, msg: '生年月日を入力してください' });
    if (!newPassword || newPassword.length < 4) return res.json({ success: false, msg: 'パスワードは4文字以上で設定してください' });
    const db = getDb();
    const user = db.prepare('SELECT birth_date FROM users WHERE id = ?').get(uid);
    if (!user) return res.json({ success: false, msg: 'ユーザーが見つかりません' });
    if (!user.birth_date || user.birth_date !== birthDate) {
      return res.json({ success: false, msg: '生年月日が一致しません' });
    }
    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, uid);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
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
    // 順位算出
    const postRankPos = db.prepare(`
      SELECT COUNT(*) + 1 as pos FROM (
        SELECT user_id, COUNT(*) as cnt FROM posts GROUP BY user_id
        HAVING cnt > (SELECT COUNT(*) FROM posts WHERE user_id = ?)
      )
    `).get(uid).pos;
    const inviteRankPos = db.prepare(`
      SELECT COUNT(*) + 1 as pos FROM (
        SELECT inviter_id, COUNT(*) as cnt FROM users WHERE inviter_id IS NOT NULL GROUP BY inviter_id
        HAVING cnt > (SELECT COUNT(*) FROM users WHERE inviter_id = ?)
      )
    `).get(uid).pos;
    res.json({ success: true, inviteCount, postCount, rank, nextTarget: next, postRankPos, inviteRankPos });
  } catch (e) {
    res.json({ success: false, error: e.toString() });
  }
});

// ランキング（投稿数・紹介者数 TOP5）
router.get('/ranking', (req, res) => {
  try {
    const db = getDb();
    // 投稿数TOP5
    const postRanking = db.prepare(`
      SELECT u.id, u.nickname, u.avatar, COUNT(p.id) as count
      FROM users u LEFT JOIN posts p ON u.id = p.user_id
      GROUP BY u.id ORDER BY count DESC LIMIT 5
    `).all();
    // 紹介者数TOP5
    const inviteRanking = db.prepare(`
      SELECT u.id, u.nickname, u.avatar, COUNT(u2.id) as count
      FROM users u LEFT JOIN users u2 ON u.id = u2.inviter_id
      GROUP BY u.id ORDER BY count DESC LIMIT 5
    `).all();
    res.json({ success: true, postRanking, inviteRanking });
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
