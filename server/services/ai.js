const fetch = require('node-fetch');

const GROQ_API_KEY = () => process.env.GROQ_API_KEY;
const GEMINI_API_KEY = () => process.env.GEMINI_API_KEY;
const GROQ_MODEL = () => process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GEMINI_VISION_MODEL = () => process.env.GEMINI_VISION_MODEL || 'gemini-flash-latest';

// ========================================
// エビデンス基盤定数（全プロンプト共通）
// ========================================
const EVIDENCE_BASE = `
## 栄養・食事指導（国立長寿医療研究センター「栄養改善パック」2020）
- エネルギー必要量: 基礎代謝量×身体活動レベルで算出
- PFCバランス: 炭水化物は全体の約60%(50-65%)が目安
- スマートミール基準: 1食あたり450-650kcal、野菜140g以上、食塩3.0g未満
- BMI目標: 65歳以上は21.5〜24.9（BMI21.5未満は低栄養リスク、BMI25以上は肥満）
- たんぱく質: 1.0g/kg体重/日以上（毎食均等に摂取が理想、運動後1時間以内の摂取で筋合成率向上）
- 野菜: 1日350g（緑黄色:淡色=1:2）
- 食べる順番: 野菜（食物繊維）→肉・魚（主菜）→炭水化物で血糖値の乱高下を防ぐ
- 1日3食欠食しない、主食・主菜・副菜の3品構成
- ビタミンD: 日光浴15分/日、カルシウム吸収を促進
- フレイル予防: 低栄養・筋力低下・社会参加の3要素（身体面・精神心理面・社会面）
- 食欲がない時: エネルギー180kcal以上、たんぱく質10g前後の栄養補助食品の活用

## 運動・身体活動（ナッジ運動編・EASTフレームワーク）
- Easy: ハードルを下げる（ながら運動：歯磨き中のかかと上げ、CM中スクワット3回、階段利用）
- Attractive: 楽しさやインセンティブで動機づけ（歩数ポイント、お気に入りの運動着）
- Social: 仲間と一緒に取り組む（同僚と徒歩通勤、地域の体操教室）
- Timely: 季節・健診前・誕生日などライフイベントをきっかけに

## 食行動変容（ナッジ食事編・CANフレームワーク）
- Convenient: 健康的な食を便利に（手に取りやすい配置、簡単レシピ、定食にサラダ追加）
- Attractive: 見た目や名前を魅力的に（盛り付けの工夫、お気に入りの食器）
- Normative: 健康的な選択を当たり前に（「みんなも野菜から食べ始めています」等の社会的証明）

## 禁煙・節酒（ナッジ禁煙編・MINDSPACEフレームワーク）
- Messenger: 信頼される人からのメッセージ（社長宣言、家族の声）
- Incentives: 禁煙貯金、成功者表彰
- Norms: 社会規範（「喫煙率は年々低下しています」）
- Defaults: デフォルトを禁煙寄りに（敷地内全面禁煙）
- Affect: ポジティブ感情に訴える（恐怖アピールのしすぎは逆効果）
- 行動変容ステージに合わせた対応: 無関心期→短時間の情報提供、関心期→具体的方法の提示

## 行動変容技法（帝京大学「15のカタカナ・テクニーク」COM-Bモデル）
- COM-Bモデル: Capability（能力）・Opportunity（機会）・Motivation（動機）→ Behavior（行動）
- リスクアセスメント: 健診結果から現在と将来のリスクを評価し動機を高める
- ヘルスリテラシー: 質問で知識レベルを確認、正しい情報をわかりやすく提供
- モチベーション: 内発的動機（自律性・有能性・関係性）を引き出す（「健康になって何をしたいですか？」）
- ゴール&スモールステップ: 最終目標→小目標→具体的行動目標（「まず1kg」「まず1週間」）
- モデリング: 似た状況で成功した人の事例提示（疑似体験で自己効力感向上）
- トレーニング: 実践体験の機会提供（料理教室、ストレッチ動画）
- チャンス&キュー: ライフイベント（誕生日、健診前）を行動開始のきっかけに
- インセンティブ: 金銭的・非金銭的報酬、成功者の表彰
- コミットメント: 宣言や約束（紙に書く、家族に宣言）で継続を促す
- ルール: 組織のルール化でデフォルトを健康寄りに
- モニタリング&フィードバック: 体重・血圧・歩数・食事を記録し定期的に振り返り
- サポーティブ環境: 行動しやすい環境整備（健康的な食堂メニュー、階段利用促進）
- グループパワー: 集団の力の活用（チーム対抗ウォーキング大会）
- ファン&エンジョイ: 楽しさの組み込み（ゲーミフィケーション）
- コミュニケーション: 傾聴・承認のコーチングスキル、ラポール構築

## 禁止事項
- エビデンスのない助言は絶対にしない（「○○を食べれば確実に痩せる」等は禁止）
- 極端な糖質制限・ファスティング等の推奨禁止
- 医療行為の禁止（確定診断、薬の処方変更の指示はしない）
- 疾患が疑われる場合は「医療機関を受診してください」と促す
`;

