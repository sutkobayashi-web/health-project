/**
 * 健診結果参照API
 * Box APIから健診データを都度取得し、本人分のみ返却
 * DBには一切保存しない（個人情報保護のため）
 */
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const XLSX = require('xlsx');
const { authUser, authAdmin } = require('../middleware/auth');
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

  // 判定カウント（●=要受診、▲=要注意、★=要経過観察 を異常とする）
  function isAbnormal(val) {
    if (!val) return false;
    var s = String(val).trim();
    if (s === '') return false;
    // ●（要受診）または▲（要注意）が含まれていれば異常
    return s.indexOf('●') !== -1 || s.indexOf('▲') !== -1 || s.indexOf('★') !== -1;
  }

  var counts = { 肥満: 0, 高血圧: 0, 脂質異常: 0, 高血糖: 0, 肝機能: 0, 腎機能: 0, 貧血: 0 };
  var bmiOver25 = 0;
  var ageSum = 0, ageCount = 0;

  var redQuartet = 0, redTrio = 0, yellow = 0;
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
    // レッドカード・イエローカード判定
    var ob = isAbnormal(d.肥満判定);
    var bp = isAbnormal(d.高血圧判定);
    var lip = isAbnormal(d.脂質異常判定);
    var glu = isAbnormal(d.高血糖判定);
    if (ob && bp && lip && glu) { redQuartet++; }
    else if (bp && lip && glu) { redTrio++; }
    else if ((ob ? 1 : 0) + (bp ? 1 : 0) + (lip ? 1 : 0) + (glu ? 1 : 0) >= 1) { yellow++; }
  });

  return {
    total: total,
    averageAge: ageCount > 0 ? Math.round(ageSum / ageCount) : 0,
    bmiOver25: bmiOver25,
    bmiOver25Pct: Math.round(bmiOver25 / total * 100),
    counts: counts,
    rates: Object.fromEntries(Object.entries(counts).map(function(e) { return [e[0], Math.round(e[1] / total * 100)]; })),
    redQuartet: redQuartet,
    redTrio: redTrio,
    redTotal: redQuartet + redTrio,
    yellow: yellow
  };
}

