const express = require('express');
const { chatWithNurse, getNurseGreeting, chatWithNurseImage } = require('../services/ai');
const { getDb } = require('../services/db');

const router = express.Router();

// AIヘルスアドバイザーチャット
router.post('/message', async (req, res) => {
  const { userMessage, history, userName } = req.body;
  const result = await chatWithNurse(userMessage, history, userName);
  res.json(result);
});

// AIヘルスアドバイザー初回挨拶
router.post('/greeting', async (req, res) => {
  const { userName } = req.body;
  const result = await getNurseGreeting(userName);
  res.json(result);
});

// AIヘルスアドバイザー画像付きチャット
router.post('/image-message', async (req, res) => {
  const { userMessage, imageBase64, mimeType, history, userName } = req.body;
  const result = await chatWithNurseImage(userMessage, imageBase64, mimeType, history, userName);
  res.json(result);
});

// 健康診断結果 Step1: 画像からOCR抽出のみ（DBに保存しない）
router.post('/checkup-extract', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.json({ success: false, msg: '画像データがありません' });

    const { callGeminiVision } = require('../services/ai');

    const extractPrompt = `あなたは健康診断結果の読み取り専門AIです。
送られた画像（健康診断結果通知書、血液検査結果など）から、以下の項目を可能な限り読み取り、JSON形式で出力してください。

読み取り対象項目:
- height（身長cm）, weight（体重kg）, bmi, waist（腹囲cm）
- bp_sys（収縮期血圧）, bp_dia（拡張期血圧）
- glucose（空腹時血糖mg/dL）, hba1c（HbA1c%）
- tg（中性脂肪mg/dL）, hdl（HDLコレステロールmg/dL）, ldl（LDLコレステロールmg/dL）
- ast（AST/GOT U/L）, alt（ALT/GPT U/L）, ggt（γ-GTP U/L）
- uric（尿酸mg/dL）, egfr（eGFR mL/min）
- rbc（赤血球万/μL）, hb（ヘモグロビンg/dL）, wbc（白血球/μL）

出力形式（読み取れない項目はnull）:
{"height":170,"weight":68,"bmi":23.5,"bp_sys":128,...}

JSONのみ出力し、それ以外のテキストは一切出力しないでください。`;

    const extracted = await callGeminiVision(extractPrompt, imageBase64, mimeType);
    if (!extracted || extracted === '通信エラー') {
      return res.json({ success: false, msg: '画像の読み取りに失敗しました。鮮明な写真で再度お試しください。' });
    }

    let data = {};
    try {
      const jsonMatch = extracted.match(/\{[\s\S]*\}/);
      if (jsonMatch) data = JSON.parse(jsonMatch[0]);
    } catch (e) {
      return res.json({ success: false, msg: '数値の抽出に失敗しました。写真を撮り直してください。' });
    }

    res.json({ success: true, data });
  } catch (e) {
    console.error('Checkup extract error:', e.message);
    res.json({ success: false, msg: 'エラーが発生しました' });
  }
});