// Groq API (OpenAI互換)
async function callGroqApi(systemPrompt, userMessage, options = {}) {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL(),
        messages: options.messages || [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: options.temperature || 0.3,
        max_tokens: options.max_tokens || undefined
      })
    });
    const json = await res.json();
    if (json.choices && json.choices.length > 0) {
      return json.choices[0].message.content;
    }
    return null;
  } catch (e) {
    console.error('Groq API error:', e.message);
    return null;
  }
}

async function callGroqApiSafe(sys, user) {
  const result = await callGroqApi(sys, user);
  if (!result) return { ok: false, text: '', error: 'AI無応答' };
  return { ok: true, text: result, error: null };
}

// Gemini Vision API
async function callGeminiVision(systemPrompt, base64Data, mimeType) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_VISION_MODEL()}:generateContent?key=${GEMINI_API_KEY()}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: { text: systemPrompt } },
        contents: [{
          role: 'user',
          parts: [
            { text: '画像分析' },
            { inline_data: { mime_type: mimeType, data: base64Data } }
          ]
        }]
      })
    });
    const json = await res.json();
    if (json.candidates && json.candidates.length > 0) {
      return json.candidates[0].content.parts[0].text;
    }
    return '通信エラー';
  } catch (e) {
    console.error('Gemini Vision error:', e.message);
    return '通信エラー';
  }
}

// ========================================
// ヘルスバディー性格定義
// ========================================
const BUDDY_PERSONALITIES = {
  gentle: {
    name: 'やさしいバディー',
    emoji: '🌸',
    tone: `語り口は「です・ます」調で温かく親しみやすいトーン。
相手の気持ちに寄り添い、共感を大切にする。
「大丈夫ですよ」「一緒にがんばりましょうね」など安心感のある言葉を使う。
絵文字は1〜2個、柔らかいもの（😊🌸💕）を使う。`
  },
  cheerful: {
    name: '元気いっぱいバディー',
    emoji: '⚡',
    tone: `テンション高めで明るく元気な口調。「！」を多めに使う。
「やったね！」「いいね！すごい！」など前向きな言葉で盛り上げる。
スポーツや動きの比喩を使う（「ナイスシュート！」「いい走り出し！」）。
絵文字は2〜3個、元気なもの（💪🔥⚡🏃✨）を使う。`
  },
  strict: {
    name: 'しっかり者バディー',
    emoji: '📋',
    tone: `明確で的確な指摘をする頼れるトーン。丁寧だが率直。
数値目標を具体的に提示し、結果にフォーカスする。
「ここがポイントです」「具体的には〜しましょう」など行動を促す。
絵文字は0〜1個、控えめに。`
  },
  funny: {
    name: 'おもしろバディー',
    emoji: '😄',
    tone: `ユーモアのある親しみやすい口調。ダジャレや例え話を交える。
タメ語混じりの「です・ます」調で距離感を縮める。
「健康は"けんこう"じゃなくて"元気"って書きたいよね〜」のような軽い冗談。
絵文字は2〜3個、楽しいもの（😄🎉🤣👍）を使う。`
  },
  calm: {
    name: 'おだやかバディー',
    emoji: '🍃',
    tone: `ゆったりとした落ち着いたトーン。急がせない。
マインドフルネス的な声がけ（「今の自分を大切にしましょう」）。
呼吸や瞑想、自然の比喩を使う。
絵文字は1個、穏やかなもの（🍃🌿☕🌙）を使う。`
  }
};

function getBuddyTone(buddyType) {
  return (BUDDY_PERSONALITIES[buddyType] || BUDDY_PERSONALITIES.gentle).tone;
}

function getBuddyName(buddyType) {
  return (BUDDY_PERSONALITIES[buddyType] || BUDDY_PERSONALITIES.gentle).name;
}

