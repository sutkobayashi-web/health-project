// 8パターンの主人公魚を生成
// Usage: node generate_heroes.js
const fs = require('fs');
const path = require('path');
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY環境変数が必要です'); process.exit(1); }
const OUTPUT_DIR = path.join(__dirname, 'public', 'fish');
const MODEL = 'gemini-2.5-flash-image';

// 主人公の8パターン（色違い）
const HEROES = [
  { id: 1, name: 'blue',   desc: 'A chibi fish with bright cyan blue body and yellow fin accents' },
  { id: 2, name: 'red',    desc: 'A chibi fish with bright red body and orange fin accents' },
  { id: 3, name: 'yellow', desc: 'A chibi fish with sunny yellow body and orange fin accents' },
  { id: 4, name: 'purple', desc: 'A chibi fish with purple body and pink fin accents' },
  { id: 5, name: 'green',  desc: 'A chibi fish with emerald green body and lime green fin accents' },
  { id: 6, name: 'pink',   desc: 'A chibi fish with soft pink body and white fin accents' },
  { id: 7, name: 'navy',   desc: 'A chibi fish with deep navy body and silver fin accents' },
  { id: 8, name: 'silver', desc: 'A chibi fish with shiny silver body and light blue fin accents' },
];

async function gen(desc, outputPath) {
  if (fs.existsSync(outputPath)) {
    console.log('[SKIP]', path.basename(outputPath));
    return true;
  }
  const prompt = `A cute chibi cartoon fish character illustration. ${desc}.
Style: adorable kawaii mascot, big round eyes facing left, rounded chubby body with short tail, game sprite asset, clean pure white background, single fish centered, no text or watermarks.`;

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent?key=' + API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
        })
      }
    );
    const data = await response.json();
    const candidates = data.candidates || [];
    for (const c of candidates) {
      for (const p of (c.content && c.content.parts || [])) {
        if (p.inlineData && p.inlineData.mimeType && p.inlineData.mimeType.startsWith('image/')) {
          const buf = Buffer.from(p.inlineData.data, 'base64');
          fs.writeFileSync(outputPath, buf);
          console.log('[OK]', path.basename(outputPath), Math.round(buf.length / 1024) + 'KB');
          return true;
        }
      }
    }
    console.log('[FAIL]', path.basename(outputPath));
    return false;
  } catch (e) {
    console.error('[ERR]', path.basename(outputPath), e.message);
    return false;
  }
}

(async () => {
  console.log('=== 8主人公魚の生成 ===');
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  let success = 0, fail = 0;
  for (const h of HEROES) {
    const out = path.join(OUTPUT_DIR, 'hero_' + h.id + '.png');
    if (await gen(h.desc, out)) success++; else fail++;
    await new Promise(r => setTimeout(r, 2500));
  }
  console.log('\n=== 完了:', success, '成功,', fail, '失敗 ===');
  const missing = HEROES.filter(h => !fs.existsSync(path.join(OUTPUT_DIR, 'hero_' + h.id + '.png')));
  if (missing.length) {
    console.log('\n未生成:');
    missing.forEach(m => console.log('  - hero_' + m.id + '.png (' + m.name + ')'));
  }
})();
