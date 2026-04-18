/**
 * 遭遇魚 id 61-80 を生成 (海亀/イルカ/クジラ/クラゲ etc + 昭和のおやじギャグ)
 * cd /opt/health && node server/scripts/regen-fish-extra20.js
 */
const fs = require('fs');
const path = require('path');
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY が未設定'); process.exit(1); }
const MODEL = 'gemini-2.5-flash-image';
const OUT_DIR = path.join(__dirname, '..', '..', 'public', 'fish');
const STYLE = 'A single small cartoon sea creature, three-quarter view from slightly above, simple flat 2D illustration in children-book style, soft outlines, vibrant clean colors, white background (will be made transparent), no shadow, no text, centered.';

const ITEMS = [
  // 第1章
  { file: 'rpg_61', prompt: STYLE + ' Starfish (Hitode), orange-brown 5-pointed star, textured surface.' },
  { file: 'rpg_62', prompt: STYLE + ' Hermit crab (Yadokari), tan body inside spiral seashell, peeking eyes.' },
  { file: 'rpg_63', prompt: STYLE + ' Sea urchin (Uni), dark purple-black spiky ball.' },
  // 第2章
  { file: 'rpg_64', prompt: STYLE + ' Blue sea slug (Ao-umiushi), vivid blue body with bright yellow rim, frilly gills on back.' },
  { file: 'rpg_65', prompt: STYLE + ' Fan butterflyfish (Ougi-chouchouuo), elegant disc body with yellow and white fan-pattern fins.' },
  { file: 'rpg_66', prompt: STYLE + ' Triggerfish (Mongara-kawahagi), geometric color-block patterns, blue and yellow stripes.' },
  { file: 'rpg_67', prompt: STYLE + ' Parrotfish (Budai), turquoise-green body with beak-like mouth, scaly look.' },
  // 第3章
  { file: 'rpg_68', prompt: STYLE + ' Green sea turtle (Ao-umigame), olive-green shell, gentle eyes, flippers spread for swimming.' },
  { file: 'rpg_69', prompt: STYLE + ' Hawksbill turtle (Taimai), tortoiseshell golden-brown shell pattern.' },
  { file: 'rpg_70', prompt: STYLE + ' Bottlenose dolphin (Bandou-iruka), sleek grey-blue body, friendly smile, beak-like nose.' },
  { file: 'rpg_71', prompt: STYLE + ' Humpback whale (Zatou-kujira), massive dark navy body with long pectoral fins, water spray from blowhole.' },
  { file: 'rpg_72', prompt: STYLE + ' Sperm whale (Makkou-kujira), huge boxy head, dark grey body, square front profile.' },
  // 第4章 クラゲ祭り
  { file: 'rpg_73', prompt: STYLE + ' Moon jellyfish (Mizu-kurage), translucent pale blue dome with four ring marks, drifting tentacles.' },
  { file: 'rpg_74', prompt: STYLE + ' Red jellyfish (Aka-kurage), red and white striped umbrella with wavy long tentacles.' },
  { file: 'rpg_75', prompt: STYLE + ' Spotted jellyfish (Tako-kurage), small round bell with white spots, stubby tentacles.' },
  { file: 'rpg_76', prompt: STYLE + ' Box jellyfish (Andon-kurage), square cube-shaped translucent body with thin tentacles at corners.' },
  { file: 'rpg_77', prompt: STYLE + ' Mimic octopus (Mimic-dako), bronze-brown body with white striped tentacles, intelligent look.' },
  // 第5章 伝説
  { file: 'rpg_78', prompt: STYLE + ' Mythical "Ryuugu King" sea creature, golden ornate carp-dragon hybrid, regal and ethereal.' },
  { file: 'rpg_79', prompt: STYLE + ' Mythical legendary whale, ethereal silver-purple body with celestial markings, deep cosmic aura.' },
  // ★ 昭和のおやじ (ギャグ伝説)
  { file: 'rpg_80', prompt: STYLE + ' BIZARRE GAG: Fish-human hybrid creature. Fish body with a Japanese middle-aged man face (short balding, mustache, small glasses, mellow tired expression). Beige haramaki belly band wrapped around. Holding a tiny beer can with a small human-like arm. Whimsical Japanese gag manga style. Pure white background only, NO blue, NO water, NO sea backdrop.' },
];

async function genOne(item) {
  const out = path.join(OUT_DIR, item.file + '.png');
  if (fs.existsSync(out)) fs.unlinkSync(out);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: item.prompt }] }],
    generationConfig: { responseModalities: ['IMAGE'] }
  };
  const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('HTTP '+res.status);
  const data = await res.json();
  const inline = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts.find(p=>p.inlineData);
  if (!inline) throw new Error('画像なし');
  fs.writeFileSync(out, Buffer.from(inline.inlineData.data, 'base64'));
  console.log('OK:', item.file);
}

(async () => {
  let ok=0, ng=0;
  for (const item of ITEMS) {
    try { await genOne(item); ok++; } catch(e) { console.error('NG:', item.file, e.message); ng++; }
    await new Promise(r => setTimeout(r, 1500));
  }
  console.log('=== 完了 OK:'+ok+' / NG:'+ng);
})();