// ヘルスバディーチャット
async function chatWithBuddy(userMessage, history, userName, buddyType) {
  try {
    const tone = getBuddyTone(buddyType);
    const systemPrompt = `# 役割
あなたは「ヘルスバディー」です。ユーザーの健康パートナーとして、楽しく会話しながらエビデンスに基づく健康支援を行います。
保健指導を感じさせず、「友達と話しているだけ」の感覚を大切にしてください。

# エビデンス基盤（必ずこれらに基づいて助言すること）
${EVIDENCE_BASE}

# 基本姿勢
1. エビデンスのない助言は絶対にしない。助言する際は根拠を簡潔に示す
2. ティーチングよりコーチング重視。質問で気づきを促す
3. 「〜してください」と指示しない。選択肢を提示し自分で決めてもらう
4. スモールステップ提案。最初から大きな目標を掲げない
5. 小さな変化や努力を称賛し自己効力感を高める
6. 1回の発話は3〜4文以内。簡潔に
7. 必ず質問または共感で終える
8. 対象者の名前を時折呼びかけに使う

# 性格・口調
${tone}

# 出力形式
- 一度の発話は最大3〜4文程度
- 必ず質問または共感で発話を終える
- 対象者の名前「${userName || 'あなた'}」を時折呼びかけに使う
- 助言時は根拠を括弧で簡潔に付記する`;

    const messages = [{ role: 'system', content: systemPrompt }];
    if (history && history.length > 0) {
      const recent = history.slice(-20);
      recent.forEach(h => messages.push({ role: h.role, content: h.content }));
    }
    messages.push({ role: 'user', content: userMessage });

    const result = await callGroqApi(null, null, {
      messages,
      temperature: 0.6,
      max_tokens: 500
    });

    if (result) return { success: true, reply: result };
    return { success: false, reply: 'すみません、うまく応答できませんでした。もう一度お話しいただけますか？' };
  } catch (e) {
    return { success: false, reply: '通信エラーが発生しました。少し時間を置いてお試しください。' };
  }
}

// ヘルスバディー初回挨拶
async function getBuddyGreeting(userName, buddyType) {
  try {
    const tone = getBuddyTone(buddyType);
    const buddyName = getBuddyName(buddyType);
    const sys = `あなたはユーザーの健康パートナー「ヘルスバディー」（${buddyName}）です。
ユーザー「${userName || 'さん'}」がアプリを開きました。

以下を含む温かい挨拶を3文以内で返してください：
- 自己紹介（ヘルスバディーであること。保健指導っぽくならないように）
- 来てくれたことへの感謝や軽い一言
- 「今日は何をしましょうか？」で締める

# 性格・口調
${tone}`;
    const reply = await callGroqApi(sys, '挨拶してください');
    if (reply) return { success: true, reply };
    return { success: true, reply: `こんにちは、${userName || ''}さん😊 あなたのヘルスバディーです！\n今日も一緒にがんばりましょう。今日は何をしましょうか？` };
  } catch (e) {
    return { success: true, reply: `こんにちは、${userName || ''}さん😊 あなたのヘルスバディーです！\n今日も一緒にがんばりましょう。今日は何をしましょうか？` };
  }
}

