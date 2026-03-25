/**
 * 健診結果参照API
 * Box APIから健診データを都度取得し、本人分のみ返却
 * DBには一切保存しない（個人情報保護のため）
 */
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const XLSX = require('xlsx');
const { authUser } = require('../middleware/auth');
const { getBoxToken } = require('../services/backup');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getDb } = require('../services/db');

const CHECKUP_FOLDER_ID = process.env.BOX_CHECKUP_FOLDER_ID || '354720844674';

// パスワード検証（bcrypt / SHA256 / 平文に対応）
function verifyPassword(inputPassword, storedHash) {
  if (!storedHash || storedHash.length === 0) return false;
  if (storedHash.startsWith('$2')) {
    return bcrypt.compareSync(inputPassword, storedHash);
  }
  var sha = crypto.createHash('sha256').update(inputPassword).digest('hex');
  if (storedHash === sha) return true;
  if (storedHash === inputPassword) return true;
  return false;
}

// 生年月日の正規化比較（YYYY/MM/DD, YYYY-MM-DD, YYYYMMDD 等に対応）
function normalizeBirthDate(d) {
  if (!d) return '';
  var s = String(d).replace(/[\/\-\.年月日\s]/g, '');
  // 8桁の数字にする
  if (s.length === 8) return s;
  return s;
}

async function boxListFolder(token, folderId) {
  const res = await fetch(
    `https://api.box.com/2.0/folders/${folderId}/items?fields=id,name,type&limit=1000`,
    { headers: { 'Authorization': 'Bearer ' + token } }
  );
  if (!res.ok) throw new Error('Box API エラー (HTTP ' + res.status + ')');
  const data = await res.json();
  return data.entries || [];
}

async function boxDownloadFile(token, fileId) {
  const res = await fetch(
    `https://api.box.com/2.0/files/${fileId}/content`,
    { headers: { 'Authorization': 'Bearer ' + token }, redirect: 'follow' }
  );
  if (!res.ok) throw new Error('Box ダウンロードエラー (HTTP ' + res.status + ')');
  return res.buffer();
}

// 判定結果xlsmから指定氏名のデータを抽出
function extractCheckupData(buffer, realName) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets['判定結果'];
  if (!sheet) return null;

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (data.length < 5) return null;

  const target = realName.replace(/[\s\u3000]+/g, '');

  for (let i = 4; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[2]) continue;
    const name = String(row[2]).replace(/[\s\u3000]+/g, '');
    if (name === target) {
      return {
        氏名: row[2],
        支店名: row[4] || '',
        職種: row[6] || '',
        生年月日: row[7] || '',
        年齢: row[8] || '',
        性別: row[9] || '',
        健診受診日: row[10] || '',
        // 判定
        肥満判定: row[11] || '',
        高血圧判定: row[12] || '',
        脂質異常判定: row[13] || '',
        高血糖判定: row[14] || '',
        肝機能判定: row[17] || '',
        腎機能判定: row[18] || '',
        貧血判定: row[19] || '',
        // 生体計測
        身長: row[29] || '',
        体重: row[30] || '',
        BMI: row[31] || '',
        腹囲: row[32] || '',
        // 血圧
        収縮期_1回目: row[34] || '',
        拡張期_1回目: row[35] || '',
        収縮期_2回目: row[36] || '',
        拡張期_2回目: row[37] || '',
        収縮期_平均: row[38] || '',
        拡張期_平均: row[39] || '',
        // 脂質
        総コレステロール: row[41] || '',
        HDLコレステロール: row[42] || '',
        LDLコレステロール: row[43] || '',
        中性脂肪: row[44] || '',
        // 血糖
        血糖値: row[46] || '',
        HbA1c: row[47] || '',
        尿糖: row[48] || '',
        // 肝機能
        GOT_AST: row[50] || '',
        GPT_ALT: row[51] || '',
        γGTP: row[52] || '',
        // 腎機能
        尿蛋白: row[54] || '',
        クレアチニン: row[55] || '',
        尿酸: row[56] || '',
        // 貧血
        ヘモグロビン: row[58] || '',
        赤血球: row[59] || '',
        // 視力
        視力右: row[61] || '',
        視力左: row[62] || '',
        // 聴力
        聴力右_低音: row[64] || '',
        聴力右_高音: row[65] || '',
        聴力左_低音: row[66] || '',
        聴力左_高音: row[67] || '',
        // その他
        心電図: row[69] || '',
        胸部レントゲン: row[71] || '',
      };
    }
  }
  return null;
}

