const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../services/db');
const { generateToken, authUser, authAdmin } = require('../middleware/auth');
const { getMariganInfo, getMariganRanking, getStreakInfo } = require('../services/marigan');
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
    const { name, nickname, email, password, dept, isUniversity, universityOrg } = req.body;
    if (!name || !email || !password) return res.json({ success: false, msg: '氏名・メール・パスワードを入力してください' });
    if (!nickname) return res.json({ success: false, msg: 'ニックネームを入力してください' });
    if (typeof password !== 'string' || password.length < 6) return res.json({ success: false, msg: 'パスワードは6文字以上で入力してください' });

    const db = getDb();
    const existing = db.prepare('SELECT id FROM core_members WHERE email = ?').get(email.trim().toLowerCase());
    if (existing) return res.json({ success: false, msg: '既に登録されているメールアドレスです' });

    // ニックネーム重複チェック
    const nickExisting = db.prepare('SELECT id FROM users WHERE nickname = ?').get(nickname.trim());
    if (nickExisting) return res.json({ success: false, msg: 'このニックネームは既に使われています' });

    const passwordHash = hashPasswordBcrypt(password.trim());
    const role = isUniversity ? 'observer' : 'member';

    // core_membersに登録
    db.prepare(`INSERT INTO core_members (name, dept, email, password_hash, avatar, role, is_exec, is_university, university_org, status)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending')`).run(name.trim(), dept || '', email.trim().toLowerCase(), passwordHash, '🛡️', role, isUniversity ? 1 : 0, universityOrg || '');

    // usersテーブルにも同時登録（ユーザー画面でも使えるように）
    const uid = uuidv4();
    db.prepare(`INSERT INTO users (id, nickname, password_hash, avatar, department, real_name) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(uid, nickname.trim(), passwordHash, '😀', dept || '', name.trim());

    res.json({
      success: true, msg: '登録申請を受け付けました。推進メンバーの承認をお待ちください。\nユーザー画面にはニックネーム「' + nickname.trim() + '」でログインできます。',
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
    if (!newPassword || newPassword.length < 6) return res.json({ success: false, msg: 'パスワードは6文字以上で設定してください' });
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

// ランキング（投稿数 TOP5）
router.get('/ranking', (req, res) => {
  try {
    const db = getDb();
    // 投稿数TOP5
    const postRanking = db.prepare(`
      SELECT u.id, u.nickname, u.avatar, COUNT(p.id) as count
      FROM users u LEFT JOIN posts p ON u.id = p.user_id
      GROUP BY u.id ORDER BY count DESC LIMIT 5
    `).all();
    res.json({ success: true, postRanking, inviteRanking: [] });
  } catch (e) {
    res.json({ success: false, error: e.toString() });
  }
});

// CoWellコイン情報取得
router.get('/marigan/:uid', (req, res) => {
  try {
    const info = getMariganInfo(req.params.uid);
    res.json({ success: true, ...info });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// CoWellコインランキング
router.get('/marigan-ranking', (req, res) => {
  try {
    const ranking = getMariganRanking(10);
    res.json({ success: true, ranking });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// ストリーク＋木の育成情報取得
router.get('/streak/:uid', (req, res) => {
  try {
    const info = getStreakInfo(req.params.uid);
    res.json({ success: true, ...info });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// ========================================
// コイン��ョップ
// ========================================

// ショップアイテム一覧
router.get('/shop/items', (req, res) => {
  try {
    const db = getDb();
    // shop_itemsテーブルが無ければ作成
    db.exec(`CREATE TABLE IF NOT EXISTS shop_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT '🎁',
      cost INTEGER NOT NULL,
      category TEXT DEFAULT 'reward',
      stock INTEGER DEFAULT -1,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
    db.exec(`CREATE TABLE IF NOT EXISTS shop_redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      cost INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    )`);

    // デフォルトアイテムを初期投入（存在しなければ）
    const count = db.prepare('SELECT COUNT(*) as cnt FROM shop_items').get();
    if (count.cnt === 0) {
      const defaults = [
        ['lottery_ticket', '月イチ抽選券', 'QUOカード500円やドリンク券が当たるかも！', '🎰', 500, 'lottery', -1],
        ['coffee_gift', 'おごりコーヒー', '同僚にコーヒー1杯おごれる。相手に通知が届きます', '☕', 1000, 'gift', -1],
        ['avatar_hat_cap', 'キャップ帽', 'アバター用のかっこいいキャップ', '🧢', 200, 'avatar', -1],
        ['avatar_hat_helmet', 'ヘルメット', 'アバター用の安全ヘルメット', '⛑️', 300, 'avatar', -1],
        ['avatar_glasses_sun', 'サングラス', 'アバター用のクールなサングラス', '🕶️', 250, 'avatar', -1],
        ['avatar_glasses_star', 'スター眼鏡', 'アバター用のキラキラ星眼鏡', '⭐', 400, 'avatar', -1],
        ['donate_100', '寄付 100円', '交通遺児支援に100円寄付（会社負担）', '💝', 2000, 'donate', -1]
      ];
      const ins = db.prepare('INSERT OR IGNORE INTO shop_items (item_id, name, description, icon, cost, category, stock) VALUES (?,?,?,?,?,?,?)');
      defaults.forEach(d => ins.run(...d));
    }

    const items = db.prepare('SELECT * FROM shop_items WHERE active = 1 ORDER BY cost ASC').all();
    res.json({ success: true, items });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// コイン交換（アイテム購入）
router.post('/shop/redeem', (req, res) => {
  try {
    const { uid, itemId, targetUid } = req.body;
    if (!uid || !itemId) return res.json({ success: false, msg: '必須項目が不足' });

    const db = getDb();
    const user = db.prepare('SELECT marigan_total, nickname FROM users WHERE id = ?').get(uid);
    if (!user) return res.json({ success: false, msg: 'ユーザーが見つかりません' });

    const item = db.prepare('SELECT * FROM shop_items WHERE item_id = ? AND active = 1').get(itemId);
    if (!item) return res.json({ success: false, msg: 'アイテムが見つかりません' });

    if ((user.marigan_total || 0) < item.cost) {
      return res.json({ success: false, msg: 'コインが足りません（必要: ' + item.cost + 'pt、残高: ' + (user.marigan_total || 0) + 'pt）' });
    }

    // コイン消費
    db.prepare('UPDATE users SET marigan_total = marigan_total - ? WHERE id = ?').run(item.cost, uid);

    // 交換ログ
    db.prepare('INSERT INTO shop_redemptions (user_id, item_id, cost, status) VALUES (?, ?, ?, ?)').run(uid, itemId, item.cost, 'pending');

    // 抽選の場合は即時結果を生成
    let lotteryResult = null;
    if (item.category === 'lottery') {
      const rand = Math.random();
      if (rand < 0.05) { lotteryResult = { won: true, prize: 'QUOカード 500円', icon: '🎉', tier: 'gold' }; }
      else if (rand < 0.20) { lotteryResult = { won: true, prize: 'ドリンク1本', icon: '🥤', tier: 'silver' }; }
      else if (rand < 0.50) { lotteryResult = { won: true, prize: 'CoWellコイン 100pt', icon: '🪙', tier: 'bronze' }; }
      else { lotteryResult = { won: false, prize: 'ハズレ…でもまた来週！', icon: '😅', tier: 'miss' }; }

      // 当選時はコインバック
      if (lotteryResult.tier === 'bronze') {
        db.prepare('UPDATE users SET marigan_total = marigan_total + 100 WHERE id = ?').run(uid);
      }

      // バディーメッセージで結果を伝える
      const lotteryMsg = lotteryResult.won
        ? `🎰 抽選結果！\n${lotteryResult.icon} おめでとう！【${lotteryResult.prize}】が当たったよ！\n推進メンバーに見せてね！`
        : `🎰 抽選結果！\n${lotteryResult.icon} 残念、今回はハズレ…\nでも参加してくれてありがとう！また挑戦してね💪`;
      try {
        db.prepare('INSERT INTO buddy_messages (user_id, role, content) VALUES (?, ?, ?)').run(uid, 'assistant', lotteryMsg);
      } catch(e) {}
    }

    // おごりコーヒーの場合
    if (item.category === 'gift' && targetUid) {
      const target = db.prepare('SELECT nickname FROM users WHERE id = ?').get(targetUid);
      const targetName = target ? target.nickname : '仲間';
      // 相手にバディーメッセージ
      try {
        db.prepare('INSERT INTO buddy_messages (user_id, role, content) VALUES (?, ?, ?)').run(
          targetUid, 'assistant',
          `☕ ${user.nickname}さんから【おごりコーヒー】が届いたよ！\n「いつもありがとう」だって😊\n推進メンバーに見せてコーヒーもらってね！`
        );
        // 通知も送る
        db.prepare("INSERT INTO notices (notice_id, content, sender, target_id, status) VALUES (?, ?, ?, ?, 'unread')").run(
          'notice_' + Date.now(), `☕ ${user.nickname}さんからおごりコーヒーが届きました！推進メンバーに見せてコーヒーをもらってください。`, '🎁 CoWellショップ', targetUid
        );
      } catch(e) {}
    }

    const newTotal = db.prepare('SELECT marigan_total FROM users WHERE id = ?').get(uid);

    res.json({
      success: true,
      item: item,
      newTotal: newTotal ? newTotal.marigan_total : 0,
      lotteryResult: lotteryResult,
      msg: item.name + 'と交換しました！'
    });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 交換履歴
router.get('/shop/history/:uid', (req, res) => {
  try {
    const db = getDb();
    const history = db.prepare(`
      SELECT sr.*, si.name, si.icon, si.category
      FROM shop_redemptions sr
      JOIN shop_items si ON sr.item_id = si.item_id
      WHERE sr.user_id = ?
      ORDER BY sr.created_at DESC LIMIT 20
    `).all(req.params.uid);
    res.json({ success: true, history });
  } catch (e) { res.json({ success: false, msg: e.message }); }
});

// 社員一覧（おごりコーヒー用）
router.get('/shop/users', (req, res) => {
  try {
    const db = getDb();
    const users = db.prepare('SELECT id, nickname, avatar FROM users ORDER BY nickname').all();
    res.json({ success: true, users });
  } catch (e) { res.json({ success: false, msg: e.message }); }
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

// ユーザーオンライン状態管理（メモリ）
const onlineUsers = {}; // { uid: { nickname, avatar, department, lastSeen } }

router.post('/user-heartbeat', authUser, (req, res) => {
  const { uid, nickname, avatar, department } = req.body;
  if (!uid) return res.json({ success: false });
  onlineUsers[uid] = { nickname: nickname || '', avatar: avatar || '😀', department: department || '', lastSeen: Date.now() };

  // アクセスログ記録
  try {
    const db = require('../services/db').getDb();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // 本日のアクセスをUPSERT
    db.prepare(`INSERT INTO user_access_log (user_id, access_date, access_count, first_access, last_access)
      VALUES (?, ?, 1, ?, ?)
      ON CONFLICT(user_id, access_date) DO UPDATE SET
        access_count = access_count + 1,
        last_access = ?`).run(uid, today, now, now, now);

    // usersテーブルのカウンター更新
    db.prepare(`UPDATE users SET
      total_access_count = COALESCE(total_access_count, 0) + 1,
      last_access_at = ?
      WHERE id = ?`).run(now, uid);

    // 連続アクセス日数の計算
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const hadYesterday = db.prepare('SELECT 1 FROM user_access_log WHERE user_id = ? AND access_date = ?').get(uid, yesterday);
    const user = db.prepare('SELECT consecutive_access_days, best_consecutive_days FROM users WHERE id = ?').get(uid);

    if (user) {
      // 今日が初回アクセスかチェック
      const todayLog = db.prepare('SELECT access_count FROM user_access_log WHERE user_id = ? AND access_date = ?').get(uid, today);
      if (todayLog && todayLog.access_count === 1) {
        // 今日の初回アクセス → 連続日数を更新
        const consecutive = hadYesterday ? (user.consecutive_access_days || 0) + 1 : 1;
        const best = Math.max(consecutive, user.best_consecutive_days || 0);
        db.prepare('UPDATE users SET consecutive_access_days = ?, best_consecutive_days = ? WHERE id = ?').run(consecutive, best, uid);
      }
    }
  } catch(e) {
    console.error('[access-log]', e.message);
  }

  res.json({ success: true });
});

// 管理者向け: オンラインユーザー一覧
router.get('/online-users', authAdmin, (req, res) => {
  const now = Date.now();
  const threshold = 3 * 60 * 1000; // 3分以内をオンラインとする
  const users = Object.entries(onlineUsers)
    .filter(([, u]) => (now - u.lastSeen) < threshold)
    .map(([uid, u]) => ({
      uid, nickname: u.nickname, avatar: u.avatar, department: u.department,
      lastSeen: u.lastSeen
    }))
    .sort((a, b) => b.lastSeen - a.lastSeen);
  // 古いデータを掃除（10分以上前）
  for (const uid of Object.keys(onlineUsers)) {
    if ((now - onlineUsers[uid].lastSeen) > 10 * 60 * 1000) delete onlineUsers[uid];
  }
  res.json({ success: true, online: users, count: users.length });
});

// アクセス統計API（管理者向け）
router.get('/access-stats', authAdmin, (req, res) => {
  try {
    const db = require('../services/db').getDb();
    const { period, user_id } = req.query;

    // 全ユーザーのアクセスサマリー
    const userStats = db.prepare(`
      SELECT u.id, u.nickname, u.department,
        u.total_access_count, u.consecutive_access_days, u.best_consecutive_days,
        u.last_access_at,
        (SELECT COUNT(DISTINCT access_date) FROM user_access_log WHERE user_id = u.id) as total_days,
        (SELECT SUM(access_count) FROM user_access_log WHERE user_id = u.id
          AND access_date >= date('now', '-30 days')) as last_30_days
      FROM users u
      ORDER BY u.total_access_count DESC
    `).all();

    // 本日のアクティブユーザー数
    const today = new Date().toISOString().split('T')[0];
    const todayActive = db.prepare('SELECT COUNT(DISTINCT user_id) as cnt FROM user_access_log WHERE access_date = ?').get(today);

    // 過去30日の日別アクセス数
    const dailyTrend = db.prepare(`
      SELECT access_date, COUNT(DISTINCT user_id) as unique_users, SUM(access_count) as total_hits
      FROM user_access_log
      WHERE access_date >= date('now', '-30 days')
      GROUP BY access_date
      ORDER BY access_date
    `).all();

    // 個別ユーザーの詳細（指定時）
    let userDetail = null;
    if (user_id) {
      userDetail = db.prepare(`
        SELECT access_date, access_count, first_access, last_access
        FROM user_access_log
        WHERE user_id = ?
        ORDER BY access_date DESC
        LIMIT 90
      `).all(user_id);
    }

    res.json({
      success: true,
      today_active: todayActive ? todayActive.cnt : 0,
      users: userStats,
      daily_trend: dailyTrend,
      user_detail: userDetail
    });
  } catch(e) {
    res.json({ success: false, error: e.message });
  }
});

// 個別ユーザーのアクセス情報（ユーザー自身用）
router.get('/my-access', authUser, (req, res) => {
  try {
    const db = require('../services/db').getDb();
    const uid = req.query.uid;
    if (!uid) return res.json({ success: false });

    const user = db.prepare(`
      SELECT total_access_count, consecutive_access_days, best_consecutive_days, last_access_at
      FROM users WHERE id = ?
    `).get(uid);

    const recent = db.prepare(`
      SELECT access_date, access_count
      FROM user_access_log WHERE user_id = ?
      ORDER BY access_date DESC LIMIT 30
    `).all(uid);

    const totalDays = db.prepare('SELECT COUNT(DISTINCT access_date) as cnt FROM user_access_log WHERE user_id = ?').get(uid);

    res.json({
      success: true,
      total_access: user ? user.total_access_count : 0,
      consecutive_days: user ? user.consecutive_access_days : 0,
      best_consecutive: user ? user.best_consecutive_days : 0,
      last_access: user ? user.last_access_at : null,
      total_days: totalDays ? totalDays.cnt : 0,
      recent: recent
    });
  } catch(e) {
    res.json({ success: false, error: e.message });
  }
});

module.exports = router;
