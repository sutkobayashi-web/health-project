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

// バディーチャット履歴保存
router.post('/buddy-history', (req, res) => {
  try {
    const { uid, role, content } = req.body;
    if (!uid || !role || !content) return res.json({ success: false, msg: 'uid, role, content required' });
    const db = getDb();
    db.prepare('INSERT INTO buddy_messages (user_id, role, content) VALUES (?, ?, ?)').run(uid, role, content);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// バディーチャット当日履歴取得
router.get('/buddy-history/:uid', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(
      "SELECT role, content, created_at FROM buddy_messages WHERE user_id = ? AND date(created_at) = date('now') ORDER BY id ASC"
    ).all(req.params.uid);
    res.json({ success: true, messages: rows });
  } catch (e) {
    res.json({ success: false, msg: e.message });
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
