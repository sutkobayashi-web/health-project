/**
 * Box バックアップサービス
 * SQLiteデータベースをBoxにバックアップ
 *
 * 使い方:
 *   node server/services/backup.js          # 手動実行
 *   スケジューラーから自動実行（server/index.jsに組込み）
 */
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'db', 'health.db');
const BOX_FOLDER_ID = process.env.BOX_FOLDER_ID || '371132541140';

// Box APIでアクセストークンを取得（クライアント資格情報）
async function getBoxToken() {
  // まずDeveloper Tokenを試す（設定されている場合）
  if (process.env.BOX_DEVELOPER_TOKEN) {
    return process.env.BOX_DEVELOPER_TOKEN;
  }
  // クライアント資格情報方式
  const res = await fetch('https://api.box.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.BOX_CLIENT_ID,
      client_secret: process.env.BOX_CLIENT_SECRET,
      grant_type: 'client_credentials',
      box_subject_type: 'enterprise',
      box_subject_id: process.env.BOX_ENTERPRISE_ID || '0'
    })
  });
  const json = await res.json();
  if (json.access_token) return json.access_token;
  throw new Error('Box token取得失敗: ' + JSON.stringify(json));
}

// Boxにファイルをアップロード（新規 or 上書き）
async function uploadToBox(token, filePath, fileName, folderId) {
  // 既存ファイルを検索
  let existing = null;
  try {
    const searchRes = await fetch(
      `https://api.box.com/2.0/search?query=${encodeURIComponent(fileName)}&ancestor_folder_ids=${folderId}&type=file&limit=5`,
      { headers: { 'Authorization': 'Bearer ' + token } }
    );
    const searchText = await searchRes.text();
    if (searchRes.ok && searchText) {
      const searchJson = JSON.parse(searchText);
      existing = searchJson.entries && searchJson.entries.find(e => e.name === fileName);
    } else {
      console.log('  Box検索スキップ (status:' + searchRes.status + ')。新規アップロードします');
    }
  } catch (searchErr) {
    console.log('  Box検索エラー: ' + searchErr.message + '。新規アップロードします');
  }

  const fileData = fs.readFileSync(filePath);
  const boundary = '----BoxUpload' + Date.now();

  let uploadUrl, uploadBody;

  if (existing) {
    // 上書きアップロード
    uploadUrl = `https://upload.box.com/api/2.0/files/${existing.id}/content`;
    uploadBody = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`),
      fileData,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);
  } else {
    // 新規アップロード
    uploadUrl = 'https://upload.box.com/api/2.0/files/content';
    const attributes = JSON.stringify({ name: fileName, parent: { id: folderId } });
    uploadBody = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="attributes"\r\n\r\n${attributes}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`),
      fileData,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);
  }

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'multipart/form-data; boundary=' + boundary
    },
    body: uploadBody
  });

  const resText = await res.text();
  if (!res.ok) {
    throw new Error('Boxアップロード失敗 (HTTP ' + res.status + '): ' + resText.substring(0, 200));
  }
  try {
    return JSON.parse(resText);
  } catch (e) {
    throw new Error('Box応答の解析失敗 (HTTP ' + res.status + '): ' + resText.substring(0, 200));
  }
}

// メインバックアップ処理
async function runBackup() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // 2026-03-16
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, ''); // 012345
  console.log(`[${now.toISOString()}] バックアップ開始...`);

  try {
    // 1. トークン取得
    const token = await getBoxToken();
    console.log('  Box認証OK');

    // 2. SQLite DBをコピー
    const backupDir = path.join(__dirname, '..', '..', 'backup');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const backupFileName = `health_${dateStr}.db`;
    const backupPath = path.join(backupDir, backupFileName);
    fs.copyFileSync(DB_PATH, backupPath);
    const sizeKB = Math.round(fs.statSync(backupPath).size / 1024);
    console.log(`  DBコピー完了: ${backupFileName} (${sizeKB}KB)`);

    // 3. Boxにアップロード
    const result = await uploadToBox(token, backupPath, backupFileName, BOX_FOLDER_ID);
    if (result.entries || result.total_count >= 0) {
      console.log('  Boxアップロード完了');
    } else if (result.type === 'error') {
      console.error('  Boxエラー:', result.message);
    } else {
      console.log('  Box応答:', JSON.stringify(result).substring(0, 200));
    }

    // 4. ローカルの古いバックアップを削除（7日以上前）
    const files = fs.readdirSync(backupDir);
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    files.forEach(f => {
      const fp = path.join(backupDir, f);
      if (fs.statSync(fp).mtimeMs < sevenDaysAgo) {
        fs.unlinkSync(fp);
        console.log(`  古いバックアップ削除: ${f}`);
      }
    });

    console.log(`[${new Date().toISOString()}] バックアップ完了`);
    return { success: true, file: backupFileName, sizeKB };

  } catch (e) {
    console.error(`[${new Date().toISOString()}] バックアップ失敗:`, e.message);
    return { success: false, error: e.message };
  }
}

// 直接実行された場合
if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
  runBackup().then(r => {
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.success ? 0 : 1);
  });
}

module.exports = { runBackup, getBoxToken, uploadToBox };
