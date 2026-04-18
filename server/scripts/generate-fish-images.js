/**
 * 魚画像一括生成スクリプト (Gemini 2.5 Flash Image)
 *
 * 使い方:
 *   cd /opt/health && node server/scripts/generate-fish-images.js
 *   (環境変数 GEMINI_API_KEY が必要)
 *
 * 出力先: /opt/health/public/fish/<imgFile>.png
 *
 * 生成済みファイルはスキップする (再実行可能)。
 * 1リクエスト約2秒。全40枚で約2分。
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY が未設定'); process.exit(1); }

const MODEL = 'gemini-2.5-flash-image';
const OUT_DIR = path.join(__dirname, '..', '..', 'public', 'fish');

// 共通スタイル: 透過PNG / 横向き / シンプルな2Dカートゥーン / 影なし背景
const BASE_STYLE = 'A single small cartoon fish, side profile facing right, simple flat 2D illustration in a children-book style, soft outlines, vibrant clean colors, white background (will be made transparent), no shadow, no text, centered.';

const ITEMS = [
  // ============ HERO VARIANTS 11-20 ============
  { file: 'hero_type_11', prompt: BASE_STYLE + ' Silver streaked fish with starry sparkle pattern across its scales, slightly metallic blue body.' },
  { file: 'hero_type_12', prompt: BASE_STYLE + ' Soft pink cherry-blossom themed fish with petal-shaped fins.' },
  { file: 'hero_type_13', prompt: BASE_STYLE + ' Jade-green messenger fish with elegant flowing fins, ribbon-like tail.' },
  { file: 'hero_type_14', prompt: BASE_STYLE + ' Vermillion red phoenix-style fish with flame-like fins, golden eye.' },
  { file: 'hero_type_15', prompt: BASE_STYLE + ' Pale moonlight white-blue fish with crescent-moon mark on its side.' },
  { file: 'hero_type_16', prompt: BASE_STYLE + ' Golden traveler fish with glowing yellow body, brass-trimmed fins.' },
  { file: 'hero_type_17', prompt: BASE_STYLE + ' Snow fish with strong navy-blue outline, body in pale icy lavender (NOT white), bright cyan accents on fins. Body must be clearly colored, never pure white.' },
  { file: 'hero_type_18', prompt: BASE_STYLE + ' Deep purple fish with cloudy lavender pattern, mystical aura.' },
  { file: 'hero_type_19', prompt: BASE_STYLE + ' Turquoise guardian fish with armor-plate scales, strong jaw.' },
  { file: 'hero_type_20', prompt: BASE_STYLE + ' Sky-blue swift whirlwind fish with sweeping wing-like fins.' },

  // ============ RPG_FISH 31-60 ============
  // 第1章 (浅瀬) - common
  { file: 'rpg_31', prompt: BASE_STYLE + ' Ayu sweetfish, slender body, light olive-yellow gradient, freshwater fish.' },
  { file: 'rpg_32', prompt: BASE_STYLE + ' Dojo loach, long brown eel-like fish with whiskers, side view.' },
  { file: 'rpg_33', prompt: BASE_STYLE + ' Small pale yellow Motsugo minnow, simple narrow body.' },
  { file: 'rpg_34', prompt: BASE_STYLE + ' Tanago bitterling fish with iridescent rainbow sheen, oval body.' },
  { file: 'rpg_35', prompt: BASE_STYLE + ' Mebaru rockfish, large eyes, reddish-brown spotted body.' },
  { file: 'rpg_36', prompt: BASE_STYLE + ' Kasago scorpionfish, rough brown bumpy body, defensive spines.' },
  // 第2章 (サンゴ礁) - uncommon/rare
  { file: 'rpg_37', prompt: BASE_STYLE + ' Bera wrasse fish, multicolor green-blue-pink stripes.' },
  { file: 'rpg_38', prompt: BASE_STYLE + ' Yellow and navy royal angelfish (Kinchakudai), elegant disc shape.' },
  { file: 'rpg_39', prompt: BASE_STYLE + ' Pink Hanadai anthias fish, glowing rose body, lyre-shaped tail.' },
  { file: 'rpg_40', prompt: BASE_STYLE + ' Nishikibera rainbow wrasse, brilliant blue-green-orange streaks.' },
  { file: 'rpg_41', prompt: BASE_STYLE + ' Seahorse (Tatsunoootoshigo), curled tail, golden body, vertical pose adapted to side view.' },
  { file: 'rpg_42', prompt: BASE_STYLE + ' Pygmy seahorse, tiny pinkish body covered in coral-like nodules.' },
  // 第3章 (外洋) - uncommon/rare/ultra
  { file: 'rpg_43', prompt: BASE_STYLE + ' Tuna (Maguro), large torpedo-shaped silver-blue body, powerful tail.' },
  { file: 'rpg_44', prompt: BASE_STYLE + ' Bonito (Katsuo), slim silver fish with horizontal stripes on belly.' },
  { file: 'rpg_45', prompt: BASE_STYLE + ' Mahi-mahi (Shiira), iridescent blue-green-yellow rainbow body, blunt forehead.' },
  { file: 'rpg_46', prompt: BASE_STYLE + ' Sailfish (Bashokajiki) with huge sail-like dorsal fin spread, pointed bill. Body in deep ocean blue with dark navy outline, dorsal fin in bright purple. Body must NOT be white or silver.' },
  { file: 'rpg_47', prompt: BASE_STYLE + ' Whale shark (Jinbeezame), massive grey-blue body with white polka dot pattern.' },
  { file: 'rpg_48', prompt: BASE_STYLE + ' Killer whale (Shachi/Orca), iconic black body with white belly patches.' },
  // 第4章 (深海) - rare/ultra
  { file: 'rpg_49', prompt: BASE_STYLE + ' Green tassled anglerfish (Midorifusa-anko), greenish bulbous body with feathery growths.' },
  { file: 'rpg_50', prompt: BASE_STYLE + ' Armored shark (Yoroizame), dark grey rough scales, plated head.' },
  { file: 'rpg_51', prompt: BASE_STYLE + ' Megamouth shark, massive rounded head, gigantic open mouth, dark grey body.' },
  { file: 'rpg_52', prompt: BASE_STYLE + ' Barreleye fish (Demenigisu), translucent dome head with green tubular eyes inside.' },
  { file: 'rpg_53', prompt: BASE_STYLE + ' Frilled shark (Rabuka), eel-like long body, frilly gill slits, ancient look.' },
  { file: 'rpg_54', prompt: BASE_STYLE + ' Hagfish (Nutaunagi), primitive eel-like body in dark muted purple-grey with dark outline. Glossy slimy texture. Body must NOT be white or pale.' },
  // 第5章 (海淵) - ultra/legend
  { file: 'rpg_55', prompt: BASE_STYLE + ' Mystical "Origin of Life" creature, glowing green-cyan microbial fish form, hydrothermal vent aesthetic.' },
  { file: 'rpg_56', prompt: BASE_STYLE + ' Bioluminescent "Abyss Butterfly" fish, large translucent wing-like fins glowing purple-pink.' },
  { file: 'rpg_57', prompt: BASE_STYLE + ' "Time Traveler" legendary fish, silver body with clock-gear markings, ethereal blue glow.' },
  { file: 'rpg_58', prompt: BASE_STYLE + ' "Moon Fish" legendary, pearl-white circular body radiating moonlight, ghostly indigo aura.' },
  { file: 'rpg_59', prompt: BASE_STYLE + ' "Genesis Scale" legendary giant fish, golden ancient scales, primordial earthy colors.' },
  { file: 'rpg_60', prompt: BASE_STYLE + ' "Cosmic Whale" legendary, deep purple body with stars, galaxy patterns, cosmic aura.' },
];

async function genOne(item) {
  const out = path.join(OUT_DIR, item.file + '.png');
  if (fs.existsSync(out)) { console.log('SKIP (exists):', item.file); return; }
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
  if (!inline) throw new Error('画像データなし: ' + JSON.stringify(data).slice(0, 200));
  fs.writeFileSync(out, Buffer.from(inline.inlineData.data, 'base64'));
  console.log('OK:', item.file, '(' + Math.round(fs.statSync(out).size / 1024) + 'KB)');
}

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  let ok = 0, ng = 0, skip = 0;
  for (const item of ITEMS) {
    try {
      const out = path.join(OUT_DIR, item.file + '.png');
      if (fs.existsSync(out)) { skip++; continue; }
      await genOne(item);
      ok++;
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.error('NG:', item.file, '-', e.message);
      ng++;
    }
  }
  console.log('\n=== 完了 === OK:' + ok + ' / NG:' + ng + ' / SKIP:' + skip);
})();
