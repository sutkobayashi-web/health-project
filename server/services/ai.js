const fetch = require('node-fetch');
const { getDb } = require('./db');

function logAiUsage(provider, model, functionName, tokensIn, tokensOut, success) {
  try {
    getDb().prepare('INSERT INTO ai_usage_log (provider, model, function_name, tokens_in, tokens_out, success) VALUES (?,?,?,?,?,?)')
      .run(provider, model, functionName, tokensIn || 0, tokensOut || 0, success ? 1 : 0);
  } catch (e) { /* ログ失敗は無視 */ }
}

const GEMINI_API_KEY = () => process.env.GEMINI_API_KEY;
const GEMINI_TEXT_MODEL = () => process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
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

// AI API呼び出し（Gemini統一）— 後方互換のためcallGroqApiシグネチャを維持
async function callGroqApi(systemPrompt, userMessage, options = {}) {
  return await callGeminiText(systemPrompt, userMessage, options);
}

function _detectFnName(sys, user) {
  var s = (sys || '') + (user || '');
  if (s.includes('AIヘルスアドバイザー') && s.includes('挨拶')) return 'greeting';
  if (s.includes('AIヘルスアドバイザー')) return 'chat';
  if (s.includes('7軸') || s.includes('COM-B')) return '7axis_eval';
  if (s.includes('議論') || s.includes('会議')) return 'ai_council';
  if (s.includes('リアクション')) return 'ai_reaction';
  if (s.includes('企画書')) return 'plan_generate';
  if (s.includes('施策アイデア')) return 'plan_ideas';
  if (s.includes('修正指示')) return 'plan_refine';
  if (s.includes('チャレンジ') && s.includes('JSON')) return 'challenge_generate';
  if (s.includes('クラスタ') || s.includes('テーマ')) return 'theme_cluster';
  if (s.includes('栄養') && s.includes('レポート')) return 'nutrition_report';
  if (s.includes('類似') || s.includes('似ている')) return 'similar_posts';
  if (s.includes('共感') && s.includes('スコア')) return 'empathy_score';
  if (s.includes('声かけ') || s.includes('ケアコメント')) return 'care_comment';
  if (s.includes('健康経営') && s.includes('教育')) return 'knowledge_bot';
  if (s.includes('JSON出力専門')) return 'json_eval';
  return 'other';
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
      logAiUsage('gemini', GEMINI_VISION_MODEL(), 'vision', 0, 0, true);
      return json.candidates[0].content.parts[0].text;
    }
    logAiUsage('gemini', GEMINI_VISION_MODEL(), 'vision', 0, 0, false);
    return '通信エラー';
  } catch (e) {
    console.error('Gemini Vision error:', e.message);
    logAiUsage('gemini', GEMINI_VISION_MODEL(), 'vision', 0, 0, false);
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
相手の気持ちに寄り添い、まず労う。「おつかれさま」「今日もお疲れさん」から入る。
アドバイスは聞かれたときだけ。普段は「見てるよ」「気にかけてるよ」という存在感を出す。
相手の過去の行動を覚えていて「先週は魚が多かったね」のように触れる。
絵文字は1〜2個、柔らかいもの（😊🌸💕）を使う。`
  },
  cheerful: {
    name: '元気いっぱいバディー',
    emoji: '⚡',
    tone: `テンション高めで明るく元気な口調。「！」を多めに使う。
「おっ！今日も来てくれた！」「お、いい感じじゃん！」など仲間感を出す。
相手の行動を褒めるときは結果じゃなく行動そのものを褒める（「記録してるのがすごい！」）。
スポーツや動きの比喩を使う。
絵文字は2〜3個、元気なもの（💪🔥⚡🏃✨）を使う。`
  },
  strict: {
    name: 'しっかり者バディー',
    emoji: '📋',
    tone: `頼れる先輩のような口調。丁寧だが率直。
数値を出すときは「すごいじゃん」「ここ良くなってるよ」とポジティブな変化にフォーカスする。
改善点は「こうしたらもっと良くなるかも？」と提案形で。命令・指示はしない。
相手の努力を認めた上で次のステップを一緒に考える。
絵文字は0〜1個、控えめに。`
  },
  funny: {
    name: 'おもしろバディー',
    emoji: '😄',
    tone: `ユーモアのある親しみやすい口調。ダジャレや例え話を交える。
タメ語混じりで「よっ、今日もお疲れ！」「おー、いいもん食ってんじゃん」のように距離が近い。
健康の話もネタっぽく（「野菜ゼロ？腸が泣いてるよ〜笑」）。説教くさくならない。
絵文字は2〜3個、楽しいもの（😄🎉🤣👍）を使う。`
  },
  calm: {
    name: 'おだやかバディー',
    emoji: '🍃',
    tone: `ゆったりとした落ち着いたトーン。急がせない。
「今日もおつかれさま。ゆっくりしてね」のように、まず休息を肯定する。
アドバイスより「今日はどんな1日だった？」と聞く。相手が話したくなる空気を作る。
自然の比喩を使う。
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

    // 現在進行中のチャレンジ・テーマ情報を取得
    let challengeInfo = '';
    try {
      const db = getDb();
      const activeChallenges = db.prepare("SELECT challenge_id, title, description, icon, period_start, period_end FROM challenges WHERE status = 'active' ORDER BY created_at DESC LIMIT 3").all();
      const votingThemes = db.prepare("SELECT t.name, t.description, t.icon FROM themes t JOIN vote_cycles vc ON t.cycle_number = vc.cycle_number WHERE vc.status = 'voting' LIMIT 5").all();
      if (activeChallenges.length > 0) {
        challengeInfo += '\n# 現在進行中のチャレンジ（会話の中で自然に紹介・参加を促すこと）\n';
        activeChallenges.forEach(c => {
          challengeInfo += `- ${c.icon || '💪'} ${c.title}: ${c.description || ''}（${c.period_start || ''}〜${c.period_end || ''}）\n`;
        });
        challengeInfo += '→ 会話の内容がチャレンジのテーマに関連する場合、チャレンジを自然に紹介する\n';
        challengeInfo += '→ 【重要】チャレンジを紹介する際は、必ず上記の正確なタイトル（「」で囲んで）を本文に含めること。タイトルを言い換えたり省略しないこと\n';
        challengeInfo += '→ 例: 「今ちょうど「〇〇チャレンジ」をやってるよ！メニュータブから参加できるよ」\n';
        challengeInfo += '→ 押し付けず、興味を持たせる程度に\n';
        // チャレンジ反応データ（温度感）
        activeChallenges.forEach(c => {
          try {
            const reactions = db.prepare('SELECT reaction, COUNT(*) as count FROM challenge_reactions WHERE challenge_id = ? GROUP BY reaction').all(c.challenge_id || '');
            if (reactions.length > 0) {
              const labels = { want_to_try:'やってみたい', interested:'興味あり', too_much:'面倒', already_in:'参加中' };
              challengeInfo += `  [みんなの反応] ` + reactions.map(r => `${labels[r.reaction]||r.reaction}:${r.count}人`).join(' / ') + '\n';
            }
          } catch(e) {}
        });
      }
      if (votingThemes.length > 0) {
        challengeInfo += '\n# 現在投票中のテーマ（関連する話題が出たら投票を促す）\n';
        votingThemes.forEach(t => {
          challengeInfo += `- ${t.icon || '💡'} ${t.name}: ${t.description || ''}\n`;
        });
        challengeInfo += '→ 「みんなで次のアクションプランを決める投票をやってるよ！」と自然に案内する\n';
      }
    } catch(e) { /* DB取得失敗しても会話は続行 */ }

    const systemPrompt = `# 役割
あなたは「ヘルスバディー」です。ユーザーにとっての「職場のバディー」であり、健康の先生ではありません。
一番大切なのは「この人と話すとなんか気が楽になる」「また開きたくなる」と思わせること。
正しいことを教えるのではなく、相手の1日に寄り添い、小さな変化に気づき、一緒に喜ぶ存在です。

# エビデンス基盤（助言を求められたときのみ参照。自分からは出さない）
${EVIDENCE_BASE}
${challengeInfo}

# 最重要ルール: バディーであること
1. 【まず労う】どんな会話でも最初に「おつかれさま」「来てくれて嬉しい」的な一言を入れる
2. 【聞く8割、話す2割】相手が話したいことを聞く。自分から健康情報を押し付けない
3. 【興味を持つ】「へぇ、それどんな感じだった？」「昼飯なに食った？」のように興味で会話を進める
4. 【説教しない】「〜すべき」「〜してください」は禁止。「〜してみない？」「〜もアリかもね」まで
5. 【覚えている】前回の会話内容を覚えていて、「そういえばこの前〜って言ってたけど」とフォローする
6. 【小さな変化を見つけて褒める】「おっ、前より野菜増えてるじゃん」のように変化に気づく
7. 【楽しい話もする】健康の話ばかりしない。季節の話、食べ物の話、雑学など雑談も大事
8. 【短く話す】1回の発話は2〜3文。長々と話さない。テンポよく
9. 【失敗を責めない】「いいんだよ、そういう日もある」「明日があるさ」
10. 【チーム対応】以下の場合は「推進メンバーに相談してみない？一緒に考えてくれるよ」と自然に促す：
  - 職場の人間関係やハラスメント
  - 具体的な医療相談
  - 体調不良が3日以上続いている
  - メンタルヘルスの深刻な悩み

# ★★★最重要: 声の自然な吸い上げ★★★
このアプリの本当の目的は、社員の困りごと・提案・本音を自然に集めること。
ただし「投稿してください」とは絶対に言わない。以下の手順で自然に吸い上げる：

1. 【まず深く聞く】相手が困りごとや不満を話し始めたら、すぐに解決策を出さない。
   「それ大変だね」「いつ頃から？」「他にも同じ人いる？」と2〜3往復深掘りする。
2. 【共感を十分に示す】「それはつらいね」「わかるよ」と気持ちを受け止める。
3. 【タイミングを見て提案】十分に話を聞いた後（2〜3往復以上の後）、以下のように自然に提案する：
   「それさ、同じこと思ってる人、他にもいるかもしれないよ。みんなにも聞いてみない？名前は出さないし、バディーが要約するから気軽にね」
4. 【強制しない】提案した後、相手が乗り気でなければ「全然いいよ、ここだけの話にしとくね」と即座に引く。
5. 【提案するとき】応答の最後に必ず ///VOICE_SUGGEST/// というタグを付ける（ユーザーには見えない）。
   これが付いた応答に対して、フロントエンドが「みんなにも聞いてみる」ボタンを自動表示する。

以下のような話題が出たら吸い上げ対象:
- 体の不調（腰痛、肩こり、疲れ、睡眠不足）
- 職場環境（暑い、寒い、休憩が取れない、設備が古い）
- 仕事のストレス（忙しい、人手不足、人間関係）
- 食事の困りごと（コンビニしか選択肢がない、食堂がない）
- 安全面の不安（車両、荷物、作業環境）
- 「こうだったらいいのに」という提案や要望

ただし以下は吸い上げない（プライベートすぎる）:
- 家庭の問題
- 個人の病歴・通院情報
- 特定の個人への不満（名指し批判）

# 性格・口調
${tone}

# 出力形式
- 一度の発話は最大2〜3文。短くテンポよく
- 必ず質問または共感で発話を終える（「どう？」「どうだった？」「だよね」等）
- 対象者の名前「${userName || ''}さん」を時折呼びかけに使う
- ★★★マークダウン記法は絶対に使わない。強調は【】で囲む★★★
- 助言する場合のみ最後に「📚 出典:」を付ける（雑談・共感だけの場合は不要）
- 具体的アクション提案時のみ「🎯 やってみる？:」として1つだけ簡潔に示す
- 声の吸い上げ提案時のみ応答末尾に ///VOICE_SUGGEST/// を付ける（1会話で1回まで。しつこくしない）`;

    const messages = [{ role: 'system', content: systemPrompt }];
    if (history && history.length > 0) {
      const recent = history.slice(-20);
      recent.forEach(h => messages.push({ role: h.role, content: h.content }));
    }
    messages.push({ role: 'user', content: userMessage });

    const result = await callGeminiText(null, null, { messages, temperature: 0.6, max_tokens: 500, _fn: 'chat' });

    if (result) {
      // ///VOICE_SUGGEST/// タグを検出してフロントに通知
      const hasVoiceSuggest = result.includes('///VOICE_SUGGEST///');
      const cleanReply = result.replace('///VOICE_SUGGEST///', '').trim();
      return { success: true, reply: cleanReply, voiceSuggest: hasVoiceSuggest };
    }
    return { success: false, reply: 'あれ、ちょっとうまく聞き取れなかった。もう一回教えてくれる？' };
  } catch (e) {
    return { success: false, reply: 'ごめん、ちょっと調子悪いみたい。少ししたらまた話そう！' };
  }
}

