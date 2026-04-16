// CoWell RPG用: Geminiで海の生き物30種+主人公+5章背景を生成
// Usage: node generate_fish.js
// 出力: public/fish/fish_1.png ~ fish_30.png + hero.png + bg_ch1.png ~ bg_ch5.png

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyA0MexJsJWaaFz_q-lUMUru3YcDMh6HCRM';
const OUTPUT_DIR = path.join(__dirname, 'public', 'fish');
const BG_DIR = path.join(__dirname, 'public', 'bg');
const MODEL = 'gemini-2.5-flash-image';

// CoWell RPG 魚種リスト（エリア順）
const RPG_FISH = [
  // 第1章: はじまりの浅瀬
  { id: 1,  jp: 'メダカ',             en: 'Medaka',              desc: 'tiny pale silver Japanese rice fish, simple and cute', rarity: 'common' },
  { id: 2,  jp: 'ハゼ',               en: 'Goby',                desc: 'small tan-brown bottom fish with wide pectoral fins', rarity: 'common' },
  { id: 3,  jp: 'グッピー',            en: 'Guppy',               desc: 'small fish with a big colorful fantail in orange and purple', rarity: 'common' },
  { id: 4,  jp: 'ネオンテトラ',         en: 'Neon Tetra',          desc: 'tiny fish with bright blue-red glowing horizontal stripe', rarity: 'common' },
  { id: 5,  jp: 'プラティ',            en: 'Platy',               desc: 'chubby bright orange tropical fish', rarity: 'common' },
  { id: 6,  jp: 'ゼブラダニオ',         en: 'Zebra Danio',         desc: 'slim fish with blue and silver horizontal stripes', rarity: 'common' },
  // 第2章: 珊瑚礁の迷宮
  { id: 7,  jp: 'カクレクマノミ',       en: 'Clownfish',           desc: 'orange fish with white stripes and black edges, Nemo-style', rarity: 'uncommon' },
  { id: 8,  jp: 'チョウチョウウオ',     en: 'Butterflyfish',       desc: 'yellow and white fish with black eye band, elegant butterfly-like', rarity: 'uncommon' },
  { id: 9,  jp: 'ルリスズメダイ',       en: 'Blue Damselfish',     desc: 'brilliant cobalt blue small reef fish, jewel-like', rarity: 'uncommon' },
  { id: 10, jp: 'ハタタテハゼ',         en: 'Firefish Goby',       desc: 'red and white goby with a tall flag-like dorsal fin', rarity: 'uncommon' },
  { id: 11, jp: 'マンダリンフィッシュ',  en: 'Mandarinfish',        desc: 'stunning rainbow patterned fish with swirls of blue orange and green', rarity: 'rare' },
  { id: 12, jp: 'ナンヨウハギ',         en: 'Blue Tang',           desc: 'vibrant blue fish with yellow tail and black markings, Dory-style', rarity: 'uncommon' },
  // 第3章: 外洋の試練
  { id: 13, jp: 'ウミガメ',            en: 'Sea Turtle',          desc: 'graceful green sea turtle with patterned shell, swimming', rarity: 'rare' },
  { id: 14, jp: 'トビウオ',            en: 'Flying Fish',         desc: 'silver fish with large wing-like pectoral fins spread wide', rarity: 'uncommon' },
  { id: 15, jp: 'エンゼルフィッシュ',    en: 'Angelfish',           desc: 'tall triangular fish with black vertical stripes on silver body, elegant', rarity: 'rare' },
  { id: 16, jp: 'カジキ',              en: 'Marlin',              desc: 'streamlined blue marlin with a long pointed bill/sword', rarity: 'rare' },
  { id: 17, jp: 'マンタ',              en: 'Manta Ray',           desc: 'huge graceful manta ray with wide wings, dark blue top white belly', rarity: 'ultra' },
  { id: 18, jp: 'イルカ',              en: 'Dolphin',             desc: 'friendly blue-gray dolphin with big kind eyes', rarity: 'rare' },
  // 第4章: 深海への招待
  { id: 19, jp: 'チョウチンアンコウ',    en: 'Anglerfish',          desc: 'deep sea anglerfish with glowing bioluminescent lure on its head, dark body', rarity: 'rare' },
  { id: 20, jp: 'ハッチェットフィッシュ', en: 'Hatchetfish',         desc: 'silver deep-sea fish shaped like a hatchet with big eyes', rarity: 'uncommon' },
  { id: 21, jp: 'リュウグウノツカイ',    en: 'Oarfish',             desc: 'extremely long silver ribbon-like fish with flowing red fins, mythical', rarity: 'ultra' },
  { id: 22, jp: 'ダイオウイカ',         en: 'Giant Squid',         desc: 'massive red giant squid with huge round eye and tentacles', rarity: 'ultra' },
  { id: 23, jp: 'ホタルイカ',           en: 'Firefly Squid',       desc: 'small glowing bioluminescent blue squid, fairy-like', rarity: 'rare' },
  { id: 24, jp: 'クラゲ',              en: 'Jellyfish',           desc: 'ethereal translucent jellyfish with long glowing tentacles, purple-pink glow', rarity: 'rare' },
  // 第5章: 海溝の神殿
  { id: 25, jp: 'シーラカンス',         en: 'Coelacanth',          desc: 'ancient living fossil fish with primitive fins, deep blue-gray, prehistoric look', rarity: 'ultra' },
  { id: 26, jp: 'メンダコ',             en: 'Dumbo Octopus',       desc: 'cute pink-purple deep sea octopus with ear-like fins on head', rarity: 'rare' },
  { id: 27, jp: 'フェニックスフィッシュ', en: 'Phoenix Fish',        desc: 'mythical fish with fiery red-gold flames for fins, phoenix-like, legendary', rarity: 'legend' },
  { id: 28, jp: '金龍',                en: 'Golden Dragon Fish',  desc: 'majestic golden dragon fish with shimmering scales, legendary oriental dragon', rarity: 'legend' },
  { id: 29, jp: '海神の使い',           en: 'Sea God Messenger',   desc: 'mystical divine fish with turquoise glow and ornate patterns, ethereal and holy', rarity: 'legend' },
  { id: 30, jp: '虹のクジラ',           en: 'Rainbow Whale',       desc: 'gigantic whale with rainbow iridescent body, magical and awe-inspiring', rarity: 'legend' },
];

