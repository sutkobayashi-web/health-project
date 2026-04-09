const express = require('express');
const { chatWithBuddy, getBuddyGreeting, chatWithBuddyImage, chatWithNurse, getNurseGreeting, chatWithNurseImage, callGeminiVision } = require('../services/ai');
const { authUser } = require('../middleware/auth');
const { getDb } = require('../services/db');

const router = express.Router();

// ヘルスバディーチャット
router.post('/message', authUser, async (req, res) => {
  const { userMessage, history, userName, buddyType, buddyName } = req.body;
  const uid = req.user.uid;
  console.log('[buddy/message] uid=' + uid + ' msg="' + (userMessage || '').substring(0, 100) + '"');

  // ユーザーの食事・相談データを収集してコンテキストに含める
  let userDataContext = '';
  try {
    const db = getDb();

    // 直近10食の食事データ
    const recentMeals = db.prepare(`
      SELECT content, nutrition_scores, created_at FROM posts
      WHERE user_id = ? AND category LIKE '%食事%' AND nutrition_scores IS NOT NULL
      ORDER BY created_at DESC LIMIT 10
    `).all(uid);

    if (recentMeals.length > 0) {
      // 最近の食事メニュー一覧
      const menuList = recentMeals.slice(0, 5).map(m => {
        const d = new Date(m.created_at + 'Z');
        const dateStr = (d.getMonth()+1) + '/' + d.getDate();
        return dateStr + ': ' + (m.content || '').substring(0, 50);
      }).join('\n');

      // 栄養傾向の計算
      const targets = { calories: 550, protein: 20, fat: 25, carbs: 57.5, vitamin: 120, salt: 2.5, fiber: 6, alcohol: 0 };
      const sums = {};
      let count = 0;
      recentMeals.forEach(m => {
        try {
          const ns = typeof m.nutrition_scores === 'string' ? JSON.parse(m.nutrition_scores) : m.nutrition_scores;
          if (!ns) return;
          count++;
          Object.keys(targets).forEach(k => {
            if (ns[k] && ns[k].value !== undefined) sums[k] = (sums[k] || 0) + ns[k].value;
          });
        } catch(e) {}
      });

      let trendText = '';
      if (count >= 2) {
        Object.keys(targets).forEach(k => {
          if (sums[k] === undefined) return;
          const avg = Math.round(sums[k] / count * 10) / 10;
          const target = targets[k];
          const ratio = avg / target;
          let status = '適量';
          if (ratio > 1.2) status = '多め';
          if (ratio > 1.5) status = '過剰傾向';
          if (ratio < 0.7) status = '不足傾向';
          if (ratio < 0.5) status = '不足';
          const labels = { calories:'カロリー', protein:'たんぱく質', fat:'脂質', carbs:'炭水化物', vitamin:'野菜量', salt:'塩分', fiber:'食物繊維', alcohol:'アルコール' };
          trendText += `${labels[k]||k}: 平均${avg}（目安${target}）→ ${status}\n`;
        });
      }

      userDataContext += `\n# この社員の食事データ（直近${recentMeals.length}食）\n`;
      userDataContext += `## 最近の食事\n${menuList}\n`;
      if (trendText) userDataContext += `## 栄養傾向\n${trendText}`;
    }

    // 直近の相談・投稿（食事以外）
    const recentConsults = db.prepare(`
      SELECT content, category, created_at FROM posts
      WHERE user_id = ? AND category NOT LIKE '%食事%' AND content IS NOT NULL
      ORDER BY created_at DESC LIMIT 5
    `).all(uid);

    if (recentConsults.length > 0) {
      userDataContext += `\n# この社員の最近の相談・投稿\n`;
      recentConsults.forEach(c => {
        const d = new Date(c.created_at + 'Z');
        const dateStr = (d.getMonth()+1) + '/' + d.getDate();
        userDataContext += `- ${dateStr} [${c.category||''}]: ${(c.content||'').substring(0, 80)}\n`;
      });
    }

    // 最新の週次食事レポート
    const weeklyReport = db.prepare(`
      SELECT report_text, week_start, week_end FROM food_weekly_reports
      WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(uid);

    if (weeklyReport) {
      userDataContext += `\n# 最新の週次食事分析（${weeklyReport.week_start}〜${weeklyReport.week_end}）\n`;
      userDataContext += (weeklyReport.report_text || '').substring(0, 300) + '\n';
    }

    // 血圧データ
    try {
      const bpRows = db.prepare(`SELECT systolic, diastolic, pulse, measured_at FROM blood_pressure WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`).all(uid);
      if (bpRows.length > 0) {
        userDataContext += `\n# 血圧記録（直近${bpRows.length}件）\n`;
        let sSum = 0, dSum = 0;
        bpRows.forEach(r => {
          const d = (r.measured_at || '').substring(0, 10);
          userDataContext += `- ${d}: ${r.systolic}/${r.diastolic}${r.pulse ? ' 脈拍'+r.pulse : ''}\n`;
          sSum += r.systolic; dSum += r.diastolic;
        });
        const sAvg = Math.round(sSum / bpRows.length);
        const dAvg = Math.round(dSum / bpRows.length);
        let level = '正常範囲';
        if (sAvg >= 140 || dAvg >= 90) level = '高血圧域（要注意）';
        else if (sAvg >= 130 || dAvg >= 85) level = 'やや高め';
        userDataContext += `平均: ${sAvg}/${dAvg} → ${level}\n`;
      }
    } catch(e) {}

  } catch(e) { /* データ取得失敗しても会話は続行 */ }

  const result = await chatWithBuddy(userMessage, history, userName, buddyType || 'gentle', buddyName || '', userDataContext);
  // アクティブなチャレンジ情報を付与（フロントでチャレンジ言及検知に使用）
  try {
    const db = getDb();
    const activeChallenges = db.prepare("SELECT challenge_id, title FROM challenges WHERE status = 'active' LIMIT 3").all();
    result.activeChallenges = activeChallenges;
  } catch(e) { result.activeChallenges = []; }

  // ★ エスカレーション検知: バディーが推進メンバーを紹介した場合、管理画面に自動通知
  try {
    if (result.reply && result.reply.indexOf('推進メンバー') !== -1) {
      const db = getDb();
      // 同一ユーザーの当日アラート重複防止
      const todayAlert = db.prepare(`SELECT post_id FROM posts WHERE user_id = ? AND category = '🚨 要対応アラート' AND created_at > datetime('now', '-12 hours')`).get(uid);
      if (!todayAlert) {
      const { v4: uuidv4 } = require('uuid');
      const { callAIWithFallback } = require('../services/ai');
      const user = db.prepare('SELECT nickname, avatar, department, birth_date FROM users WHERE id = ?').get(uid);

      // AIで会話を匿名要約（個人特定情報を除去）
      const recentChat = (history || []).slice(-6).map(m => (m.role === 'user' ? '社員: ' : 'バディー: ') + m.content).join('\n');
      const fullChat = recentChat + '\n社員: ' + userMessage + '\nバディー: ' + result.reply;
      const summaryPrompt = `以下の会話でバディーが推進メンバーへの相談を促しました。管理者向けに状況を匿名で要約してください。
【会話】
${fullChat}
【ルール】
- 個人名・日時は除く
- 「ある社員が〜」で始める
- 何が問題か、どの程度深刻かを2〜3文で簡潔に
- マークダウン不可`;

      const summary = await callAIWithFallback('あなたは管理者向けに社員の状況を匿名要約するアシスタントです。', summaryPrompt);
      if (summary) {
        const pid = 'alert_' + uuidv4().substring(0, 8);
        const analysis = `【要対応】バディーが推進メンバーへの相談を促しました。\n///SCORE///\n{"is_target":true,"legal":2,"risk":3,"freq":1,"urgency":4,"safety":3,"value":3,"needs":4}`;
        db.prepare(`INSERT INTO posts (post_id, user_id, content, analysis, nickname, avatar, status, category, department, birth_date)
          VALUES (?, ?, ?, ?, ?, ?, 'open', '🚨 要対応アラート', ?, ?)`).run(
          pid, uid, '【要対応】' + summary, analysis,
          '匿名の社員', '',
          user ? (user.department || '') : '', user ? (user.birth_date || '') : ''
        );
      }
      } // todayAlert check
    }
  } catch(e) { console.error('[escalation-alert]', e.message); }

  res.json(result);
});