// 再帰的に判定結果xlsmを探す
async function findCheckupFiles(token, folderId, depth) {
  if (depth > 4) return [];
  const items = await boxListFolder(token, folderId);
  const results = [];
  for (const item of items) {
    if (item.type === 'file' && item.name.includes('判定結果') &&
        (item.name.endsWith('.xlsm') || item.name.endsWith('.xlsx'))) {
      results.push(item);
    }
    if (item.type === 'folder' && depth < 4) {
      const sub = await findCheckupFiles(token, item.id, depth + 1);
      results.push(...sub);
    }
  }
  return results;
}

// POST /api/checkup/my — 本人確認（生年月日+パスワード）後に健診結果を返却
router.post('/my', authUser, async (req, res) => {
  try {
    var birthDate = req.body.birthDate;
    var password = req.body.password;
    if (!birthDate || !password) {
      return res.json({ success: false, msg: '生年月日とパスワードを入力してください。' });
    }

    var db = getDb();
    const user = db.prepare('SELECT real_name, department, birth_date, password_hash FROM users WHERE id = ?').get(req.user.uid);
    if (!user || !user.real_name) {
      return res.json({ success: false, msg: '実名が登録されていません。管理者にご連絡ください。' });
    }

    // パスワード検証
    if (!verifyPassword(password, user.password_hash)) {
      return res.json({ success: false, msg: 'パスワードが正しくありません。' });
    }

    // 生年月日検証
    if (!user.birth_date || normalizeBirthDate(birthDate) !== normalizeBirthDate(user.birth_date)) {
      return res.json({ success: false, msg: '生年月日が一致しません。' });
    }

    const token = await getBoxToken();

    // トップレベルの年度フォルダを取得
    const topItems = await boxListFolder(token, CHECKUP_FOLDER_ID);
    const yearFolders = topItems
      .filter(function(i) {
        return i.type === 'folder' && /\d{4}/.test(i.name) && i.name.includes('ヘルスケア');
      })
      .sort(function(a, b) {
        var ya = (a.name.match(/(\d{4})/) || ['', '0'])[1];
        var yb = (b.name.match(/(\d{4})/) || ['', '0'])[1];
        return yb.localeCompare(ya);
      });

    if (yearFolders.length === 0) {
      return res.json({ success: false, msg: '健診結果データが見つかりません' });
    }

    // 最新2年度分を検索
    var results = [];
    for (var fi = 0; fi < Math.min(2, yearFolders.length); fi++) {
      var yearFolder = yearFolders[fi];
      var yearMatch = yearFolder.name.match(/(\d{4})/);
      var year = yearMatch ? yearMatch[1] : '';

      var xlsmFiles = await findCheckupFiles(token, yearFolder.id, 0);

      for (var xi = 0; xi < xlsmFiles.length; xi++) {
        try {
          var buffer = await boxDownloadFile(token, xlsmFiles[xi].id);
          var checkup = extractCheckupData(buffer, user.real_name);
          if (checkup) {
            delete checkup.氏名;
            results.push(Object.assign({ 年度: year + '年度' }, checkup));
            break;
          }
        } catch (dlErr) {
          console.error('健診ファイルDLエラー:', xlsmFiles[xi].name, dlErr.message);
        }
      }
    }

    if (results.length === 0) {
      return res.json({ success: false, msg: 'あなたの健診結果が見つかりませんでした' });
    }

    res.json({ success: true, results: results });

  } catch (e) {
    console.error('健診結果取得エラー:', e.message);
    if (e.message.includes('Box token')) {
      return res.json({ success: false, msg: 'Box連携の設定に問題があります。管理者にご連絡ください。' });
    }
    res.json({ success: false, msg: '健診結果の取得に失敗しました' });
  }
});

module.exports = router;
