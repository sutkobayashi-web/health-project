const express = require('express');
const { chatWithNurse, getNurseGreeting, chatWithNurseImage, callGeminiVision } = require('../services/ai');
const { getDb } = require('../services/db');

const router = express.Router();

// AIヘルスアドバイザーチャット
router.post('/message', async (req, res) => {
  const { userMessage, history, userName } = req.body;
  const result = await chatWithNurse(userMessage, history, userName);
  // アクティブなチャレンジ情報を付与（フロントでチャレンジ言及検知に使用）
  try {
    const db = getDb();
    const activeChallenges = db.prepare("SELECT challenge_id, title FROM challenges WHERE status = 'active' LIMIT 3").all();
    result.activeChallenges = activeChallenges;
  } catch(e) { result.activeChallenges = []; }
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

// 野菜スコアリング（写真→AI判定）
router.post('/veggie-score', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.json({ success: false, msg: '画像が必要です' });

    const prompt = `この食事写真の野菜と栄養バランスを分析してください。JSON形式のみ返してください。

{
  "hasVeggies": true/false,
  "veggieList": ["野菜名1", "野菜名2", ...],
  "veggieCount": 野菜の種類数(数値),
  "score": 0-3のスコア(0=野菜なし, 1=少量/1種, 2=まあまあ/1-2種, 3=豊富/3種以上),
  "saltEstimate": 推定塩分量(g数値。例: 2.5),
  "saltLevel": "low/normal/high"(目標1食2.5g未満: low=1.5g以下, normal=1.5-2.5g, high=2.5g超),
  "saltSources": ["塩分が多い要因1", "要因2"],
  "calories": 推定カロリー(kcal数値),
  "comment": "野菜と塩分に関する一言コメント(25文字以内)"
}

必ず有効なJSONのみ返してください。`;

    const result = await callGeminiVision(prompt, imageBase64, mimeType || 'image/jpeg');
    if (!result) return res.json({ success: false, msg: 'AI判定に失敗しました' });

    try {
      const jsonStr = result.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      res.json({ success: true, ...parsed });
    } catch (e) {
      res.json({ success: true, hasVeggies: false, veggieList: [], veggieCount: 0, score: 0, comment: '判定できませんでした' });
    }
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 当日の食事投稿から野菜スコアを取得
router.get('/veggie-from-posts/:uid', (req, res) => {
  try {
    const db = getDb();
    const posts = db.prepare(
      "SELECT content, analysis FROM posts WHERE user_id = ? AND (category = '🍱 食事・栄養' OR image_url IS NOT NULL) AND date(created_at) = date('now') ORDER BY created_at DESC"
    ).all(req.params.uid);

    if (!posts.length) return res.json({ success: true, found: false, msg: '今日の食事投稿がありません' });

    // 最新の食事投稿のAI分析から野菜情報を抽出
    var bestScore = 0;
    var veggieInfo = '';
    posts.forEach(function(p) {
      var analysis = p.analysis || p.content || '';
      // 簡易判定: 野菜関連キーワードの数でスコア推定
      var veggieWords = ['野菜', 'サラダ', 'トマト', 'キャベツ', 'レタス', 'ほうれん草', 'ブロッコリー', 'にんじん', '大根', 'きゅうり', 'ピーマン', 'なす', '玉ねぎ', 'もやし', '小松菜', 'かぼちゃ', 'アスパラ', 'セロリ', 'パプリカ', 'ごぼう', '白菜', 'おくら', '枝豆'];
      var found = veggieWords.filter(function(w) { return analysis.indexOf(w) !== -1; });
      var score = found.length >= 3 ? 3 : found.length >= 1 ? 2 : 0;
      if (score > bestScore) { bestScore = score; veggieInfo = found.join('、'); }
    });

    res.json({ success: true, found: true, score: bestScore, veggieInfo: veggieInfo, postCount: posts.length });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// チャレンジ反応を保存（UPSERT）
router.post('/challenge-reaction', (req, res) => {
  try {
    const { uid, challengeId, reaction } = req.body;
    if (!uid || !challengeId || !reaction) return res.json({ success: false, msg: 'missing params' });
    const db = getDb();
    db.prepare(`INSERT INTO challenge_reactions (user_id, challenge_id, reaction)
      VALUES (?, ?, ?) ON CONFLICT(user_id, challenge_id) DO UPDATE SET reaction = ?, created_at = datetime('now')`)
      .run(uid, challengeId, reaction, reaction);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// チャレンジ反応集計
router.get('/challenge-reactions/:challengeId', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(
      'SELECT reaction, COUNT(*) as count FROM challenge_reactions WHERE challenge_id = ? GROUP BY reaction'
    ).all(req.params.challengeId);
    const total = rows.reduce((s, r) => s + r.count, 0);
    res.json({ success: true, reactions: rows, total });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// バディーチャット履歴削除
router.post('/buddy-history/clear', (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.json({ success: false, msg: 'uid required' });
    const db = getDb();
    db.prepare("DELETE FROM buddy_messages WHERE user_id = ?").run(uid);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// デイリーグリーティング（今日は何の日 + 天気 + 季節の健康トピック）
let _dailyGreetingCache = { date: '', data: null };

router.get('/daily-greeting', async (req, res) => {
  try {
    // 日本時間で日付を取得
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });

    // 当日キャッシュがあればそのまま返す
    if (_dailyGreetingCache.date === today && _dailyGreetingCache.data) {
      return res.json({ success: true, ..._dailyGreetingCache.data });
    }

    // 天気取得（静岡）
    let weatherText = '';
    const weatherKey = process.env.OPENWEATHER_API_KEY;
    if (weatherKey) {
      try {
        const lat = process.env.WEATHER_LAT || '34.98';
        const lon = process.env.WEATHER_LON || '138.38';
        const wRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherKey}&units=metric&lang=ja`
        );
        if (wRes.ok) {
          const w = await wRes.json();
          const desc = w.weather[0].description;
          const temp = Math.round(w.main.temp);
          const tempMax = Math.round(w.main.temp_max);
          const tempMin = Math.round(w.main.temp_min);
          const humidity = w.main.humidity;
          const cityName = process.env.WEATHER_CITY || '静岡';
          weatherText = `${cityName}の天気: ${desc} ${temp}℃（最高${tempMax}℃/最低${tempMin}℃）湿度${humidity}%`;
        }
      } catch (e) { console.log('[Weather] fetch error:', e.message); }
    }

    // AIで今日の話題を生成
    const { callAIWithFallback } = require('../services/ai');
    const d = new Date();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekday = ['日','月','火','水','木','金','土'][d.getDay()];
    const dateStr = `${month}月${day}日（${weekday}）`;

    const weatherField = weatherText
      ? `\n  "weather": "天気と気温を絵文字付きで15文字以内にまとめる",`
      : '';
    const weatherInstruction = weatherText ? '\n天気情報: ' + weatherText : '';

    const prompt = `今日は${dateStr}です。${weatherInstruction}

以下を簡潔に生成してください。JSON形式で返してください。

{
  "dateInfo": "${dateStr}の記念日や歴史的出来事を1つ選び、20文字以内で紹介（例: 三ツ矢の日🥤）",
  "dateFact": "その記念日・出来事の簡単な説明を30文字以内で",${weatherField}
  "healthTip": "今の季節に合った健康アドバイスを40文字以内で1つ。具体的な行動を提案"
}

必ず有効なJSONのみ返してください。コードブロックや説明は不要です。weatherフィールドがない場合は天気情報を生成しないでください。`;

    const aiResult = await callAIWithFallback(
      'あなたは日本の記念日・歴史に詳しいアシスタントです。正確な情報を簡潔に返してください。',
      prompt
    );

    let parsed = { dateInfo: dateStr, dateFact: '', weather: '', healthTip: '' };
    if (aiResult) {
      try {
        const jsonStr = aiResult.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        console.log('[DailyGreeting] JSON parse error, using fallback');
        parsed.dateInfo = dateStr;
      }
    }

    const result = {
      dateStr: dateStr,
      dateInfo: parsed.dateInfo || dateStr,
      dateFact: parsed.dateFact || '',
      weather: parsed.weather || '',
      healthTip: parsed.healthTip || '',
      weatherRaw: weatherText
    };

    _dailyGreetingCache = { date: today, data: result };
    res.json({ success: true, ...result });
  } catch (e) {
    console.log('[DailyGreeting] error:', e.message);
    const d = new Date();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekday = ['日','月','火','水','木','金','土'][d.getDay()];
    res.json({ success: true, dateStr: `${month}月${day}日（${weekday}）`, dateInfo: '', dateFact: '', weather: '', healthTip: '' });
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