// ヘルスバディー初回挨拶
router.post('/greeting', authUser, async (req, res) => {
  const { userName, buddyType, department } = req.body;
  const result = await getBuddyGreeting(userName, buddyType || 'gentle', department);
  res.json(result);
});

// ヘルスバディー画像付きチャット
router.post('/image-message', authUser, async (req, res) => {
  const { userMessage, imageBase64, mimeType, history, userName, buddyType } = req.body;
  const result = await chatWithBuddyImage(userMessage, imageBase64, mimeType, history, userName, buddyType || 'gentle');
  res.json(result);
});

// チャットメモ保存
router.post('/memo', authUser, (req, res) => {
  try {
    const { userId, messageText, memoText } = req.body;
    if (!userId || !messageText) return res.json({ success: false, msg: '必須項目が不足しています' });
    const db = getDb();
    db.prepare('INSERT INTO chat_memos (user_id, message_text, memo_text) VALUES (?, ?, ?)').run(userId, messageText, memoText || '');
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// チャットメモ取得
router.get('/memos/:userId', authUser, (req, res) => {
  try {
    const db = getDb();
    const memos = db.prepare('SELECT * FROM chat_memos WHERE user_id = ? ORDER BY created_at DESC').all(req.params.userId);
    res.json({ success: true, memos });
  } catch (e) {
    res.json({ success: false, memos: [] });
  }
});

// チャットメモ削除
router.post('/memo/delete', authUser, (req, res) => {
  try {
    const { memoId, userId } = req.body;
    const db = getDb();
    db.prepare('DELETE FROM chat_memos WHERE id = ? AND user_id = ?').run(memoId, userId);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// ナレッジベースAIボット
router.post('/knowledge', authUser, async (req, res) => {
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
      "SELECT role, content, created_at FROM buddy_messages WHERE user_id = ? AND date(created_at, '+9 hours') = date('now', '+9 hours') ORDER BY id ASC"
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
      "SELECT content, analysis FROM posts WHERE user_id = ? AND (category = '🍱 食事・栄養' OR image_url IS NOT NULL) AND date(created_at, '+9 hours') = date('now', '+9 hours') ORDER BY created_at DESC"
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

// 主要記念日データベース（正確性を担保するため静的データ）
const MEMORIAL_DAYS = {
  '1/1': ['元日 🎍', '新しい年の始まり。おせち料理で無病息災を願う'],
  '1/7': ['七草の日 🌿', '春の七草粥を食べて胃腸を休める風習'],
  '1/11': ['鏡開き 🍡', '正月の鏡餅を下げてお汁粉等にして食べる日'],
  '2/3': ['節分 👹', '豆まきで邪気を払い、恵方巻で福を呼ぶ'],
  '2/14': ['バレンタインデー 🍫', '1958年頃から日本でもチョコを贈る習慣が定着'],
  '2/22': ['猫の日 🐱', 'ニャン(2)ニャン(2)ニャン(2)の語呂合わせ'],
  '3/3': ['ひな祭り 🎎', '女の子の健やかな成長を祝う桃の節句'],
  '3/8': ['国際女性デー 💐', '1904年NY女性労働者デモが起源。ミモザの日とも'],
  '3/9': ['ありがとうの日 💝', 'サン(3)キュー(9)の語呂合わせで感謝を伝える日'],
  '3/14': ['ホワイトデー 🍬', '1978年全飴協が制定。お返しの日'],
  '3/20': ['春分の日 🌸', '昼と夜の長さがほぼ同じになる日。自然を称える'],
  '3/21': ['ランドセルの日 🎒', '3+2+1=6で小学校6年間を表す'],
  '3/27': ['さくらの日 🌸', '3×9(さくら)=27。日本さくらの会が制定'],
  '3/31': ['エッフェル塔の日 🗼', '1889年パリに完成。高さ312m、当時世界最高の建造物'],
  '4/1': ['エイプリルフール 🤡', '16世紀フランスの暦改正が起源とされる'],
  '4/2': ['世界自閉症啓発デー 💙', '2007年国連総会で制定。理解と支援を促進'],
  '4/4': ['あんパンの日 🍞', '1875年明治天皇に木村屋のあんパンを献上'],
  '4/7': ['世界保健デー 🏥', '1948年WHO設立記念日。毎年テーマを設定'],
  '4/10': ['駅弁の日 🍱', '4月は駅弁シーズン、十(10)は弁当の形に似ている'],
  '4/18': ['よい歯の日 🦷', 'よ(4)い(1)は(8)の語呂合わせ。日本歯科医師会制定'],
  '4/22': ['アースデー 🌍', '1970年米国で始まった地球環境を考える日'],
  '4/29': ['昭和の日 🇯🇵', '昭和天皇の誕生日。激動の昭和を顧み未来に思いを'],
  '5/1': ['メーデー 💪', '1886年シカゴの労働者が8時間労働を求めたのが起源'],
  '5/3': ['憲法記念日 📜', '1947年日本国憲法施行を記念する祝日'],
  '5/5': ['こどもの日 🎏', '端午の節句。子どもの健やかな成長を願う'],
  '5/8': ['世界赤十字デー ❤️', 'アンリ・デュナン生誕記念日。人道支援の日'],
  '5/9': ['アイスクリームの日 🍦', '1964年アイスクリーム協会が制定'],
  '5/31': ['世界禁煙デー 🚭', 'WHOが制定。たばこのない社会を目指す'],
  '6/1': ['衣替え 👔', '学校や企業で夏服に切り替える日'],
  '6/4': ['虫歯予防デー 🦷', 'む(6)し(4)の語呂合わせ。歯と口の健康週間開始'],
  '6/10': ['時の記念日 ⏰', '671年天智天皇が漏刻で時を知らせたことに由来'],
  '6/21': ['夏至 ☀️', '1年で最も昼が長い日。冬至と比べ約5時間差'],
  '7/7': ['七夕 🎋', '織姫と彦星が年に一度会える日。短冊に願いを'],
  '7/20': ['海の日 🌊', '海の恩恵に感謝し海洋国日本の繁栄を願う'],
  '7/28': ['世界肝炎デー 💛', 'WHOが制定。ウイルス性肝炎の啓発'],
  '8/1': ['水の日 💧', '水資源の大切さを考える日。国土交通省制定'],
  '8/6': ['広島原爆の日 🕊️', '1945年世界初の原爆投下。平和を祈る'],
  '8/11': ['山の日 ⛰️', '山に親しむ機会を得て山の恩恵に感謝する'],
  '8/15': ['終戦記念日 🕊️', '1945年ポツダム宣言受諾。戦没者を追悼'],
  '9/1': ['防災の日 🔔', '1923年関東大震災に由来。備えの確認を'],
  '9/9': ['救急の日 🚑', 'きゅう(9)きゅう(9)の語呂合わせ。応急手当の普及'],
  '9/15': ['老人の日 👴', '高齢者を敬い長寿を祝う日'],
  '9/23': ['秋分の日 🍁', '昼夜ほぼ等分。祖先を敬い亡き人を偲ぶ'],
  '10/1': ['コーヒーの日 ☕', '国際コーヒー機関が制定。新年度の始まり'],
  '10/10': ['目の愛護デー 👁️', '10.10を横にすると眉と目に見えることから'],
  '10/13': ['さつまいもの日 🍠', '栗(9里)より(4里)うまい13里の語呂合わせ'],
  '10/31': ['ハロウィン 🎃', 'ケルトの収穫祭が起源。仮装で悪霊を追い払う'],
  '11/3': ['文化の日 📚', '1946年日本国憲法公布。自由と平和を愛し文化を進める'],
  '11/8': ['いい歯の日 🦷', 'い(1)い(1)は(8)の語呂合わせ。日本歯科医師会制定'],
  '11/11': ['ポッキーの日 🍫', '1が4つ並んでポッキーに見える。グリコ制定'],
  '11/22': ['いい夫婦の日 💑', 'い(1)い(1)ふ(2)うふ(2)の語呂合わせ'],
  '11/23': ['勤労感謝の日 🙏', '勤労を尊び生産を祝い国民が感謝し合う'],
  '12/5': ['国際ボランティアデー 🤝', '1985年国連総会で制定。社会貢献を促進'],
  '12/21': ['冬至 🍊', '1年で最も夜が長い日。柚子湯とかぼちゃ'],
  '12/22': ['冬至（年による）🍊', '柚子湯に入りかぼちゃを食べて無病息災を願う'],
  '12/25': ['クリスマス 🎄', 'イエス・キリストの降誕を祝う日'],
  '12/31': ['大晦日 🔔', '1年の最後の日。年越し蕎麦で長寿を願う']
};

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

    // 季節に応じた健康TIPカテゴリ（月ベース）
    const seasonalTips = {
      spring: ['🌸 春野菜（菜の花、たけのこ、新玉ねぎ等）を使った献立提案', '🚶 春の散歩・ウォーキングのコツ', '😴 春の眠気対策と睡眠リズム調整法', '🤧 花粉症対策と免疫力アップの工夫', '🧘 新年度ストレス対策・リラックス法'],
      summer: ['🥒 夏バテ防止の食材・献立提案', '💧 水分補給・熱中症予防の具体策', '🌙 暑い夜の快眠テクニック', '🏊 夏にオススメの運動・クールダウン法', '🦠 食中毒予防・衛生管理'],
      autumn: ['🍠 秋の味覚で栄養バランスを整える提案', '🏃 運動の秋・始めやすいエクササイズ', '🌙 秋の夜長を活かした睡眠改善', '🍂 季節の変わり目の風邪予防', '👁️ 目の疲れ・VDT対策'],
      winter: ['🍲 冬の温活食材・鍋料理の栄養ポイント', '🧣 冬の冷え対策と血行改善ストレッチ', '😷 インフルエンザ・感染症予防', '🦷 歯と口の健康・噛む力アップ', '🧠 冬のメンタルケア・日光浴のススメ']
    };
    const season = month <= 2 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : month <= 10 ? 'autumn' : 'winter';
    const tips = seasonalTips[season];
    const todayTipCategory = tips[(day - 1) % tips.length];

    // 静的データベースから記念日を取得（正確性を保証）
    const memorialKey = `${month}/${day}`;
    const memorial = MEMORIAL_DAYS[memorialKey];

    // 健康TIPはAIで日替わり生成（記念日はAIに任せない）
    const prompt = `今日は${d.getFullYear()}年${month}月${day}日（${weekday}曜日）、季節は${season === 'spring' ? '春' : season === 'summer' ? '夏' : season === 'autumn' ? '秋' : '冬'}です。${weatherInstruction}

以下のJSON形式で返してください。

【出力例】
{${!memorial ? '\n  "dateInfo": "エイプリルフール 🤡",\n  "dateFact": "1564年フランスの暦改正が起源とされる説が有名",' : ''}${weatherField}
  "healthTip": "🌸 新玉ねぎの血液サラサラ効果！今夜はオニオンスープにしてみよう"
}

【あなたが返すJSON】
{${!memorial ? `\n  "dateInfo": "${month}月${day}日に実在する記念日・語呂合わせ・歴史的出来事を1つ。絵文字1つ付きで20文字以内",\n  "dateFact": "由来や背景を具体的に25〜35文字で",` : ''}${weatherField}
  "healthTip": "カテゴリ「${todayTipCategory}」から、今日すぐ実践できる具体的アドバイスを絵文字1つ付き35〜45文字。食材名・運動名・数値（○分、○g等）を含め、「〜してみよう」「〜がオススメ」調で"
}

【厳守ルール】
- healthTipは「体温調節に注意」「水分補給しよう」のような抽象的表現は禁止。具体的な食材名・行動・数値を必ず含める${!memorial ? '\n- dateInfoは実在する記念日のみ。架空の記念日を創作しない' : ''}
- 有効なJSONのみ返す。コードブロックや説明文は不要`;

    const aiResult = await callAIWithFallback(
      'あなたは健康アドバイザーです。季節と日付に合った具体的で実践的な健康アドバイスを返してください。',
      prompt
    );

    let parsed = { dateInfo: '', dateFact: '', weather: '', healthTip: '' };
    if (aiResult) {
      try {
        const jsonStr = aiResult.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        console.log('[DailyGreeting] JSON parse error, using fallback');
      }
    }

    // 記念日は静的データ優先（AIは信頼しない）

    // 好奇心ギャップ：「気になる一言」を生成
    const curiosityTemplates = [
      '今日のあなたの食事、ちょっと意外な発見があるかも…？',
      '今週のデータ見たら、面白いことわかったよ👀',
      '最近の食事パターン、あることに気づいたんだけど…',
      'みんなの中で、あなたの○○が���番変わってたよ',
      '今日のごはん見せてくれたら、あることを教えてあげる',
      '先週と今週、ある数字が全然違うんだけど、気づいた？',
      '今日の天気と食事、実は関係があるって知ってた？',
      '今月のあなた、先月と比べて…（続きはバディーで！）',
      '今週みんなが一番食べてるメニュー、当てられる？',
      'あなたの食事傾向、ある有名人と似てるかも…？'
    ];
    const todayCuriosity = curiosityTemplates[(day + month * 3) % curiosityTemplates.length];

    const result = {
      dateStr: dateStr,
      dateInfo: memorial ? memorial[0] : (parsed.dateInfo || dateStr),
      dateFact: memorial ? memorial[1] : (parsed.dateFact || ''),
      weather: parsed.weather || '',
      healthTip: parsed.healthTip || '',
      weatherRaw: weatherText,
      curiosity: todayCuriosity
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

// ========================================
// 声の自然な吸い上げ: 会話→要約→自動投稿
// ========================================
router.post('/voice-from-chat', authUser, async (req, res) => {
  try {
    const { uid, nickname, avatar, department, birthDate, recentMessages } = req.body;
    if (!uid || !recentMessages || recentMessages.length === 0) {
      return res.json({ success: false, msg: '会話履歴がありません' });
    }

    const db = getDb();
    const { callAIWithFallback } = require('../services/ai');
    const { awardMarigan } = require('../services/marigan');
    const { v4: uuidv4 } = require('uuid');

    // 直近の会話から要約を生成（AI）
    const chatText = recentMessages.map(m => (m.role === 'user' ? '社員: ' : 'バディー: ') + m.content).join('\n');

    const summaryPrompt = `以下はある社員とヘルスバディーの会話です。この中から社員が困っていること・提案・要望を1つ抽出し、匿名の投稿文として要約してください。

【会話】
${chatText}

【要約ルール】
- 社員の立場で書く（「私は」「自分は」で始めてOK）
- 個人が特定されない表現にする（名前、具体的な日時は除く）
- 困りごとの本質を2〜3文で簡潔に
- 「〜だったらいいのに」「〜してほしい」のような要望形で締める
- マークダウン不可
- 50〜100文字程度`;

    const summary = await callAIWithFallback('あなたは社員の声を匿名で要約するアシスタントです。', summaryPrompt);
    if (!summary) return res.json({ success: false, msg: '要約生成に失敗しました' });

    // 投稿として保存（バディー経由であることを記録）
    const pid = 'post_' + uuidv4().substring(0, 8);

    // AIヘルスアドバイザーのコメントも生成
    const { EVIDENCE_BASE } = require('../services/ai');
    const careSys = `あなたはバディーです。以下の社員の声に対して、共感と労いの一言を返してください。
- 2〜3文で短く
- 「大変だったね」「わかるよ」から入る
- 同じ悩みを持つ人がいることを伝える
- マークダウン不可、強調は【】
- 最後に「📚 出典:」でガイドライン名を明記`;
    let careComment = await callAIWithFallback(careSys, summary);
    if (!careComment) careComment = '声を届けてくれてありがとう。推進メンバーが確認するよ。';

    const analysis = `【バディーからのひとこと】\n${careComment}\n///SCORE///\n{"is_target":true,"legal":1,"risk":2,"freq":2,"urgency":2,"safety":2,"value":3,"needs":3}`;

    db.prepare(`INSERT INTO posts (post_id, user_id, content, analysis, nickname, avatar, status, category, department, birth_date)
      VALUES (?, ?, ?, ?, ?, ?, 'open', '💬 相談・提案', ?, ?)`).run(
      pid, uid, '【バディーとの会話から】' + summary, analysis, nickname, avatar, department || '', birthDate || ''
    );

    // コイン付与
    awardMarigan(uid, 'post', pid);

    // バディーメッセージで完了を通知
    db.prepare('INSERT INTO buddy_messages (user_id, role, content) VALUES (?, ?, ?)').run(
      uid, 'assistant',
      'みんなに届けたよ！名前は出してないから安心してね😊\n推進メンバーが見てくれるはずだよ。'
    );

    res.json({ success: true, postId: pid, summary: summary });
  } catch (e) {
    console.error('[voice-from-chat]', e.message);
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

// ========================================
// Google Cloud Text-to-Speech（音声ファイルとして直接配信）
// ========================================
// GETでも対応（Audio.srcから直接アクセス）
router.get('/tts', async (req, res) => {
  req.body = { text: req.query.text };
  return ttsHandler(req, res);
});
router.post('/tts', async (req, res) => {
  return ttsHandler(req, res);
});
async function ttsHandler(req, res) {
  try {
    const text = req.body.text || req.query.text;
    if (!text || text.trim().length === 0) return res.status(400).json({ error: 'テキストが空です' });

    const cleanText = text.substring(0, 5000);
    const voiceName = req.body.voice || req.query.voice || 'ja-JP-Neural2-B';
    const speed = parseFloat(req.body.speed || req.query.speed || '1.0') || 1.0;
    const pitch = parseFloat(req.body.pitch || req.query.pitch || '0') || 0;

    // 許可する音声名のリスト
    const allowedVoices = ['ja-JP-Neural2-B','ja-JP-Neural2-C','ja-JP-Neural2-D','ja-JP-Wavenet-A','ja-JP-Wavenet-B','ja-JP-Wavenet-C','ja-JP-Wavenet-D'];
    const safeVoice = allowedVoices.includes(voiceName) ? voiceName : 'ja-JP-Neural2-B';
    const safeSpeed = Math.max(0.5, Math.min(2.0, speed));
    const safePitch = Math.max(-10, Math.min(10, pitch));

    const apiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'TTS API Keyが設定されていません' });

    const fetch = require('node-fetch');
    const ttsRes = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: cleanText },
        voice: {
          languageCode: 'ja-JP',
          name: safeVoice
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: safeSpeed,
          pitch: safePitch
        }
      })
    });

    const data = await ttsRes.json();
    if (data.error) {
      console.error('TTS API error:', data.error.message);
      return res.status(500).json({ error: data.error.message });
    }

    // Base64 → バイナリに変換して音声ファイルとして直接配信
    const audioBuffer = Buffer.from(data.audioContent, 'base64');
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'no-cache'
    });
    res.send(audioBuffer);
  } catch (e) {
    console.error('TTS error:', e.message);
    res.status(500).json({ error: e.message });
  }
}

module.exports = router;