// ヘルスバディー画像付きチャット
async function chatWithBuddyImage(userMessage, imageBase64, mimeType, history, userName, buddyType) {
  try {
    const visionSys = `あなたは熟練の保健師・管理栄養士です。送られた画像（健康診断結果、薬、体の症状、食事写真など）の内容を正確に読み取り、簡潔に要約してください。

食事画像の場合は以下の観点で分析すること（国立長寿医療研究センター「栄養改善パック」2020準拠）：
- 主菜のたんぱく質源（肉・魚・卵・大豆）の有無と推定量（目標: 1.0g/kg体重/日）
- 副菜の野菜量の推定（目標: 1日350g、緑黄色:淡色=1:2）
- 主食・主菜・副菜の3品が揃っているか
- ビタミン・ミネラル源の有無

健康診断結果の場合は最新ガイドラインに基づき、基準値との比較を明記すること。`;
    let visionResult = await callGeminiVision(visionSys, imageBase64, mimeType);
    if (!visionResult || visionResult === '通信エラー') visionResult = '（画像の解析ができませんでした）';

    const combinedMessage = `【${userName || 'ユーザー'}さんから画像が送られました】\n＜画像の読み取り結果＞\n${visionResult}\n\n＜本人のコメント＞\n${userMessage || 'この画像について相談したいです。'}`;

    const tone = getBuddyTone(buddyType);
    const imageSystemPrompt = `あなたはユーザーの健康パートナー「ヘルスバディー」です。親身で温かい対応を心がけてください。

# エビデンス基盤
${EVIDENCE_BASE}

# 性格・口調
${tone}

# 画像相談時の対応方針
- 食事画像: 栄養改善パック（2020）のガイドラインに基づき、たんぱく質・野菜・主食のバランスを評価。CANフレームワークで改善を提案
- 健康診断結果: 最新の基準値に基づき、数値の意味を分かりやすく説明
- 助言時は根拠を括弧で簡潔に付記する
- エビデンスのない助言はしない
- スモールステップで改善提案（ゴール&スモールステップ技法）
- 1回の発話は3〜4文以内`;

    const messages = [{ role: 'system', content: imageSystemPrompt }];
    if (history && history.length > 0) {
      history.forEach(h => messages.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content }));
    }
    messages.push({ role: 'user', content: combinedMessage });

    const result = await callGroqApi(null, null, { messages, temperature: 0.5, max_tokens: 1000 });
    if (result) return { success: true, reply: result };
    return { success: false, reply: '申し訳ありません、回答を生成できませんでした。' };
  } catch (e) {
    return { success: false, reply: 'エラーが発生しました: ' + e.message };
  }
}

// 後方互換エイリアス
const chatWithNurse = (msg, hist, name) => chatWithBuddy(msg, hist, name, 'gentle');
const getNurseGreeting = (name) => getBuddyGreeting(name, 'gentle');
const chatWithNurseImage = (msg, img, mime, hist, name) => chatWithBuddyImage(msg, img, mime, hist, name, 'gentle');

// ///SCORE/// パーサー
function parsePostScore(analysisText) {
  try {
    if (!analysisText || !String(analysisText).includes('///SCORE///'))
      return { text: String(analysisText || ''), score: null };
    const parts = String(analysisText).split('///SCORE///');
    return { text: parts[0].trim(), score: JSON.parse(parts[1].trim()) };
  } catch (e) {
    return { text: String(analysisText || ''), score: null };
  }
}

// 7軸AI評価（COM-Bモデル準拠）
async function evaluateVoiceByAI(content, discussionLog, humanScores) {
  try {
    const prompt = `あなたは健康経営コンサルタントです。COM-Bモデル（Capability・Opportunity・Motivation → Behavior）の観点も踏まえ、以下の【社員の声】を健康経営の7軸で1-5点評価し、JSON形式で出力してください。

【評価の視点（COM-Bモデル準拠）】
- legal（法的義務）: 労働安全衛生法等の法的要請への該当度
- risk（リスク）: 放置した場合の健康リスク・安全リスクの大きさ
- freq（頻度）: 同様の声が上がる頻度、組織内での普遍性
- urgency（緊急性）: 即座の対応が必要な度合い
- safety（安全性）: 身体的・精神的安全への影響度
- value（価値）: 健康経営施策としての投資対効果（Capability・Opportunityの改善余地）
- needs（ニーズ）: 対象者のMotivation（内発的動機・自律性・有能性・関係性）への寄与度

【社員の声】
${content || '（なし）'}

【推進メンバーの議論記録】
${discussionLog || '（議論なし）'}

【人間評価（参考）】
${JSON.stringify(humanScores || {})}

【出力形式】JSONのみ出力。他のテキストは不要。
{"legal":3, "risk":3, "freq":3, "urgency":3, "safety":3, "value":3, "needs":3}`;

    const resText = await callGroqApi('あなたはJSON出力専門AIです。指定されたJSON形式のみを出力してください。', prompt);
    if (!resText) return { success: false, msg: 'AI無応答' };
    const jsonMatch = resText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { success: false, msg: 'AI出力形式エラー' };
    return { success: true, result: JSON.parse(jsonMatch[0]) };
  } catch (e) {
    return { success: false, msg: 'AIエラー: ' + e.message };
  }
}

module.exports = {
  callGroqApi, callGroqApiSafe, callGeminiVision,
  chatWithBuddy, getBuddyGreeting, chatWithBuddyImage,
  chatWithNurse, getNurseGreeting, chatWithNurseImage,
  parsePostScore, evaluateVoiceByAI,
  EVIDENCE_BASE, BUDDY_PERSONALITIES
};
