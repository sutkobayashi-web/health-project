const fetch = require('node-fetch');

const GROQ_API_KEY = () => process.env.GROQ_API_KEY;
const GEMINI_API_KEY = () => process.env.GEMINI_API_KEY;
const GROQ_MODEL = () => process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GEMINI_VISION_MODEL = () => process.env.GEMINI_VISION_MODEL || 'gemini-flash-latest';

// ========================================
// エビデンス基盤定数（全プロンプト共通）
// ========================================
const EVIDENCE_BASE = `
## 1. 腰痛・筋骨格系（厚労省「職場における腰痛予防対策指針」2013年改訂）
- 休業4日以上の職業性疾病の約6割が腰痛。陸上貨物運送業の発生率は全業種平均の約4倍
- 重量物の自動化・省力化、台車等の補助機器導入
- 配置時および6カ月以内ごとの腰痛健康診断、腰痛予防体操
- 男性の取扱い重量は体重の40%以下、女性はその60%程度

## 2. 睡眠・疲労（厚労省「健康づくりのための睡眠ガイド2023」）
- 成人は6時間以上の睡眠を確保。6時間未満は死亡リスク1.12倍
- 日中に日光を浴び体内時計を調節。就寝1〜2時間前の入浴が有効
- カフェインはコーヒー4杯/日まで、夕方以降は控える
- 晩酌の深酒・寝酒は避ける。「寝だめ」は効果なし

## 3. 食生活・肥満（厚労省「日本人の食事摂取基準2025年版」・栄養改善パック2020）
- BMI目標: 18〜49歳は18.5〜24.9、50〜64歳は20.0〜24.9、65歳以上は21.5〜24.9
- 炭水化物エネルギー比率50〜65%。極端な糖質制限は避ける
- スマートミール基準: 1食あたり450-650kcal、野菜140g以上、食塩3.0g未満
- たんぱく質: 1.0g/kg体重/日以上（毎食均等、運動後1時間以内で筋合成率向上）
- 野菜350g/日以上（緑黄色:淡色=1:2）
- 食べる順番: 野菜→主菜→炭水化物で血糖値の乱高下を防ぐ（ベジファースト）
- 食塩: 男性7.5g/日未満、女性6.5g/日未満
- 1日3食欠食しない、主食・主菜・副菜の3品構成

## 4. 血糖値・糖尿病（日本糖尿病学会「糖尿病診療ガイドライン2024」）
- 水溶性食物繊維（1日7.6〜10g: 海藻・野菜・きのこ・未精製穀物）がHbA1c改善
- 低GI食は血糖コントロールに有効（推奨グレードB）
- よく噛んで食べることでインスリン・GLP-1の分泌促進
- 食後1〜2時間後に10分程度のウォーキングで食後血糖値の急上昇を防止
- 食後2時間血糖値140mg/dL以上は「食後高血糖」、動脈硬化を促進

## 5. 高血圧・循環器（日本高血圧学会「高血圧管理・治療ガイドライン2025」）
- 診断基準: 診察室血圧140/90mmHg以上、家庭血圧135/85mmHg以上
- 降圧目標: 合併症なし75歳未満は130/80mmHg未満
- 減塩（6g/日未満目標）が最重要。カリウム摂取増加（野菜・果物）
- 有酸素運動を中心に毎日30分以上。節酒: 男性は純アルコール20g/日未満

## 6. メンタルヘルス（厚労省「労働者の心の健康の保持増進のための指針」）
- 4つのケア: セルフケア、ラインケア、産業保健スタッフケア、事業場外資源ケア
- ストレスチェック: 50人以上の事業場で年1回義務
- 高ストレス者への医師面接指導の実施

## 7. 喫煙・受動喫煙（改正健康増進法・受動喫煙防止ガイドライン）
- 職場は原則屋内禁煙。ニコチンには覚醒作用があり睡眠を悪化
- 行動変容ステージに合わせた対応: 無関心期→短時間の情報提供、関心期→具体的方法の提示
- 恐怖アピールのしすぎは逆効果。ポジティブ感情に訴える

## 8. 飲酒・アルコール（厚労省「健康に配慮した飲酒に関するガイドライン」2024年）
- 純アルコール量での管理。男性40g/日以上、女性20g/日以上でリスク上昇
- 週2日以上の休肝日。アルコールは睡眠後半を顕著に悪化
- 飲酒運転防止はドライバー業務の大前提

## 9. 運動・身体活動（厚労省「身体活動・運動ガイド2023」）
- 成人は1日60分以上の歩行等。息が弾む程度の運動を週60分以上
- 座りっぱなしの時間を減らし、30分に1回は立ち上がる
- 筋力トレーニングを週2〜3回。運動は血糖値改善・血圧低下・メンタルヘルス改善・腰痛予防に横断的に有効

## 10. 熱中症対策（厚労省「STOP!熱中症 クールワークキャンペーン」）
- WBGT値28℃以上で注意、31℃以上で危険
- 水分・塩分の定期的摂取（15〜20分ごとにコップ1〜2杯）
- 暑熱順化期間の確保（7日以上）

## 11. 過重労働（改善基準告示・過重労働による健康障害防止総合対策）
- 時間外労働月100時間超 or 2〜6カ月平均80時間超で脳・心臓疾患リスク上昇
- トラック運転者: 年960時間の時間外労働上限、休息期間は継続11時間以上を基本

## 12. 歯科・口腔（厚労省「歯科口腔保健の推進に関する基本的事項第2次」）
- 歯周病は糖尿病・心臓病・脳卒中のリスク因子
- 噛む力の維持が栄養摂取・認知症予防に関連
- 定期歯科健診の受診促進（年1回以上）
- 「噛ミング30」: 1口30回噛むことで肥満予防・血糖上昇抑制

## 13. 化学物質管理（新たな化学物質規制・令和6年4月本格施行）
- リスクアセスメントの義務化対象が大幅拡大（約2,900物質→GHS分類のある全物質）
- 自律的な管理が基本。ばく露濃度を濃度基準値以下に管理する義務
- SDS（安全データシート）の確認と周知が事業者の義務
- 化学物質管理者の選任が義務化（令和6年4月〜）
- がん原性物質に対する特別な管理措置

## 14. 女性の健康（厚労省「女性の健康づくり」）
- 月経随伴症状による労働損失（プレゼンティーイズム）への対策
- 更年期症状への理解と相談体制の整備
- 妊娠中の母性健康管理措置（勤務時間の短縮、作業制限等）
- 乳がん・子宮頸がんの検診受診率向上
- 骨粗鬆症予防（食事摂取基準2025年版で新規追加）

## 15. がん対策（がん対策推進基本計画第4期・2023年3月）
- 5大がん検診（胃・大腸・肺・乳・子宮頸）の受診率向上が目標
- がんのリスク要因: 喫煙・過度な飲酒・肥満・運動不足・感染（ピロリ菌、HPV等）
- 職域におけるがん検診受診率は依然として低い
- がん治療と仕事の両立支援ガイドラインあり

## 16. 感染症対策（厚労省「職場における感染症対策」）
- 手洗い・手指消毒・咳エチケットの継続
- 換気の確保（職場のCO2濃度1,000ppm以下を目安）
- 体調不良時の出勤自粛を促す体制づくり
- インフルエンザ予防接種の職域接種推進
- ノロウイルス等の食中毒対策（調理業務がある場合）

## 17. 特定健診・特定保健指導（標準的な健診・保健指導プログラム令和6年度版）
- メタボリックシンドロームに着目した健診・保健指導
- 第4期から「アウトカム評価」を導入（腹囲2cm・体重2kg減で成果とみなす）
- 保健指導の効率化: ICT活用、初回面談の弾力化
- 受診勧奨判定値: 血圧160/100以上は速やかに医療機関受診
- HbA1c 6.5%以上、LDLコレステロール180以上は受診勧奨

## 18. 運転者健康管理（国交省「事業用自動車の運転者の健康管理マニュアル」）
- 健康起因事故のうち心臓疾患55%、脳疾患12%、大動脈瘤12%が死亡原因
- 脳・心臓疾患のスクリーニング検査で約20%に異常所見
- SAS（睡眠時無呼吸症候群）スクリーニングの実施推奨
- 深夜勤務者は半年に1回の定期健診が必要（特定業務従事者）
- 改善基準告示（2024年4月〜）: 拘束時間・休息期間の基準強化
- 飲酒運転防止マニュアルの遵守

## 行動変容フレームワーク

### EASTフレームワーク（ナッジ運動編）
- Easy: ハードルを下げる（ながら運動: 歯磨き中のかかと上げ、CM中スクワット3回、階段利用）
- Attractive: 楽しさやインセンティブで動機づけ（歩数ポイント、お気に入りの運動着）
- Social: 仲間と一緒に取り組む（同僚と徒歩通勤、地域の体操教室）
- Timely: 健診前・誕生日などライフイベントをきっかけに

### CANフレームワーク（ナッジ食事編）
- Convenient: 健康的な食を便利に（手に取りやすい配置、簡単レシピ）
- Attractive: 見た目や名前を魅力的に（盛り付けの工夫、お気に入りの食器）
- Normative: 健康的な選択を当たり前に（「みんなも野菜から食べ始めています」等の社会的証明）

### MINDSPACEフレームワーク（ナッジ禁煙編）
- Messenger: 信頼される人からのメッセージ
- Incentives: 禁煙貯金、成功者表彰
- Norms: 社会規範（「喫煙率は年々低下しています」）
- Defaults: デフォルトを禁煙寄りに
- Affect: ポジティブ感情に訴える

### COM-Bモデル＋15のカタカナ・テクニーク（帝京大学）
- COM-B: Capability（能力）・Opportunity（機会）・Motivation（動機）→ Behavior（行動）
- リスクアセスメント / ヘルスリテラシー / モチベーション（内発的動機: 自律性・有能性・関係性）
- ゴール&スモールステップ / モデリング / トレーニング / チャンス&キュー
- インセンティブ / コミットメント / ルール
- モニタリング&フィードバック / サポーティブ環境 / グループパワー
- ファン&エンジョイ（ゲーミフィケーション） / コミュニケーション（傾聴・承認・コーチング・ラポール構築）

### 保健指導の基本姿勢
- ティーチングよりコーチング重視。質問で気づきを促す
- 「〜してください」と指示しない。選択肢を提示し自分で決めてもらう
- スモールステップ提案。最初から大きな目標を掲げない
- 小さな変化や努力を称賛し自己効力感を高める
- 「できないこと」ではなく「今できていること、できそうなこと」に光を当てる

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

// AIヘルスアドバイザーチャット用
async function chatWithNurse(userMessage, history, userName) {
  try {
    const systemPrompt = `# 役割