// Admin用: 全社健診分析 + AI 3パターン提案
router.get('/company-analysis', authAdmin, async (req, res) => {
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

    // 全ファイルからデータ取得（合計のみ）
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

    var branches = [];

    // キャッシュ保存（参考資料として）
    try {
      var cacheText = `従業員${summary.total}名 平均${summary.averageAge}歳\nBMI25↑:${summary.bmiOver25Pct}% 肥満:${summary.rates.肥満}% 高血圧:${summary.rates.高血圧}% 脂質異常:${summary.rates.脂質異常}% 高血糖:${summary.rates.高血糖}% 肝機能:${summary.rates.肝機能}% 腎機能:${summary.rates.腎機能}% 貧血:${summary.rates.貧血}%`;
      const db = getDb();
      db.prepare("INSERT OR REPLACE INTO system_cache (key, data, updated_at) VALUES ('checkup_summary', ?, datetime('now'))").run(cacheText);
    } catch(e) {}

    // 時系列データも取得（最新以外の年度フォルダ）
    var timeline = [];
    for (var yf of yearFolders) {
      try {
        var yFiles = yf === latestFolder ? xlsmFiles : await findCheckupFiles(token, yf.id, 0);
        if (yFiles.length === 0) continue;
        var yData = [];
        for (var yFile of yFiles) {
          try {
            var yBuf = await boxDownloadFile(token, yFile.id);
            yData = yData.concat(extractAllCheckupData(yBuf));
          } catch(e) {}
        }
        var ySummary = aggregateCheckupData(yData);
        if (ySummary) timeline.push({ year: yf.name, summary: ySummary });
      } catch(e) {}
    }
    timeline.sort(function(a, b) { return a.year.localeCompare(b.year); });

    // AI簡易プラン提案（3つ、タイトルと1行概要のみ）
    var aiPlans = null;
    try {
      const { callAIWithFallback } = require('../services/ai');
      // 経年変化の情報も渡す
      var tlText = timeline.map(function(t) {
        return t.year + ': 🔴' + (t.summary.redTotal||0) + ' 🟡' + (t.summary.yellow||0) + ' BMI25↑' + t.summary.bmiOver25Pct + '% 高血圧' + (t.summary.rates.高血圧||0) + '% 脂質' + (t.summary.rates.脂質異常||0) + '% 高血糖' + (t.summary.rates.高血糖||0) + '%';
      }).join('\n');
      var prompt = `あなたは中小運送会社の健康推進を支援する産業保健コンサルタントです。
以下の全社健診データを分析し、健康推進メンバー（医療の素人）が理解できる具体的な施策案を3つ提案してください。

■ 会社情報
業種: 運輸業（トラックドライバー中心）
従業員数: ${summary.total}名 / 平均年齢: ${summary.averageAge}歳

■ 最新年度の健診結果
レッドカード（死の四重奏＋三重奏）: ${summary.redTotal||0}名
イエローカード（予備軍）: ${summary.yellow||0}名
BMI25以上: ${summary.bmiOver25Pct}%
肥満: ${summary.rates.肥満}% / 高血圧: ${summary.rates.高血圧}% / 脂質異常: ${summary.rates.脂質異常}%
高血糖: ${summary.rates.高血糖}% / 肝機能: ${summary.rates.肝機能}% / 腎機能: ${summary.rates.腎機能}% / 貧血: ${summary.rates.貧血}%

■ 経年推移
${tlText}

■ 出力ルール
- JSON配列のみ出力（説明文不要）
- 3案それぞれに以下の5項目を含める
- 各項目は具体的かつ詳細に。ドライバーの生活実態（長時間運転、コンビニ食中心、不規則な生活）を踏まえた実践的な内容にする

title: 施策名（例：「コンビニ食で始める減塩チャレンジ」）
why: この施策が必要な理由。健診データの具体的な数値を引用し、放置した場合のリスクもわかりやすく説明する（80〜120字）
who: 対象者と優先度（例：「レッドカード29名を最優先、イエローカード100名も段階的に参加」）（30〜50字）
what: 具体的な実施内容。「いつ・何を・どうやるか」をステップで示す（100〜150字）
effect: 期待される効果と達成の目安（例：「3ヶ月で脂質異常率5%低下、6ヶ月で再検査受診率80%達成を目指す」）（50〜80字）`;
      var aiRes = await callAIWithFallback('産業保健コンサルタントとして、指定されたJSON配列形式のみを出力してください。', prompt);
      if (aiRes) {
        var m = aiRes.match(/\[[\s\S]*\]/);
        if (m) aiPlans = JSON.parse(m[0]);
      }
    } catch(e) { console.log('AI簡易提案エラー:', e.message); }

    res.json({ success: true, year: latestFolder.name, summary: summary, branches: branches, timeline: timeline, aiPlans: aiPlans });
  } catch (e) {
    console.error('全社健診分析エラー:', e.message);
    res.json({ success: false, msg: e.message });
  }
});