// 健康診断結果 Step2: 確認済み数値から解説生成（DBに保存しない）
router.post('/checkup-advise', async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.json({ success: false, msg: 'データがありません' });

    const { callGroqApi, EVIDENCE_BASE } = require('../services/ai');

    const advicePrompt = `あなたは健康診断結果をわかりやすく解説する保健師AIです。

${EVIDENCE_BASE}

## 基準値（特定健診）
- BMI: 18.5〜24.9が正常
- 血圧: 収縮期130未満/拡張期85未満が正常、140/90以上は高血圧
- 空腹時血糖: 100未満が正常、110以上は要注意、126以上は糖尿病域
- HbA1c: 5.6%未満が正常、6.0%以上は要注意、6.5%以上は糖尿病域
- 中性脂肪: 150未満が正常
- HDL: 40以上が正常（高いほど良い）
- LDL: 120未満が正常、140以上は高値
- AST/ALT: 31以上は要注意
- γ-GTP: 男性51以上/女性31以上は要注意
- 尿酸: 7.0以下が正常
- eGFR: 60以上が正常、45未満は要精査

## 出力ルール
1. まず各項目を「✅正常」「⚠️要注意」「🔴要受診」で判定し一覧表示
2. 特に注意すべき項目をピックアップして、わかりやすく解説
3. 生活改善のアドバイスを具体的に3つ提案（ナッジ技法を活用、スモールステップで）
4. 医療機関受診が必要な場合は明確に伝える
5. 専門用語は避け、一般の方にもわかる言葉で
6. 400〜600字程度で簡潔に`;

    const userMsg = `以下の健康診断結果を解説してください:\n${JSON.stringify(data, null, 2)}`;
    const advice = await callGroqApi(advicePrompt, userMsg);

    res.json({ success: true, advice: advice.reply || advice });
  } catch (e) {
    console.error('Checkup advise error:', e.message);
    res.json({ success: false, msg: 'エラーが発生しました' });
  }
});

// ナレッジベースAIボット
router.post('/knowledge', async (req, res) => {
  const { question } = req.body;
  if (!question) return res.json({ success: false, reply: '質問を入力してください' });
  try {
    const { EVIDENCE_BASE } = require('../services/ai');
    const sys = `あなたは健康経営の知識を分かりやすく教えるAIアシスタントです。
健康推進メンバー（専門知識を持たない一般社員）からの質問に、以下のエビデンスに基づいて回答してください。

# 知識ベース
${EVIDENCE_BASE}

# 追加知識
- ナッジ（Nudge）: 強制せず、望ましい行動にそっと誘導する手法（2017年ノーベル経済学賞）
- EAST: Easy（簡単）・Attractive（魅力的）・Social（社会的）・Timely（タイムリー）
- CAN: Convenient（便利）・Attractive（魅力的）・Normative（当たり前に）
- MINDSPACE: Messenger・Incentives・Norms・Defaults・Salience・Priming・Affect・Commitments・Ego
- COM-Bモデル: Capability（能力）・Opportunity（機会）・Motivation（動機）→ Behavior（行動）
- スモールステップ: 目標を極限まで分解し確実にクリアできる小さな階段
- フレイル: 加齢による心身の虚弱、低栄養・筋力低下・社会参加減少が3要素

# 回答のルール
1. 専門用語は必ず平易な言葉で言い換えるか、括弧で説明を添える
2. 具体的な数値や例を入れて実践イメージが湧くように
3. エビデンスのない助言はしない
4. 出典を簡潔に括弧で付記する
5. 3〜5文程度で簡潔に回答
6. 温かく親しみやすいトーンで`;
    const reply = await require('../services/ai').callGroqApi(sys, question);
    res.json({ success: true, reply: reply || '申し訳ありません、回答を生成できませんでした。' });
  } catch (e) {
    res.json({ success: false, reply: 'エラーが発生しました: ' + e.message });
  }
});

// メモ保存
router.post('/save-memo', (req, res) => {
  try {
    const { uid, memoText, sourceMessage } = req.body;
    if (!uid || !memoText) return res.json({ success: false, msg: 'uid and memoText required' });
    const db = getDb();
    const stmt = db.prepare('INSERT INTO chat_memos (user_id, memo_text, source_message) VALUES (?, ?, ?)');
    const result = stmt.run(uid, memoText, sourceMessage || '');
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// メモ一覧取得
router.get('/memos/:uid', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM chat_memos WHERE user_id = ? ORDER BY created_at DESC').all(req.params.uid);
    res.json({ success: true, memos: rows });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// メモ削除
router.post('/delete-memo', (req, res) => {
  try {
    const { memoId } = req.body;
    if (!memoId) return res.json({ success: false, msg: 'memoId required' });
    const db = getDb();
    db.prepare('DELETE FROM chat_memos WHERE id = ?').run(memoId);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

module.exports = router;
