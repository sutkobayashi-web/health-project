/**
 * 主人公魚20種を斜め視点で再生成
 *
 * 使い方:
 *   cd /opt/health && node server/scripts/regen-hero-diagonal.js
 *
 * 既存の hero_type_*.png を強制上書き(削除してから生成)。
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY が未設定'); process.exit(1); }
const MODEL = 'gemini-2.5-flash-image';
const OUT_DIR = path.join(__dirname, '..', '..', 'public', 'fish');

// 共通スタイル: 斜め視点(3/4 view)で水中を泳いでいる雰囲気
const BASE_STYLE = 'A single small cartoon fish swimming, three-quarter view from slightly above and side (diagonal angle, dynamic perspective as if approaching the viewer), simple flat 2D illustration, children-book style, soft outlines, vibrant clean colors, white background (will be made transparent), no shadow, no text, centered, body clearly visible from the angle.';

const HEROES = [
  { file: 'hero_type_1',  prompt: BASE_STYLE + ' Bright cyan hero fish with sparkly highlights, brave warrior look.' },
  { file: 'hero_type_2',  prompt: BASE_STYLE + ' Royal purple noble fish wearing a small golden crown on its head, elegant fins.' },
  { file: 'hero_type_3',  prompt: BASE_STYLE + ' Vivid red racer fish with white chevron stripes, streamlined body, speedy look.' },
  { file: 'hero_type_4',  prompt: BASE_STYLE + ' Dark gunmetal-blue armored knight fish with a small helmet, riveted scales. Body must be dark steel-blue.' },
  { file: 'hero_type_5',  prompt: BASE_STYLE + ' Mystical blue fish with glowing aura, ethereal fins.' },
  { file: 'hero_type_6',  prompt: BASE_STYLE + ' Orange-gold dragon-descendant fish with horn-like fins and ornate scales.' },
  { file: 'hero_type_7',  prompt: BASE_STYLE + ' Sleek dark navy ninja fish with masked face stripe.' },
  { file: 'hero_type_8',  prompt: BASE_STYLE + ' Bright sunshine yellow round fish with cheerful big eyes.' },
  { file: 'hero_type_9',  prompt: BASE_STYLE + ' Deep purple sage fish with mystical eye, scholarly look.' },
  { file: 'hero_type_10', prompt: BASE_STYLE + ' Iridescent rainbow shimmer fish with prismatic scales.' },
  { file: 'hero_type_11', prompt: BASE_STYLE + ' Silver streaked fish with starry sparkle pattern across its scales, slightly metallic blue body.' },
  { file: 'hero_type_12', prompt: BASE_STYLE + ' Cherry-blossom themed fish with deep magenta-pink saturated body and dark crimson outline, petal-shaped fins. Body must be vivid pink, NOT pale.' },
  { file: 'hero_type_13', prompt: BASE_STYLE + ' Jade-green messenger fish with elegant flowing fins, ribbon-like tail.' },
  { file: 'hero_type_14', prompt: BASE_STYLE + ' Vermillion red phoenix-style fish with flame-like fins, golden eye.' },
  { file: 'hero_type_15', prompt: BASE_STYLE + ' Deep midnight-indigo fish with glowing yellow crescent-moon mark on its side, dark navy outline. Body must be dark indigo.' },
  { file: 'hero_type_16', prompt: BASE_STYLE + ' Golden traveler fish with glowing yellow body, brass-trimmed fins.' },
  { file: 'hero_type_17', prompt: BASE_STYLE + ' Snow fish with strong navy-blue outline, body in pale icy lavender (NOT white), bright cyan accents on fins. Body must be clearly colored.' },
  { file: 'hero_type_18', prompt: BASE_STYLE + ' Deep purple fish with cloudy lavender pattern, mystical aura.' },
  { file: 'hero_type_19', prompt: BASE_STYLE + ' Turquoise guardian fish with armor-plate scales, strong jaw.' },
  { file: 'hero_type_20', prompt: BASE_STYLE + ' Sky-blue swift whirlwind fish with sweeping wing-like fins.' },
];

async function genOne(item) {
  const out = path.join(OUT_DIR, item.file + '.png');
  if (fs.existsSync(out)) fs.unlinkSync(out);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: item.prompt }] }],
    generationConfig: { responseModalities: ['IMAGE'] }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (await res.text()).slice(0, 200));
  const data = await res.json();
  const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
  const inline = parts && parts.find(p => p.inlineData);
  if (!inline) throw new Error('画像データなし');
  fs.writeFileSync(out, Buffer.from(inline.inlineData.data, 'base64'));
  console.log('OK:', item.file, '(' + Math.round(fs.statSync(out).size / 1024) + 'KB)');
}

(async () => {
  let ok = 0, ng = 0;
  for (const item of HEROES) {
    try { await genOne(item); ok++; }
    catch (e) { console.error('NG:', item.file, '-', e.message); ng++; }
    await new Promise(r => setTimeout(r, 1500));
  }
  console.log('\n=== 完了 === OK:' + ok + ' / NG:' + ng);
})();
