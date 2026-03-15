const express = require('express');
const { chatWithNurse, getNurseGreeting, chatWithNurseImage } = require('../services/ai');

const router = express.Router();

// AI保健師チャット
router.post('/message', async (req, res) => {
  const { userMessage, history, userName } = req.body;
  const result = await chatWithNurse(userMessage, history, userName);
  res.json(result);
});

// AI保健師初回挨拶
router.post('/greeting', async (req, res) => {
  const { userName } = req.body;
  const result = await getNurseGreeting(userName);
  res.json(result);
});

// AI保健師画像付きチャット
router.post('/image-message', async (req, res) => {
  const { userMessage, imageBase64, mimeType, history, userName } = req.body;
  const result = await chatWithNurseImage(userMessage, imageBase64, mimeType, history, userName);
  res.json(result);
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

module.exports = router;