// ヘルスバディー初回挨拶
async function getBuddyGreeting(userName, buddyType, department) {
  try {
    const tone = getBuddyTone(buddyType);
    const buddyName = getBuddyName(buddyType);
    const hour = new Date().getHours();
    const timeContext = hour < 11 ? '朝' : hour < 17 ? '昼' : '夜';
    const deptContext = department && department !== 'その他' ? `\nユーザーの職種は「${department}」です。職種に合わせた気遣い（配送→安全運転・腰痛、倉庫→体力・腰、製造→ケガ・立ち仕事、事務→目・肩こり、管理者→多忙さ）を自然にひとこと入れてください。` : '';
    const sys = `あなたはユーザーの健康パートナー「ヘルスバディー」（${buddyName}）です。
ユーザー「${userName || 'さん'}」がアプリを開きました。現在は${timeContext}の時間帯です。${deptContext}

以下を含む挨拶を2〜3文で返してください：
- 「来てくれた」ことへの嬉しさ（「おっ、来てくれた！」「よっ！」等、友達に会った感じで）
- 今日の天気や季節に軽く触れるか、前回話した内容に触れる
- 最後は「まず、今の調子はどう？」のように体調を聞いて締める
- ★★★「何をしましょうか」「何かお手伝い」的なサービス口調は禁止。友達の口調で★★★

# 性格・口調
${tone}`;
    const reply = await callAIWithFallback(sys, '挨拶してください');
    if (reply) return { success: true, reply };
    return { success: true, reply: `おっ、${userName || ''}さん！来てくれて嬉しい😊\nまず、今の調子はどう？` };
  } catch (e) {
    return { success: true, reply: `おっ、${userName || ''}さん！来てくれて嬉しい😊\nまず、今の調子はどう？` };
  }
}

