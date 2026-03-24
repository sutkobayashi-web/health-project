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
const db = require('../services/db');

// 健診データの親フォルダID（ヘルスケアネットワーク）
const CHECKUP_FOLDER_ID = process.env.BOX_CHECKUP_FOLDER_ID || '354720844674';

// Box APIでフォルダ内アイテム一覧取得
async function boxListFolder(token, folderId) {
  const res = await fetch(
    `https://api.box.com/2.0/folders/${folderId}/items?fields=id,name,type&limit=1000`,
    { headers: { 'Authorization': 'Bearer ' + token } }
  );
  if (!res.ok) throw new Error('Box API エラー (HTTP ' + res.status + ')');
  const data = await res.json();
  return data.entries || [];
}

// Box APIでファイルをダウンロード（バイナリ）
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

  // ヘッダー行（行3）
  const headers = data[3];
  // 氏名は列2
  for (let i = 4; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[2]) continue;
    const name = String(row[2]).replace(/\s+/g, '');
    const target = realName.replace(/\s+/g, '');
    if (name === target) {
      // 本人の行を見つけた → 主要項目を抽出
      return {
        氏名: row[2],
        支店名: row[4] || '',
        職種: row[6] || '',
        生年月日: row[7] || '',
        年齢: row[8] || '',
        性別: row[9] || '',
        健診受診日: row[10] || '',
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
        // 肝機能
        GOT_AST: row[50] || '',
        GPT_ALT: row[51] || '',
        γGTP: row[52] || '',
        // 腎機能
        クレアチニン: row[55] || '',
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
        // 総合
        胸部レントゲン: row[70] || '',
      };
    }
  }
  return null;
}

// GET /api/checkup/my — 自分の健診結果を取得
router.get('/my', authUser, async (req, res) => {
  try {
    // ユーザーのreal_nameを取得
    const user = db.prepare('SELECT real_name, department FROM users WHERE id = ?').get(req.user.uid);
    if (!user || !user.real_name) {
      return res.json({ success: false, msg: '実名が登録されていません。管理者にご連絡ください。' });
    }

    const token = await getBoxToken();

    // 1. ヘルスケアネットワーク → ヘルスケアネット結果データ を探す
    const topItems = await boxListFolder(token, CHECKUP_FOLDER_ID);
    const resultFolder = topItems.find(i => i.type === 'folder' && i.name.includes('結果データ'));
    if (!resultFolder) {
      return res.json({ success: false, msg: '健診結果データフォルダが見つかりません' });
    }

    // 2. 年度フォルダ一覧取得 → 最新年度を特定
    const yearFolders = await boxListFolder(token, resultFolder.id);
    const sorted = yearFolders
      .filter(i => i.type === 'folder' && i.name.includes('判定結果'))
      .sort((a, b) => b.name.localeCompare(a.name));

    if (sorted.length === 0) {
      return res.json({ success: false, msg: '判定結果フォルダが見つかりません' });
    }

    // 最新2年度分を検索
    const results = [];
    for (const yearFolder of sorted.slice(0, 2)) {
      // 3. 営業所フォルダ一覧
      const officeFolders = await boxListFolder(token, yearFolder.id);

      for (const office of officeFolders) {
        if (office.type !== 'folder') continue;

        // 4. 営業所内の「結果」サブフォルダを探す
        const officeItems = await boxListFolder(token, office.id);
        const resultSubFolder = officeItems.find(i => i.type === 'folder' && i.name.includes('結果'));

        const searchFolder = resultSubFolder || office;
        const files = resultSubFolder
          ? await boxListFolder(token, resultSubFolder.id)
          : officeItems;

        // 5. 判定結果xlsmファイルを探す
        const xlsmFile = files.find(i =>
          i.type === 'file' && i.name.includes('判定結果') && (i.name.endsWith('.xlsm') || i.name.endsWith('.xlsx'))
        );

        if (!xlsmFile) continue;

        // 6. ダウンロードして本人データ抽出
        try {
          const buffer = await boxDownloadFile(token, xlsmFile.id);
          const checkup = extractCheckupData(buffer, user.real_name);
          if (checkup) {
            // 年度情報を付加
            const yearMatch = yearFolder.name.match(/(\d{4})/);
            results.push({
              年度: yearMatch ? yearMatch[1] + '年度' : yearFolder.name,
              会社区分: yearFolder.name.includes('SU') ? 'SU' : '茨運',
              ...checkup
            });
            break; // この年度で見つかったので次の年度へ
          }
        } catch (dlErr) {
          console.error('健診ファイルDLエラー:', xlsmFile.name, dlErr.message);
        }
      }
    }

    if (results.length === 0) {
      return res.json({ success: false, msg: 'あなたの健診結果が見つかりませんでした' });
    }

    res.json({ success: true, results });

  } catch (e) {
    console.error('健診結果取得エラー:', e.message);
    if (e.message.includes('Box token')) {
      return res.json({ success: false, msg: 'Box連携の設定に問題があります。管理者にご連絡ください。' });
    }
    res.json({ success: false, msg: '健診結果の取得に失敗しました' });
  }
});

module.exports = router;
