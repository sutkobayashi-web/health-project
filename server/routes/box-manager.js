/**
 * Box ファイルマネージャー API
 * Box Enterprise管理者トークンでファイル操作・アクセス管理を行う
 */
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// Box認証トークン取得
async function getToken() {
  try { require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') }); } catch(e) {}
  const res = await fetch('https://api.box.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'client_id=' + process.env.BOX_CLIENT_ID +
      '&client_secret=' + process.env.BOX_CLIENT_SECRET +
      '&grant_type=client_credentials&box_subject_type=enterprise' +
      '&box_subject_id=' + (process.env.BOX_ENTERPRISE_ID || '0')
  });
  const json = await res.json();
  if (json.access_token) return json.access_token;
  throw new Error('Box認証失��');
}

// 簡易認証ミドルウェア（Box管理者メール+パスワードでログイン）
const BOX_MANAGER_SESSIONS = {};
function authBoxManager(req, res, next) {
  const token = req.headers['x-box-session'];
  if (!token || !BOX_MANAGER_SESSIONS[token]) return res.status(401).json({ error: '未認証' });
  req.boxUser = BOX_MANAGER_SESSIONS[token];
  next();
}

// ログイン（Boxユーザーリストから照合）
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ success: false, msg: 'メールとパスワードを入力してください' });
    const token = await getToken();
    // Boxユーザー一覧から照合
    const uRes = await fetch('https://api.box.com/2.0/users?filter_term=' + encodeURIComponent(email) + '&limit=5', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const uData = await uRes.json();
    const user = (uData.entries || []).find(u => u.login.toLowerCase() === email.toLowerCase() && u.status === 'active');
    if (!user) return res.json({ success: false, msg: 'Boxユーザーが見つかりません' });

    // Box OAuth2パスワード認証（Resource Owner Password Credentials）は非対応のため
    // Enterpriseレベルで管理者パスワードを検証
    // → 代替: health DBのcore_membersまたは固定パスワードで認証
    const { getDb } = require('../services/db');
    const db = getDb();
    const member = db.prepare('SELECT email, password_hash FROM core_members WHERE LOWER(email) = ?').get(email.toLowerCase());
    if (member && member.password_hash) {
      const bcrypt = require('bcryptjs');
      const crypto = require('crypto');
      let match = false;
      if (member.password_hash.startsWith('$2')) match = bcrypt.compareSync(password, member.password_hash);
      else match = (crypto.createHash('sha256').update(password).digest('hex') === member.password_hash) || (member.password_hash === password);
      if (!match) return res.json({ success: false, msg: 'パスワードが違います' });
    } else {
      // core_membersに無い場合、管理者マスターパスワード
      if (password !== process.env.BOX_ADMIN_PASS && password !== '7158$Tk123') {
        return res.json({ success: false, msg: 'パスワードが違います' });
      }
    }

    const sessionToken = Date.now().toString(36) + Math.random().toString(36).slice(2);
    BOX_MANAGER_SESSIONS[sessionToken] = { id: user.id, name: user.name, login: user.login };
    res.json({ success: true, session: sessionToken, user: { id: user.id, name: user.name, login: user.login } });
  } catch(e) { res.json({ success: false, msg: e.message }); }
});

// フォルダ一覧
router.get('/folder/:id', authBoxManager, async (req, res) => {
  try {
    const token = await getToken();
    const folderId = req.params.id || '0';
    const r = await fetch('https://api.box.com/2.0/folders/' + folderId + '?fields=id,name,parent,shared_link,item_collection', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const folder = await r.json();
    // アイテム詳細
    const items = await fetch('https://api.box.com/2.0/folders/' + folderId + '/items?fields=id,name,type,size,modified_at,shared_link&limit=200', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const itemData = await items.json();
    res.json({ success: true, folder: { id: folder.id, name: folder.name, parent: folder.parent, shared_link: folder.shared_link }, items: itemData.entries || [] });
  } catch(e) { res.json({ success: false, msg: e.message }); }
});

// 共有リンク設定（パスワード付き）
router.post('/share', authBoxManager, async (req, res) => {
  try {
    const { itemId, itemType, access, password, canDownload } = req.body;
    const token = await getToken();
    const endpoint = itemType === 'folder' ? 'folders' : 'files';
    const body = {
      shared_link: {
        access: access || 'company',
        permissions: { can_download: canDownload !== false, can_preview: true }
      }
    };
    if (password) body.shared_link.password = password;
    if (access === 'remove') {
      body.shared_link = null;
    }
    const r = await fetch('https://api.box.com/2.0/' + endpoint + '/' + itemId, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    res.json({ success: true, shared_link: data.shared_link, name: data.name });
  } catch(e) { res.json({ success: false, msg: e.message }); }
});

// コラボレーション一覧
router.get('/collaborations/:type/:id', authBoxManager, async (req, res) => {
  try {
    const token = await getToken();
    const { type, id } = req.params;
    const endpoint = type === 'folder' ? 'folders' : 'files';
    const r = await fetch('https://api.box.com/2.0/' + endpoint + '/' + id + '/collaborations', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await r.json();
    res.json({ success: true, collaborations: data.entries || [] });
  } catch(e) { res.json({ success: false, msg: e.message }); }
});

// コラボレーション追加
router.post('/collaboration', authBoxManager, async (req, res) => {
  try {
    const { itemId, itemType, userEmail, role } = req.body;
    const token = await getToken();
    const r = await fetch('https://api.box.com/2.0/collaborations', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item: { type: itemType || 'folder', id: itemId },
        accessible_by: { type: 'user', login: userEmail },
        role: role || 'viewer'
      })
    });
    const data = await r.json();
    res.json({ success: true, collaboration: data });
  } catch(e) { res.json({ success: false, msg: e.message }); }
});

// コラボレーション削除
router.delete('/collaboration/:id', authBoxManager, async (req, res) => {
  try {
    const token = await getToken();
    await fetch('https://api.box.com/2.0/collaborations/' + req.params.id, {
      method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token }
    });
    res.json({ success: true });
  } catch(e) { res.json({ success: false, msg: e.message }); }
});

// Boxユーザー一覧
router.get('/users', authBoxManager, async (req, res) => {
  try {
    const token = await getToken();
    const r = await fetch('https://api.box.com/2.0/users?limit=100', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await r.json();
    res.json({ success: true, users: (data.entries || []).map(u => ({ id: u.id, name: u.name, login: u.login, status: u.status })) });
  } catch(e) { res.json({ success: false, msg: e.message }); }
});

// アクセスログ
router.get('/logs', authBoxManager, async (req, res) => {
  try {
    const token = await getToken();
    const after = req.query.after || new Date(Date.now() - 7*24*60*60*1000).toISOString();
    const r = await fetch('https://api.box.com/2.0/events?stream_type=admin_logs&limit=200&created_after=' + encodeURIComponent(after), {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await r.json();
    res.json({ success: true, events: (data.entries || []).map(e => ({
      date: e.created_at, type: e.event_type,
      user: e.created_by ? e.created_by.name : 'Unknown',
      file: e.source ? (e.source.name || '') : '',
      ip: e.ip_address || ''
    }))});
  } catch(e) { res.json({ success: false, msg: e.message }); }
});

module.exports = router;
