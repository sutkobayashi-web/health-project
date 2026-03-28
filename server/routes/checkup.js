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

// 判定結果xlsmを探す（深さ制限付き、サブフォルダは並列）
async function findCheckupFiles(token, folderId, depth) {
  if (depth > 2) return [];
  var items = await boxListFolder(token, folderId);
  var files = items.filter(function(i) {
    return i.type === 'file' && i.name.includes('判定結果') &&
      (i.name.endsWith('.xlsm') || i.name.endsWith('.xlsx'));
  });
  if (files.length > 0) return files;
  // サブフォルダを並列探索
  var subFolders = items.filter(function(i) { return i.type === 'folder'; });
  var subResults = await Promise.all(subFolders.map(function(f) {
    return findCheckupFiles(token, f.id, depth + 1);
  }));
  var all = [];
  subResults.forEach(function(r) { all = all.concat(r); });
  return all;
}

// 1年度分のデータを取得する関数
async function searchYearData(token, yearFolder, realName) {
  var yearMatch = yearFolder.name.match(/(\d{4})/);
  var year = yearMatch ? yearMatch[1] : '';
  var xlsmFiles = await findCheckupFiles(token, yearFolder.id, 0);
  // 全xlsmを並列ダウンロード＆検索
  var results = await Promise.all(xlsmFiles.map(async function(f) {
    try {
      var buffer = await boxDownloadFile(token, f.id);
      return extractCheckupData(buffer, realName);
    } catch (e) { return null; }
  }));
  var found = results.find(function(r) { return r !== null; });
  if (found) {
    delete found.氏名;
    return Object.assign({ 年度: year + '年度' }, found);
  }
  return null;
}

