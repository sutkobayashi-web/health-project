const jwt = require('jsonwebtoken');

const JWT_SECRET = () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');
  return process.env.JWT_SECRET;
};

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET(), { expiresIn: '24h' });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET());
}

// ユーザー認証ミドルウェア（セッション検証付き）
function authUser(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ success: false, msg: '認証が必要です' });
  try {
    const payload = verifyToken(token);
    req.user = payload;
    // セッショントークン検証（同時ログイン防止）
    if (payload.sid && payload.uid) {
      try {
        const { getDb } = require('../services/db');
        const user = getDb().prepare('SELECT session_token FROM users WHERE id = ?').get(payload.uid);
        if (user && user.session_token && user.session_token !== payload.sid) {
          return res.status(401).json({ success: false, msg: '別の端末でログインされました。再ログインしてください。', code: 'SESSION_EXPIRED' });
        }
      } catch (dbErr) { /* DB未初期化時はスキップ */ }
    }
    next();
  } catch (e) {
    res.status(401).json({ success: false, msg: 'トークンが無効です' });
  }
}

// 管理者認証ミドルウェア
function authAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ success: false, msg: '認証が必要です' });
  try {
    const payload = verifyToken(token);
    if (payload.type !== 'admin') return res.status(403).json({ success: false, msg: '管理者権限が必要です' });
    req.admin = payload;
    next();
  } catch (e) {
    res.status(401).json({ success: false, msg: 'トークンが無効です' });
  }
}

module.exports = { generateToken, verifyToken, authUser, authAdmin };