// ===== 食事×健診 因果分析 =====
router.post('/food-correlation', authUser, async (req, res) => {
  try {
    const { checkupData } = req.body;
    if (!checkupData || !Array.isArray(checkupData) || checkupData.length === 0) {
      return res.json({ success: false, msg: '健診データが必要です' });
    }
    const uid = req.user.uid;
    const db = getDb();

    // 食事データ: 直近3ヶ月の栄養スコア平均を算出
    const foodPosts = db.prepare(
      "SELECT nutrition_scores, created_at FROM posts WHERE user_id = ? AND category LIKE '%食事%' AND nutrition_scores IS NOT NULL AND created_at >= datetime('now', '-3 months') ORDER BY created_at DESC"
    ).all(uid);

    if (foodPosts.length < 3) {
      return res.json({ success: false, msg: '食事データが不足しています（最低3食分必要）。食事写真の投稿を続けてください。' });
    }

    // 栄養平均計算（旧形式対応）
    const keys = ['calories','protein','fat','carbs','vitamin','mineral','fiber','salt','alcohol'];
    const units = {calories:'kcal',protein:'g',fat:'%',carbs:'%',vitamin:'g',mineral:'mg',fiber:'g',salt:'g',alcohol:'g'};
    const targets = {calories:550,protein:20,fat:25,carbs:57.5,vitamin:120,mineral:227,fiber:7,salt:2.5,alcohol:20};
    const sums = {}, counts = {};
    keys.forEach(k => { sums[k] = 0; counts[k] = 0; });

    foodPosts.forEach(p => {
      try {
        let sc = JSON.parse(p.nutrition_scores);
        const isLegacy = (typeof sc.protein === 'number' && sc.protein <= 5 && !sc.calories);
        if (isLegacy) {
          sc = {
            calories:{value:300+(sc.protein||3)*70}, protein:{value:(sc.protein||3)*5},
            fat:{value:15+(sc.fat||3)*3}, carbs:{value:35+(sc.carbs||sc.carb||3)*6},
            vitamin:{value:(sc.vitamin||3)*30}, mineral:{value:(sc.mineral||3)*55},
            fiber:{value:(sc.vitamin||3)*1.5}, salt:{value:4.0-(sc.salt||3)*0.5},
            alcohol:{value:0}
          };
        }
        keys.forEach(k => {
          const v = sc[k];
          const num = (v && typeof v === 'object') ? Number(v.value) : Number(v);
          if (!isNaN(num) && num > 0) { sums[k] += num; counts[k]++; }
        });
      } catch(e) {}
    });

    const avgNutrition = {};
    keys.forEach(k => {
      if (counts[k] > 0) {
        avgNutrition[k] = { value: Math.round(sums[k] / counts[k] * 10) / 10, unit: units[k], target: targets[k] };
      }
    });

    // 最新の健診データを使用
    const latestCheckup = checkupData[0];

    // AI因果分析
    const { callAIWithFallback, EVIDENCE_BASE } = require('../services/ai');
    const user = db.prepare('SELECT nickname FROM users WHERE id = ?').get(uid);
    const nickname = user ? user.nickname : 'ユーザー';

    const prompt = `${EVIDENCE_BASE}

あなたはAIヘルスアドバイザーです。${nickname}さんの健康診断結果と食事データの因果関係を分析してください。

【最新の健診結果（${latestCheckup.year || '最新'}年度）】
${Object.entries(latestCheckup).filter(([k]) => k !== 'year' && k !== 'rawData').map(([k,v]) => `${k}: ${v}`).join('\n')}

【食事データ（直近${foodPosts.length}食の1食平均）】
${Object.entries(avgNutrition).map(([k,v]) => `${k}: ${v.value}${v.unit} (目標: ${v.target}${v.unit})`).join('\n')}

【分析ルール】
マークダウン記法は使わない。強調は【】で囲む。

以下の形式で分析してください:

1. 総合評価（2〜3文で食事と健診の全体的な関連を述べる）

2. 因果関係の指摘（該当するもの全て）
   各項目について:
   - 食事データの何が原因か（具体的な数値と目標値の乖離）
   - 健診結果のどの数値に影響しているか
   - エビデンス（どのガイドラインに基づく判断か）

   以下の組み合わせを重点的に分析:
   - 塩分過剰 → 血圧（収縮期/拡張期）
   - 脂質過剰 → LDLコレステロール、中性脂肪
   - カロリー過剰 → BMI、腹囲、肥満判定
   - 炭水化物/糖質 → HbA1c、血糖値
   - アルコール過剰 → γ-GTP、肝機能
   - 食物繊維不足 → 血糖値上昇、便秘
   - 野菜・カルシウム不足 → 貧血、腎機能

3. 改善アクション（優先度順に3つ）
   各アクションは:
   - 【具体的な食事変更】（例: 「味噌汁を1日1杯に減らす」）
   - 【期待される健診値の改善】（例: 「収縮期血圧-5〜10mmHg」）
   - 【根拠】（ガイドライン名）

4. 次回健診での目標値
   改善が見込まれる項目の具体的目標数値を設定

5. 📚 出典: 参照したガイドライン一覧`;

    const aiResult = await callAIWithFallback('健診×食事因果分析を行ってください', prompt);
    if (!aiResult) throw new Error('AI分析失敗');

    res.json({
      success: true,
      analysis: aiResult,
      foodSummary: avgNutrition,
      foodCount: foodPosts.length,
      checkupYear: latestCheckup.year || '最新'
    });

  } catch (e) {
    console.error('因果分析エラー:', e.message);
    res.json({ success: false, msg: '分析に失敗しました: ' + e.message });
  }
});

module.exports = router;
