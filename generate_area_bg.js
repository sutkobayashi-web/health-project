// 15エリア分の固有背景を生成 (3エリア×5章)
// Usage: GEMINI_API_KEY=xxx node generate_area_bg.js
const fs = require('fs');
const path = require('path');
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY環境変数が必要です'); process.exit(1); }
const OUTPUT_DIR = path.join(__dirname, 'public', 'bg');
const MODEL = 'gemini-2.5-flash-image';

// 各エリアの固有描写
const AREAS = [
  // 第1章: はじまりの浅瀬（明るい浅海）
  { id: '1-1', name: 'shore_beach',     desc: 'shallow tropical beach shoreline, very shallow turquoise water with sun reflections, pure white sandy bottom, palm trees on horizon, bright cheerful daytime' },
  { id: '1-2', name: 'shore_cove',      desc: 'a hidden rocky cove underwater, large weathered rocks with crevices and shadows, soft sunlight filtering down, clear shallow blue-green water, peaceful sheltered atmosphere' },
  { id: '1-3', name: 'shore_corals',    desc: 'shallow coral shelf in clear turquoise water, scattered small colorful corals on white sand, sun rays piercing through ripples, friendly inviting underwater scene' },
  // 第2章: 珊瑚礁の迷宮
  { id: '2-1', name: 'reef_gate',       desc: 'massive natural coral arch entrance underwater, towering coral formations like a gate, blue-green water passing through, sense of entering somewhere new and grand' },
  { id: '2-2', name: 'reef_corridor',   desc: 'narrow underwater corridor between vibrant coral walls, walls of pink orange yellow blue corals on both sides, rainbow colored small fish darting through, magical winding passage' },
  { id: '2-3', name: 'reef_palace',     desc: 'an inner sanctuary of the coral reef, magnificent dome-shaped coral formations like a palace, deep teal water, ethereal beams of light, sacred mysterious atmosphere' },
  // 第3章: 外洋の試練
  { id: '3-1', name: 'ocean_entrance',  desc: 'transition from coral reef into vast open ocean, the reef edge dropping into deep blue, bright sunbeams pouring down, sense of vastness opening up' },
  { id: '3-2', name: 'ocean_currents',  desc: 'open mid-depth ocean with visible swirling water currents, streaks of suspended bubbles flowing in dynamic patterns, shafts of light, dramatic water movement' },
  { id: '3-3', name: 'ocean_edge',      desc: 'far open ocean approaching the abyss, water turning from blue to dark navy, last rays of sunlight from above, sense of standing at the edge of something profound' },
  // 第4章: 深海への招待
  { id: '4-1', name: 'deep_twilight',   desc: 'twilight zone of the deep sea, very dim light from far above, dark blue-purple water, scattered first bioluminescent particles starting to appear, edge of darkness' },
  { id: '4-2', name: 'deep_abyss',      desc: 'silent deep sea abyss, pitch black water with only faint distant glows, occasional bioluminescent specks like stars, sense of profound silence and vastness' },
  { id: '4-3', name: 'deep_lights',     desc: 'enchanted garden of bioluminescent creatures in pitch dark water, countless tiny glowing dots in blue purple pink, magical fairy-tale underwater scene' },
  // 第5章: 海溝の神殿
  { id: '5-1', name: 'trench_gate',     desc: 'entrance to the deepest ocean trench, towering rocky walls on both sides descending into blackness, faint light from far above, foreboding ominous atmosphere' },
  { id: '5-2', name: 'trench_temple',   desc: 'ancient submerged temple ruins in the deep trench, massive stone pillars and crumbling architecture, dim divine light filtering down, mysterious sacred ruins' },
  { id: '5-3', name: 'trench_legend',   desc: 'innermost legendary chamber at the bottom of the world, otherworldly divine glow emanating from the center, ancient runes and treasures, transcendent sacred atmosphere' },
];

async function gen(desc, outputPath) {
  if (fs.existsSync(outputPath)) {
    console.log('[SKIP]', path.basename(outputPath));
    return true;
  }
  const prompt = `A beautiful horizontal underwater scenery background, painterly illustration style: ${desc}.
Atmospheric game background art, painterly style, NO creatures or fish, NO text/labels/watermarks, wide landscape composition, depth and ambience, cinematic.`;

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
    console.log('[FAIL]', path.basename(outputPath), JSON.stringify(data).substring(0, 200));
    return false;
  } catch (e) {
    console.error('[ERR]', path.basename(outputPath), e.message);
    return false;
  }
}

(async () => {
  console.log('=== 15エリア背景生成 ===');
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  let success = 0, fail = 0;
  for (const a of AREAS) {
    const out = path.join(OUTPUT_DIR, 'area_' + a.id + '.png');
    if (await gen(a.desc, out)) success++; else fail++;
    await new Promise(r => setTimeout(r, 2500));
  }
  console.log('\n=== 完了:', success, '成功,', fail, '失敗 ===');
  const missing = AREAS.filter(a => !fs.existsSync(path.join(OUTPUT_DIR, 'area_' + a.id + '.png')));
  if (missing.length) {
    console.log('\n未生成:');
    missing.forEach(m => console.log('  - area_' + m.id + '.png (' + m.name + ')'));
  }
})();