// 章ごとの背景
const CHAPTER_BG = [
  { id: 1, name: 'ch1_shore',   desc: 'shallow tropical sea shoreline, bright turquoise water with sunlight streaming through, sandy bottom with small colorful corals, happy peaceful atmosphere' },
  { id: 2, name: 'ch2_reef',    desc: 'vibrant coral reef underwater scene, colorful corals in pink orange blue yellow, crystal clear blue water, sunbeams filtering down' },
  { id: 3, name: 'ch3_ocean',   desc: 'open deep blue ocean, sunbeams from above, sense of vast empty depth, a bit mysterious' },
  { id: 4, name: 'ch4_deepsea', desc: 'very dark deep sea, bioluminescent glowing particles and specks of light scattered in pitch black water, mysterious and magical' },
  { id: 5, name: 'ch5_trench',  desc: 'extremely dark ocean trench depths, ancient ruins silhouettes in the distance, faint divine glow, legendary and mystical atmosphere' },
];

async function generateImage(desc, outputPath, style) {
  if (fs.existsSync(outputPath)) {
    console.log(`[SKIP] ${path.basename(outputPath)} already exists`);
    return true;
  }

  const prompt = style === 'bg'
    ? `Generate a beautiful horizontal underwater scenery background image: ${desc}.
Style: atmospheric game background art, painterly style, no creatures or fish visible, NO text/labels/watermarks, wide landscape composition, depth and ambience.`
    : `Generate a single cute chibi-style sea creature illustration: ${desc}.
Style requirements:
- Adorable kawaii cartoon style with big sparkly eyes
- Clean vector-like outlines, soft colorful shading
- Creature faces LEFT in a natural swimming pose
- Transparent or pure white background
- No text, no labels, no watermarks, no bubbles, no other objects
- Centered game sprite asset, clean and professional
- Single creature only, full body visible`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[ERROR] ${path.basename(outputPath)}: HTTP ${response.status} - ${errText.substring(0, 200)}`);
      return false;
    }

    const data = await response.json();
    const candidates = data.candidates || [];
    for (const candidate of candidates) {
      const parts = candidate.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.mimeType?.startsWith('image/')) {
          const buffer = Buffer.from(part.inlineData.data, 'base64');
          fs.writeFileSync(outputPath, buffer);
          console.log(`[OK] ${path.basename(outputPath)} saved - ${Math.round(buffer.length / 1024)}KB`);
          return true;
        }
      }
    }

    console.error(`[WARN] ${path.basename(outputPath)}: No image in response`);
    return false;
  } catch (err) {
    console.error(`[ERROR] ${path.basename(outputPath)}: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('=== CoWell RPG 画像生成 ===');
  console.log(`Model: ${MODEL}`);
  console.log(`Fish: ${RPG_FISH.length}, BG: ${CHAPTER_BG.length}, Hero: 1\n`);

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (!fs.existsSync(BG_DIR)) fs.mkdirSync(BG_DIR, { recursive: true });

  let success = 0, fail = 0;

  // 主人公（プレイヤーの分身）
  const heroPath = path.join(OUTPUT_DIR, 'hero.png');
  if (await generateImage('a cute bright blue heroic-looking small fish with a determined expression, the main character of an adventure game, protagonist style, bright cyan-blue body with gold accents', heroPath, 'fish')) success++; else fail++;
  await new Promise(r => setTimeout(r, 2000));

  // 章背景
  for (const bg of CHAPTER_BG) {
    const bgPath = path.join(BG_DIR, `${bg.name}.png`);
    if (await generateImage(bg.desc, bgPath, 'bg')) success++; else fail++;
    await new Promise(r => setTimeout(r, 2000));
  }

  // 魚30種
  for (const fish of RPG_FISH) {
    const outPath = path.join(OUTPUT_DIR, `rpg_${fish.id}.png`);
    if (await generateImage(fish.desc, outPath, 'fish')) success++; else fail++;
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n=== 完了: ${success} 成功, ${fail} 失敗 ===`);

  const missing = [];
  if (!fs.existsSync(heroPath)) missing.push('hero.png');
  for (const bg of CHAPTER_BG) {
    if (!fs.existsSync(path.join(BG_DIR, `${bg.name}.png`))) missing.push(bg.name + '.png');
  }
  for (const fish of RPG_FISH) {
    if (!fs.existsSync(path.join(OUTPUT_DIR, `rpg_${fish.id}.png`))) {
      missing.push(`rpg_${fish.id}.png (${fish.jp})`);
    }
  }
  if (missing.length > 0) {
    console.log('\n未生成ファイル:');
    missing.forEach(m => console.log('  - ' + m));
    console.log('\n再実行で未生成のみ生成されます');
  }
}

main().catch(console.error);
