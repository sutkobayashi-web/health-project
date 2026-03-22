/**
 * Gemini APIでアバターパーツ画像を自動生成するスクリプト
 *
 * Usage: cd /opt/health && node scripts/generate-avatar-parts-ai.js
 *
 * 各パーツを400x400透過PNGとして生成し /public/img/avatar/ に保存
 * 白/グレースケールで描画（Tint処理で色付けするため）
 */
require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY;
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'img', 'avatar');
const MODEL = 'gemini-2.0-flash-exp';

// 生成間隔（レート制限対策、ミリ秒）
const DELAY_MS = 3000;

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// パーツ定義：各パーツのプロンプト
const PARTS = [
  // 背景（これはTintではなく色付きで生成）
  ...Array.from({length: 8}, (_, i) => {
    const bgColors = ['薄緑','薄青','薄オレンジ','薄ピンク','薄紫','薄シアン','薄黄','薄ベージュ'];
    return { file: `bg_${i}`, prompt: `400x400ピクセルの画像。${bgColors[i]}の単色で塗りつぶされた円形の背景。中央に直径400pxの円。円の外側は完全に透明。フラットでクリーンなデザイン。テキストなし。` };
  }),

  // 輪郭（白/グレースケール、Tintで肌色に変換）
  ...(() => {
    const shapes = ['丸顔（まんまる）','面長','四角め','卵型','ホームベース型（顎が広い）','おにぎり型（逆三角）','細面','えら張り'];
    return shapes.map((s, i) => ({
      file: `face_${i}`,
      prompt: `400x400ピクセルの透過PNG。白色の${s}の輪郭のみを描画。かわいいカートゥーン風。顔の輪郭だけで、目・鼻・口・髪は一切描かない。顔は画像の中央やや下に配置（上部は髪用に空ける）。輪郭の幅は約250px。背景は完全に透明。影やグラデーションで立体感を少しだけ出す。`
    }));
  })(),

  // 耳（白/グレースケール）
  ...(() => {
    const ears = ['ふつうサイズの耳','小さめの耳','大きめの耳','とがった耳','まるい耳','エルフ風の長い耳'];
    return ears.map((e, i) => ({
      file: `ear_${i}`,
      prompt: `400x400ピクセルの透過PNG。白色の${e}を左右対称に描画。かわいいカートゥーン風。耳だけを描き、顔の輪郭の左右端に配置される位置（左は約x=45, 右はx=355, y=220付近）。背景は完全に透明。他のパーツは一切描かない。`
    }));
  })(),

  // 目（白/グレースケール、Tintで目の色に変換）
  ...(() => {
    const eyes = ['小さなドット目','ライン目（横線）','まんまるの大きな目','ウインク（片目閉じ）','両目閉じ（にっこり線）','たれ目（下がった目尻）','つり目（上がった目尻）','キラキラ目（星入り）','ジト目（半開き）'];
    return eyes.map((e, i) => ({
      file: `eyes_${i}`,
      prompt: `400x400ピクセルの透過PNG。白色の${e}を左右対称に描画。かわいいカートゥーン風。目だけを描く。左目はx=160,y=200付近、右目はx=240,y=200付近に配置。背景は完全に透明。他のパーツは一切描かない。`
    }));
  })(),

  // 眉（白/グレースケール、Tintで髪色に変換）
  ...(() => {
    const brows = ['ナチュラルな眉','太めの眉','キリッとした眉','ハの字眉（困り眉）','細めの眉','眉なし'];
    return brows.map((b, i) => ({
      file: `eyebrow_${i}`,
      prompt: i === 5
        ? `400x400ピクセルの完全に透明な画像。何も描かない。`
        : `400x400ピクセルの透過PNG。白色の${b}を左右対称に描画。かわいいカートゥーン風。眉だけを描く。左眉はx=160,y=175付近、右眉はx=240,y=175付近に配置。背景は完全に透明。他のパーツは一切描かない。`
    }));
  })(),

  // 鼻
  ...(() => {
    const noses = ['ちょこんとした小さな鼻','まるい鼻','高い鼻（縦長）','鼻なし'];
    return noses.map((n, i) => ({
      file: `nose_${i}`,
      prompt: i === 3
        ? `400x400ピクセルの完全に透明な画像。何も描かない。`
        : `400x400ピクセルの透過PNG。薄いピンクがかった白色の${n}を描画。かわいいカートゥーン風。鼻だけを描く。x=200,y=230付近に配置。小さめに描く。背景は完全に透明。他のパーツは一切描かない。`
    }));
  })(),

  // 口
  ...(() => {
    const mouths = ['にっこり笑顔の口','わーいと大きく開いた口','一文字の口','ぽかんと開いた口','むすっとした口','にやりとした口','べーっと舌を出した口'];
    return mouths.map((m, i) => ({
      file: `mouth_${i}`,
      prompt: `400x400ピクセルの透過PNG。${m}を描画。かわいいカートゥーン風。赤〜ピンク系の色で口だけを描く。x=200,y=265付近に配置。背景は完全に透明。他のパーツは一切描かない。`
    }));
  })(),

  // 髪型（白/グレースケール、Tintで髪色に変換）
  ...(() => {
    const hairs = ['なし（坊主）','ショートヘア','ミディアムヘア','ロングヘア','スパイキーヘア（ツンツン）','ひよこのような短い髪','力強い短髪','ポニーテール','ボブカット','おだんごヘア','ツインテール','ウェーブヘア','ワンレングス','ハーフアップ','マッシュルームカット','センター分け','外ハネ','ベリーショート','ゆるふわパーマ','姫カット','オールバック','クレオパトラ風ボブ'];
    return hairs.map((h, i) => ({
      file: `hair_${i}`,
      prompt: i === 0
        ? `400x400ピクセルの完全に透明な画像。何も描かない。`
        : `400x400ピクセルの透過PNG。白色の${h}を描画。かわいいカートゥーン風。髪だけを描く。顔の上部から生えるように配置（顔の中心はx=200,y=220付近）。髪は顔の前面に被る部分も含む。背景は完全に透明。顔・目・鼻・口は一切描かない。`
    }));
  })(),

  // ひげ（白/グレースケール、Tintで髪色に変換）
  ...(() => {
    const beards = ['なし','ちょびひげ','あごひげ','フルひげ（口ひげ+あごひげ）'];
    return beards.map((b, i) => ({
      file: `beard_${i}`,
      prompt: i === 0
        ? `400x400ピクセルの完全に透明な画像。何も描かない。`
        : `400x400ピクセルの透過PNG。白色の${b}を描画。かわいいカートゥーン風。ひげだけを描く。口の周辺x=200,y=270付近に配置。背景は完全に透明。他のパーツは一切描かない。`
    }));
  })(),

  // チーク（白/グレースケール、Tintでチーク色に変換）
  ...(() => {
    const cheeks = ['なし','うっすらチーク','しっかりチーク'];
    return cheeks.map((c, i) => ({
      file: `cheek_${i}`,
      prompt: i === 0
        ? `400x400ピクセルの完全に透明な画像。何も描かない。`
        : `400x400ピクセルの透過PNG。白色の${c}を左右対称に描画。かわいいカートゥーン風。頬のふんわりした丸だけを描く。左頬x=145,y=245、右頬x=255,y=245付近に楕円形で配置。背景は完全に透明。他のパーツは一切描かない。`
    }));
  })(),

  // アクセサリー
  ...(() => {
    const accs = ['なし','丸メガネ','四角メガネ','アンダーリムメガネ','サングラス（黒レンズ）','帽子（キャップ）','リボン（頭頂部）','ヘアバンド'];
    return accs.map((a, i) => ({
      file: `acc_${i}`,
      prompt: i === 0
        ? `400x400ピクセルの完全に透明な画像。何も描かない。`
        : `400x400ピクセルの透過PNG。${a}を描画。かわいいカートゥーン風。アクセサリーだけを描く。顔の上に重ねて表示するため、適切な位置に配置（メガネはy=200付近、帽子はy=100付近、リボン・ヘアバンドはy=110付近）。色はそのアクセサリーに自然な色で。背景は完全に透明。顔や髪は一切描かない。`
    }));
  })(),

  // リップ（白/グレースケール）
  ...(() => {
    const lips = ['ナチュラルリップ','ローズリップ','レッドリップ','コーラルリップ','ベリーリップ','ヌードリップ'];
    return lips.map((l, i) => ({
      file: `lip_${i}`,
      prompt: `400x400ピクセルの透過PNG。白色の${l}の形を描画。かわいいカートゥーン風。唇の形だけを描く。x=200,y=268付近に小さく配置。背景は完全に透明。他のパーツは一切描かない。`
    }));
  })(),

  // アイシャドウ
  ...(() => {
    const shadows = ['なし','ピンクのアイシャドウ','ブラウンのアイシャドウ','パープルのアイシャドウ','ブルーのアイシャドウ','ゴールドのアイシャドウ'];
    return shadows.map((s, i) => ({
      file: `eyeshadow_${i}`,
      prompt: i === 0
        ? `400x400ピクセルの完全に透明な画像。何も描かない。`
        : `400x400ピクセルの透過PNG。${s}を描画。かわいいカートゥーン風。目の上のアイシャドウだけを描く。左目上x=160,y=192、右目上x=240,y=192付近にふんわり楕円で配置。半透明で柔らかい色合い。背景は完全に透明。他のパーツは一切描かない。`
    }));
  })(),

  // まつ毛
  ...(() => {
    const lashes = ['ナチュラルまつ毛','ロングまつ毛','ボリュームまつ毛'];
    return lashes.map((l, i) => ({
      file: `lash_${i}`,
      prompt: `400x400ピクセルの透過PNG。黒色の${l}を描画。かわいいカートゥーン風。まつ毛だけを描く。左目x=160,y=195、右目x=240,y=195付近の目の上端から外側に向かって描く。背景は完全に透明。他のパーツは一切描かない。`
    }));
  })(),
];