あなたは、エビデンスに基づく健康支援を行う「AIヘルスアドバイザー」です。
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
- ★★★助言を含む回答の最後に必ず「📚 出典:」として根拠となるガイドライン名を明記すること★★★
  例: 📚 出典: 厚生労働省「健康づくりのための睡眠ガイド2023」`;

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

// AIヘルスアドバイザーの初回挨拶
async function getNurseGreeting(userName) {
  try {
    const sys = `あなたはエビデンスに基づく健康支援を行うAIヘルスアドバイザーです。ユーザー「${userName || 'さん'}」がチャットを開きました。
初回の挨拶として、以下を含む温かい挨拶を3文以内で返してください：
- 自己紹介（エビデンスに基づく健康支援を行うAIヘルスアドバイザーであること）
- 来てくれたことへの感謝
- 体調や気になることを聞くオープンクエスチョン（食事・運動・睡眠など）
語り口は「です・ます」調で温かく。絵文字は1〜2個まで。`;
    const reply = await callGroqApi(sys, '挨拶してください');
    if (reply) return { success: true, reply };
    return { success: true, reply: `こんにちは、${userName || ''}さん😊 エビデンスに基づく健康支援を行うAIヘルスアドバイザーです！\nお話しできて嬉しいです。最近の食事や運動、体調で気になっていることはありますか？` };
  } catch (e) {
    return { success: true, reply: `こんにちは、${userName || ''}さん😊 エビデンスに基づく健康支援を行うAIヘルスアドバイザーです！\nお話しできて嬉しいです。最近の食事や運動、体調で気になっていることはありますか？` };
  }
}

// 画像付きチャット
async function chatWithNurseImage(userMessage, imageBase64, mimeType, history, userName) {
  try {
    const visionSys = `あなたは熟練のヘルスアドバイザー・食事アドバイザーです。送られた画像（健康診断結果、薬、体の症状、食事写真など）の内容を正確に読み取り、簡潔に要約してください。