// POST /api/checkup/my — 誓約同意+本人確認（生年月日+パスワード）後に健診結果を返却
router.post('/my', authUser, async (req, res) => {
  try {
    var birthDate = req.body.birthDate;
    var password = req.body.password;
    var agreed = req.body.agreed;
    if (!birthDate || !password) {
      return res.json({ success: false, msg: '生年月日とパスワードを入力してください。' });
    }
    if (!agreed) {
      return res.json({ success: false, msg: '誓約事項に同意してください。' });
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

    // アクセスログ記録（内部統制：誰が・いつ・どこから閲覧したか）
    try {
      var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
      var ua = req.headers['user-agent'] || '';
      db.prepare('INSERT INTO checkup_access_log (user_id, ip_address, user_agent) VALUES (?, ?, ?)').run(req.user.uid, ip, ua.substring(0, 500));
    } catch (logErr) {
      console.error('健診アクセスログ記録エラー:', logErr.message);
    }

    const token = await getBoxToken();

    // トップレベルの年度フォルダを取得（ヘルスケアネットワーク年度 + 結果データ）
    const topItems = await boxListFolder(token, CHECKUP_FOLDER_ID);
    var yearFolders = topItems
      .filter(function(i) {
        return i.type === 'folder' && /\d{4}/.test(i.name) && i.name.includes('ヘルスケア');
      })
      .sort(function(a, b) {
        var ya = (a.name.match(/(\d{4})/) || ['', '0'])[1];
        var yb = (b.name.match(/(\d{4})/) || ['', '0'])[1];
        return yb.localeCompare(ya);
      });

    // 「ヘルスケアネット結果データ」フォルダも探索（2020-2021年度等の古いデータ）
    var oldDataFolder = topItems.find(function(i) {
      return i.type === 'folder' && i.name.includes('結果データ');
    });
    if (oldDataFolder) {
      var oldSubFolders = await boxListFolder(token, oldDataFolder.id);
      var oldYears = oldSubFolders.filter(function(i) {
        return i.type === 'folder' && /\d{4}/.test(i.name);
      });
      yearFolders = yearFolders.concat(oldYears);
      // 重複排除＆再ソート
      yearFolders.sort(function(a, b) {
        var ya = (a.name.match(/(\d{4})/) || ['', '0'])[1];
        var yb = (b.name.match(/(\d{4})/) || ['', '0'])[1];
        return yb.localeCompare(ya);
      });
    }

    // 年度の重複排除（同じ年は新しいフォルダを優先）
    var seenYears = {};
    yearFolders = yearFolders.filter(function(f) {
      var y = (f.name.match(/(\d{4})/) || ['', ''])[1];
      if (!y || seenYears[y]) return false;
      seenYears[y] = true;
      return true;
    });

    if (yearFolders.length === 0) {
      return res.json({ success: false, msg: '健診結果データが見つかりません' });
    }

    // 全年度を並列検索（最大6年度）
    var targetFolders = yearFolders.slice(0, 6);
    var yearResults = await Promise.all(targetFolders.map(function(yf) {
      return searchYearData(token, yf, user.real_name);
    }));
    var results = yearResults.filter(function(r) { return r !== null; });

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

// ===== 全社健診データ匿名集計 + AI分析 =====

// 全員分のデータを匿名で集計
function extractAllCheckupData(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets['判定結果'];
  if (!sheet) return [];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (data.length < 5) return [];

  var results = [];
  for (let i = 4; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[2]) continue;
    results.push({
      年齢: row[8] || '',
      性別: row[9] || '',
      肥満判定: row[11] || '',
      高血圧判定: row[12] || '',
      脂質異常判定: row[13] || '',
      高血糖判定: row[14] || '',
      肝機能判定: row[17] || '',
      腎機能判定: row[18] || '',
      貧血判定: row[19] || '',
      BMI: row[31] || '',
      腹囲: row[32] || '',
      収縮期血圧: row[38] || '',
      拡張期血圧: row[39] || '',
      LDLコレステロール: row[43] || '',
      中性脂肪: row[44] || '',
      HbA1c: row[47] || '',
      γGTP: row[52] || '',
    });
  }
  return results;
}

// 集計関数
function aggregateCheckupData(allData) {
  var total = allData.length;
  if (total === 0) return null;

  // 判定カウント（要受診/要精検/要治療を異常とする）
  var abnormalKeywords = ['要受診', '要精検', '要治療', 'D', 'E', 'D1', 'D2', 'E1'];
  function isAbnormal(val) { return abnormalKeywords.some(function(k) { return String(val).indexOf(k) !== -1; }); }

  var counts = { 肥満: 0, 高血圧: 0, 脂質異常: 0, 高血糖: 0, 肝機能: 0, 腎機能: 0, 貧血: 0 };
  var bmiOver25 = 0;
  var ageSum = 0, ageCount = 0;

  allData.forEach(function(d) {
    if (isAbnormal(d.肥満判定)) counts.肥満++;
    if (isAbnormal(d.高血圧判定)) counts.高血圧++;
    if (isAbnormal(d.脂質異常判定)) counts.脂質異常++;
    if (isAbnormal(d.高血糖判定)) counts.高血糖++;
    if (isAbnormal(d.肝機能判定)) counts.肝機能++;
    if (isAbnormal(d.腎機能判定)) counts.腎機能++;
    if (isAbnormal(d.貧血判定)) counts.貧血++;
    var bmi = parseFloat(d.BMI);
    if (!isNaN(bmi) && bmi >= 25) bmiOver25++;
    var age = parseInt(d.年齢);
    if (!isNaN(age)) { ageSum += age; ageCount++; }
  });

  return {
    total: total,
    averageAge: ageCount > 0 ? Math.round(ageSum / ageCount) : 0,
    bmiOver25: bmiOver25,
    bmiOver25Pct: Math.round(bmiOver25 / total * 100),
    counts: counts,
    rates: Object.fromEntries(Object.entries(counts).map(function(e) { return [e[0], Math.round(e[1] / total * 100)]; }))
  };
}

// Admin用: 全社健診分析 + AI 3パターン提案
router.get('/company-analysis', async (req, res) => {
  try {
    const token = await getBoxToken();
    const items = await boxListFolder(token, CHECKUP_FOLDER_ID);
    // 最新の年度フォルダを探す
    var yearFolders = items.filter(function(i) { return i.type === 'folder' && /\d{4}/.test(i.name); });
    yearFolders.sort(function(a, b) { return b.name.localeCompare(a.name); });

    if (yearFolders.length === 0) return res.json({ success: false, msg: '健診データフォルダが見つかりません' });

    var latestFolder = yearFolders[0];
    var xlsmFiles = await findCheckupFiles(token, latestFolder.id, 0);
    if (xlsmFiles.length === 0) return res.json({ success: false, msg: '健診ファイルが見つかりません' });

    // 全ファイルからデータ取得
    var allData = [];
    for (var f of xlsmFiles) {
      try {
        var buffer = await boxDownloadFile(token, f.id);
        var rows = extractAllCheckupData(buffer);
        allData = allData.concat(rows);
      } catch (e) { console.log('健診ファイル読込エラー:', f.name, e.message); }
    }

    var summary = aggregateCheckupData(allData);
    if (!summary) return res.json({ success: false, msg: 'データの集計に失敗しました' });

    // AI分析 - 3パターン提案
    const { callAIWithFallback, EVIDENCE_BASE } = require('../services/ai');
    var prompt = `あなたは産業保健の専門家（保健師）を支援するAIコンサルタントです。
以下の全社健康診断の集計結果に基づいて、会社として取り組むべきアクションプランを3パターン提案してください。

【会社概要】
業種: 運輸業（トラックドライバー中心）
従業員数: ${summary.total}名
平均年齢: ${summary.averageAge}歳

【健診集計結果】
BMI25以上: ${summary.bmiOver25}名（${summary.bmiOver25Pct}%）
肥満判定異常: ${summary.rates.肥満}%
高血圧判定異常: ${summary.rates.高血圧}%
脂質異常判定異常: ${summary.rates.脂質異常}%
高血糖判定異常: ${summary.rates.高血糖}%
肝機能判定異常: ${summary.rates.肝機能}%
腎機能判定異常: ${summary.rates.腎機能}%
貧血判定異常: ${summary.rates.貧血}%

【エビデンス基盤】
${EVIDENCE_BASE}

【出力形式】以下のJSON形式のみ出力。
{
  "summary": "全体所見（3文以内）",
  "topRisks": ["リスク1", "リスク2", "リスク3"],
  "plans": [
    {
      "title": "プランA名称",
      "priority": "高/中/低",
      "targetRisk": "対象リスク",
      "description": "概要説明（3文）",
      "evidence": "根拠となるエビデンス・ガイドライン名",
      "kpi": "測定指標",
      "duration": "推奨期間",
      "eastDesign": {"easy":"ハードルを下げる工夫","attractive":"魅力","social":"仲間の力","timely":"タイミング"}
    },
    { プランB... },
    { プランC... }
  ],
  "advisorNote": "保健師・産業医への申し送り事項（2文）"
}`;

    var aiResult = await callAIWithFallback('JSON出力専門AI。指定JSON形式のみ出力。', prompt);
    var analysis = null;
    if (aiResult) {
      try {
        var jsonStr = aiResult.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
        analysis = JSON.parse(jsonStr);
      } catch (e) { console.log('AI分析JSON解析エラー'); }
    }

    // テーマ凝集用にキャッシュ保存
    try {
      var cacheText = `従業員${summary.total}名 平均${summary.averageAge}歳\nBMI25↑:${summary.bmiOver25Pct}% 肥満:${summary.rates.肥満}% 高血圧:${summary.rates.高血圧}% 脂質異常:${summary.rates.脂質異常}% 高血糖:${summary.rates.高血糖}% 肝機能:${summary.rates.肝機能}% 腎機能:${summary.rates.腎機能}% 貧血:${summary.rates.貧血}%`;
      const db = getDb();
      db.prepare("INSERT OR REPLACE INTO system_cache (key, data, updated_at) VALUES ('checkup_summary', ?, datetime('now'))").run(cacheText);
    } catch(e) {}

    res.json({ success: true, year: latestFolder.name, summary: summary, analysis: analysis });
  } catch (e) {
    console.error('全社健診分析エラー:', e.message);
    res.json({ success: false, msg: e.message });
  }
});

module.exports = router;
