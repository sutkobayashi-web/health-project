// 10種類の個性的な主人公魚を生成
// Usage: GEMINI_API_KEY=xxx node generate_hero_types.js
const fs = require('fs');
const path = require('path');
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY環境変数が必要です'); process.exit(1); }
const OUTPUT_DIR = path.join(__dirname, 'public', 'fish');
const MODEL = 'gemini-2.5-flash-image';

// 10種類の個性的な主人公デザイン (形・雰囲気が違う)
const HEROES = [
  { id: 1,  name: 'cyan',    desc: 'bright cyan and gold classic hero fish with rounded body, big brave eyes, short tail' },
  { id: 2,  name: 'crown',   desc: 'regal royal purple fish with a golden crown pattern on its head, elegant long fins, noble expression' },
  { id: 3,  name: 'racer',   desc: 'streamlined red-and-white racer fish with sleek dart-like body, speed stripes, determined expression' },
  { id: 4,  name: 'knight',  desc: 'armored warrior fish with silver metallic scales that look like armor, strong angular body, determined eyes' },
  { id: 5,  name: 'mystic',  desc: 'translucent glowing blue mystical fish with ethereal fins, soft magical glow aura, dreamy eyes' },
  { id: 6,  name: 'dragon',  desc: 'orange and gold dragon-fish hybrid with whiskers and tiny wings, fierce expression, oriental design' },
  { id: 7,  name: 'ninja',   desc: 'dark navy stealthy ninja fish with a mask-like face pattern, thin sleek body, sharp focused eyes' },
  { id: 8,  name: 'sunny',   desc: 'bright sunny yellow cheerful chubby fish with big smile, round body, happy sparkly eyes' },
  { id: 9,  name: 'abyssal', desc: 'deep dark purple mysterious deep-sea fish with bioluminescent dots on body, wise ancient eyes' },
  { id: 10, name: 'rainbow', desc: 'iridescent rainbow fish with shimmering multi-color scales transitioning through the spectrum, joyful expression' },
];

async function gen(desc, outputPath) {
  if (fs.existsSync(outputPath)) {
    console.log('[SKIP]', path.basename(outputPath));
    return true;
  }
  const prompt = `A cute chibi-style mascot fish character illustration, full body, facing left in swimming pose. ${desc}.
Style requirements:
- Adorable kawaii cartoon chibi, NOT realistic
- Big sparkly expressive eyes, rounded stylized body shape
- Clean vector-like outlines, vibrant colors, soft cel-shading
- Game sprite asset style, centered composition
- Pure white or very light solid background
- No text, no labels, no watermarks, no bubbles, no other objects
- Single character only, full body visible`;

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
    console.log('[FAIL]', path.basename(outputPath), JSON.stringify(data).substring(0,300));
    return false;
  } catch (e) {
    console.error('[ERR]', path.basename(outputPath), e.message);
    return false;
  }
}

(async () => {
  console.log('=== 10種類の主人公魚生成 ===');
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  let success = 0, fail = 0;
  for (const h of HEROES) {
    const out = path.join(OUTPUT_DIR, 'hero_type_' + h.id + '.png');
    if (await gen(h.desc, out)) success++; else fail++;
    await new Promise(r => setTimeout(r, 2500));
  }
  console.log('\n=== 完了:', success, '成功,', fail, '失敗 ===');
  const missing = HEROES.filter(h => !fs.existsSync(path.join(OUTPUT_DIR, 'hero_type_' + h.id + '.png')));
  if (missing.length) {
    console.log('\n未生成:');
    missing.forEach(m => console.log('  - hero_type_' + m.id + '.png (' + m.name + ')'));
  }
})();