// ヘルスバディー画像付きチャット
async function chatWithBuddyImage(userMessage, imageBase64, mimeType, history, userName, buddyType) {
  try {
    const visionSys = `あなたは熟練のヘルスアドバイザー・AI栄養アドバイザーです。送られた画像（健康診断結果、薬、体の症状、食事写真など）の内容を正確に読み取り、簡潔に要約してください。

食事画像の場合は以下の観点で分析すること（国立長寿医療研究センター「栄養改善パック」2020 + 日本人の食事摂取基準2025準拠）：

【分量推定（最重要）】
写真内の基準物から料理の実サイズ・重量を推定すること:
- 箸（約23cm）、茶碗（直径約12cm、米飯150g）、味噌汁椀（約11cm）
- 丸皿（小15cm/中20cm/大26cm）、どんぶり（約15cm）
- ペットボトル（約22cm）、手の幅（約8-9cm）
- 基準物との比較で面積・厚みを推定し、食品成分表の100gあたり栄養値×推定重量で算出

【五大栄養素の推定】
- たんぱく質: 主菜の種類と推定重量から算出（目標: 1食20g程度）
- 脂質: 揚げ物・油脂の使用量（目標: エネルギー比20-30%）
- 炭水化物: 主食の種類と推定重量から算出（目標: エネルギー比50-65%）
- ビタミン: 緑黄色野菜・果物の推定重量（目標: 1食120g）
- ミネラル: カルシウム源の推定量（目標: 1食227mg）

【塩分の推定（重要）】
- 推定塩分量をg単位で算出すること（目標: 1食2.5g未満、1日7.5g未満）
- 塩分が多い要因を具体的に指摘（味噌汁、漬物、加工食品、惣菜の味付け、ラーメンのスープ等）
- コンビニ弁当・惣菜の場合は表示塩分相当量を推定

【その他】
- 主食・主菜・副菜の3品バランス
- 推定カロリー（目標: Smart Meal基準 450-650kcal/食）

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
- 食事画像: 栄養改善パック（2020）＋食事摂取基準2025に基づき、五大栄養素のバランスと推定塩分量を評価。特に塩分が多い場合は具体的に指摘（例:「この味噌汁と漬物で推定塩分3g。1食の目標2.5gを超えています」）。CANフレームワークで減塩の改善提案
- 健康診断結果: 最新の基準値に基づき、数値の意味を分かりやすく説明
- ★★★助言を含む回答の最後に必ず「📚 出典:」として根拠となるガイドライン名を明記すること★★★
- エビデンスのない助言はしない
- スモールステップで改善提案（ゴール&スモールステップ技法）
- 1回の発話は3〜4文以内
- ★★★マークダウン記法（**太字**や###見出し等）は絶対に使わない。強調したい語句は【】で囲むこと★★★`;

    const messages = [{ role: 'system', content: imageSystemPrompt }];
    if (history && history.length > 0) {
      history.forEach(h => messages.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content }));
    }
    messages.push({ role: 'user', content: combinedMessage });

    const result = await callGeminiText(null, null, { messages, temperature: 0.5, max_tokens: 1000, _fn: 'image_chat' });
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
    // チャレンジ反応データを取得
    let challengeReactionInfo = '';
    try {
      const db = getDb();
      const activeChallenges = db.prepare("SELECT challenge_id, title FROM challenges WHERE status IN ('active','recruiting') LIMIT 5").all();
      if (activeChallenges.length > 0) {
        challengeReactionInfo = '\n\n【チャレンジへのバディー経由の反応（参考情報）】\n';
        activeChallenges.forEach(c => {
          const reactions = db.prepare('SELECT reaction, COUNT(*) as count FROM challenge_reactions WHERE challenge_id = ? GROUP BY reaction').all(c.challenge_id);
          if (reactions.length > 0) {
            const labels = { want_to_try:'やってみたい', interested:'興味がある', too_much:'面倒', already_in:'参加中' };
            const total = reactions.reduce((s, r) => s + r.count, 0);
            challengeReactionInfo += `${c.title}（計${total}件）: `;
            challengeReactionInfo += reactions.map(r => `${labels[r.reaction] || r.reaction} ${r.count}件(${Math.round(r.count/total*100)}%)`).join(', ') + '\n';
          }
        });
        challengeReactionInfo += '→ 「面倒」が多い施策はアクションプランの簡素化を検討。「やってみたい」が多いテーマは優先度を上げる材料とする\n';
      }
    } catch(e) {}

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
${challengeReactionInfo}
【出力形式】JSONのみ出力。他のテキストは不要。
{"legal":3, "risk":3, "freq":3, "urgency":3, "safety":3, "value":3, "needs":3}`;

    const resText = await callAIWithFallback('あなたはJSON出力専門AIです。指定されたJSON形式のみを出力してください。', prompt);
    if (!resText) return { success: false, msg: 'AI無応答' };
    const jsonMatch = resText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { success: false, msg: 'AI出力形式エラー' };
    return { success: true, result: JSON.parse(jsonMatch[0]) };
  } catch (e) {
    return { success: false, msg: 'AIエラー: ' + e.message };
  }
}

// Gemini テキスト生成（メインAIエンジン）
async function callGeminiText(systemPrompt, userMessage, options = {}) {
  try {
    var model = GEMINI_TEXT_MODEL();
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + GEMINI_API_KEY();
    var body = { generationConfig: { temperature: options.temperature || 0.3, maxOutputTokens: options.max_tokens || 4096 } };

    if (options.messages) {
      // OpenAI互換messages配列 → Gemini形式に変換
      var sysText = '';
      var contents = [];
      options.messages.forEach(function(m) {
        if (m.role === 'system') { sysText += (sysText ? '\n' : '') + m.content; }
        else if (m.role === 'assistant') { contents.push({ role: 'model', parts: [{ text: m.content }] }); }
        else { contents.push({ role: 'user', parts: [{ text: m.content }] }); }
      });
      if (sysText) body.system_instruction = { parts: [{ text: sysText }] };
      if (contents.length === 0) contents.push({ role: 'user', parts: [{ text: '開始' }] });
      body.contents = contents;
    } else {
      // シンプルなsystem + user形式
      if (systemPrompt) body.system_instruction = { parts: [{ text: systemPrompt }] };
      body.contents = [{ role: 'user', parts: [{ text: userMessage }] }];
    }

    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      var errText = await res.text();
      throw new Error('Gemini HTTP ' + res.status + ': ' + errText.substring(0, 200));
    }
    var json = await res.json();
    var fnName = options._fn || _detectFnName(systemPrompt, userMessage);
    var tokensIn = (json.usageMetadata && json.usageMetadata.promptTokenCount) || 0;
    var tokensOut = (json.usageMetadata && json.usageMetadata.candidatesTokenCount) || 0;
    if (json.candidates && json.candidates[0] && json.candidates[0].content) {
      logAiUsage('gemini', model, fnName, tokensIn, tokensOut, true);
      return json.candidates[0].content.parts[0].text;
    }
    logAiUsage('gemini', model, fnName, tokensIn, tokensOut, false);
    return null;
  } catch (e) {
    console.error('Gemini Text error:', e.message);
    logAiUsage('gemini', GEMINI_TEXT_MODEL(), options._fn || 'gemini_error', 0, 0, false);
    return null;
  }
}

// AI呼び出し（Gemini統一）
async function callAIWithFallback(systemPrompt, userMessage) {
  return await callGeminiText(systemPrompt, userMessage);
}

module.exports = {
  callGroqApi, callGroqApiSafe, callGeminiVision, callGeminiText, callAIWithFallback,
  chatWithBuddy, getBuddyGreeting, chatWithBuddyImage,
  chatWithNurse, getNurseGreeting, chatWithNurseImage,
  parsePostScore, evaluateVoiceByAI,
  EVIDENCE_BASE, BUDDY_PERSONALITIES
};
