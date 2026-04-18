/**
 * 全ての魚画像PNGに透過を焼き込む（フラッドフィル方式）
 *
 * 使い方:
 *   node server/scripts/bake-fish-transparency.js
 *
 * クライアント側の makeFishImgTransparent への依存を排除し、
 * PNG ファイル自体に alpha を持たせる。実行後はクライアント処理は no-op で済む。
 */

const fs = require('fs');
const path = require('path');

let PNG;
try { PNG = require('pngjs').PNG; }
catch (e) { try { PNG = require('/tmp/node_modules/pngjs').PNG; } catch (e2) { throw new Error('pngjs not installed: npm install pngjs'); } }

const FISH_DIR = path.join(__dirname, '..', '..', 'public', 'fish');

function processOne(filePath) {
  const data = fs.readFileSync(filePath);
  const png = PNG.sync.read(data);
  const w = png.width, h = png.height;
  const px = png.data;

  // 既に透過済みならスキップ
  const idxs = [0, (w-1)*4, ((h-1)*w)*4, ((h-1)*w + w-1)*4];
  let aSum = 0;
  idxs.forEach(i => aSum += px[i+3]);
  if (aSum / 4 < 250) return { skipped: true, reason: 'already transparent' };

  // 四隅の平均背景色
  let bgR=0, bgG=0, bgB=0;
  idxs.forEach(i => { bgR += px[i]; bgG += px[i+1]; bgB += px[i+2]; });
  bgR = Math.round(bgR/4); bgG = Math.round(bgG/4); bgB = Math.round(bgB/4);
  if ((bgR+bgG+bgB)/3 < 200) return { skipped: true, reason: 'no white bg' };

  // フラッドフィル
  const visited = new Uint8Array(w*h);
  const stack = [0,0, w-1,0, 0,h-1, w-1,h-1];
  let touched=0, transparent=0;
  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    if (x<0||x>=w||y<0||y>=h) continue;
    const idx = y*w+x;
    if (visited[idx]) continue;
    visited[idx] = 1;
    const pi = idx*4;
    const dr = px[pi]-bgR, dg = px[pi+1]-bgG, db = px[pi+2]-bgB;
    const dist = Math.sqrt(dr*dr+dg*dg+db*db);
    if (dist >= 60) continue;
    touched++;
    if (dist < 30) { px[pi+3] = 0; transparent++; }
    else px[pi+3] = Math.round((dist-30)/30 * 255);
    stack.push(x-1,y); stack.push(x+1,y); stack.push(x,y-1); stack.push(x,y+1);
  }

  fs.writeFileSync(filePath, PNG.sync.write(png));
  return { touched, transparent, total: w*h };
}

const files = fs.readdirSync(FISH_DIR).filter(f => f.endsWith('.png'));
let ok=0, skip=0, ng=0;
for (const f of files) {
  try {
    const r = processOne(path.join(FISH_DIR, f));
    if (r.skipped) { console.log('SKIP', f, '(' + r.reason + ')'); skip++; }
    else { console.log('OK  ', f, '透明:' + r.transparent + '/' + r.total); ok++; }
  } catch (e) { console.error('NG  ', f, '-', e.message); ng++; }
}
console.log('\n=== 完了 === OK:' + ok + ' / SKIP:' + skip + ' / NG:' + ng);