食事画像の場合は以下の観点で分析すること（国立長寿医療研究センター「栄養改善パック」2020準拠）：
- 主菜のたんぱく質源（肉・魚・卵・大豆）の有無と推定量（目標: 1.0g/kg体重/日）
- 副菜の野菜量の推定（目標: 1日350g、緑黄色:淡色=1:2）
- 主食・主菜・副菜の3品が揃っているか
- ビタミン・ミネラル源の有無

健康診断結果の場合は最新ガイドラインに基づき、基準値との比較を明記すること。`;
    let visionResult = await callGeminiVision(visionSys, imageBase64, mimeType);
    if (!visionResult || visionResult === '通信エラー') visionResult = '（画像の解析ができませんでした）';

    const combinedMessage = `【${userName || 'ユーザー'}さんから画像が送られました】\n＜画像の読み取り結果＞\n${visionResult}\n\n＜本人のコメント＞\n${userMessage || 'この画像について相談したいです。'}`;

    const imageSystemPrompt = `あなたはエビデンスに基づく健康支援を行うAIヘルスアドバイザーです。親身で温かい対応を心がけてください。

# エビデンス基盤
${EVIDENCE_BASE}

# 画像相談時の対応方針
- 食事画像: 栄養改善パック（2020）のガイドラインに基づき、たんぱく質・野菜・主食のバランスを評価。CANフレームワークで改善を提案
- 健康診断結果: 最新の基準値に基づき、数値の意味を分かりやすく説明
- ★★★助言を含む回答の最後に必ず「📚 出典:」として根拠となるガイドライン名を明記すること★★★
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
