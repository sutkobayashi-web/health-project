const express = require('express');
const { getDb } = require('../services/db');
const router = express.Router();

// ============================================================
// アバターチャレンジ（オンボーディング用）
// ============================================================

// テーブル初期化
function ensureTables() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS avatar_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voter_id TEXT NOT NULL,
      target_user_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(voter_id, target_user_id)
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS avatar_challenge_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      status TEXT DEFAULT 'inactive',
      start_date DATETIME,
      end_date DATETIME,
      max_votes INTEGER DEFAULT 5
    )
  `);
  // デフォルト設定がなければ挿入
  const cfg = db.prepare("SELECT * FROM avatar_challenge_config WHERE id = 1").get();
  if (!cfg) {
    db.prepare("INSERT INTO avatar_challenge_config (id, status, max_votes) VALUES (1, 'inactive', 5)").run();
  }
}

// 設定取得
router.get('/config', (req, res) => {
  try {
    ensureTables();
    const db = getDb();
    const config = db.prepare("SELECT * FROM avatar_challenge_config WHERE id = 1").get();
    res.json({ success: true, config });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 設定更新（管理者用）
router.post('/config', (req, res) => {
  try {
    ensureTables();
    const db = getDb();
    const { status, start_date, end_date, max_votes } = req.body;
    db.prepare(`
      UPDATE avatar_challenge_config
      SET status = ?, start_date = ?, end_date = ?, max_votes = ?
      WHERE id = 1
    `).run(status || 'inactive', start_date || null, end_date || null, max_votes || 5);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// ギャラリー取得（全ユーザーのアバター + 得票数）
router.get('/gallery', (req, res) => {
  try {
    ensureTables();
    const db = getDb();
    const uid = req.query.uid || '';

    // アクティブチェック
    const config = db.prepare("SELECT * FROM avatar_challenge_config WHERE id = 1").get();
    if (!config || config.status !== 'active') {
      return res.json({ success: true, active: false, users: [] });
    }

    // 全ユーザー + 得票数
    const users = db.prepare(`
      SELECT u.id, u.nickname, u.avatar, u.department,
        (SELECT COUNT(*) FROM avatar_votes av WHERE av.target_user_id = u.id) as vote_count
      FROM users u
      ORDER BY vote_count DESC, u.created_at ASC
    `).all();

    // 自分の投票先
    let myVotes = [];
    if (uid) {
      myVotes = db.prepare("SELECT target_user_id FROM avatar_votes WHERE voter_id = ?")
        .all(uid).map(r => r.target_user_id);
    }

    const totalUsers = users.length;
    const totalVoters = db.prepare("SELECT COUNT(DISTINCT voter_id) as cnt FROM avatar_votes").get().cnt;

    res.json({
      success: true,
      active: true,
      config,
      users,
      myVotes,
      totalUsers,
      totalVoters
    });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 投票 / 取消
router.post('/vote', (req, res) => {
  try {
    ensureTables();
    const db = getDb();
    const { voterId, targetUserId } = req.body;
    if (!voterId || !targetUserId) return res.json({ success: false, msg: '必須項目が不足' });
    if (voterId === targetUserId) return res.json({ success: false, msg: '自分には投票できません' });

    const config = db.prepare("SELECT * FROM avatar_challenge_config WHERE id = 1").get();
    if (!config || config.status !== 'active') {
      return res.json({ success: false, msg: 'アバターチャレンジは開催中ではありません' });
    }

    // 既存投票チェック
    const existing = db.prepare("SELECT id FROM avatar_votes WHERE voter_id = ? AND target_user_id = ?")
      .get(voterId, targetUserId);

    if (existing) {
      // 取消
      db.prepare("DELETE FROM avatar_votes WHERE voter_id = ? AND target_user_id = ?")
        .run(voterId, targetUserId);
      return res.json({ success: true, action: 'removed' });
    }

    // 投票数上限チェック
    const maxVotes = config.max_votes || 5;
    const currentCount = db.prepare("SELECT COUNT(*) as cnt FROM avatar_votes WHERE voter_id = ?")
      .get(voterId).cnt;
    if (currentCount >= maxVotes) {
      return res.json({ success: false, msg: maxVotes + '票まで投票できます。取り消してから再投票してください。' });
    }

    db.prepare("INSERT INTO avatar_votes (voter_id, target_user_id) VALUES (?, ?)")
      .run(voterId, targetUserId);
    res.json({ success: true, action: 'voted' });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// ランキング
router.get('/ranking', (req, res) => {
  try {
    ensureTables();
    const db = getDb();
    const ranking = db.prepare(`
      SELECT u.id, u.nickname, u.avatar, u.department,
        (SELECT COUNT(*) FROM avatar_votes av WHERE av.target_user_id = u.id) as vote_count
      FROM users u
      HAVING vote_count > 0
      ORDER BY vote_count DESC
      LIMIT 20
    `).all();
    res.json({ success: true, ranking });
  } catch (e) {
    res.json({ success: false, ranking: [] });
  }
});

module.exports = router;
