const jwt = require('jsonwebtoken');

const crypto = require('crypto');

// JWT_SECRET: 環境変数必須。未設定時はランダム生成（再起動で全トークン無効化）
let _jwtFallback = null;
const JWT_SECRET = () => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (!_jwtFallback) {
    console.warn('[SECURITY WARNING] JWT_SECRET が未設定です。ランダムキーを使用します。.envにJWT_SECRETを設定してください。');
    _jwtFallback = crypto.randomBytes(64).toString('hex');
  }
  return _jwtFallback;
};

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET(), { expiresIn: '7d' });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET());
}

// ユーザー認証ミドルウェア
function authUser(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ success: false, msg: '認証が必要です' });
  try {
    req.user = verifyToken(token);
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
