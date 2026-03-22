/**
 * テスト用プレースホルダーPNG生成スクリプト
 *
 * 1x1の透過PNG（最小サイズ）を全パーツ分作成
 * 実際のパーツ画像が用意できたら差し替える
 *
 * Usage: node scripts/generate-placeholder-parts.js
 */
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..', 'public', 'img', 'avatar');

// ディレクトリ作成
fs.mkdirSync(outputDir, { recursive: true });

const partsConfig = {
  face: 8, hair: 22, eyes: 9, eyebrow: 6, nose: 4,
  mouth: 7, ear: 6, beard: 4, cheek: 3, acc: 8,
  bg: 8, lip: 6, eyeshadow: 6, lash: 3
};

// 最小の透過PNG (1x1px) を生成
// PNG header + IHDR + IDAT (transparent pixel) + IEND
function createTransparentPNG() {
  // 1x1 transparent PNG
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB' +
    'Nl7BcQAAAABJRU5ErkJggg==',
    'base64'
  );
}

const png = createTransparentPNG();
let count = 0;

for (const [type, num] of Object.entries(partsConfig)) {
  for (let i = 0; i < num; i++) {
    const filename = `${type}_${i}.png`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, png);
    count++;
  }
}

console.log(`Generated ${count} placeholder PNGs in ${outputDir}`);
console.log('These are 1x1 transparent images for testing the montage system.');
console.log('Replace with actual 400x400 part images for production use.');
