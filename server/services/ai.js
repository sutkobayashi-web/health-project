const fetch = require('node-fetch');

const GROQ_API_KEY = () => process.env.GROQ_API_KEY;
const GEMINI_API_KEY = () => process.env.GEMINI_API_KEY;
const GROQ_MODEL = () => process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GEMINI_VISION_MODEL = () => process.env.GEMINI_VISION_MODEL || 'gemini-flash-latest';

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
あなたは、対象者の心に寄り添い、行動変容を優しくサポートする「AI保健師」です。
医学的・公衆衛生学的なエビデンスに基づきながらも、ティーチング（知識の伝達）よりコーチング（気づきの促進）を重視して対話を行ってください。

# 基本姿勢
1. 【しゃべりすぎない】1回の発言は簡潔に。AI：対象者＝3：7を心がける。
2. 【聞き上手になる】オープンクエスチョンを多用。
3. 【指示しない】「〜してください」は禁止。選択肢を提案。
4. 【自信をつけてもらう】スモールステップ提案、小さな変化を称賛。
5. 【じっくり、あせらず】短期的成果を求めない。
6. 【信頼関係】対象者の言葉を否定しない。
7. 【事実に基づく】最新ガイドラインに基づく正確な情報。

# 出力形式
- 語り口は「です・ます」調で温かく親しみやすいトーン
- 一度の発話は最大3〜4文程度
- 必ず質問または共感で発話を終える
- 絵文字は控えめに使用
- 対象者の名前「${userName || 'あなた'}」を時折呼びかけに使う`;

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
    const sys = `あなたはAI保健師です。ユーザー「${userName || 'さん'}」がチャットを開きました。
初回の挨拶として、以下を含む温かい挨拶を3文以内で返してください：
- 自己紹介（AI保健師であること）
- 来てくれたことへの感謝
- 体調や気になることを聞くオープンクエスチョン
語り口は「です・ます」調で温かく。絵文字は1〜2個まで。`;
    const reply = await callGroqApi(sys, '挨拶してください');
    if (reply) return { success: true, reply };
    return { success: true, reply: `こんにちは、${userName || ''}さん😊 AI保健師です！\nお話しできて嬉しいです。最近、体調やお気持ちで気になっていることはありますか？` };
  } catch (e) {
    return { success: true, reply: `こんにちは、${userName || ''}さん😊 AI保健師です！\nお話しできて嬉しいです。最近、体調やお気持ちで気になっていることはありますか？` };
  }
}

// 画像付きチャット
async function chatWithNurseImage(userMessage, imageBase64, mimeType, history, userName) {
  try {
    const visionSys = 'あなたは熟練の保健師・看護師です。送られた画像（健康診断結果、薬、体の症状、食事写真など）の内容を正確に読み取り、簡潔に要約してください。';
    let visionResult = await callGeminiVision(visionSys, imageBase64, mimeType);
    if (!visionResult || visionResult === '通信エラー') visionResult = '（画像の解析ができませんでした）';

    const combinedMessage = `【${userName || 'ユーザー'}さんから画像が送られました】\n＜画像の読み取り結果＞\n${visionResult}\n\n＜本人のコメント＞\n${userMessage || 'この画像について相談したいです。'}`;

    const messages = [{ role: 'system', content: 'あなたは企業の健康管理を担当するAI保健師です。親身で温かい対応を心がけてください。' }];
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

// 7軸AI評価
async function evaluateVoiceByAI(content, discussionLog, humanScores) {
  try {
    const prompt = `あなたは健康経営コンサルタントです。以下の【社員の声】を健康経営の7軸で1-5点評価し、JSON形式で出力してください。

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
  parsePostScore, evaluateVoiceByAI
};
