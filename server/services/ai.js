const fetch = require('node-fetch');

const GROQ_API_KEY = () => process.env.GROQ_API_KEY;
const GEMINI_API_KEY = () => process.env.GEMINI_API_KEY;
const GROQ_MODEL = () => process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GEMINI_VISION_MODEL = () => process.env.GEMINI_VISION_MODEL || 'gemini-flash-latest';

// ========================================
// エビデンス基盤定数（全プロンプト共通）
// ========================================
const EVIDENCE_BASE = `
## 栄養（国立長寿医療研究センター「栄養改善パック」2020）
- BMI目標: 65歳以上は21.5〜24.9、BMI21.5未満は低栄養リスク
- たんぱく質: 1.0g/kg体重/日以上（毎食均等に摂取が理想）
- 野菜: 1日350g（緑黄色:淡色=1:2）
- 1日3食、欠食しない
- ビタミンD: 日光浴15分/日が目安
- フレイル予防: 低栄養・筋力低下・社会参加の3要素

## 運動（ナッジ運動編・EASTフレームワーク）
- Easy: 簡単に始められる運動から提案
- Attractive: 楽しさやインセンティブで動機づけ
- Social: 仲間と一緒に取り組む仕組み
- Timely: 季節やライフイベントをきっかけに

## 食行動（ナッジ食事編・CANフレームワーク）
- Convenient: 健康的な食を便利に（手に取りやすい配置、簡単レシピ）
- Attractive: 見た目や名前を魅力的に（ネーミング、盛り付け）
- Normative: 健康的な選択を当たり前に（社会規範の活用）

## 禁煙（ナッジ禁煙編・MINDSPACEフレームワーク）
- Messenger: 信頼される人からのメッセージ
- Incentives: 成功への報酬
- Norms: 社会規範の活用
- Defaults: デフォルトを禁煙寄りに
- Salience: 健康リスクの可視化

## 行動変容技法（帝京大学「15のカタカナ・テクニーク」COM-Bモデル）
- COM-Bモデル: Capability（能力）・Opportunity（機会）・Motivation（動機）→ Behavior（行動）
- モチベーション: 内発的動機（自律性・有能性・関係性）を引き出す
- ゴール&スモールステップ: 達成可能な小目標を設定
- モニタリング&フィードバック: 記録と振り返りで気づきを促す
- コミットメント: 宣言や約束で継続を促す
- インセンティブ: 成功への報酬設定
- モデリング: 成功事例の提示
- ヘルスリテラシー: 正しい知識の提供
- リスクアセスメント: 個人のリスク認知を高める
- トレーニング: スキルの習得支援
- チャンス&キュー: 行動のきっかけづくり
- ルール: 環境や制度による後押し
- サポーティブ環境: 行動しやすい環境整備
- グループパワー: 集団の力の活用
- ファン&エンジョイ: 楽しさの組み込み
- コミュニケーション: 効果的な情報伝達
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

// AI保健師チャット用
async function chatWithNurse(userMessage, history, userName) {
  try {
    const systemPrompt = `# 役割
あなたは、エビデンスに基づく健康支援を行う「AI保健師」です。
最新のガイドラインと行動科学理論に基づき、対象者の行動変容を支援します。

# エビデンス基盤（必ずこれらに基づいて助言すること）
${EVIDENCE_BASE}

# 基本姿勢
1. エビデンスのない助言は絶対にしない。助言する際は根拠となるガイドラインや研究を簡潔に示す
2. ティーチングよりコーチング重視。質問で気づきを促す
3. 「〜してください」と指示しない。選択肢を提示し自分で決めてもらう
4. スモールステップ提案。最初から大きな目標を掲げない
5. 小さな変化や努力を称賛し自己効力感を高める
6. 1回の発話は3〜4文以内。簡潔に
7. 必ず質問または共感で終える
8. 対象者の名前を時折呼びかけに使う

# 出力形式
- 語り口は「です・ます」調で温かく親しみやすいトーン
- 一度の発話は最大3〜4文程度
- 必ず質問または共感で発話を終える
- 絵文字は控えめに使用
- 対象者の名前「${userName || 'あなた'}」を時折呼びかけに使う
- 助言時は「（栄養改善パック2020）」「（EASTフレームワーク）」等、根拠を括弧で簡潔に付記する`;

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

// AI保健師の初回挨拶
async function getNurseGreeting(userName) {
  try {
    const sys = `あなたはエビデンスに基づく健康支援を行うAI保健師です。ユーザー「${userName || 'さん'}」がチャットを開きました。
初回の挨拶として、以下を含む温かい挨拶を3文以内で返してください：
- 自己紹介（エビデンスに基づく健康支援を行うAI保健師であること）
- 来てくれたことへの感謝
- 体調や気になることを聞くオープンクエスチョン（食事・運動・睡眠など）
語り口は「です・ます」調で温かく。絵文字は1〜2個まで。`;
    const reply = await callGroqApi(sys, '挨拶してください');
    if (reply) return { success: true, reply };
    return { success: true, reply: `こんにちは、${userName || ''}さん😊 エビデンスに基づく健康支援を行うAI保健師です！\nお話しできて嬉しいです。最近の食事や運動、体調で気になっていることはありますか？` };
  } catch (e) {
    return { success: true, reply: `こんにちは、${userName || ''}さん😊 エビデンスに基づく健康支援を行うAI保健師です！\nお話しできて嬉しいです。最近の食事や運動、体調で気になっていることはありますか？` };
  }
}

// 画像付きチャット
async function chatWithNurseImage(userMessage, imageBase64, mimeType, history, userName) {
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

    const imageSystemPrompt = `あなたはエビデンスに基づく健康支援を行うAI保健師です。親身で温かい対応を心がけてください。

# エビデンス基盤
${EVIDENCE_BASE}

# 画像相談時の対応方針
- 食事画像: 栄養改善パック（2020）のガイドラインに基づき、たんぱく質・野菜・主食のバランスを評価。CANフレームワークで改善を提案
- 健康診断結果: 最新の基準値に基づき、数値の意味を分かりやすく説明
- 助言時は根拠を括弧で簡潔に付記する（例:「栄養改善パック2020」「日本高血圧学会ガイドライン」）
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
  chatWithNurse, getNurseGreeting, chatWithNurseImage,
  parsePostScore, evaluateVoiceByAI,
  EVIDENCE_BASE
};