async function generateImage(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
        imageMimeType: 'image/png'
      }
    })
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  if (json.candidates && json.candidates[0] && json.candidates[0].content) {
    for (const part of json.candidates[0].content.parts) {
      if (part.inlineData) return Buffer.from(part.inlineData.data, 'base64');
    }
  }
  throw new Error('No image in response');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log(`Generating ${PARTS.length} avatar parts using Gemini API...`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log('');

  let success = 0, fail = 0;

  for (let i = 0; i < PARTS.length; i++) {
    const part = PARTS[i];
    const filepath = path.join(OUTPUT_DIR, part.file + '.png');
    process.stdout.write(`[${i+1}/${PARTS.length}] ${part.file}.png ... `);

    // 「なし」系は透過1x1 PNGで済ませる
    if (part.prompt.includes('何も描かない')) {
      const emptyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAZAAAAGQCAYAAACAvzbMAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABl0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC4xNkRpr/UAAABESURBVHja7cExAQAAAMKg9U9tDB+gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAN4GUWAAAfJbJiAAAAAASUVORK5CYII=', 'base64');
      fs.writeFileSync(filepath, emptyPng);
      console.log('skip (empty)');
      success++;
      continue;
    }

    try {
      const imgBuf = await generateImage(part.prompt);
      fs.writeFileSync(filepath, imgBuf);
      console.log('OK (' + Math.round(imgBuf.length/1024) + 'KB)');
      success++;
    } catch(e) {
      console.log('FAIL: ' + e.message);
      fail++;
    }

    // レート制限対策
    if (i < PARTS.length - 1) await sleep(DELAY_MS);
  }

  console.log('');
  console.log(`Done! Success: ${success}, Failed: ${fail}`);
  console.log('Restart the app: systemctl restart health');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
