const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDb } = require('../services/db');
const { authUser } = require('../middleware/auth');
const { callGeminiVision } = require('../services/ai');

// テーブル作成
try {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS blood_pressure (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    systolic INTEGER NOT NULL,
    diastolic INTEGER NOT NULL,
    pulse INTEGER,
    measured_at TEXT DEFAULT (datetime('now')),
    image_url TEXT,
    memo TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
} catch(e) { console.error('BP table init:', e.message); }

// 血圧計OCR読取り
router.post('/ocr', authUser, async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64 || !mimeType) return res.json({ success: false, msg: '画像データが必要です' });

    const systemPrompt = `あなたは血圧計の液晶表示を読み取る専門AIです。
画像に表示されている血圧計の数値を正確に読み取ってください。

【出力ルール】
- 必ず以下のJSON形式のみを出力してください。前後に説明文を付けないこと。
- 読み取れない項目はnullにしてください。
- systolic=最高血圧(上)、diastolic=最低血圧(下)、pulse=脈拍数

{"systolic": 数値またはnull, "diastolic": 数値またはnull, "pulse": 数値またはnull, "confidence": "high"または"medium"または"low", "note": "補足(読み取りにくい場合等)"}

【注意】
- 血圧計以外の画像の場合: {"systolic": null, "diastolic": null, "pulse": null, "confidence": "low", "note": "血圧計の画像ではありません"}
- 数値が部分的にしか見えない場合もできるだけ推定してください`;

    const result = await callGeminiVision(systemPrompt, imageBase64, mimeType);

    // JSONを抽出
    let parsed = null;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {}

    if (parsed && (parsed.systolic !== null || parsed.diastolic !== null)) {
      res.json({ success: true, data: parsed });
    } else {
      res.json({ success: false, msg: '数値を読み取れませんでした。手入力してください。', data: parsed });
    }
  } catch (e) {
    console.error('BP OCR error:', e.message);
    res.json({ success: false, msg: 'エラー: ' + e.message });
  }
});

// 血圧データ保存
router.post('/save', authUser, async (req, res) => {
  try {
    const { uid, systolic, diastolic, pulse, memo, imageBase64, mimeType } = req.body;
    if (!uid || !systolic || !diastolic) return res.json({ success: false, msg: '上・下の血圧値は必須です' });

    const db = getDb();

    // 画像保存（任意）
    let imageUrl = '';
    if (imageBase64 && mimeType) {
      try {
        const crypto = require('crypto');
        const uploadDir = process.env.UPLOAD_DIR || './uploads';
        const fileName = 'bp_' + crypto.randomBytes(8).toString('hex') + '.jpg';
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, Buffer.from(imageBase64, 'base64'));
        imageUrl = `/uploads/${fileName}`;
      } catch (e) { imageUrl = ''; }
    }

    db.prepare(`INSERT INTO blood_pressure (user_id, systolic, diastolic, pulse, memo, image_url) VALUES (?,?,?,?,?,?)`)
      .run(uid, systolic, diastolic, pulse || null, memo || '', imageUrl);

    res.json({ success: true });
  } catch (e) {
    console.error('BP save error:', e.message);
    res.json({ success: false, msg: e.message });
  }
});

// 血圧履歴取得
router.get('/history/:uid', authUser, (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`SELECT * FROM blood_pressure WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`).all(req.params.uid);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

module.exports = router;
