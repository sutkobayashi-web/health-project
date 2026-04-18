/**
 * 15エリア背景の再生成 (Gemini 2.5 Flash Image)
 *
 * 使い方:
 *   cd /opt/health && node server/scripts/generate-area-backgrounds.js
 *   (環境変数 GEMINI_API_KEY が必要)
 *
 * 出力先: /opt/health/public/bg/<bgFile>.png
 *
 * 既存ファイルは強制上書き。1.5秒間隔、約30秒で完走。
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY が未設定'); process.exit(1); }

const MODEL = 'gemini-2.5-flash-image';
const OUT_DIR = path.join(__dirname, '..', '..', 'public', 'bg');

// 共通スタイル
const STYLE = 'Cinematic painterly underwater scene in Studio Ghibli × Subnautica style, atmospheric depth, dramatic lighting, no text, no characters, no fish, no people, vertical portrait composition, immersive environment art.';

const ITEMS = [
  // === 第1章: 浅瀬 (光に満ちた明るい海) ===
  { file: 'area_1-1', prompt: STYLE + ' Sun-drenched shallow tropical lagoon, pale turquoise crystal-clear water, sunlight rays piercing the surface from above, white sandy bottom with gentle ripples, distant glow.' },
  { file: 'area_1-2', prompt: STYLE + ' Rocky cove underwater, shafts of sunlight streaming through gaps in dark volcanic rocks, teal-green water, scattered pebbles, sense of mystery in the shadows.' },
  { file: 'area_1-3', prompt: STYLE + ' Shallow coral garden, vibrant pastel pink and orange brain corals on white sand, dappled sunlight from above, clear cyan water, peaceful and inviting.' },

  // === 第2章: 珊瑚礁 (色彩と神秘) ===
  { file: 'area_2-1', prompt: STYLE + ' Massive arched coral gateway, towering pink and lavender soft corals form a natural arch, deep cerulean water beyond, godrays cascading through.' },
  { file: 'area_2-2', prompt: STYLE + ' Iridescent coral corridor, prismatic light reflections on multicolored fan corals, magenta purple gold ribbons of light, mid-depth blue water.' },
  { file: 'area_2-3', prompt: STYLE + ' Mysterious coral palace ruins underwater, ornate pillar-like coral formations, deep sapphire-violet water, shafts of distant blue light, sacred atmosphere.' },

  // === 第3章: 外洋 (広大さと孤独) ===
  { file: 'area_3-1', prompt: STYLE + ' Vast endless open ocean horizon, infinite midnight blue, distant pelagic depth, silvery shimmer near surface above, sense of immense scale, no land, no shore.' },
  { file: 'area_3-2', prompt: STYLE + ' Powerful ocean current with swirling water patterns, deep navy and slate-blue flowing currents, scattered marine particles caught in the flow, dramatic motion.' },
  { file: 'area_3-3', prompt: STYLE + ' Twilight zone of the open ocean, fading sunlight from far above, gradient from dim teal to inky deep blue below, lonely and cold.' },

  // === 第4章: 深海 (闇と発光) ===
  { file: 'area_4-1', prompt: STYLE + ' Threshold of the dark deep sea, last traces of pale blue light fading into pitch black below, suspended marine snow particles drifting, cold and silent.' },
  { file: 'area_4-2', prompt: STYLE + ' Silent abyss, pure darkness with subtle dark navy gradients, faint specks of bioluminescent dots scattered in the depths, total stillness.' },
  { file: 'area_4-3', prompt: STYLE + ' Bioluminescent garden, countless soft glowing dots in cyan green and indigo, dark deep water with magical light particles, ethereal beauty.' },

  // === 第5章: 海淵 (太古と神秘) ===
  { file: 'area_5-1', prompt: STYLE + ' Entrance to the deepest oceanic trench, towering vertical walls of dark rock disappearing into blackness, faint glowing markers on the walls, ominous gravity.' },
  { file: 'area_5-2', prompt: STYLE + ' Ancient submerged temple corridor, weathered stone columns and arches in deep blackwater, soft mystical golden runes glowing on walls, primordial silence.' },
  { file: 'area_5-3', prompt: STYLE + ' Legendary chamber of the abyss, vast cavern with cosmic-like glow, swirls of nebula-like phosphorescent currents, otherworldly transcendent atmosphere, unreached frontier.' },
];

async function genOne(item) {
  const out = path.join(OUT_DIR, item.file + '.png');
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
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  let ok = 0, ng = 0;
  for (const item of ITEMS) {
    try { await genOne(item); ok++; }
    catch (e) { console.error('NG:', item.file, '-', e.message); ng++; }
    await new Promise(r => setTimeout(r, 1500));
  }
  console.log('\n=== 完了 === OK:' + ok + ' / NG:' + ng);
})();
