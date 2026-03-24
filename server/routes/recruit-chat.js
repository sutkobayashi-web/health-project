/**
 * 採用チャットBOT API
 * スタンダード運輸グループHP用
 * 認証不要（公開エンドポイント）
 */
const express = require('express');
const router = express.Router();
const { callGroqApi } = require('../services/ai');

const SYSTEM_PROMPT = `あなたはスタンダード運輸グループの採用アシスタントBOTです。
求職者からの質問に、親しみやすく正確に回答してください。

# 会社情報
- 正式名称: スタンダード運輸グループ（株式会社スタンダード運輸、株式会社茨運、スズエ電機株式会社）
- 設立: 1972年
- 本社: 神奈川県海老名市上今泉3-2-33
- 営業所: 海老名本社、埼玉営業所、三和営業所、鹿島営業所
- 事業内容: 住宅設備メーカー（タカラスタンダード）製品の配送、電子部品製造
- 従業員数: グループ約180名

# 認証・認定
- 働きやすい職場認証制度 三つ星（全国トラック事業者34社のみ）
- 安全性優良事業所（Gマーク）
- 健康経営優良法人2024認定

# 募集職種
- 大型ドライバー: 月給約28〜37万円
- 4tドライバー: 月給約28〜30万円
- 2tドライバー: 月給約24万円〜
- 倉庫内作業スタッフ
- 製造スタッフ（スズエ電機）
- 設備施工スタッフ

# 待遇・福利厚生
- 年間休日105日以上
- 賞与年2回、昇給年1回
- 社会保険完備
- 資格取得支援制度（大型免許、フォークリフト等）
- 未経験者歓迎（入社後2ヶ月間の横乗り研修あり）
- 社宅あり（一部）
- 無事故手当あり

# 外国人採用
- 日本の運転免許保持者は応募可能
- Gマーク・働きやすい職場認証を取得しており、特定技能「自動車運送業」の受入れ要件を満たしている
- 多国籍の社員が活躍中

# 会社説明会
- 履歴書不要、私服OK、家族同伴OK
- 施設見学、先輩社員との座談会、当日面接も可能
- 申込み: 電話 046-231-0578 / メール info@standard-transport.co.jp

# 経営方針
- 「風通しが良く、世代を問わず、社会に貢献できる職場づくりを目指す」
- サステナビリティ経営: 社員・地域・環境すべてが持続する経営
- 社員主導の健康経営プロジェクト（AIアプリを自社開発、2026年4月本格稼働）
- 20代〜40代の比率を50%まで引き上げる10年計画を実行中

# 回答ルール
1. 3〜5文で簡潔に回答する
2. 親しみやすく温かいトーンで
3. わからないことは正直に「説明会で詳しくお伝えします」と案内する
4. 具体的な数字を使って回答する
5. 質問が日本語以外の場合は、その言語で回答する（英語、ポルトガル語、ベトナム語に対応）
6. 個人情報や機密情報は回答しない
7. 他社の悪口や比較は絶対にしない
8. 採用に無関係な質問（天気、政治など）には「採用に関するご質問にお答えしています」と返す`;

// POST /api/recruit-chat
router.post('/', async (req, res) => {
  const { message, lang, history } = req.body;
  if (!message || !message.trim()) {
    return res.json({ success: false, reply: '' });
  }

  try {
    // Build messages array with history for context
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

    if (history && Array.isArray(history)) {
      // Last 6 messages for context (to keep token usage low)
      const recent = history.slice(-6);
      recent.forEach(h => {
        messages.push({ role: h.role === 'bot' ? 'assistant' : 'user', content: h.text });
      });
    }

    // Add language hint if not Japanese
    let userMsg = message;
    if (lang && lang !== 'ja') {
      const langNames = { en: 'English', pt: 'Portuguese', vi: 'Vietnamese' };
      userMsg = `[Reply in ${langNames[lang] || 'English'}] ${message}`;
    }
    messages.push({ role: 'user', content: userMsg });

    const reply = await callGroqApi(SYSTEM_PROMPT, userMsg, {
      messages,
      temperature: 0.5,
      max_tokens: 300
    });

    res.json({ success: true, reply: reply || 'お問い合わせありがとうございます。詳しくはお電話（046-231-0578）でご確認ください。' });
  } catch (e) {
    console.error('Recruit chat error:', e.message);
    res.json({ success: true, reply: 'ただいま混み合っております。お電話（046-231-0578）またはメール（info@standard-transport.co.jp）でお問い合わせください。' });
  }
});

module.exports = router;
