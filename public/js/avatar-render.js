var AB_SKINS = ['#FDEBD0','#F5CBA7','#D08B5B','#A0522D','#614335','#3E2723'];
var AB_HAIRS = ['#1A1A1A','#4A3728','#8B4513','#FFD700','#FF6347','#C0C0C0'];
var AB_BGS = ['#E8F5E9','#E3F2FD','#FFF3E0','#FCE4EC','#F3E5F5','#E0F7FA','#FFF9C4','#EFEBE9'];
var AB_FACES = [14,16,18];
var AB_EYE_NAMES = ['ドット','ライン','まんまる','ウインク','閉じ目','たれ目','つり目','キラキラ','ジト目'];
var AB_MOUTH_NAMES = ['にっこり','わーい','一文字','ぽかん','むすっ','にやり','べー'];
var AB_HAIR_NAMES = ['なし','ショート','ミディアム','ロング','スパイキー','ひよこ','チカラ','ポニテ','ボブ','おだんご','ツインテ','ウェーブ','ワンレン','ハーフアップ','マッシュ','センター分け','外ハネ','ベリーショート','ゆるふわ','姫カット','オールバック','クレオ'];
var AB_ACC_NAMES = ['なし','丸メガネ','四角メガネ','アンダーリム','サングラス','帽子','リボン','ヘアバンド'];
var AB_FACE_SHAPE_NAMES = ['まるがお','おもなが','しかくめ','たまご','ホームベース','おにぎり','ほそおも','えら張り'];
var AB_EYEBROW_NAMES = ['ナチュラル','太め','キリッと','ハの字','ほそめ','なし'];
var AB_NOSE_NAMES = ['ちょこん','まるい','たかい','なし'];
var AB_BEARD_NAMES = ['なし','ちょびひげ','あごひげ','フルひげ'];
var AB_CHEEK_NAMES = ['なし','うすく','しっかり'];
var AB_EAR_NAMES = ['ふつう','ちいさめ','おおきめ','とがり','まるい','エルフ'];
var AB_EYE_COLORS = ['#3B2F2F','#5D4037','#1B5E20','#0D47A1','#4A148C','#37474F'];
var AB_EYE_COLOR_NAMES = ['こげ茶','茶','緑','青','紫','グレー'];
var _avatarCache = {};

// ====== カスタムアバター描画 ======
function renderCustomAvatar(avatarStr, size) {
  if (!avatarStr || !avatarStr.startsWith('custom:')) return null;
  var cacheKey = avatarStr + '_' + size;
  if (_avatarCache[cacheKey]) return _avatarCache[cacheKey];
  try {
    var parts = avatarStr.substring(7).split('|');
    var skinColor = parts[0] || AB_SKINS[2];
    var hairColor = parts[1] || AB_HAIRS[0];
    var bgColor = parts[2] || AB_BGS[0];
    var faceSize = parseInt(parts[3]) || 16;
    var eyeType = parseInt(parts[4]) || 0;
    var mouthType = parseInt(parts[5]) || 0;
    var accStr = parts[6] || '0';
    var accessories = accStr.split(',').map(Number);
    var hairType = parseInt(parts[7]) || 0;
    var eyebrowType = parseInt(parts[8]) || 0;
    var noseType = parseInt(parts[9]) || 0;
    var beardType = parseInt(parts[10]) || 0;
    var cheekType = parseInt(parts[11]) || 0;
    var faceShapeType = parseInt(parts[12]) || 0;
    var eyeColorIdx = parseInt(parts[13]) || 0;
    var eyeColor = AB_EYE_COLORS[eyeColorIdx] || AB_EYE_COLORS[0];
    // 位置調整パラメータ（-3〜+3 → faceRの割合に変換）
    var posEyeVal = parseInt(parts[14]) || 0;
    var posMouthVal = parseInt(parts[15]) || 0;
    var posNoseVal = parseInt(parts[16]) || 0;
    var posBrowVal = parseInt(parts[17]) || 0;
    var eyeSpacingVal = parseInt(parts[18]) || 0;
    var sizeEyeVal = parseInt(parts[19]) || 0;
    var sizeNoseVal = parseInt(parts[20]) || 0;
    var sizeMouthVal = parseInt(parts[21]) || 0;
    var posHairVal = parseInt(parts[22]) || 0;
    var sizeHairVal = parseInt(parts[23]) || 0;
    var sizeFaceVal = parseInt(parts[24]) || 0;
    var widthHairVal = parseInt(parts[25]) || 0;
    // 耳パラメータ（v2追加、後方互換）
    var earType = parseInt(parts[26]) || 0;
    var posEarVal = parseInt(parts[27]) || 0;
    var sizeEarVal = parseInt(parts[28]) || 0;
    var earSpacingVal = parseInt(parts[29]) || 0;

    var canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    var ctx = canvas.getContext('2d');
    var cx = size / 2, cy = size / 2, r = size / 2;

    // 背景円
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = bgColor; ctx.fill();

    // 顔（輪郭形状反映）- 少し下寄せで髪との間隔を確保
    var faceR = r * faceSize / 24 * (1 + sizeFaceVal * 0.06);
    var faceY = cy + r * 0.08;
    drawFace(ctx, cx, faceY, faceR, faceShapeType, skinColor, earType, posEarVal, sizeEarVal, earSpacingVal);

    // 髪のオフセット
    var hairYOff = posHairVal * faceR * 0.08;
    var hairScale = 1 + sizeHairVal * 0.08;
    var hairWidthScale = 1 + widthHairVal * 0.08;

    // 髪（後ろ部分 - ロング・ボブなどのサイド）
    ctx.save();
    ctx.translate(cx, 0); ctx.scale(hairWidthScale, 1); ctx.translate(-cx, 0);
    drawHairBack(ctx, cx, faceY + hairYOff, faceR * hairScale, hairType, hairColor);
    ctx.restore();

    // 位置オフセット計算（1単位 = faceR * 0.04）
    var eyeYOff = posEyeVal * faceR * 0.04;
    var mouthYOff = posMouthVal * faceR * 0.04;
    var noseYOff = posNoseVal * faceR * 0.04;
    var browYOff = posBrowVal * faceR * 0.04;
    var spacingOff = eyeSpacingVal * faceR * 0.03;

    // 目 - にがおえ風の大きめ配置
    var eyeY = faceY + faceR * 0.02 + eyeYOff;
    var eyeSpacing = faceR * 0.33 + spacingOff;
    var eyeSize = faceR * (0.115 + sizeEyeVal * 0.015);

    // 眉毛
    drawEyebrows(ctx, cx, eyeY + browYOff, eyeSpacing, faceR, eyebrowType);

    // 目
    drawEyes(ctx, cx, eyeY, eyeSpacing, eyeSize, eyeType, faceR, eyeColor);

    // 鼻
    var mouthY = faceY + faceR * 0.35 + mouthYOff;
    var noseY = (eyeY + mouthY) / 2 + noseYOff;
    var noseFaceR = faceR * (1 + sizeNoseVal * 0.12);
    drawNose(ctx, cx, noseY, noseFaceR, noseType);

    // 口
    var mouthFaceR = faceR * (1 + sizeMouthVal * 0.1);
    drawMouth(ctx, cx, mouthY, mouthFaceR, mouthType);

    // ヒゲ
    drawBeard(ctx, cx, mouthY, faceR, beardType, hairColor);

    // チーク
    drawCheeks(ctx, cx, eyeY, eyeSpacing, faceR, cheekType);

    // 髪（前部分）
    ctx.save();
    ctx.translate(cx, 0); ctx.scale(hairWidthScale, 1); ctx.translate(-cx, 0);
    drawHair(ctx, cx, faceY + hairYOff, faceR * hairScale, hairType, hairColor);
    ctx.restore();

    // アクセサリー
    accessories.forEach(function(acc) {
      drawAccessory(ctx, cx, faceY, eyeY, faceR, eyeSpacing, acc, hairColor);
    });

    var dataUrl = canvas.toDataURL('image/png');
    _avatarCache[cacheKey] = dataUrl;
    return dataUrl;
  } catch(e) { console.error('Avatar render error:', e); return null; }
}

function _skinLighter(hex, amt) {
  var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  r = Math.min(255, r + amt); g = Math.min(255, g + amt); b = Math.min(255, b + amt);
  return '#' + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
function _skinDarker(hex, amt) {
  var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  r = Math.max(0, r - amt); g = Math.max(0, g - amt); b = Math.max(0, b - amt);
  return '#' + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
// 耳の形状描画ヘルパー
function _drawEarShape(ctx, ex, ey, earR, earType, side, scaleW, scaleH) {
  var w = earR * scaleW, h = earR * scaleH;
  ctx.beginPath();
  switch(earType) {
    case 1: // ちいさめ（小さい楕円）
      ctx.ellipse(ex, ey, w * 0.85, h * 0.85, 0, 0, Math.PI * 2);
      break;
    case 2: // おおきめ（大きい楕円）
      ctx.ellipse(ex, ey, w * 1.1, h * 1.15, 0, 0, Math.PI * 2);
      break;
    case 3: // とがり（上が尖った耳）
      ctx.moveTo(ex - side * w * 0.1, ey + h);
      ctx.bezierCurveTo(ex + side * w * 0.3, ey + h * 0.5, ex + side * w * 1.1, ey + h * 0.1, ex + side * w * 0.5, ey - h * 1.3);
      ctx.bezierCurveTo(ex - side * w * 0.2, ey - h * 0.6, ex - side * w * 0.5, ey + h * 0.3, ex - side * w * 0.1, ey + h);
      ctx.closePath();
      break;
    case 4: // まるい（まん丸）
      ctx.arc(ex, ey, Math.max(w, h), 0, Math.PI * 2);
      break;
    case 5: // エルフ（長く尖った）
      ctx.moveTo(ex - side * w * 0.1, ey + h * 1.1);
      ctx.bezierCurveTo(ex + side * w * 0.4, ey + h * 0.4, ex + side * w * 1.5, ey - h * 0.3, ex + side * w * 1.2, ey - h * 1.8);
      ctx.bezierCurveTo(ex + side * w * 0.2, ey - h * 1.0, ex - side * w * 0.3, ey - h * 0.2, ex - side * w * 0.1, ey + h * 1.1);
      ctx.closePath();
      break;
    default: // ふつう（楕円）
      ctx.ellipse(ex, ey, w, h, 0, 0, Math.PI * 2);
  }
}

function _facePath(ctx, cx, faceY, faceR, shapeType) {
  switch(shapeType) {
    case 1: // おもなが
      ctx.beginPath(); ctx.ellipse(cx, faceY, faceR * 0.85, faceR * 1.1, 0, 0, Math.PI * 2);
      break;
    case 2: // しかくめ
      var w = faceR * 0.9, h = faceR * 1.0, rad = faceR * 0.3;
      ctx.beginPath();
      ctx.moveTo(cx - w + rad, faceY - h);
      ctx.lineTo(cx + w - rad, faceY - h);
      ctx.arcTo(cx + w, faceY - h, cx + w, faceY - h + rad, rad);
      ctx.lineTo(cx + w, faceY + h - rad);
      ctx.arcTo(cx + w, faceY + h, cx + w - rad, faceY + h, rad);
      ctx.lineTo(cx - w + rad, faceY + h);
      ctx.arcTo(cx - w, faceY + h, cx - w, faceY + h - rad, rad);
      ctx.lineTo(cx - w, faceY - h + rad);
      ctx.arcTo(cx - w, faceY - h, cx - w + rad, faceY - h, rad);
      ctx.closePath();
      break;
    case 3: // たまご — 上が広く下が狭い卵型
      ctx.beginPath();
      ctx.moveTo(cx, faceY - faceR * 1.05);
      ctx.bezierCurveTo(cx + faceR * 1.0, faceY - faceR * 1.0, cx + faceR * 0.9, faceY + faceR * 0.3, cx + faceR * 0.5, faceY + faceR * 0.95);
      ctx.quadraticCurveTo(cx, faceY + faceR * 1.15, cx - faceR * 0.5, faceY + faceR * 0.95);
      ctx.bezierCurveTo(cx - faceR * 0.9, faceY + faceR * 0.3, cx - faceR * 1.0, faceY - faceR * 1.0, cx, faceY - faceR * 1.05);
      ctx.closePath();
      break;
    case 4: // ホームベース — 頬骨が広くあごが尖る
      ctx.beginPath();
      ctx.moveTo(cx, faceY - faceR * 0.95);
      ctx.lineTo(cx + faceR * 0.95, faceY - faceR * 0.15);
      ctx.lineTo(cx + faceR * 0.7, faceY + faceR * 0.7);
      ctx.quadraticCurveTo(cx, faceY + faceR * 1.15, cx - faceR * 0.7, faceY + faceR * 0.7);
      ctx.lineTo(cx - faceR * 0.95, faceY - faceR * 0.15);
      ctx.closePath();
      break;
    case 5: // おにぎり — 逆三角形で顎がシャープ
      ctx.beginPath();
      ctx.moveTo(cx, faceY - faceR * 0.95);
      ctx.bezierCurveTo(cx + faceR * 1.1, faceY - faceR * 0.8, cx + faceR * 1.0, faceY + faceR * 0.1, cx + faceR * 0.55, faceY + faceR * 0.6);
      ctx.quadraticCurveTo(cx, faceY + faceR * 1.2, cx - faceR * 0.55, faceY + faceR * 0.6);
      ctx.bezierCurveTo(cx - faceR * 1.0, faceY + faceR * 0.1, cx - faceR * 1.1, faceY - faceR * 0.8, cx, faceY - faceR * 0.95);
      ctx.closePath();
      break;
    case 6: // ほそおも — 細長い面長のバリエーション
      ctx.beginPath(); ctx.ellipse(cx, faceY, faceR * 0.75, faceR * 1.15, 0, 0, Math.PI * 2);
      break;
    case 7: // えら張り — 下半分が広い
      ctx.beginPath();
      ctx.moveTo(cx, faceY - faceR);
      ctx.bezierCurveTo(cx + faceR * 0.85, faceY - faceR, cx + faceR * 0.85, faceY, cx + faceR * 0.95, faceY + faceR * 0.3);
      ctx.lineTo(cx + faceR * 0.85, faceY + faceR * 0.7);
      ctx.quadraticCurveTo(cx, faceY + faceR * 1.1, cx - faceR * 0.85, faceY + faceR * 0.7);
      ctx.lineTo(cx - faceR * 0.95, faceY + faceR * 0.3);
      ctx.bezierCurveTo(cx - faceR * 0.85, faceY, cx - faceR * 0.85, faceY - faceR, cx, faceY - faceR);
      ctx.closePath();
      break;
    default: // まるがお
      ctx.beginPath(); ctx.arc(cx, faceY, faceR, 0, Math.PI * 2);
  }
}
function drawFace(ctx, cx, faceY, faceR, shapeType, skinColor, earType, posEarVal, sizeEarVal, earSpacingVal) {
  earType = earType || 0;
  posEarVal = posEarVal || 0;
  sizeEarVal = sizeEarVal || 0;
  earSpacingVal = earSpacingVal || 0;
  var lighter = _skinLighter(skinColor, 25);
  var darker = _skinDarker(skinColor, 30);
  var darkest = _skinDarker(skinColor, 50);
  var blush = _skinLighter(skinColor, 10);
  var detail = faceR >= 20; // ディテール描画ガード

  // 首
  ctx.save();
  var neckW = faceR * 0.28, neckH = faceR * 0.4;
  var neckGrad = ctx.createLinearGradient(cx, faceY + faceR * 0.7, cx, faceY + faceR * 0.7 + neckH);
  neckGrad.addColorStop(0, skinColor);
  neckGrad.addColorStop(0.6, darker);
  neckGrad.addColorStop(1, darkest);
  ctx.fillStyle = neckGrad;
  ctx.beginPath();
  ctx.moveTo(cx - neckW, faceY + faceR * 0.7);
  ctx.lineTo(cx - neckW * 1.4, faceY + faceR * 0.7 + neckH);
  ctx.lineTo(cx + neckW * 1.4, faceY + faceR * 0.7 + neckH);
  ctx.lineTo(cx + neckW, faceY + faceR * 0.7);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // 肩ライン + 服の襟（Vネック暗示）
  if (detail) {
    ctx.save();
    var shoulderY = faceY + faceR * 0.7 + neckH;
    var shoulderW = faceR * 0.9;
    // 肩の丸み
    ctx.fillStyle = _skinDarker('#5a6a7a', 10);
    ctx.beginPath();
    ctx.moveTo(cx - shoulderW, shoulderY + faceR * 0.3);
    ctx.quadraticCurveTo(cx - shoulderW * 0.5, shoulderY - faceR * 0.05, cx, shoulderY + faceR * 0.15);
    ctx.quadraticCurveTo(cx + shoulderW * 0.5, shoulderY - faceR * 0.05, cx + shoulderW, shoulderY + faceR * 0.3);
    ctx.lineTo(cx + shoulderW, shoulderY + faceR * 0.6);
    ctx.lineTo(cx - shoulderW, shoulderY + faceR * 0.6);
    ctx.closePath(); ctx.fill();
    // Vネック
    ctx.strokeStyle = '#4a5a6a';
    ctx.lineWidth = Math.max(1, faceR * 0.02);
    ctx.beginPath();
    ctx.moveTo(cx - neckW * 1.3, shoulderY - faceR * 0.02);
    ctx.lineTo(cx, shoulderY + faceR * 0.2);
    ctx.lineTo(cx + neckW * 1.3, shoulderY - faceR * 0.02);
    ctx.stroke();
    ctx.restore();
  }

  // 耳（種類・サイズ・位置カスタマイズ対応）
  var earSizeScale = [1.0, 0.7, 1.35, 1.1, 1.15, 1.25][earType] || 1.0;
  earSizeScale *= (1 + sizeEarVal * 0.12);
  var earR = faceR * 0.15 * earSizeScale;
  var earX = faceR * 0.95 + earSpacingVal * faceR * 0.06;
  var earYOff = posEarVal * faceR * 0.05;
  var earCy = faceY + earYOff;
  ctx.save();

  [-1, 1].forEach(function(side) {
    var ex = cx + side * earX;

    // 耳の影（外側）
    ctx.fillStyle = darkest;
    _drawEarShape(ctx, ex, earCy, earR, earType, side, 1.08, 1.25);
    ctx.fill();

    // 耳本体（グラデーション）
    var eGrad = ctx.createRadialGradient(ex, earCy - earR * 0.2, earR * 0.1, ex, earCy, earR * 1.2);
    eGrad.addColorStop(0, lighter);
    eGrad.addColorStop(0.7, skinColor);
    eGrad.addColorStop(1, darker);
    ctx.fillStyle = eGrad;
    _drawEarShape(ctx, ex, earCy, earR, earType, side, 0.9, 1.05);
    ctx.fill();

    // 耳の内側ディテール
    if (detail) {
      var innerGrad = ctx.createRadialGradient(ex + side * earR * 0.1, earCy, earR * 0.05, ex + side * earR * 0.1, earCy, earR * 0.55);
      innerGrad.addColorStop(0, 'rgba(180,100,100,0.25)');
      innerGrad.addColorStop(0.6, 'rgba(160,80,80,0.1)');
      innerGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = innerGrad;
      ctx.beginPath(); ctx.ellipse(ex + side * earR * 0.1, earCy, earR * 0.55, earR * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      // 軟骨ライン
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = Math.max(0.5, faceR * 0.01);
      ctx.beginPath();
      ctx.ellipse(ex + side * earR * 0.15, earCy - earR * 0.1, earR * 0.35, earR * 0.6, side * 0.15, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  ctx.restore();

  // 顔本体（精密グラデーション）
  // ベースのラジアルグラデーション（額が明るく、顎下が暗い）
  var grad = ctx.createRadialGradient(cx, faceY - faceR * 0.3, faceR * 0.1, cx, faceY + faceR * 0.1, faceR * 1.05);
  grad.addColorStop(0, _skinLighter(skinColor, 35));
  grad.addColorStop(0.4, lighter);
  grad.addColorStop(0.7, skinColor);
  grad.addColorStop(1, darker);
  ctx.fillStyle = grad;
  _facePath(ctx, cx, faceY, faceR, shapeType);
  ctx.fill();

  // 頬の赤み（微細な暖色グラデーション）
  if (detail) {
    ctx.save();
    _facePath(ctx, cx, faceY, faceR, shapeType);
    ctx.clip();
    // 左頬の赤み
    var cheekBlush1 = ctx.createRadialGradient(cx - faceR * 0.4, faceY + faceR * 0.15, 0, cx - faceR * 0.4, faceY + faceR * 0.15, faceR * 0.35);
    cheekBlush1.addColorStop(0, 'rgba(220,140,130,0.12)');
    cheekBlush1.addColorStop(1, 'rgba(220,140,130,0)');
    ctx.fillStyle = cheekBlush1;
    ctx.fillRect(cx - faceR * 1.2, faceY - faceR * 0.5, faceR * 2.4, faceR * 1.5);
    // 右頬の赤み
    var cheekBlush2 = ctx.createRadialGradient(cx + faceR * 0.4, faceY + faceR * 0.15, 0, cx + faceR * 0.4, faceY + faceR * 0.15, faceR * 0.35);
    cheekBlush2.addColorStop(0, 'rgba(220,140,130,0.12)');
    cheekBlush2.addColorStop(1, 'rgba(220,140,130,0)');
    ctx.fillStyle = cheekBlush2;
    ctx.fillRect(cx - faceR * 1.2, faceY - faceR * 0.5, faceR * 2.4, faceR * 1.5);
    ctx.restore();
  }

  // 下部の陰影（あご下 - より強い）
  ctx.save();
  _facePath(ctx, cx, faceY, faceR, shapeType);
  ctx.clip();
  var shadowGrad = ctx.createLinearGradient(cx, faceY + faceR * 0.35, cx, faceY + faceR * 1.1);
  shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
  shadowGrad.addColorStop(0.5, 'rgba(0,0,0,0.06)');
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = shadowGrad;
  ctx.fillRect(cx - faceR * 1.2, faceY + faceR * 0.35, faceR * 2.4, faceR * 0.85);
  ctx.restore();

  // 顔の輪郭に薄い影線（立体感）
  if (detail) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = Math.max(0.5, faceR * 0.015);
    _facePath(ctx, cx, faceY, faceR, shapeType);
    ctx.stroke();
    ctx.restore();
  }

  // 鼻筋の薄いハイライト（額からTゾーン）
  if (detail) {
    ctx.save();
    _facePath(ctx, cx, faceY, faceR, shapeType);
    ctx.clip();
    var tZone = ctx.createLinearGradient(cx - faceR * 0.05, faceY, cx + faceR * 0.05, faceY);
    tZone.addColorStop(0, 'rgba(255,255,255,0)');
    tZone.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    tZone.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = tZone;
    ctx.fillRect(cx - faceR * 0.08, faceY - faceR * 0.8, faceR * 0.16, faceR * 1.0);
    ctx.restore();
  }
}

function drawHairBack(ctx, cx, faceY, faceR, type, color) {
  var darker = _skinDarker(color, 20);
  var lighter = _skinLighter(color, 20);
  var detail = faceR >= 20;

  function _hairBackGrad(x, y, r) {
    var g = ctx.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, lighter);
    g.addColorStop(0.6, color);
    g.addColorStop(1, darker);
    return g;
  }

  switch(type) {
    case 2: // ミディアム - サイドの髪
      ctx.save();
      [-1, 1].forEach(function(s) {
        ctx.fillStyle = _hairBackGrad(cx + s * faceR * 0.82, faceY + faceR * 0.1, faceR * 0.55);
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.7, faceY - faceR * 0.5);
        ctx.bezierCurveTo(cx + s * faceR * 0.95, faceY - faceR * 0.2, cx + s * faceR * 0.9, faceY + faceR * 0.3, cx + s * faceR * 0.7, faceY + faceR * 0.5);
        ctx.bezierCurveTo(cx + s * faceR * 0.6, faceY + faceR * 0.45, cx + s * faceR * 0.65, faceY - faceR * 0.1, cx + s * faceR * 0.7, faceY - faceR * 0.5);
        ctx.closePath(); ctx.fill();
      });
      if (detail) {
        ctx.strokeStyle = darker; ctx.globalAlpha = 0.12; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
        [-1, 1].forEach(function(s) {
          for (var i = 0; i < 3; i++) {
            var off = (i - 1) * faceR * 0.03;
            ctx.beginPath();
            ctx.moveTo(cx + s * faceR * 0.72 + off, faceY - faceR * 0.4);
            ctx.bezierCurveTo(cx + s * faceR * 0.88 + off, faceY - faceR * 0.1, cx + s * faceR * 0.85 + off, faceY + faceR * 0.2, cx + s * faceR * 0.72 + off, faceY + faceR * 0.45);
            ctx.stroke();
          }
        });
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      break;
    case 3: // ロング - サイドの髪（胸元まで）
      ctx.save();
      [-1, 1].forEach(function(s) {
        var sGrad = ctx.createLinearGradient(cx + s * faceR * 0.8, faceY - faceR * 0.5, cx + s * faceR * 0.85, faceY + faceR * 1.0);
        sGrad.addColorStop(0, color); sGrad.addColorStop(0.5, lighter); sGrad.addColorStop(1, darker);
        ctx.fillStyle = sGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.7, faceY - faceR * 0.55);
        ctx.bezierCurveTo(cx + s * faceR * 1.0, faceY - faceR * 0.2, cx + s * faceR * 0.95, faceY + faceR * 0.5, cx + s * faceR * 0.75, faceY + faceR * 0.9);
        ctx.bezierCurveTo(cx + s * faceR * 0.65, faceY + faceR * 0.85, cx + s * faceR * 0.6, faceY + faceR * 0.3, cx + s * faceR * 0.62, faceY - faceR * 0.1);
        ctx.bezierCurveTo(cx + s * faceR * 0.63, faceY - faceR * 0.3, cx + s * faceR * 0.65, faceY - faceR * 0.45, cx + s * faceR * 0.7, faceY - faceR * 0.55);
        ctx.closePath(); ctx.fill();
      });
      if (detail) {
        ctx.strokeStyle = darker; ctx.globalAlpha = 0.12; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
        [-1, 1].forEach(function(s) {
          for (var i = 0; i < 5; i++) {
            var off = (i - 2) * faceR * 0.025;
            ctx.beginPath();
            ctx.moveTo(cx + s * faceR * 0.72 + off, faceY - faceR * 0.45);
            ctx.bezierCurveTo(cx + s * faceR * 0.92 + off, faceY, cx + s * faceR * 0.88 + off, faceY + faceR * 0.5, cx + s * faceR * 0.72 + off, faceY + faceR * 0.85);
            ctx.stroke();
          }
        });
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      break;
    case 7: // ポニテ - 後頭部から下に垂れるテール
      ctx.save();
      // テール開始位置（頭頂部やや右の高い位置）
      var ptStartX = cx + faceR * 0.15;
      var ptStartY = faceY - faceR * 0.7;
      // テール終了位置（背中方向に下へ流れる）
      var ptEndX = cx + faceR * 0.5;
      var ptEndY = faceY + faceR * 0.5;
      var ptLen = faceR * 1.2;
      // テール本体（太めに開始→毛先に向かって細く）
      var pGrad = ctx.createLinearGradient(ptStartX, ptStartY, ptEndX, ptEndY);
      pGrad.addColorStop(0, darker); pGrad.addColorStop(0.3, color); pGrad.addColorStop(0.7, lighter); pGrad.addColorStop(1, darker);
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      // テール左側（太い側）
      ctx.moveTo(ptStartX - faceR * 0.12, ptStartY);
      ctx.bezierCurveTo(
        ptStartX - faceR * 0.08, ptStartY + ptLen * 0.3,
        ptStartX + faceR * 0.15, ptStartY + ptLen * 0.6,
        ptEndX - faceR * 0.05, ptEndY
      );
      // 毛先（細くなる）
      ctx.lineTo(ptEndX + faceR * 0.05, ptEndY + faceR * 0.02);
      // テール右側（太い側に戻る）
      ctx.bezierCurveTo(
        ptStartX + faceR * 0.35, ptStartY + ptLen * 0.6,
        ptStartX + faceR * 0.25, ptStartY + ptLen * 0.3,
        ptStartX + faceR * 0.18, ptStartY
      );
      ctx.closePath(); ctx.fill();
      // 結び目（ゴム）- 髪色より暗い円
      var pkGrad = ctx.createRadialGradient(ptStartX + faceR * 0.03, ptStartY, faceR * 0.02, ptStartX + faceR * 0.03, ptStartY, faceR * 0.09);
      pkGrad.addColorStop(0, _skinDarker(color, 30)); pkGrad.addColorStop(1, _skinDarker(color, 50));
      ctx.fillStyle = pkGrad;
      ctx.beginPath(); ctx.arc(ptStartX + faceR * 0.03, ptStartY, faceR * 0.08, 0, Math.PI * 2); ctx.fill();
      // 毛束のストランド線（5-7本）
      if (detail) {
        ctx.strokeStyle = darker; ctx.globalAlpha = 0.18; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
        for (var pi = 0; pi < 6; pi++) {
          var pOff = (pi - 2.5) * faceR * 0.04;
          ctx.beginPath();
          ctx.moveTo(ptStartX + faceR * 0.03 + pOff * 0.3, ptStartY + faceR * 0.05);
          ctx.bezierCurveTo(
            ptStartX + pOff * 0.6, ptStartY + ptLen * 0.35,
            ptStartX + faceR * 0.2 + pOff * 0.8, ptStartY + ptLen * 0.6,
            ptEndX + pOff * 0.5, ptEndY - faceR * 0.05
          );
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      break;
    case 8: // ボブ - 顎ラインで内巻き
      ctx.save();
      [-1, 1].forEach(function(s) {
        var bGrad = ctx.createLinearGradient(cx + s * faceR * 0.7, faceY - faceR * 0.4, cx + s * faceR * 0.8, faceY + faceR * 0.35);
        bGrad.addColorStop(0, color); bGrad.addColorStop(0.7, lighter); bGrad.addColorStop(1, darker);
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.68, faceY - faceR * 0.45);
        ctx.bezierCurveTo(cx + s * faceR * 0.95, faceY - faceR * 0.2, cx + s * faceR * 0.92, faceY + faceR * 0.15, cx + s * faceR * 0.75, faceY + faceR * 0.35);
        ctx.bezierCurveTo(cx + s * faceR * 0.65, faceY + faceR * 0.3, cx + s * faceR * 0.6, faceY + faceR * 0.1, cx + s * faceR * 0.62, faceY - faceR * 0.15);
        ctx.bezierCurveTo(cx + s * faceR * 0.63, faceY - faceR * 0.3, cx + s * faceR * 0.65, faceY - faceR * 0.4, cx + s * faceR * 0.68, faceY - faceR * 0.45);
        ctx.closePath(); ctx.fill();
      });
      if (detail) {
        ctx.strokeStyle = darker; ctx.globalAlpha = 0.12; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
        [-1, 1].forEach(function(s) {
          for (var i = 0; i < 3; i++) {
            var off = (i - 1) * faceR * 0.025;
            ctx.beginPath();
            ctx.moveTo(cx + s * faceR * 0.7 + off, faceY - faceR * 0.4);
            ctx.bezierCurveTo(cx + s * faceR * 0.9 + off, faceY - faceR * 0.05, cx + s * faceR * 0.85 + off, faceY + faceR * 0.15, cx + s * faceR * 0.72 + off, faceY + faceR * 0.3);
            ctx.stroke();
          }
        });
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      break;
    case 9: // おだんご - 立体的な丸いお団子
      ctx.save();
      var topY = faceY - faceR - faceR * 0.12;
      // お団子本体（大きめ、グラデーション付き）
      var dGrad = ctx.createRadialGradient(cx - faceR * 0.05, topY - faceR * 0.5, faceR * 0.05, cx, topY - faceR * 0.4, faceR * 0.38);
      dGrad.addColorStop(0, lighter); dGrad.addColorStop(0.4, color); dGrad.addColorStop(0.8, darker); dGrad.addColorStop(1, _skinDarker(color, 40));
      ctx.fillStyle = dGrad;
      ctx.beginPath(); ctx.arc(cx, topY - faceR * 0.4, faceR * 0.35, 0, Math.PI * 2); ctx.fill();
      // お団子のハイライト
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath(); ctx.ellipse(cx - faceR * 0.08, topY - faceR * 0.55, faceR * 0.12, faceR * 0.08, -0.3, 0, Math.PI * 2); ctx.fill();
      // お団子のストランド模様
      if (detail) {
        ctx.strokeStyle = darker; ctx.globalAlpha = 0.2; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
        for (var di = 0; di < 5; di++) {
          var dAngle = (di / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(cx, topY - faceR * 0.4, faceR * 0.25, dAngle, dAngle + Math.PI * 0.6);
          ctx.stroke();
        }
        // 後れ毛
        ctx.strokeStyle = color; ctx.globalAlpha = 0.4; ctx.lineWidth = Math.max(0.5, faceR * 0.012);
        ctx.beginPath();
        ctx.moveTo(cx - faceR * 0.15, topY - faceR * 0.1);
        ctx.bezierCurveTo(cx - faceR * 0.2, topY + faceR * 0.1, cx - faceR * 0.18, topY + faceR * 0.3, cx - faceR * 0.22, topY + faceR * 0.45);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + faceR * 0.12, topY - faceR * 0.08);
        ctx.bezierCurveTo(cx + faceR * 0.18, topY + faceR * 0.1, cx + faceR * 0.15, topY + faceR * 0.25, cx + faceR * 0.2, topY + faceR * 0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + faceR * 0.3, topY + faceR * 0.05);
        ctx.bezierCurveTo(cx + faceR * 0.35, topY + faceR * 0.2, cx + faceR * 0.32, topY + faceR * 0.35, cx + faceR * 0.28, topY + faceR * 0.5);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // サイドの髪（ミディアム風ベース）
      [-1, 1].forEach(function(s) {
        ctx.fillStyle = _hairBackGrad(cx + s * faceR * 0.82, faceY + faceR * 0.1, faceR * 0.5);
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.7, faceY - faceR * 0.5);
        ctx.bezierCurveTo(cx + s * faceR * 0.92, faceY - faceR * 0.15, cx + s * faceR * 0.88, faceY + faceR * 0.25, cx + s * faceR * 0.68, faceY + faceR * 0.45);
        ctx.bezierCurveTo(cx + s * faceR * 0.58, faceY + faceR * 0.4, cx + s * faceR * 0.62, faceY - faceR * 0.1, cx + s * faceR * 0.7, faceY - faceR * 0.5);
        ctx.closePath(); ctx.fill();
      });
      ctx.restore();
      break;
    case 10: // ツインテ - 左右のテール
      ctx.save();
      [-1, 1].forEach(function(s) {
        var tGrad = ctx.createLinearGradient(cx + s * faceR * 0.5, faceY - faceR * 0.6, cx + s * faceR * 0.7, faceY + faceR * 0.8);
        tGrad.addColorStop(0, darker); tGrad.addColorStop(0.3, color); tGrad.addColorStop(0.7, lighter); tGrad.addColorStop(1, darker);
        ctx.fillStyle = tGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.5, faceY - faceR * 0.55);
        ctx.bezierCurveTo(cx + s * faceR * 0.85, faceY - faceR * 0.5, cx + s * faceR * 0.9, faceY + faceR * 0.1, cx + s * faceR * 0.8, faceY + faceR * 0.7);
        ctx.bezierCurveTo(cx + s * faceR * 0.75, faceY + faceR * 0.85, cx + s * faceR * 0.6, faceY + faceR * 0.8, cx + s * faceR * 0.55, faceY + faceR * 0.65);
        ctx.bezierCurveTo(cx + s * faceR * 0.5, faceY + faceR * 0.3, cx + s * faceR * 0.55, faceY - faceR * 0.15, cx + s * faceR * 0.45, faceY - faceR * 0.45);
        ctx.bezierCurveTo(cx + s * faceR * 0.44, faceY - faceR * 0.5, cx + s * faceR * 0.47, faceY - faceR * 0.55, cx + s * faceR * 0.5, faceY - faceR * 0.55);
        ctx.closePath(); ctx.fill();
        // 結び目
        var knGrad = ctx.createRadialGradient(cx + s * faceR * 0.5, faceY - faceR * 0.52, faceR * 0.02, cx + s * faceR * 0.5, faceY - faceR * 0.52, faceR * 0.08);
        knGrad.addColorStop(0, lighter); knGrad.addColorStop(1, darker);
        ctx.fillStyle = knGrad;
        ctx.beginPath(); ctx.arc(cx + s * faceR * 0.5, faceY - faceR * 0.52, faceR * 0.07, 0, Math.PI * 2); ctx.fill();
      });
      // テールのストランド
      if (detail) {
        ctx.strokeStyle = darker; ctx.globalAlpha = 0.15; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
        [-1, 1].forEach(function(s) {
          for (var ti = 0; ti < 4; ti++) {
            var tOff = (ti - 1.5) * faceR * 0.025;
            ctx.beginPath();
            ctx.moveTo(cx + s * faceR * 0.52 + tOff, faceY - faceR * 0.5);
            ctx.bezierCurveTo(cx + s * faceR * 0.82 + tOff, faceY - faceR * 0.1, cx + s * faceR * 0.78 + tOff, faceY + faceR * 0.3, cx + s * faceR * 0.68 + tOff, faceY + faceR * 0.7);
            ctx.stroke();
          }
        });
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      break;
    case 11: // ウェーブ - サイドのウェーブ
      ctx.save();
      [-1, 1].forEach(function(s) {
        var wGrad = ctx.createLinearGradient(cx + s * faceR * 0.7, faceY - faceR * 0.5, cx + s * faceR * 0.85, faceY + faceR * 0.8);
        wGrad.addColorStop(0, color); wGrad.addColorStop(0.5, lighter); wGrad.addColorStop(1, darker);
        ctx.fillStyle = wGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.68, faceY - faceR * 0.5);
        ctx.bezierCurveTo(cx + s * faceR * 1.0, faceY - faceR * 0.2, cx + s * faceR * 0.85, faceY + faceR * 0.1, cx + s * faceR * 1.0, faceY + faceR * 0.35);
        ctx.bezierCurveTo(cx + s * faceR * 1.05, faceY + faceR * 0.55, cx + s * faceR * 0.85, faceY + faceR * 0.7, cx + s * faceR * 0.75, faceY + faceR * 0.8);
        ctx.bezierCurveTo(cx + s * faceR * 0.6, faceY + faceR * 0.75, cx + s * faceR * 0.65, faceY + faceR * 0.4, cx + s * faceR * 0.7, faceY + faceR * 0.2);
        ctx.bezierCurveTo(cx + s * faceR * 0.75, faceY, cx + s * faceR * 0.6, faceY - faceR * 0.2, cx + s * faceR * 0.62, faceY - faceR * 0.4);
        ctx.closePath(); ctx.fill();
      });
      if (detail) {
        ctx.strokeStyle = darker; ctx.globalAlpha = 0.12; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
        [-1, 1].forEach(function(s) {
          for (var wi = 0; wi < 4; wi++) {
            var wOff = (wi - 1.5) * faceR * 0.025;
            ctx.beginPath();
            ctx.moveTo(cx + s * faceR * 0.7 + wOff, faceY - faceR * 0.45);
            ctx.bezierCurveTo(cx + s * faceR * 0.95 + wOff, faceY - faceR * 0.1, cx + s * faceR * 0.82 + wOff, faceY + faceR * 0.2, cx + s * faceR * 0.95 + wOff, faceY + faceR * 0.45);
            ctx.stroke();
          }
        });
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      break;
    case 12: // ワンレン - サイド（7:3分け、片側重め）
      ctx.save();
      // 重い側（左側）のサイド
      var wlGrad = ctx.createLinearGradient(cx - faceR * 0.8, faceY - faceR * 0.4, cx - faceR * 0.85, faceY + faceR * 0.5);
      wlGrad.addColorStop(0, color); wlGrad.addColorStop(0.6, lighter); wlGrad.addColorStop(1, darker);
      ctx.fillStyle = wlGrad;
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.7, faceY - faceR * 0.5);
      ctx.bezierCurveTo(cx - faceR * 1.0, faceY - faceR * 0.2, cx - faceR * 0.95, faceY + faceR * 0.2, cx - faceR * 0.8, faceY + faceR * 0.5);
      ctx.bezierCurveTo(cx - faceR * 0.68, faceY + faceR * 0.45, cx - faceR * 0.65, faceY, cx - faceR * 0.65, faceY - faceR * 0.3);
      ctx.closePath(); ctx.fill();
      // 軽い側（右側）
      var wrGrad = ctx.createLinearGradient(cx + faceR * 0.75, faceY - faceR * 0.3, cx + faceR * 0.8, faceY + faceR * 0.4);
      wrGrad.addColorStop(0, color); wrGrad.addColorStop(0.6, lighter); wrGrad.addColorStop(1, darker);
      ctx.fillStyle = wrGrad;
      ctx.beginPath();
      ctx.moveTo(cx + faceR * 0.65, faceY - faceR * 0.4);
      ctx.bezierCurveTo(cx + faceR * 0.88, faceY - faceR * 0.15, cx + faceR * 0.85, faceY + faceR * 0.15, cx + faceR * 0.72, faceY + faceR * 0.45);
      ctx.bezierCurveTo(cx + faceR * 0.62, faceY + faceR * 0.4, cx + faceR * 0.6, faceY, cx + faceR * 0.6, faceY - faceR * 0.25);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      break;
    case 13: // ハーフアップ - 下ろした部分のサイド
      ctx.save();
      [-1, 1].forEach(function(s) {
        var haGrad = ctx.createLinearGradient(cx + s * faceR * 0.7, faceY - faceR * 0.3, cx + s * faceR * 0.8, faceY + faceR * 0.6);
        haGrad.addColorStop(0, color); haGrad.addColorStop(0.5, lighter); haGrad.addColorStop(1, darker);
        ctx.fillStyle = haGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.68, faceY - faceR * 0.3);
        ctx.bezierCurveTo(cx + s * faceR * 0.92, faceY - faceR * 0.05, cx + s * faceR * 0.88, faceY + faceR * 0.35, cx + s * faceR * 0.72, faceY + faceR * 0.6);
        ctx.bezierCurveTo(cx + s * faceR * 0.6, faceY + faceR * 0.55, cx + s * faceR * 0.62, faceY + faceR * 0.1, cx + s * faceR * 0.63, faceY - faceR * 0.15);
        ctx.closePath(); ctx.fill();
      });
      // 後ろの留めた部分（結び目）
      var clipGrad = ctx.createRadialGradient(cx, faceY - faceR * 0.85, faceR * 0.02, cx, faceY - faceR * 0.85, faceR * 0.08);
      clipGrad.addColorStop(0, '#ffcc80'); clipGrad.addColorStop(1, '#f4a742');
      ctx.fillStyle = clipGrad;
      ctx.beginPath(); ctx.arc(cx, faceY - faceR * 0.85, faceR * 0.07, 0, Math.PI * 2); ctx.fill();
      if (detail) {
        ctx.strokeStyle = darker; ctx.globalAlpha = 0.12; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
        [-1, 1].forEach(function(s) {
          for (var hi = 0; hi < 3; hi++) {
            var hOff = (hi - 1) * faceR * 0.025;
            ctx.beginPath();
            ctx.moveTo(cx + s * faceR * 0.7 + hOff, faceY - faceR * 0.25);
            ctx.bezierCurveTo(cx + s * faceR * 0.85 + hOff, faceY + faceR * 0.05, cx + s * faceR * 0.82 + hOff, faceY + faceR * 0.3, cx + s * faceR * 0.7 + hOff, faceY + faceR * 0.55);
            ctx.stroke();
          }
        });
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      break;
    case 14: // マッシュ - 後ろ側なし（コンパクトなので前面のみ）
      break;
    case 15: // センター分け - サイドに流れる後ろ髪
      ctx.save();
      [-1, 1].forEach(function(s) {
        var cpGrad = ctx.createLinearGradient(cx + s * faceR * 0.7, faceY - faceR * 0.4, cx + s * faceR * 0.8, faceY + faceR * 0.5);
        cpGrad.addColorStop(0, color); cpGrad.addColorStop(0.5, lighter); cpGrad.addColorStop(1, darker);
        ctx.fillStyle = cpGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.68, faceY - faceR * 0.5);
        ctx.bezierCurveTo(cx + s * faceR * 0.95, faceY - faceR * 0.2, ctx.canvas ? cx + s * faceR * 0.9 : cx + s * faceR * 0.9, faceY + faceR * 0.15, cx + s * faceR * 0.75, faceY + faceR * 0.45);
        ctx.bezierCurveTo(cx + s * faceR * 0.65, faceY + faceR * 0.4, cx + s * faceR * 0.62, faceY, cx + s * faceR * 0.63, faceY - faceR * 0.25);
        ctx.closePath(); ctx.fill();
      });
      if (detail) {
        ctx.strokeStyle = darker; ctx.globalAlpha = 0.12; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
        [-1, 1].forEach(function(s) {
          for (var i = 0; i < 3; i++) {
            var off = (i - 1) * faceR * 0.025;
            ctx.beginPath();
            ctx.moveTo(cx + s * faceR * 0.7 + off, faceY - faceR * 0.4);
            ctx.bezierCurveTo(cx + s * faceR * 0.88 + off, faceY - faceR * 0.05, cx + s * faceR * 0.82 + off, faceY + faceR * 0.15, cx + s * faceR * 0.7 + off, faceY + faceR * 0.4);
            ctx.stroke();
          }
        });
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      break;
    case 16: // 外ハネ - サイドの髪（ミディアム長、毛先外ハネ）
      ctx.save();
      [-1, 1].forEach(function(s) {
        var ohGrad = ctx.createLinearGradient(cx + s * faceR * 0.7, faceY - faceR * 0.4, cx + s * faceR * 0.85, faceY + faceR * 0.5);
        ohGrad.addColorStop(0, color); ohGrad.addColorStop(0.6, lighter); ohGrad.addColorStop(1, darker);
        ctx.fillStyle = ohGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.7, faceY - faceR * 0.5);
        ctx.bezierCurveTo(cx + s * faceR * 0.95, faceY - faceR * 0.2, cx + s * faceR * 0.9, faceY + faceR * 0.1, cx + s * faceR * 0.75, faceY + faceR * 0.35);
        // 外ハネ（毛先が外側に跳ねる）
        ctx.bezierCurveTo(cx + s * faceR * 0.85, faceY + faceR * 0.5, cx + s * faceR * 0.95, faceY + faceR * 0.45, cx + s * faceR * 0.9, faceY + faceR * 0.35);
        ctx.bezierCurveTo(cx + s * faceR * 0.82, faceY + faceR * 0.2, cx + s * faceR * 0.65, faceY - faceR * 0.1, cx + s * faceR * 0.65, faceY - faceR * 0.35);
        ctx.closePath(); ctx.fill();
      });
      if (detail) {
        ctx.strokeStyle = darker; ctx.globalAlpha = 0.12; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
        [-1, 1].forEach(function(s) {
          for (var i = 0; i < 3; i++) {
            var off = (i - 1) * faceR * 0.025;
            ctx.beginPath();
            ctx.moveTo(cx + s * faceR * 0.72 + off, faceY - faceR * 0.4);
            ctx.bezierCurveTo(cx + s * faceR * 0.88 + off, faceY - faceR * 0.05, cx + s * faceR * 0.82 + off, faceY + faceR * 0.15, cx + s * faceR * 0.78 + off, faceY + faceR * 0.35);
            ctx.stroke();
          }
        });
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      break;
    case 17: // ベリーショート - 後ろ髪なし
      break;
    case 18: // ゆるふわ - ボリュームのある後ろ髪
      ctx.save();
      [-1, 1].forEach(function(s) {
        var yfGrad = ctx.createLinearGradient(cx + s * faceR * 0.7, faceY - faceR * 0.5, cx + s * faceR * 0.9, faceY + faceR * 0.7);
        yfGrad.addColorStop(0, color); yfGrad.addColorStop(0.4, lighter); yfGrad.addColorStop(1, darker);
        ctx.fillStyle = yfGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.7, faceY - faceR * 0.5);
        ctx.bezierCurveTo(cx + s * faceR * 1.05, faceY - faceR * 0.2, cx + s * faceR * 0.95, faceY + faceR * 0.2, cx + s * faceR * 1.0, faceY + faceR * 0.45);
        ctx.bezierCurveTo(cx + s * faceR * 0.95, faceY + faceR * 0.65, cx + s * faceR * 0.75, faceY + faceR * 0.7, cx + s * faceR * 0.65, faceY + faceR * 0.6);
        ctx.bezierCurveTo(cx + s * faceR * 0.58, faceY + faceR * 0.3, cx + s * faceR * 0.62, faceY - faceR * 0.15, cx + s * faceR * 0.65, faceY - faceR * 0.4);
        ctx.closePath(); ctx.fill();
      });
      if (detail) {
        ctx.strokeStyle = darker; ctx.globalAlpha = 0.12; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
        [-1, 1].forEach(function(s) {
          for (var i = 0; i < 4; i++) {
            var off = (i - 1.5) * faceR * 0.03;
            ctx.beginPath();
            ctx.moveTo(cx + s * faceR * 0.72 + off, faceY - faceR * 0.4);
            ctx.bezierCurveTo(cx + s * faceR * 0.98 + off, faceY - faceR * 0.05, cx + s * faceR * 0.9 + off, faceY + faceR * 0.3, cx + s * faceR * 0.75 + off, faceY + faceR * 0.6);
            ctx.stroke();
          }
        });
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      break;
    case 19: // 姫カット - 後ろはロング
      ctx.save();
      [-1, 1].forEach(function(s) {
        var hmGrad = ctx.createLinearGradient(cx + s * faceR * 0.5, faceY - faceR * 0.5, cx + s * faceR * 0.8, faceY + faceR * 1.0);
        hmGrad.addColorStop(0, color); hmGrad.addColorStop(0.3, lighter); hmGrad.addColorStop(0.7, color); hmGrad.addColorStop(1, darker);
        ctx.fillStyle = hmGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.7, faceY - faceR * 0.55);
        ctx.bezierCurveTo(cx + s * faceR * 1.0, faceY - faceR * 0.2, cx + s * faceR * 0.95, faceY + faceR * 0.5, cx + s * faceR * 0.75, faceY + faceR * 0.9);
        ctx.bezierCurveTo(cx + s * faceR * 0.65, faceY + faceR * 0.85, cx + s * faceR * 0.6, faceY + faceR * 0.3, cx + s * faceR * 0.62, faceY - faceR * 0.1);
        ctx.bezierCurveTo(cx + s * faceR * 0.63, faceY - faceR * 0.3, cx + s * faceR * 0.65, faceY - faceR * 0.45, cx + s * faceR * 0.7, faceY - faceR * 0.55);
        ctx.closePath(); ctx.fill();
      });
      if (detail) {
        ctx.strokeStyle = darker; ctx.globalAlpha = 0.12; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
        [-1, 1].forEach(function(s) {
          for (var i = 0; i < 5; i++) {
            var off = (i - 2) * faceR * 0.025;
            ctx.beginPath();
            ctx.moveTo(cx + s * faceR * 0.72 + off, faceY - faceR * 0.45);
            ctx.bezierCurveTo(cx + s * faceR * 0.92 + off, faceY, cx + s * faceR * 0.88 + off, faceY + faceR * 0.5, cx + s * faceR * 0.72 + off, faceY + faceR * 0.85);
            ctx.stroke();
          }
        });
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      break;
    case 20: // オールバック - 後ろ髪なし（短い）
      break;
    case 21: // クレオ — クレオパトラ風の後ろ髪（肩まで直線的）
      ctx.save();
      [-1, 1].forEach(function(s) {
        var cleoBackGrad = ctx.createLinearGradient(cx + s * faceR * 0.5, faceY - faceR * 0.3, cx + s * faceR * 0.8, faceY + faceR * 0.9);
        cleoBackGrad.addColorStop(0, darker); cleoBackGrad.addColorStop(0.4, color); cleoBackGrad.addColorStop(0.7, lighter); cleoBackGrad.addColorStop(1, darker);
        ctx.fillStyle = cleoBackGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.7, faceY - faceR * 0.5);
        ctx.bezierCurveTo(cx + s * faceR * 0.92, faceY - faceR * 0.2, cx + s * faceR * 0.9, faceY + faceR * 0.3, cx + s * faceR * 0.85, faceY + faceR * 0.7);
        // 毛先は直線的にスパッと切り揃え
        ctx.lineTo(cx + s * faceR * 0.55, faceY + faceR * 0.72);
        ctx.bezierCurveTo(cx + s * faceR * 0.58, faceY + faceR * 0.3, cx + s * faceR * 0.6, faceY - faceR * 0.1, cx + s * faceR * 0.7, faceY - faceR * 0.5);
        ctx.closePath(); ctx.fill();
        // ストランドライン
        if (detail) {
          ctx.strokeStyle = darker; ctx.globalAlpha = 0.12; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
          for (var ci = 0; ci < 4; ci++) {
            var coff = (ci - 1.5) * faceR * 0.03;
            ctx.beginPath();
            ctx.moveTo(cx + s * faceR * 0.72 + coff, faceY - faceR * 0.4);
            ctx.bezierCurveTo(cx + s * faceR * 0.88 + coff, faceY, cx + s * faceR * 0.86 + coff, faceY + faceR * 0.4, cx + s * faceR * 0.7 + coff, faceY + faceR * 0.7);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
      });
      ctx.restore();
      break;
  }
}

function _drawTaperedBrow(ctx, x1, y1, cpx, cpy, x2, y2, thickStart, thickEnd) {
  // 太さが変化する眉を描く（先端が細い）
  var steps = 8;
  ctx.lineCap = 'round';
  for (var i = 0; i < steps; i++) {
    var t1 = i / steps, t2 = (i + 1) / steps;
    var lw = thickStart + (thickEnd - thickStart) * ((t1 + t2) / 2);
    ctx.lineWidth = Math.max(0.5, lw);
    // quadratic bezier point
    var px1 = (1-t1)*(1-t1)*x1 + 2*(1-t1)*t1*cpx + t1*t1*x2;
    var py1 = (1-t1)*(1-t1)*y1 + 2*(1-t1)*t1*cpy + t1*t1*y2;
    var px2 = (1-t2)*(1-t2)*x1 + 2*(1-t2)*t2*cpx + t2*t2*x2;
    var py2 = (1-t2)*(1-t2)*y1 + 2*(1-t2)*t2*cpy + t2*t2*y2;
    ctx.beginPath(); ctx.moveTo(px1, py1); ctx.lineTo(px2, py2); ctx.stroke();
  }
}
function drawEyebrows(ctx, cx, eyeY, eyeSpacing, faceR, type) {
  if (type === 5) return; // なし
  var lx = cx - eyeSpacing, rx = cx + eyeSpacing;
  var browY = eyeY - faceR * 0.22;
  var bw = faceR * 0.15;
  var detail = faceR >= 20;
  ctx.save();
  ctx.strokeStyle = '#3D2B1F'; ctx.lineCap = 'round';

  // 毛のテクスチャを描く関数
  function _drawBrowHairs(x1, y1, cpx, cpy, x2, y2, thickStart, thickEnd, hairCount) {
    if (!detail || !hairCount) hairCount = 6;
    // まずベースの眉を描く
    _drawTaperedBrow(ctx, x1, y1, cpx, cpy, x2, y2, thickStart, thickEnd);
    // 毛の1本1本を短い線で描画
    if (detail) {
      ctx.save();
      ctx.strokeStyle = 'rgba(61,43,31,0.3)';
      var baseThick = (thickStart + thickEnd) / 2;
      for (var h = 0; h < hairCount; h++) {
        var t = (h + 0.5) / hairCount;
        var bx = (1-t)*(1-t)*x1 + 2*(1-t)*t*cpx + t*t*x2;
        var by = (1-t)*(1-t)*y1 + 2*(1-t)*t*cpy + t*t*y2;
        // 接線方向を計算
        var tx_d = 2*(1-t)*(cpx-x1) + 2*t*(x2-cpx);
        var ty_d = 2*(1-t)*(cpy-y1) + 2*t*(y2-cpy);
        var len = Math.sqrt(tx_d*tx_d + ty_d*ty_d) || 1;
        // 毛は接線に直交する方向
        var nx = -ty_d / len, ny = tx_d / len;
        var hairLen = baseThick * (0.8 + Math.random() * 0.4);
        ctx.lineWidth = Math.max(0.3, faceR * 0.008);
        ctx.beginPath();
        ctx.moveTo(bx - nx * hairLen * 0.5, by - ny * hairLen * 0.5);
        ctx.lineTo(bx + nx * hairLen * 0.5 + tx_d / len * faceR * 0.01, by + ny * hairLen * 0.5 + ty_d / len * faceR * 0.01);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  switch(type) {
    case 0: // ナチュラル
      _drawBrowHairs(lx - bw, browY + faceR * 0.02, lx, browY - faceR * 0.04, lx + bw, browY + faceR * 0.02, faceR * 0.055, faceR * 0.025, 7);
      _drawBrowHairs(rx + bw, browY + faceR * 0.02, rx, browY - faceR * 0.04, rx - bw, browY + faceR * 0.02, faceR * 0.025, faceR * 0.055, 7);
      break;
    case 1: // 太め
      _drawBrowHairs(lx - bw, browY, lx, browY - faceR * 0.05, lx + bw, browY, faceR * 0.09, faceR * 0.05, 8);
      _drawBrowHairs(rx + bw, browY, rx, browY - faceR * 0.05, rx - bw, browY, faceR * 0.05, faceR * 0.09, 8);
      break;
    case 2: // キリッと
      _drawBrowHairs(lx + bw, browY + faceR * 0.03, lx, browY - faceR * 0.02, lx - bw, browY - faceR * 0.06, faceR * 0.025, faceR * 0.06, 6);
      _drawBrowHairs(rx - bw, browY + faceR * 0.03, rx, browY - faceR * 0.02, rx + bw, browY - faceR * 0.06, faceR * 0.025, faceR * 0.06, 6);
      break;
    case 3: // ハの字
      _drawBrowHairs(lx - bw, browY - faceR * 0.05, lx, browY - faceR * 0.02, lx + bw, browY + faceR * 0.03, faceR * 0.055, faceR * 0.025, 6);
      _drawBrowHairs(rx + bw, browY - faceR * 0.05, rx, browY - faceR * 0.02, rx - bw, browY + faceR * 0.03, faceR * 0.055, faceR * 0.025, 6);
      break;
    case 4: // ほそめ
      _drawBrowHairs(lx - bw, browY, lx, browY - faceR * 0.01, lx + bw, browY, faceR * 0.03, faceR * 0.015, 5);
      _drawBrowHairs(rx + bw, browY, rx, browY - faceR * 0.01, rx - bw, browY, faceR * 0.015, faceR * 0.03, 5);
      break;
  }
  ctx.restore();
}

function drawNose(ctx, cx, noseY, faceR, type) {
  if (type === 3) return; // なし
  var detail = faceR >= 20;
  ctx.save();
  switch(type) {
    case 0: // ちょこん
      var dotGrad = ctx.createRadialGradient(cx, noseY, 0, cx, noseY, faceR * 0.05);
      dotGrad.addColorStop(0, 'rgba(0,0,0,0.25)');
      dotGrad.addColorStop(0.7, 'rgba(0,0,0,0.1)');
      dotGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = dotGrad;
      ctx.beginPath(); ctx.arc(cx, noseY, faceR * 0.05, 0, Math.PI * 2); ctx.fill();
      // 鼻筋ハイライト
      if (detail) {
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = Math.max(0.5, faceR * 0.015);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, noseY - faceR * 0.08);
        ctx.lineTo(cx, noseY - faceR * 0.02);
        ctx.stroke();
        // 鼻先ハイライト点
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath(); ctx.arc(cx, noseY - faceR * 0.01, faceR * 0.012, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 1: // まるい
      // 小鼻の影（両サイド）
      if (detail) {
        [-1, 1].forEach(function(s) {
          var sideGrad = ctx.createRadialGradient(cx + s * faceR * 0.06, noseY + faceR * 0.01, 0, cx + s * faceR * 0.06, noseY + faceR * 0.01, faceR * 0.06);
          sideGrad.addColorStop(0, 'rgba(0,0,0,0.12)');
          sideGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = sideGrad;
          ctx.beginPath(); ctx.arc(cx + s * faceR * 0.06, noseY + faceR * 0.01, faceR * 0.06, 0, Math.PI * 2); ctx.fill();
        });
      }
      // メイン影
      var roundGrad = ctx.createRadialGradient(cx, noseY, faceR * 0.01, cx, noseY, faceR * 0.09);
      roundGrad.addColorStop(0, 'rgba(0,0,0,0.2)');
      roundGrad.addColorStop(0.5, 'rgba(0,0,0,0.12)');
      roundGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = roundGrad;
      ctx.beginPath(); ctx.ellipse(cx, noseY, faceR * 0.09, faceR * 0.07, 0, 0, Math.PI * 2); ctx.fill();
      // 鼻の穴
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.arc(cx - faceR * 0.035, noseY + faceR * 0.025, faceR * 0.016, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + faceR * 0.035, noseY + faceR * 0.025, faceR * 0.016, 0, Math.PI * 2); ctx.fill();
      // 鼻筋ハイライト
      if (detail) {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = Math.max(0.5, faceR * 0.018);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, noseY - faceR * 0.12);
        ctx.lineTo(cx, noseY - faceR * 0.03);
        ctx.stroke();
        // 鼻先の丸みハイライト
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath(); ctx.arc(cx, noseY - faceR * 0.01, faceR * 0.018, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 2: // たかい
      // 鼻筋の影線（片側）
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = Math.max(0.5, faceR * 0.02);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + faceR * 0.01, noseY - faceR * 0.12);
      ctx.bezierCurveTo(cx + faceR * 0.02, noseY - faceR * 0.04, cx + faceR * 0.025, noseY + faceR * 0.02, cx + faceR * 0.01, noseY + faceR * 0.06);
      ctx.stroke();
      // 小鼻の影（両サイド）
      if (detail) {
        [-1, 1].forEach(function(s) {
          var sGrad = ctx.createRadialGradient(cx + s * faceR * 0.04, noseY + faceR * 0.05, 0, cx + s * faceR * 0.04, noseY + faceR * 0.05, faceR * 0.04);
          sGrad.addColorStop(0, 'rgba(0,0,0,0.1)');
          sGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = sGrad;
          ctx.beginPath(); ctx.arc(cx + s * faceR * 0.04, noseY + faceR * 0.05, faceR * 0.04, 0, Math.PI * 2); ctx.fill();
        });
      }
      // 鼻筋ハイライト（中央の白い縦線）
      if (detail) {
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = Math.max(0.5, faceR * 0.015);
        ctx.beginPath();
        ctx.moveTo(cx - faceR * 0.005, noseY - faceR * 0.1);
        ctx.lineTo(cx - faceR * 0.005, noseY + faceR * 0.03);
        ctx.stroke();
      }
      // 鼻先の丸みハイライト
      var tipGrad = ctx.createRadialGradient(cx, noseY + faceR * 0.05, 0, cx, noseY + faceR * 0.05, faceR * 0.04);
      tipGrad.addColorStop(0, 'rgba(255,255,255,0.25)');
      tipGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = tipGrad;
      ctx.beginPath(); ctx.arc(cx, noseY + faceR * 0.05, faceR * 0.04, 0, Math.PI * 2); ctx.fill();
      break;
  }
  ctx.restore();
}

function drawBeard(ctx, cx, mouthY, faceR, type, color) {
  if (type === 0) return; // なし
  var beardColor = _skinDarker(color, 15);
  var detail = faceR >= 20;

  // 毛のテクスチャを描くヘルパー
  function _drawBeardHairs(x, y, w, h, density) {
    if (!detail) return;
    ctx.save();
    ctx.strokeStyle = _skinDarker(beardColor, 20);
    ctx.lineWidth = Math.max(0.3, faceR * 0.008);
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.4;
    for (var i = 0; i < density; i++) {
      var hx = x + (Math.random() - 0.5) * w;
      var hy = y + (Math.random() - 0.5) * h;
      var hLen = faceR * (0.02 + Math.random() * 0.03);
      var hAngle = Math.PI * 0.4 + Math.random() * Math.PI * 0.2;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + Math.cos(hAngle) * hLen, hy + Math.sin(hAngle) * hLen);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  ctx.fillStyle = beardColor; ctx.strokeStyle = beardColor;
  switch(type) {
    case 1: // ちょびひげ
      ctx.lineWidth = faceR * 0.04; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - faceR * 0.02, mouthY - faceR * 0.06); ctx.quadraticCurveTo(cx - faceR * 0.12, mouthY - faceR * 0.12, cx - faceR * 0.2, mouthY - faceR * 0.06); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + faceR * 0.02, mouthY - faceR * 0.06); ctx.quadraticCurveTo(cx + faceR * 0.12, mouthY - faceR * 0.12, cx + faceR * 0.2, mouthY - faceR * 0.06); ctx.stroke();
      _drawBeardHairs(cx - faceR * 0.11, mouthY - faceR * 0.09, faceR * 0.18, faceR * 0.06, 15);
      _drawBeardHairs(cx + faceR * 0.11, mouthY - faceR * 0.09, faceR * 0.18, faceR * 0.06, 15);
      break;
    case 2: // あごひげ
      ctx.beginPath(); ctx.arc(cx, mouthY + faceR * 0.25, faceR * 0.2, 0, Math.PI); ctx.fill();
      _drawBeardHairs(cx, mouthY + faceR * 0.28, faceR * 0.35, faceR * 0.15, 30);
      break;
    case 3: // フルひげ
      ctx.lineWidth = faceR * 0.04; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - faceR * 0.02, mouthY - faceR * 0.06); ctx.quadraticCurveTo(cx - faceR * 0.15, mouthY - faceR * 0.13, cx - faceR * 0.25, mouthY - faceR * 0.06); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + faceR * 0.02, mouthY - faceR * 0.06); ctx.quadraticCurveTo(cx + faceR * 0.15, mouthY - faceR * 0.13, cx + faceR * 0.25, mouthY - faceR * 0.06); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, mouthY + faceR * 0.2, faceR * 0.25, 0, Math.PI); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx - faceR * 0.3, mouthY + faceR * 0.1, faceR * 0.08, faceR * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + faceR * 0.3, mouthY + faceR * 0.1, faceR * 0.08, faceR * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      _drawBeardHairs(cx - faceR * 0.13, mouthY - faceR * 0.09, faceR * 0.2, faceR * 0.06, 15);
      _drawBeardHairs(cx + faceR * 0.13, mouthY - faceR * 0.09, faceR * 0.2, faceR * 0.06, 15);
      _drawBeardHairs(cx, mouthY + faceR * 0.25, faceR * 0.45, faceR * 0.2, 40);
      _drawBeardHairs(cx - faceR * 0.3, mouthY + faceR * 0.1, faceR * 0.14, faceR * 0.3, 20);
      _drawBeardHairs(cx + faceR * 0.3, mouthY + faceR * 0.1, faceR * 0.14, faceR * 0.3, 20);
      break;
  }
}

function drawCheeks(ctx, cx, eyeY, eyeSpacing, faceR, type) {
  if (type === 0) return; // なし
  // 頬の位置を目の下やや外側に正確に配置
  var cheekY = eyeY + faceR * 0.2;
  var cheekX = eyeSpacing + faceR * 0.08;
  var cheekR = faceR * 0.16; // より大きい半径でぼかし
  var alpha = type === 1 ? 0.13 : 0.25; // alpha値を下げてより自然に
  ctx.save();
  [cx - cheekX, cx + cheekX].forEach(function(x) {
    // 内側のコア
    var cg = ctx.createRadialGradient(x, cheekY, 0, x, cheekY, cheekR);
    cg.addColorStop(0, 'rgba(255,120,160,' + alpha + ')');
    cg.addColorStop(0.3, 'rgba(255,120,160,' + (alpha * 0.7) + ')');
    cg.addColorStop(0.6, 'rgba(255,120,160,' + (alpha * 0.3) + ')');
    cg.addColorStop(1, 'rgba(255,120,160,0)');
    ctx.fillStyle = cg;
    ctx.shadowColor = 'rgba(255,120,160,' + (alpha * 0.3) + ')';
    ctx.shadowBlur = cheekR * 1.2;
    ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    ctx.beginPath(); ctx.ellipse(x, cheekY, cheekR, cheekR * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    // 二重レイヤーでよりソフトなぼかし
    ctx.shadowBlur = 0;
    var cg2 = ctx.createRadialGradient(x, cheekY, 0, x, cheekY, cheekR * 1.4);
    cg2.addColorStop(0, 'rgba(255,140,170,' + (alpha * 0.4) + ')');
    cg2.addColorStop(0.5, 'rgba(255,140,170,' + (alpha * 0.15) + ')');
    cg2.addColorStop(1, 'rgba(255,140,170,0)');
    ctx.fillStyle = cg2;
    ctx.beginPath(); ctx.ellipse(x, cheekY, cheekR * 1.4, cheekR * 1.0, 0, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}

function _drawRealisticEye(ctx, ex, ey, sz, faceR, eyeColor, scaleX, scaleY, lidDroop) {
  var eW = sz * 2.5 * scaleX, eH = sz * 1.9 * scaleY;
  var irisR = sz * 1.45 * Math.min(scaleX, scaleY);
  var pupilR = irisR * 0.4;
  var hlR = irisR * 0.35;
  var detail = faceR >= 20;

  // アイシャドウ（目の周りの柔らかい影）
  if (detail) {
    ctx.save();
    var shadowG = ctx.createRadialGradient(ex, ey - eH * 0.2, eW * 0.3, ex, ey - eH * 0.2, eW * 1.6);
    shadowG.addColorStop(0, 'rgba(160,120,140,0.08)');
    shadowG.addColorStop(1, 'rgba(160,120,140,0)');
    ctx.fillStyle = shadowG;
    ctx.beginPath(); ctx.ellipse(ex, ey - eH * 0.2, eW * 1.6, eH * 1.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // 白目（柔らかいグラデーション）
  ctx.save();
  var scleraGrad = ctx.createRadialGradient(ex, ey - eH * 0.15, eW * 0.1, ex, ey, eW * 1.1);
  scleraGrad.addColorStop(0, '#FFFFFF');
  scleraGrad.addColorStop(0.7, '#F8F8FA');
  scleraGrad.addColorStop(1, '#E8E8EE');
  ctx.fillStyle = scleraGrad;
  ctx.beginPath(); ctx.ellipse(ex, ey, eW, eH, 0, 0, Math.PI * 2); ctx.fill();
  // 上部の影（まぶた影）
  ctx.save();
  ctx.beginPath(); ctx.ellipse(ex, ey, eW, eH, 0, 0, Math.PI * 2); ctx.clip();
  var topShadow = ctx.createLinearGradient(ex, ey - eH, ex, ey - eH * 0.1);
  topShadow.addColorStop(0, 'rgba(80,90,120,0.18)');
  topShadow.addColorStop(0.6, 'rgba(80,90,120,0.06)');
  topShadow.addColorStop(1, 'rgba(80,90,120,0)');
  ctx.fillStyle = topShadow;
  ctx.fillRect(ex - eW, ey - eH, eW * 2, eH * 1.2);
  ctx.restore();
  ctx.restore();

  // 虹彩（大きめ、深みのあるグラデーション）
  ctx.save();
  ctx.beginPath(); ctx.arc(ex, ey + sz * 0.05, irisR, 0, Math.PI * 2); ctx.clip();
  // 虹彩の多層グラデーション
  var irisGrad = ctx.createRadialGradient(ex, ey - irisR * 0.15, pupilR * 0.2, ex, ey + sz * 0.05, irisR);
  irisGrad.addColorStop(0, _skinLighter(eyeColor, 60));
  irisGrad.addColorStop(0.25, _skinLighter(eyeColor, 35));
  irisGrad.addColorStop(0.5, eyeColor);
  irisGrad.addColorStop(0.8, _skinDarker(eyeColor, 25));
  irisGrad.addColorStop(1, _skinDarker(eyeColor, 50));
  ctx.fillStyle = irisGrad;
  ctx.beginPath(); ctx.arc(ex, ey + sz * 0.05, irisR, 0, Math.PI * 2); ctx.fill();
  // 虹彩の放射状テクスチャ（控えめ）
  if (detail) {
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = _skinLighter(eyeColor, 30);
    ctx.lineWidth = Math.max(0.3, sz * 0.035);
    for (var ri = 0; ri < 20; ri++) {
      var angle = (ri / 20) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(ex + Math.cos(angle) * pupilR * 1.2, ey + sz * 0.05 + Math.sin(angle) * pupilR * 1.2);
      ctx.lineTo(ex + Math.cos(angle) * irisR * 0.88, ey + sz * 0.05 + Math.sin(angle) * irisR * 0.88);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // 虹彩下部の明るいリフレクション
  var botRef = ctx.createLinearGradient(ex, ey + irisR * 0.3, ex, ey + irisR);
  botRef.addColorStop(0, 'rgba(255,255,255,0)');
  botRef.addColorStop(0.5, 'rgba(255,255,255,0.08)');
  botRef.addColorStop(1, 'rgba(255,255,255,0.15)');
  ctx.fillStyle = botRef;
  ctx.beginPath(); ctx.arc(ex, ey + sz * 0.05, irisR, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // 虹彩の外周リング（くっきり）
  ctx.strokeStyle = _skinDarker(eyeColor, 65);
  ctx.lineWidth = Math.max(0.8, sz * 0.13);
  ctx.beginPath(); ctx.arc(ex, ey + sz * 0.05, irisR, 0, Math.PI * 2); ctx.stroke();

  // 瞳孔（やや大きめで深い黒）
  var pupGrad = ctx.createRadialGradient(ex, ey + sz * 0.05, 0, ex, ey + sz * 0.05, pupilR);
  pupGrad.addColorStop(0, '#000000');
  pupGrad.addColorStop(0.7, '#0a0a0a');
  pupGrad.addColorStop(1, '#151515');
  ctx.fillStyle = pupGrad;
  ctx.beginPath(); ctx.arc(ex, ey + sz * 0.05, pupilR, 0, Math.PI * 2); ctx.fill();

  // ハイライト（にがおえ風の大きく印象的な光）
  ctx.save();
  // メインハイライト（大きめ楕円）
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath(); ctx.ellipse(ex + irisR * 0.28, ey - irisR * 0.25, hlR * 1.3, hlR * 0.95, -0.25, 0, Math.PI * 2); ctx.fill();
  // サブハイライト（反対側）
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.arc(ex - irisR * 0.28, ey + irisR * 0.25, hlR * 0.55, 0, Math.PI * 2); ctx.fill();
  // 小さなアクセント光
  if (detail) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(ex + irisR * 0.45, ey - irisR * 0.5, hlR * 0.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // 二重まぶたのライン（柔らかいカーブ）
  if (detail) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.07)';
    ctx.lineWidth = Math.max(0.5, sz * 0.14);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ex - eW * 0.9, ey - eH * 0.75 + lidDroop * sz * 0.5);
    ctx.bezierCurveTo(ex - eW * 0.3, ey - eH * 1.5, ex + eW * 0.3, ey - eH * 1.5, ex + eW * 0.9, ey - eH * 0.75 - lidDroop * sz * 0.5);
    ctx.stroke();
    ctx.restore();
  }

  // まぶたの線（アイライン - 太めでくっきり）
  ctx.save();
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = Math.max(1.0, sz * 0.32);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ex - eW * 1.08, ey + lidDroop * sz * 0.8);
  ctx.bezierCurveTo(ex - eW * 0.4, ey - eH * 1.2, ex + eW * 0.4, ey - eH * 1.2, ex + eW * 1.08, ey - lidDroop * sz * 0.8);
  ctx.stroke();
  ctx.restore();

  // 上まつ毛（カーブした柔らかいライン）
  if (detail) {
    ctx.save();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineCap = 'round';
    var lashCount = 5;
    for (var li = 0; li < lashCount; li++) {
      var lt = (li + 0.5) / lashCount;
      var lashX = ex - eW * 1.05 + lt * eW * 2.1;
      var cpY = ey - eH * 1.2;
      var lashY = (1-lt)*(1-lt)*(ey + lidDroop * sz * 0.8) + 2*(1-lt)*lt*cpY + lt*lt*(ey - lidDroop * sz * 0.8);
      var lashAngle = -Math.PI * 0.5 + (lt - 0.5) * Math.PI * 0.5;
      var lashLen = sz * (0.5 + Math.sin(lt * Math.PI) * 0.4);
      // カーブしたまつ毛（直線→曲線）
      ctx.lineWidth = Math.max(0.5, sz * 0.1 * (1 + Math.sin(lt * Math.PI) * 0.5));
      ctx.beginPath();
      ctx.moveTo(lashX, lashY);
      var endX = lashX + Math.cos(lashAngle) * lashLen;
      var endY = lashY + Math.sin(lashAngle) * lashLen;
      var cpX = lashX + Math.cos(lashAngle + 0.3) * lashLen * 0.6;
      var cpLY = lashY + Math.sin(lashAngle + 0.3) * lashLen * 0.6;
      ctx.quadraticCurveTo(cpX, cpLY, endX, endY);
      ctx.stroke();
    }
    // 下まつ毛（控えめ2本）
    ctx.strokeStyle = 'rgba(30,30,30,0.2)';
    ctx.lineWidth = Math.max(0.3, sz * 0.06);
    for (var di = 0; di < 2; di++) {
      var dt = 0.35 + di * 0.3;
      var dlx = ex - eW * 0.6 + dt * eW * 1.2;
      var dly = ey + eH * 0.75;
      ctx.beginPath();
      ctx.moveTo(dlx, dly);
      ctx.quadraticCurveTo(dlx + (dt - 0.5) * sz * 0.15, dly + sz * 0.15, dlx + (dt - 0.5) * sz * 0.25, dly + sz * 0.25);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 下まぶたの柔らかいライン
  if (detail) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = Math.max(0.5, sz * 0.08);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ex - eW * 0.9, ey + eH * 0.3);
    ctx.bezierCurveTo(ex - eW * 0.3, ey + eH * 0.85, ex + eW * 0.3, ey + eH * 0.85, ex + eW * 0.9, ey + eH * 0.3);
    ctx.stroke();
    ctx.restore();
  }
}

function _drawClosedEye(ctx, ex, ey, sz, faceR) {
  var eW = sz * 2.5;
  var detail = faceR >= 20;

  // にっこり閉じ目のカーブ（太めの弧）
  ctx.save();
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = Math.max(1.0, sz * 0.35);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ex - eW, ey);
  ctx.bezierCurveTo(ex - eW * 0.3, ey + sz * 1.5, ex + eW * 0.3, ey + sz * 1.5, ex + eW, ey);
  ctx.stroke();
  ctx.restore();

  if (detail) {
    // カーブしたまつ毛（4本）
    ctx.save();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineCap = 'round';
    for (var i = 0; i < 4; i++) {
      var t = (i + 0.5) / 4;
      var mx = ex - eW + t * eW * 2;
      var cpY = ey + sz * 1.5;
      var my = (1-t)*(1-t)*ey + 2*(1-t)*t*cpY + t*t*ey;
      var lAngle = Math.PI * 0.3 + t * Math.PI * 0.35;
      var lLen = sz * (0.45 + Math.sin(t * Math.PI) * 0.35);
      ctx.lineWidth = Math.max(0.5, sz * 0.1 * (1 + Math.sin(t * Math.PI) * 0.4));
      ctx.beginPath();
      ctx.moveTo(mx, my);
      var endX = mx + Math.cos(lAngle) * lLen;
      var endY = my + Math.sin(lAngle) * lLen;
      ctx.quadraticCurveTo(mx + Math.cos(lAngle + 0.2) * lLen * 0.6, my + Math.sin(lAngle + 0.2) * lLen * 0.6, endX, endY);
      ctx.stroke();
    }
    // 二重まぶたのライン（柔らかいカーブ）
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = Math.max(0.5, sz * 0.12);
    ctx.beginPath();
    ctx.moveTo(ex - eW * 0.85, ey - sz * 0.5);
    ctx.bezierCurveTo(ex - eW * 0.3, ey + sz * 0.05, ex + eW * 0.3, ey + sz * 0.05, ex + eW * 0.85, ey - sz * 0.5);
    ctx.stroke();
    ctx.restore();
  } else {
    for (var j = -1; j <= 1; j++) {
      var mx2 = ex + j * eW * 0.4;
      var baseY2 = ey + sz * 0.5 + Math.abs(j) * -sz * 0.3;
      ctx.beginPath();
      ctx.moveTo(mx2, baseY2);
      ctx.lineTo(mx2 + j * sz * 0.3, baseY2 + sz * 0.4);
      ctx.stroke();
    }
  }
}

function drawEyes(ctx, cx, eyeY, spacing, sz, type, faceR, eyeColor) {
  var lx = cx - spacing, rx = cx + spacing;
  if (!eyeColor) eyeColor = AB_EYE_COLORS[0];
  var detail = faceR >= 20;
  ctx.save();
  switch(type) {
    case 0: // ドット → 標準的な目
      _drawRealisticEye(ctx, lx, eyeY, sz, faceR, eyeColor, 1, 1, 0);
      _drawRealisticEye(ctx, rx, eyeY, sz, faceR, eyeColor, 1, 1, 0);
      break;
    case 1: // ライン → 細い切れ長
      _drawRealisticEye(ctx, lx, eyeY, sz, faceR, eyeColor, 1.2, 0.6, 0);
      _drawRealisticEye(ctx, rx, eyeY, sz, faceR, eyeColor, 1.2, 0.6, 0);
      break;
    case 2: // まんまる → 大きな丸い目
      _drawRealisticEye(ctx, lx, eyeY, sz, faceR, eyeColor, 1.3, 1.3, 0);
      _drawRealisticEye(ctx, rx, eyeY, sz, faceR, eyeColor, 1.3, 1.3, 0);
      break;
    case 3: // ウインク → 片方閉じ
      _drawRealisticEye(ctx, lx, eyeY, sz, faceR, eyeColor, 1, 1, 0);
      _drawClosedEye(ctx, rx, eyeY, sz, faceR);
      break;
    case 4: // 閉じ目
      _drawClosedEye(ctx, lx, eyeY, sz, faceR);
      _drawClosedEye(ctx, rx, eyeY, sz, faceR);
      break;
    case 5: // たれ目
      _drawRealisticEye(ctx, lx, eyeY, sz, faceR, eyeColor, 1, 1, 0.6);
      _drawRealisticEye(ctx, rx, eyeY, sz, faceR, eyeColor, 1, 1, 0.6);
      break;
    case 6: // つり目
      _drawRealisticEye(ctx, lx, eyeY, sz, faceR, eyeColor, 1.1, 0.9, -0.7);
      _drawRealisticEye(ctx, rx, eyeY, sz, faceR, eyeColor, 1.1, 0.9, -0.7);
      break;
    case 7: // キラキラ → 特大 + 複数ハイライト
      var bigScale = 1.5;
      var eW7 = sz * 2.2 * bigScale, eH7 = sz * 1.6 * bigScale;
      var irisR7 = sz * 1.1 * bigScale, pupilR7 = irisR7 * 0.4;
      [lx, rx].forEach(function(ex) {
        // 白目
        ctx.fillStyle = '#FAFAFA';
        ctx.beginPath(); ctx.ellipse(ex, eyeY, eW7, eH7, 0, 0, Math.PI * 2); ctx.fill();
        // 白目上部の青み影
        ctx.save();
        ctx.beginPath(); ctx.ellipse(ex, eyeY, eW7, eH7, 0, 0, Math.PI * 2); ctx.clip();
        var bs7 = ctx.createLinearGradient(ex, eyeY - eH7, ex, eyeY);
        bs7.addColorStop(0, 'rgba(100,120,160,0.08)');
        bs7.addColorStop(1, 'rgba(100,120,160,0)');
        ctx.fillStyle = bs7;
        ctx.fillRect(ex - eW7, eyeY - eH7, eW7 * 2, eH7);
        ctx.restore();
        // 虹彩（放射状テクスチャ付き）
        ctx.save();
        ctx.beginPath(); ctx.arc(ex, eyeY, irisR7, 0, Math.PI * 2); ctx.clip();
        var ig = ctx.createRadialGradient(ex, eyeY, pupilR7 * 0.3, ex, eyeY, irisR7);
        ig.addColorStop(0, _skinLighter(eyeColor, 55));
        ig.addColorStop(0.35, _skinLighter(eyeColor, 30));
        ig.addColorStop(0.6, eyeColor);
        ig.addColorStop(1, _skinDarker(eyeColor, 40));
        ctx.fillStyle = ig;
        ctx.beginPath(); ctx.arc(ex, eyeY, irisR7, 0, Math.PI * 2); ctx.fill();
        if (detail) {
          ctx.strokeStyle = _skinDarker(eyeColor, 20);
          ctx.lineWidth = Math.max(0.3, sz * 0.04);
          ctx.globalAlpha = 0.2;
          for (var rk = 0; rk < 20; rk++) {
            var ra = (rk / 20) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(ex + Math.cos(ra) * pupilR7 * 0.8, eyeY + Math.sin(ra) * pupilR7 * 0.8);
            ctx.lineTo(ex + Math.cos(ra) * irisR7 * 0.85, eyeY + Math.sin(ra) * irisR7 * 0.85);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
        ctx.restore();
        // 虹彩外縁
        ctx.strokeStyle = _skinDarker(eyeColor, 60);
        ctx.lineWidth = Math.max(0.5, sz * 0.1);
        ctx.beginPath(); ctx.arc(ex, eyeY, irisR7, 0, Math.PI * 2); ctx.stroke();
        // 瞳孔
        ctx.fillStyle = '#080808';
        ctx.beginPath(); ctx.arc(ex, eyeY, pupilR7, 0, Math.PI * 2); ctx.fill();
        // 複数ハイライト（楕円 + 小丸 + 追加点）
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath(); ctx.ellipse(ex + irisR7 * 0.32, eyeY - irisR7 * 0.32, irisR7 * 0.3, irisR7 * 0.22, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex - irisR7 * 0.3, eyeY + irisR7 * 0.2, irisR7 * 0.18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.beginPath(); ctx.arc(ex + irisR7 * 0.1, eyeY - irisR7 * 0.5, irisR7 * 0.12, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex - irisR7 * 0.15, eyeY - irisR7 * 0.1, irisR7 * 0.1, 0, Math.PI * 2); ctx.fill();
        // まぶた + 二重ライン
        if (detail) {
          ctx.strokeStyle = 'rgba(0,0,0,0.08)';
          ctx.lineWidth = Math.max(0.5, sz * 0.12);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(ex - eW7 * 0.95, eyeY - eH7 * 0.6);
          ctx.quadraticCurveTo(ex, eyeY - eH7 * 1.4, ex + eW7 * 0.95, eyeY - eH7 * 0.6);
          ctx.stroke();
        }
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = Math.max(0.8, sz * 0.25);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex - eW7 * 1.05, eyeY);
        ctx.quadraticCurveTo(ex, eyeY - eH7 * 1.15, ex + eW7 * 1.05, eyeY);
        ctx.stroke();
        // 上まつ毛
        if (detail) {
          ctx.strokeStyle = '#1a1a1a';
          ctx.lineWidth = Math.max(0.5, sz * 0.12);
          for (var lk = 0; lk < 7; lk++) {
            var lkt = (lk + 0.5) / 7;
            var lkx = ex - eW7 * 1.05 + lkt * eW7 * 2.1;
            var lky = (1-lkt)*(1-lkt)*eyeY + 2*(1-lkt)*lkt*(eyeY - eH7 * 1.15) + lkt*lkt*eyeY;
            var lka = -Math.PI * 0.5 + (lkt - 0.5) * Math.PI * 0.6;
            var lkl = sz * (0.45 + Math.sin(lkt * Math.PI) * 0.35);
            ctx.beginPath();
            ctx.moveTo(lkx, lky);
            ctx.lineTo(lkx + Math.cos(lka) * lkl, lky + Math.sin(lka) * lkl);
            ctx.stroke();
          }
        }
      });
      break;
    case 8: // ジト目 → 半目
      var eW8 = sz * 2.2, eH8 = sz * 1.6;
      [lx, rx].forEach(function(ex) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(ex - eW8 * 1.1, eyeY - eH8 * 0.1, eW8 * 2.2, eH8 * 1.2);
        ctx.clip();
        ctx.fillStyle = '#FAFAFA';
        ctx.beginPath(); ctx.ellipse(ex, eyeY, eW8, eH8, 0, 0, Math.PI * 2); ctx.fill();
        // 青み影
        var bs8 = ctx.createLinearGradient(ex, eyeY - eH8 * 0.1, ex, eyeY + eH8 * 0.3);
        bs8.addColorStop(0, 'rgba(100,120,160,0.08)');
        bs8.addColorStop(1, 'rgba(100,120,160,0)');
        ctx.fillStyle = bs8;
        ctx.beginPath(); ctx.ellipse(ex, eyeY, eW8, eH8, 0, 0, Math.PI * 2); ctx.fill();
        // 虹彩
        var iR = sz * 1.1, pR = iR * 0.45;
        ctx.save();
        ctx.beginPath(); ctx.arc(ex, eyeY + sz * 0.2, iR, 0, Math.PI * 2); ctx.clip();
        var ig8 = ctx.createRadialGradient(ex, eyeY + sz * 0.2, pR * 0.3, ex, eyeY + sz * 0.2, iR);
        ig8.addColorStop(0, _skinLighter(eyeColor, 50));
        ig8.addColorStop(0.35, _skinLighter(eyeColor, 25));
        ig8.addColorStop(0.6, eyeColor);
        ig8.addColorStop(1, _skinDarker(eyeColor, 40));
        ctx.fillStyle = ig8;
        ctx.beginPath(); ctx.arc(ex, eyeY + sz * 0.2, iR, 0, Math.PI * 2); ctx.fill();
        if (detail) {
          ctx.strokeStyle = _skinDarker(eyeColor, 20);
          ctx.lineWidth = Math.max(0.3, sz * 0.04);
          ctx.globalAlpha = 0.2;
          for (var r8 = 0; r8 < 12; r8++) {
            var a8 = (r8 / 12) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(ex + Math.cos(a8) * pR * 0.8, eyeY + sz * 0.2 + Math.sin(a8) * pR * 0.8);
            ctx.lineTo(ex + Math.cos(a8) * iR * 0.85, eyeY + sz * 0.2 + Math.sin(a8) * iR * 0.85);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
        ctx.restore();
        // 虹彩縁
        ctx.strokeStyle = _skinDarker(eyeColor, 55);
        ctx.lineWidth = Math.max(0.5, sz * 0.08);
        ctx.beginPath(); ctx.arc(ex, eyeY + sz * 0.2, iR, 0, Math.PI * 2); ctx.stroke();
        // 瞳孔
        ctx.fillStyle = '#080808';
        ctx.beginPath(); ctx.arc(ex, eyeY + sz * 0.2, pR, 0, Math.PI * 2); ctx.fill();
        // ハイライト
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath(); ctx.ellipse(ex + iR * 0.28, eyeY + sz * 0.05, iR * 0.25, iR * 0.18, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath(); ctx.arc(ex - iR * 0.2, eyeY + sz * 0.3, iR * 0.12, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // 重いまぶた線
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = Math.max(1, sz * 0.35);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex - eW8 * 1.1, eyeY - sz * 0.1);
        ctx.lineTo(ex + eW8 * 1.1, eyeY - sz * 0.1);
        ctx.stroke();
        // 下まつ毛
        if (detail) {
          ctx.strokeStyle = 'rgba(30,30,30,0.25)';
          ctx.lineWidth = Math.max(0.3, sz * 0.08);
          for (var d8 = 0; d8 < 2; d8++) {
            var d8x = ex + (d8 - 0.5) * eW8 * 0.6;
            ctx.beginPath();
            ctx.moveTo(d8x, eyeY + eH8 * 0.6);
            ctx.lineTo(d8x + (d8 - 0.5) * sz * 0.2, eyeY + eH8 * 0.6 + sz * 0.2);
            ctx.stroke();
          }
        }
      });
      break;
  }
  ctx.restore();
}

function drawMouth(ctx, cx, my, faceR, type) {
  var mw = faceR * 0.32;
  var lipTop = '#D4636A';
  var lipBot = '#E08880';
  var lipDark = '#A03840';
  var detail = faceR >= 20;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.save();

  // 人中（上唇の上の縦溝）- 全タイプ共通
  if (detail) {
    ctx.save();
    var philGrad = ctx.createLinearGradient(cx, my - mw * 0.35, cx, my - mw * 0.05);
    philGrad.addColorStop(0, 'rgba(0,0,0,0.02)');
    philGrad.addColorStop(1, 'rgba(0,0,0,0.05)');
    ctx.strokeStyle = philGrad;
    ctx.lineWidth = Math.max(0.5, faceR * 0.015);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - faceR * 0.012, my - mw * 0.3);
    ctx.bezierCurveTo(cx - faceR * 0.01, my - mw * 0.15, cx - faceR * 0.008, my - mw * 0.08, cx - faceR * 0.005, my - mw * 0.02);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + faceR * 0.012, my - mw * 0.3);
    ctx.bezierCurveTo(cx + faceR * 0.01, my - mw * 0.15, cx + faceR * 0.008, my - mw * 0.08, cx + faceR * 0.005, my - mw * 0.02);
    ctx.stroke();
    ctx.restore();
  }

  // 口角の陰影ヘルパー（柔らかい影）
  function _drawCornerShadow(x, y) {
    if (!detail) return;
    var cGrad = ctx.createRadialGradient(x, y, 0, x, y, faceR * 0.035);
    cGrad.addColorStop(0, 'rgba(120,60,60,0.1)');
    cGrad.addColorStop(0.5, 'rgba(120,60,60,0.04)');
    cGrad.addColorStop(1, 'rgba(120,60,60,0)');
    ctx.fillStyle = cGrad;
    ctx.beginPath(); ctx.arc(x, y, faceR * 0.035, 0, Math.PI * 2); ctx.fill();
  }

  // 下唇ハイライトヘルパー（ぷっくり感強調）
  function _drawLipHighlight(y, w) {
    if (!detail) return;
    ctx.save();
    // メインのグロス光沢
    var glossGrad = ctx.createRadialGradient(cx, y - w * 0.02, w * 0.05, cx, y, w * 0.3);
    glossGrad.addColorStop(0, 'rgba(255,255,255,0.35)');
    glossGrad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
    glossGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glossGrad;
    ctx.beginPath(); ctx.ellipse(cx, y, w * 0.28, w * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  switch(type) {
    case 0: // にっこり - 閉じた笑顔
      // 上唇（キューピッドボウ）
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.7, my);
      ctx.bezierCurveTo(cx - mw * 0.45, my - mw * 0.12, cx - mw * 0.15, my - mw * 0.2, cx, my - mw * 0.1);
      ctx.bezierCurveTo(cx + mw * 0.15, my - mw * 0.2, cx + mw * 0.45, my - mw * 0.12, cx + mw * 0.7, my);
      ctx.strokeStyle = lipTop; ctx.lineWidth = faceR * 0.03; ctx.stroke();
      // 下唇（グラデーション付きふっくら）
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.6, my + mw * 0.02);
      ctx.bezierCurveTo(cx - mw * 0.35, my + mw * 0.28, cx + mw * 0.35, my + mw * 0.28, cx + mw * 0.6, my + mw * 0.02);
      var lipGrad = ctx.createLinearGradient(cx, my, cx, my + mw * 0.28);
      lipGrad.addColorStop(0, lipBot);
      lipGrad.addColorStop(0.5, _skinLighter(lipBot, 10));
      lipGrad.addColorStop(1, _skinDarker(lipBot, 25));
      ctx.fillStyle = lipGrad; ctx.fill();
      _drawLipHighlight(my + mw * 0.12, mw);
      // 口の線
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.65, my);
      ctx.bezierCurveTo(cx - mw * 0.2, my + mw * 0.12, cx + mw * 0.2, my + mw * 0.12, cx + mw * 0.65, my);
      ctx.strokeStyle = lipDark; ctx.lineWidth = faceR * 0.02; ctx.stroke();
      _drawCornerShadow(cx - mw * 0.68, my + mw * 0.02);
      _drawCornerShadow(cx + mw * 0.68, my + mw * 0.02);
      break;
    case 1: // わーい - 開いた笑顔
      // 口内
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.7, my);
      ctx.bezierCurveTo(cx - mw * 0.3, my + mw * 0.55, cx + mw * 0.3, my + mw * 0.55, cx + mw * 0.7, my);
      ctx.bezierCurveTo(cx + mw * 0.3, my - mw * 0.1, cx - mw * 0.3, my - mw * 0.1, cx - mw * 0.7, my);
      ctx.closePath();
      // 口内グラデーション
      var mouthInGrad = ctx.createLinearGradient(cx, my, cx, my + mw * 0.5);
      mouthInGrad.addColorStop(0, '#1a0a0b');
      mouthInGrad.addColorStop(1, '#2D1517');
      ctx.fillStyle = mouthInGrad; ctx.fill();
      // 舌（グラデーション付き）
      var tongGrad1 = ctx.createRadialGradient(cx, my + mw * 0.28, mw * 0.05, cx, my + mw * 0.3, mw * 0.3);
      tongGrad1.addColorStop(0, '#e88080');
      tongGrad1.addColorStop(1, '#D4736E');
      ctx.fillStyle = tongGrad1;
      ctx.beginPath();
      ctx.ellipse(cx, my + mw * 0.3, mw * 0.3, mw * 0.18, 0, 0, Math.PI);
      ctx.fill();
      // 上唇（キューピッドボウ）
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.75, my);
      ctx.bezierCurveTo(cx - mw * 0.4, my - mw * 0.18, cx - mw * 0.12, my - mw * 0.24, cx, my - mw * 0.12);
      ctx.bezierCurveTo(cx + mw * 0.12, my - mw * 0.24, cx + mw * 0.4, my - mw * 0.18, cx + mw * 0.75, my);
      ctx.strokeStyle = lipTop; ctx.lineWidth = faceR * 0.035; ctx.stroke();
      // 下唇
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.65, my + mw * 0.02);
      ctx.bezierCurveTo(cx - mw * 0.2, my + mw * 0.55, cx + mw * 0.2, my + mw * 0.55, cx + mw * 0.65, my + mw * 0.02);
      ctx.strokeStyle = lipBot; ctx.lineWidth = faceR * 0.03; ctx.stroke();
      _drawCornerShadow(cx - mw * 0.73, my + mw * 0.02);
      _drawCornerShadow(cx + mw * 0.73, my + mw * 0.02);
      break;
    case 2: // 一文字
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.6, my);
      ctx.lineTo(cx + mw * 0.6, my);
      ctx.strokeStyle = lipDark; ctx.lineWidth = faceR * 0.035; ctx.stroke();
      // 上唇の微かなキューピッドボウ影
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.5, my - faceR * 0.01);
      ctx.bezierCurveTo(cx - mw * 0.2, my - mw * 0.08, cx - mw * 0.05, my - mw * 0.1, cx, my - mw * 0.06);
      ctx.bezierCurveTo(cx + mw * 0.05, my - mw * 0.1, cx + mw * 0.2, my - mw * 0.08, cx + mw * 0.5, my - faceR * 0.01);
      ctx.strokeStyle = 'rgba(180,80,80,0.3)'; ctx.lineWidth = faceR * 0.02; ctx.stroke();
      // 下唇の微かなふっくら
      if (detail) {
        ctx.beginPath();
        ctx.moveTo(cx - mw * 0.4, my + faceR * 0.01);
        ctx.bezierCurveTo(cx - mw * 0.15, my + mw * 0.12, cx + mw * 0.15, my + mw * 0.12, cx + mw * 0.4, my + faceR * 0.01);
        ctx.fillStyle = 'rgba(196,116,110,0.15)'; ctx.fill();
        _drawLipHighlight(my + mw * 0.06, mw * 0.6);
      }
      _drawCornerShadow(cx - mw * 0.63, my);
      _drawCornerShadow(cx + mw * 0.63, my);
      break;
    case 3: // ぽかん - 開いた口
      // 口内
      ctx.beginPath();
      ctx.ellipse(cx, my + mw * 0.05, mw * 0.3, mw * 0.35, 0, 0, Math.PI * 2);
      var pokanGrad = ctx.createRadialGradient(cx, my + mw * 0.05, mw * 0.05, cx, my + mw * 0.05, mw * 0.35);
      pokanGrad.addColorStop(0, '#1a0a0b');
      pokanGrad.addColorStop(1, '#2D1517');
      ctx.fillStyle = pokanGrad; ctx.fill();
      // 唇のリング（グラデーション付き）
      ctx.beginPath();
      ctx.ellipse(cx, my + mw * 0.05, mw * 0.33, mw * 0.38, 0, 0, Math.PI * 2);
      var ovalGrad2 = ctx.createLinearGradient(cx, my - mw * 0.3, cx, my + mw * 0.4);
      ovalGrad2.addColorStop(0, lipTop);
      ovalGrad2.addColorStop(1, lipBot);
      ctx.strokeStyle = ovalGrad2; ctx.lineWidth = faceR * 0.035; ctx.stroke();
      // 下唇ハイライト
      _drawLipHighlight(my + mw * 0.25, mw * 0.5);
      break;
    case 4: // むすっ - 下向きカーブ
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.6, my - mw * 0.05);
      ctx.bezierCurveTo(cx - mw * 0.2, my + mw * 0.15, cx + mw * 0.2, my + mw * 0.15, cx + mw * 0.6, my - mw * 0.05);
      ctx.strokeStyle = lipDark; ctx.lineWidth = faceR * 0.035; ctx.stroke();
      // 下唇のふくらみ（グラデーション）
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.45, my + mw * 0.08);
      ctx.bezierCurveTo(cx - mw * 0.15, my + mw * 0.25, cx + mw * 0.15, my + mw * 0.25, cx + mw * 0.45, my + mw * 0.08);
      var grumpGrad = ctx.createLinearGradient(cx, my + mw * 0.08, cx, my + mw * 0.25);
      grumpGrad.addColorStop(0, 'rgba(196,116,110,0.35)');
      grumpGrad.addColorStop(1, 'rgba(180,100,95,0.2)');
      ctx.fillStyle = grumpGrad; ctx.fill();
      _drawLipHighlight(my + mw * 0.14, mw * 0.6);
      _drawCornerShadow(cx - mw * 0.63, my - mw * 0.03);
      _drawCornerShadow(cx + mw * 0.63, my - mw * 0.03);
      break;
    case 5: // にやり - 斜め口
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.6, my + mw * 0.08);
      ctx.bezierCurveTo(cx - mw * 0.1, my + mw * 0.15, cx + mw * 0.2, my - mw * 0.05, cx + mw * 0.7, my - mw * 0.2);
      ctx.strokeStyle = lipDark; ctx.lineWidth = faceR * 0.035; ctx.stroke();
      // 口角のハイライト
      ctx.beginPath();
      ctx.arc(cx + mw * 0.7, my - mw * 0.2, faceR * 0.02, 0, Math.PI * 2);
      ctx.fillStyle = lipTop; ctx.fill();
      _drawCornerShadow(cx - mw * 0.63, my + mw * 0.1);
      // 下唇の微かなふっくら
      if (detail) {
        ctx.beginPath();
        ctx.moveTo(cx - mw * 0.3, my + mw * 0.1);
        ctx.bezierCurveTo(cx, my + mw * 0.2, cx + mw * 0.3, my + mw * 0.05, cx + mw * 0.55, my - mw * 0.08);
        ctx.strokeStyle = 'rgba(196,116,110,0.2)'; ctx.lineWidth = faceR * 0.02; ctx.stroke();
      }
      break;
    case 6: // べー - 舌出し
      // 口
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.65, my);
      ctx.bezierCurveTo(cx - mw * 0.2, my + mw * 0.18, cx + mw * 0.2, my + mw * 0.18, cx + mw * 0.65, my);
      ctx.strokeStyle = lipDark; ctx.lineWidth = faceR * 0.035; ctx.stroke();
      // 舌（グラデーション付き）
      var tongueGrad = ctx.createRadialGradient(cx, my + mw * 0.25, mw * 0.05, cx, my + mw * 0.3, mw * 0.35);
      tongueGrad.addColorStop(0, '#FF9090');
      tongueGrad.addColorStop(0.5, '#FF8A8A');
      tongueGrad.addColorStop(1, '#D4736E');
      ctx.fillStyle = tongueGrad;
      ctx.beginPath();
      ctx.ellipse(cx, my + mw * 0.25, mw * 0.25, mw * 0.35, 0, 0, Math.PI);
      ctx.fill();
      // 舌のハイライト
      if (detail) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.ellipse(cx, my + mw * 0.2, mw * 0.12, mw * 0.06, 0, 0, Math.PI * 2); ctx.fill();
      }
      // 舌の中央線
      ctx.strokeStyle = '#C06060'; ctx.lineWidth = faceR * 0.015;
      ctx.beginPath();
      ctx.moveTo(cx, my + mw * 0.12);
      ctx.lineTo(cx, my + mw * 0.5);
      ctx.stroke();
      _drawCornerShadow(cx - mw * 0.68, my + mw * 0.02);
      _drawCornerShadow(cx + mw * 0.68, my + mw * 0.02);
      break;
  }
  ctx.restore();
}

function _drawHairShine(ctx, cx, topY, faceR, color, paths) {
  // ツヤ線を描画
  ctx.save();
  ctx.strokeStyle = _skinLighter(color, 50);
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = Math.max(0.5, faceR * 0.025);
  ctx.lineCap = 'round';
  paths.forEach(function(p) {
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.quadraticCurveTo(p[2], p[3], p[4], p[5]);
    ctx.stroke();
  });
  ctx.restore();
}
function drawHair(ctx, cx, faceY, faceR, type, color) {
  if (type === 0) return;
  var topY = faceY - faceR - faceR * 0.12;
  var lighter = _skinLighter(color, 30);
  var darker = _skinDarker(color, 25);
  var detail = faceR >= 20;

  // ベースの髪色グラデーション（根元暗く毛先明るい）
  function hairGrad(y1, y2) {
    var g = ctx.createLinearGradient(cx, y1, cx, y2);
    g.addColorStop(0, darker);
    g.addColorStop(0.4, color);
    g.addColorStop(0.8, lighter);
    g.addColorStop(1, _skinLighter(color, 15));
    return g;
  }

  // 髪のストランドライン描画ヘルパー
  function _drawStrands(paths, alpha) {
    if (!detail) return;
    ctx.save();
    ctx.strokeStyle = darker;
    ctx.globalAlpha = alpha || 0.15;
    ctx.lineWidth = Math.max(0.5, faceR * 0.012);
    ctx.lineCap = 'round';
    paths.forEach(function(p) {
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      if (p.length === 6) {
        ctx.quadraticCurveTo(p[2], p[3], p[4], p[5]);
      } else if (p.length === 8) {
        ctx.bezierCurveTo(p[2], p[3], p[4], p[5], p[6], p[7]);
      }
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // 分け目ライン描画
  function _drawPartLine(x, y1, y2) {
    if (!detail) return;
    ctx.save();
    ctx.strokeStyle = _skinDarker(color, 40);
    ctx.lineWidth = Math.max(0.5, faceR * 0.015);
    ctx.globalAlpha = 0.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x + faceR * 0.02, y2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  ctx.save();
  switch(type) {
    case 1: // ショート
      ctx.fillStyle = hairGrad(topY - faceR * 0.3, topY + faceR * 0.4);
      ctx.beginPath(); ctx.arc(cx, topY + faceR * 0.1, faceR * 0.65, Math.PI, 2 * Math.PI); ctx.fill();
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.3, topY + faceR * 0.05, cx - faceR * 0.1, topY - faceR * 0.15, cx + faceR * 0.15, topY - faceR * 0.1],
        [cx + faceR * 0.05, topY + faceR * 0.08, cx + faceR * 0.2, topY - faceR * 0.12, cx + faceR * 0.4, topY - faceR * 0.05]
      ]);
      _drawPartLine(cx - faceR * 0.15, topY - faceR * 0.05, topY + faceR * 0.1);
      _drawStrands([
        [cx - faceR * 0.5, topY + faceR * 0.1, cx - faceR * 0.3, topY - faceR * 0.1, cx - faceR * 0.1, topY - faceR * 0.05],
        [cx - faceR * 0.35, topY + faceR * 0.08, cx - faceR * 0.15, topY - faceR * 0.12, cx + faceR * 0.05, topY - faceR * 0.08],
        [cx, topY + faceR * 0.1, cx + faceR * 0.15, topY - faceR * 0.1, cx + faceR * 0.3, topY - faceR * 0.02],
        [cx + faceR * 0.1, topY + faceR * 0.08, cx + faceR * 0.25, topY - faceR * 0.08, cx + faceR * 0.45, topY + faceR * 0.02],
        [cx + faceR * 0.2, topY + faceR * 0.1, cx + faceR * 0.35, topY - faceR * 0.05, cx + faceR * 0.5, topY + faceR * 0.05],
        [cx - faceR * 0.15, topY + faceR * 0.05, cx - faceR * 0.02, topY - faceR * 0.15, cx + faceR * 0.12, topY - faceR * 0.1],
        [cx - faceR * 0.45, topY + faceR * 0.12, cx - faceR * 0.4, topY, cx - faceR * 0.2, topY - faceR * 0.05],
        [cx + faceR * 0.3, topY + faceR * 0.12, cx + faceR * 0.4, topY, cx + faceR * 0.55, topY + faceR * 0.08]
      ]);
      break;
    case 2: // ミディアム — ふんわり内巻き
      // ベースの頭頂部
      ctx.fillStyle = hairGrad(topY - faceR * 0.3, topY + faceR * 0.5);
      ctx.beginPath(); ctx.arc(cx, topY + faceR * 0.12, faceR * 0.8, Math.PI * 0.85, Math.PI * 2.15); ctx.fill();
      // サイドの髪（肩にかかる長さ、内巻き）
      [-1, 1].forEach(function(s) {
        var sideGrad2 = ctx.createLinearGradient(cx + s * faceR * 0.5, topY, cx + s * faceR * 0.7, faceY + faceR * 0.55);
        sideGrad2.addColorStop(0, darker); sideGrad2.addColorStop(0.4, color); sideGrad2.addColorStop(0.8, lighter); sideGrad2.addColorStop(1, color);
        ctx.fillStyle = sideGrad2;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.65, topY + faceR * 0.15);
        ctx.bezierCurveTo(cx + s * faceR * 0.85, topY + faceR * 0.4, cx + s * faceR * 0.82, faceY + faceR * 0.2, cx + s * faceR * 0.7, faceY + faceR * 0.45);
        // 内巻きカール（ベジェで内側へ巻く）
        ctx.bezierCurveTo(cx + s * faceR * 0.58, faceY + faceR * 0.55, cx + s * faceR * 0.45, faceY + faceR * 0.45, cx + s * faceR * 0.5, faceY + faceR * 0.35);
        ctx.bezierCurveTo(cx + s * faceR * 0.55, faceY + faceR * 0.15, cx + s * faceR * 0.6, topY + faceR * 0.5, cx + s * faceR * 0.65, topY + faceR * 0.15);
        ctx.closePath(); ctx.fill();
      });
      // 前髪（額にかかるライン）
      ctx.fillStyle = hairGrad(topY - faceR * 0.1, topY + faceR * 0.45);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.55, topY + faceR * 0.2);
      ctx.bezierCurveTo(cx - faceR * 0.5, topY + faceR * 0.4, cx - faceR * 0.3, topY + faceR * 0.48, cx - faceR * 0.1, topY + faceR * 0.45);
      ctx.bezierCurveTo(cx, topY + faceR * 0.42, cx + faceR * 0.15, topY + faceR * 0.46, cx + faceR * 0.3, topY + faceR * 0.42);
      ctx.bezierCurveTo(cx + faceR * 0.45, topY + faceR * 0.38, cx + faceR * 0.55, topY + faceR * 0.3, cx + faceR * 0.6, topY + faceR * 0.2);
      ctx.lineTo(cx + faceR * 0.65, topY + faceR * 0.05);
      ctx.bezierCurveTo(cx + faceR * 0.5, topY - faceR * 0.15, cx - faceR * 0.5, topY - faceR * 0.15, cx - faceR * 0.6, topY + faceR * 0.05);
      ctx.closePath(); ctx.fill();
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.4, topY + faceR * 0.1, cx - faceR * 0.15, topY - faceR * 0.2, cx + faceR * 0.2, topY - faceR * 0.15],
        [cx, topY + faceR * 0.12, cx + faceR * 0.2, topY - faceR * 0.18, cx + faceR * 0.5, topY - faceR * 0.08]
      ]);
      _drawPartLine(cx - faceR * 0.1, topY - faceR * 0.08, topY + faceR * 0.12);
      _drawStrands([
        [cx - faceR * 0.5, topY + faceR * 0.22, cx - faceR * 0.45, topY + faceR * 0.35, cx - faceR * 0.25, topY + faceR * 0.45],
        [cx - faceR * 0.35, topY + faceR * 0.2, cx - faceR * 0.2, topY + faceR * 0.35, cx - faceR * 0.05, topY + faceR * 0.42],
        [cx - faceR * 0.15, topY + faceR * 0.18, cx + faceR * 0.05, topY + faceR * 0.35, cx + faceR * 0.2, topY + faceR * 0.4],
        [cx + faceR * 0.1, topY + faceR * 0.2, cx + faceR * 0.25, topY + faceR * 0.32, cx + faceR * 0.4, topY + faceR * 0.38],
        [cx + faceR * 0.3, topY + faceR * 0.18, cx + faceR * 0.42, topY + faceR * 0.28, cx + faceR * 0.52, topY + faceR * 0.32],
        [cx - faceR * 0.6, topY + faceR * 0.15, cx - faceR * 0.5, topY - faceR * 0.02, cx - faceR * 0.3, topY - faceR * 0.08],
        [cx + faceR * 0.15, topY + faceR * 0.08, cx + faceR * 0.3, topY - faceR * 0.1, cx + faceR * 0.5, topY - faceR * 0.02],
        [cx - faceR * 0.25, topY + faceR * 0.1, cx - faceR * 0.08, topY - faceR * 0.15, cx + faceR * 0.1, topY - faceR * 0.12]
      ]);
      break;
    case 3: // ロング — 胸元まで伸びる長い髪
      // ベースの頭頂部（広め）
      ctx.fillStyle = hairGrad(topY - faceR * 0.3, topY + faceR * 0.6);
      ctx.beginPath(); ctx.arc(cx, topY + faceR * 0.12, faceR * 0.85, Math.PI * 0.7, Math.PI * 2.3); ctx.fill();
      // サイドの長い髪（胸元まで、ウェーブ付き）
      [-1, 1].forEach(function(s) {
        var longGrad = ctx.createLinearGradient(cx + s * faceR * 0.5, topY, cx + s * faceR * 0.8, faceY + faceR * 1.0);
        longGrad.addColorStop(0, darker); longGrad.addColorStop(0.3, color); longGrad.addColorStop(0.6, lighter); longGrad.addColorStop(1, color);
        ctx.fillStyle = longGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.7, topY + faceR * 0.15);
        ctx.bezierCurveTo(cx + s * faceR * 0.9, topY + faceR * 0.4, cx + s * faceR * 0.88, faceY + faceR * 0.1, cx + s * faceR * 0.82, faceY + faceR * 0.5);
        // ゆるやかなウェーブ感（sin曲線風の動き）
        ctx.bezierCurveTo(cx + s * faceR * 0.78, faceY + faceR * 0.75, cx + s * faceR * 0.72, faceY + faceR * 0.9, cx + s * faceR * 0.65, faceY + faceR * 1.0);
        ctx.bezierCurveTo(cx + s * faceR * 0.55, faceY + faceR * 0.95, cx + s * faceR * 0.5, faceY + faceR * 0.7, cx + s * faceR * 0.52, faceY + faceR * 0.4);
        ctx.bezierCurveTo(cx + s * faceR * 0.55, faceY, cx + s * faceR * 0.58, topY + faceR * 0.5, cx + s * faceR * 0.65, topY + faceR * 0.15);
        ctx.closePath(); ctx.fill();
      });
      // 斜め前髪
      ctx.fillStyle = hairGrad(topY - faceR * 0.1, topY + faceR * 0.5);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.6, topY + faceR * 0.15);
      ctx.bezierCurveTo(cx - faceR * 0.55, topY + faceR * 0.35, cx - faceR * 0.4, topY + faceR * 0.5, cx - faceR * 0.15, topY + faceR * 0.48);
      ctx.bezierCurveTo(cx + faceR * 0.05, topY + faceR * 0.45, cx + faceR * 0.2, topY + faceR * 0.4, cx + faceR * 0.4, topY + faceR * 0.32);
      ctx.bezierCurveTo(cx + faceR * 0.55, topY + faceR * 0.25, cx + faceR * 0.65, topY + faceR * 0.15, cx + faceR * 0.7, topY + faceR * 0.05);
      ctx.bezierCurveTo(cx + faceR * 0.55, topY - faceR * 0.15, cx - faceR * 0.5, topY - faceR * 0.15, cx - faceR * 0.65, topY + faceR * 0.05);
      ctx.closePath(); ctx.fill();
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.5, topY + faceR * 0.1, cx - faceR * 0.2, topY - faceR * 0.25, cx + faceR * 0.1, topY - faceR * 0.2],
        [cx - faceR * 0.1, topY + faceR * 0.15, cx + faceR * 0.15, topY - faceR * 0.2, cx + faceR * 0.5, topY - faceR * 0.1],
        [cx + faceR * 0.1, topY + faceR * 0.1, cx + faceR * 0.35, topY - faceR * 0.15, cx + faceR * 0.6, topY + faceR * 0.05]
      ]);
      _drawPartLine(cx - faceR * 0.2, topY - faceR * 0.1, topY + faceR * 0.15);
      _drawStrands([
        [cx - faceR * 0.55, topY + faceR * 0.18, cx - faceR * 0.48, topY + faceR * 0.35, cx - faceR * 0.3, topY + faceR * 0.48],
        [cx - faceR * 0.4, topY + faceR * 0.2, cx - faceR * 0.25, topY + faceR * 0.38, cx - faceR * 0.1, topY + faceR * 0.46],
        [cx - faceR * 0.2, topY + faceR * 0.18, cx - faceR * 0.05, topY + faceR * 0.35, cx + faceR * 0.15, topY + faceR * 0.42],
        [cx + faceR * 0.05, topY + faceR * 0.2, cx + faceR * 0.2, topY + faceR * 0.32, cx + faceR * 0.35, topY + faceR * 0.35],
        [cx + faceR * 0.25, topY + faceR * 0.18, cx + faceR * 0.38, topY + faceR * 0.28, cx + faceR * 0.5, topY + faceR * 0.3],
        [cx - faceR * 0.65, topY + faceR * 0.2, cx - faceR * 0.55, topY - faceR * 0.05, cx - faceR * 0.35, topY - faceR * 0.1],
        [cx + faceR * 0.2, topY + faceR * 0.1, cx + faceR * 0.38, topY - faceR * 0.08, cx + faceR * 0.55, topY + faceR * 0.02],
        [cx - faceR * 0.3, topY + faceR * 0.1, cx - faceR * 0.12, topY - faceR * 0.2, cx + faceR * 0.08, topY - faceR * 0.18]
      ]);
      break;
    case 4: // スパイキー
      var spikes = 7;
      for (var i = 0; i < spikes; i++) {
        var angle = Math.PI + (i / (spikes - 1)) * Math.PI;
        var sx = cx + Math.cos(angle) * faceR * 0.55;
        var sy = topY + faceR * 0.15 + Math.sin(angle) * faceR * 0.25;
        var tx = cx + Math.cos(angle) * faceR * 1.1;
        var ty = topY + faceR * 0.15 + Math.sin(angle) * faceR * 0.7 - faceR * 0.45;
        var sg = ctx.createLinearGradient(sx, sy, tx, ty);
        sg.addColorStop(0, darker); sg.addColorStop(0.6, color); sg.addColorStop(1, lighter);
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.moveTo(sx - faceR * 0.12, sy); ctx.lineTo(tx, ty); ctx.lineTo(sx + faceR * 0.12, sy); ctx.fill();
        // スパイクのストランド
        if (detail) {
          ctx.save();
          ctx.strokeStyle = _skinDarker(color, 35);
          ctx.globalAlpha = 0.15;
          ctx.lineWidth = Math.max(0.5, faceR * 0.01);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(tx + faceR * 0.02, ty);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }
      ctx.fillStyle = hairGrad(topY, topY + faceR * 0.4);
      ctx.beginPath(); ctx.arc(cx, topY + faceR * 0.2, faceR * 0.55, Math.PI, 2 * Math.PI); ctx.fill();
      _drawStrands([
        [cx - faceR * 0.3, topY + faceR * 0.2, cx - faceR * 0.15, topY + faceR * 0.05, cx, topY + faceR * 0.1],
        [cx, topY + faceR * 0.18, cx + faceR * 0.1, topY + faceR * 0.05, cx + faceR * 0.25, topY + faceR * 0.1],
        [cx + faceR * 0.15, topY + faceR * 0.2, cx + faceR * 0.3, topY + faceR * 0.08, cx + faceR * 0.4, topY + faceR * 0.15]
      ]);
      break;
    case 5: // ひよこ — 短い芝生風の毛がランダムに立つ（輪郭なし）
      // 短い毛を多数描画（芝生風）
      ctx.save();
      ctx.lineCap = 'round';
      var grassCount = detail ? 35 : 15;
      for (var gi = 0; gi < grassCount; gi++) {
        var ga = Math.PI + (gi / (grassCount - 1)) * Math.PI;
        var gx = cx + Math.cos(ga) * faceR * (0.3 + Math.random() * 0.25);
        var gy = topY + faceR * 0.05 + Math.sin(ga) * faceR * 0.1;
        var glen = faceR * (0.08 + Math.random() * 0.12);
        var gangle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
        var tx = gx + Math.cos(gangle) * glen;
        var ty = gy + Math.sin(gangle) * glen;
        ctx.strokeStyle = Math.random() > 0.5 ? color : lighter;
        ctx.lineWidth = faceR * (0.015 + Math.random() * 0.015);
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(tx, ty); ctx.stroke();
      }
      ctx.restore();
      break;
    case 6: // チカラ — 角刈り・渡哲也風（きっちりした四角いシルエット）
      ctx.save();
      // トップ部分：きっちりフラットな角刈り
      var kakuGrad = ctx.createLinearGradient(cx, topY - faceR * 0.15, cx, topY + faceR * 0.2);
      kakuGrad.addColorStop(0, lighter); kakuGrad.addColorStop(0.3, color); kakuGrad.addColorStop(1, darker);
      ctx.fillStyle = kakuGrad;
      ctx.beginPath();
      // 四角くフラットな天頂 + 角ばったサイド
      ctx.moveTo(cx - faceR * 0.68, topY + faceR * 0.3);
      ctx.lineTo(cx - faceR * 0.68, topY - faceR * 0.05);
      ctx.lineTo(cx - faceR * 0.6, topY - faceR * 0.18);
      ctx.lineTo(cx - faceR * 0.4, topY - faceR * 0.22);
      ctx.lineTo(cx + faceR * 0.4, topY - faceR * 0.22);
      ctx.lineTo(cx + faceR * 0.6, topY - faceR * 0.18);
      ctx.lineTo(cx + faceR * 0.68, topY - faceR * 0.05);
      ctx.lineTo(cx + faceR * 0.68, topY + faceR * 0.3);
      ctx.closePath(); ctx.fill();
      // サイドの刈り上げ（グラデーション＋短い毛テクスチャ）
      var sideGrad = ctx.createLinearGradient(cx - faceR * 0.8, 0, cx - faceR * 0.6, 0);
      sideGrad.addColorStop(0, darker); sideGrad.addColorStop(1, color);
      ctx.fillStyle = sideGrad;
      ctx.globalAlpha = 0.7;
      // 左サイド
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.82, topY + faceR * 0.1);
      ctx.lineTo(cx - faceR * 0.68, topY - faceR * 0.05);
      ctx.lineTo(cx - faceR * 0.68, topY + faceR * 0.55);
      ctx.lineTo(cx - faceR * 0.82, topY + faceR * 0.5);
      ctx.closePath(); ctx.fill();
      // 右サイド
      ctx.beginPath();
      ctx.moveTo(cx + faceR * 0.82, topY + faceR * 0.1);
      ctx.lineTo(cx + faceR * 0.68, topY - faceR * 0.05);
      ctx.lineTo(cx + faceR * 0.68, topY + faceR * 0.55);
      ctx.lineTo(cx + faceR * 0.82, topY + faceR * 0.5);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1.0;
      // 刈り上げテクスチャ（細い横線）
      if (detail) {
        ctx.strokeStyle = darker;
        ctx.lineWidth = Math.max(0.3, faceR * 0.006);
        ctx.globalAlpha = 0.25;
        for (var ci = 0; ci < 10; ci++) {
          var cy2 = topY + faceR * 0.12 + ci * faceR * 0.042;
          ctx.beginPath(); ctx.moveTo(cx - faceR * 0.82, cy2); ctx.lineTo(cx - faceR * 0.68, cy2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx + faceR * 0.68, cy2); ctx.lineTo(cx + faceR * 0.82, cy2); ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
      }
      // トップのオールバック流れ線（艶）
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.35, topY + faceR * 0.2, cx - faceR * 0.25, topY, cx - faceR * 0.15, topY - faceR * 0.15],
        [cx - faceR * 0.05, topY + faceR * 0.2, cx, topY, cx + faceR * 0.05, topY - faceR * 0.18],
        [cx + faceR * 0.2, topY + faceR * 0.2, cx + faceR * 0.25, topY, cx + faceR * 0.35, topY - faceR * 0.12]
      ]);
      // 分け目（左寄り）
      if (detail) {
        ctx.strokeStyle = darker; ctx.lineWidth = faceR * 0.015; ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(cx - faceR * 0.25, topY - faceR * 0.2);
        ctx.quadraticCurveTo(cx - faceR * 0.2, topY, cx - faceR * 0.15, topY + faceR * 0.15);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }
      ctx.restore();
      break;
    case 7: // ポニテ — 流し前髪、後ろに集まる流れ
      // ベースの頭頂部（後ろに流れるシルエット）
      ctx.fillStyle = hairGrad(topY - faceR * 0.3, topY + faceR * 0.4);
      ctx.beginPath(); ctx.arc(cx, topY + faceR * 0.1, faceR * 0.7, Math.PI, 2 * Math.PI); ctx.fill();
      // 頭頂部から後ろへ集まる髪の流れ（右後方へ向かう膨らみ）
      ctx.fillStyle = hairGrad(topY - faceR * 0.15, topY + faceR * 0.3);
      ctx.beginPath();
      ctx.moveTo(cx, topY - faceR * 0.1);
      ctx.bezierCurveTo(cx + faceR * 0.3, topY - faceR * 0.2, cx + faceR * 0.55, topY - faceR * 0.15, cx + faceR * 0.55, topY + faceR * 0.05);
      ctx.bezierCurveTo(cx + faceR * 0.55, topY + faceR * 0.2, cx + faceR * 0.35, topY + faceR * 0.25, cx + faceR * 0.15, topY + faceR * 0.15);
      ctx.bezierCurveTo(cx + faceR * 0.05, topY + faceR * 0.1, cx - faceR * 0.02, topY + faceR * 0.05, cx, topY - faceR * 0.1);
      ctx.closePath(); ctx.fill();
      // 前髪（流し前髪風 — 左から右へ流れる）
      ctx.fillStyle = hairGrad(topY - faceR * 0.1, topY + faceR * 0.45);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.58, topY + faceR * 0.05);
      // 左側から右に流れるカーブ
      ctx.bezierCurveTo(cx - faceR * 0.55, topY + faceR * 0.25, cx - faceR * 0.45, topY + faceR * 0.4, cx - faceR * 0.25, topY + faceR * 0.44);
      ctx.bezierCurveTo(cx - faceR * 0.1, topY + faceR * 0.46, cx + faceR * 0.05, topY + faceR * 0.43, cx + faceR * 0.2, topY + faceR * 0.38);
      // 右側は短く上がる（流し前髪の端）
      ctx.bezierCurveTo(cx + faceR * 0.35, topY + faceR * 0.32, cx + faceR * 0.48, topY + faceR * 0.22, cx + faceR * 0.55, topY + faceR * 0.12);
      ctx.lineTo(cx + faceR * 0.6, topY + faceR * 0.02);
      ctx.bezierCurveTo(cx + faceR * 0.45, topY - faceR * 0.18, cx - faceR * 0.45, topY - faceR * 0.18, cx - faceR * 0.58, topY + faceR * 0.05);
      ctx.closePath(); ctx.fill();
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.35, topY + faceR * 0.08, cx - faceR * 0.1, topY - faceR * 0.12, cx + faceR * 0.15, topY - faceR * 0.08],
        [cx + faceR * 0.05, topY + faceR * 0.06, cx + faceR * 0.25, topY - faceR * 0.1, cx + faceR * 0.42, topY - faceR * 0.02]
      ]);
      _drawPartLine(cx - faceR * 0.2, topY - faceR * 0.08, topY + faceR * 0.08);
      // 頭頂部から後ろへ集まる流れ線
      _drawStrands([
        // 前髪の流し方向ストランド（左→右）
        [cx - faceR * 0.5, topY + faceR * 0.12, cx - faceR * 0.3, topY + faceR * 0.3, cx - faceR * 0.1, topY + faceR * 0.42],
        [cx - faceR * 0.35, topY + faceR * 0.1, cx - faceR * 0.1, topY + faceR * 0.3, cx + faceR * 0.1, topY + faceR * 0.4],
        [cx - faceR * 0.15, topY + faceR * 0.08, cx + faceR * 0.1, topY + faceR * 0.25, cx + faceR * 0.3, topY + faceR * 0.32],
        [cx + faceR * 0.05, topY + faceR * 0.06, cx + faceR * 0.25, topY + faceR * 0.18, cx + faceR * 0.45, topY + faceR * 0.2],
        // 頭頂部→後方への流れ線
        [cx - faceR * 0.1, topY - faceR * 0.05, cx + faceR * 0.15, topY - faceR * 0.12, cx + faceR * 0.4, topY - faceR * 0.05],
        [cx, topY - faceR * 0.08, cx + faceR * 0.2, topY - faceR * 0.15, cx + faceR * 0.45, topY - faceR * 0.02],
        [cx + faceR * 0.1, topY - faceR * 0.05, cx + faceR * 0.3, topY - faceR * 0.1, cx + faceR * 0.5, topY + faceR * 0.05]
      ]);
      break;
    case 8: // ボブ — 顎ラインで内巻き、ぱっつん前髪
      // ベースの頭頂部（丸みのあるシルエット）
      ctx.fillStyle = hairGrad(topY - faceR * 0.3, topY + faceR * 0.5);
      ctx.beginPath(); ctx.arc(cx, topY + faceR * 0.1, faceR * 0.82, Math.PI * 0.8, Math.PI * 2.2); ctx.fill();
      // サイドの髪（顎ラインで内巻き）
      [-1, 1].forEach(function(s) {
        var bobGrad = ctx.createLinearGradient(cx + s * faceR * 0.5, topY, cx + s * faceR * 0.8, faceY + faceR * 0.4);
        bobGrad.addColorStop(0, darker); bobGrad.addColorStop(0.4, color); bobGrad.addColorStop(0.7, lighter); bobGrad.addColorStop(1, color);
        ctx.fillStyle = bobGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.68, topY + faceR * 0.15);
        ctx.bezierCurveTo(cx + s * faceR * 0.88, topY + faceR * 0.35, cx + s * faceR * 0.85, faceY + faceR * 0.05, cx + s * faceR * 0.75, faceY + faceR * 0.3);
        // 内巻きカーブ（顎で内側に）
        ctx.bezierCurveTo(cx + s * faceR * 0.65, faceY + faceR * 0.42, cx + s * faceR * 0.5, faceY + faceR * 0.38, cx + s * faceR * 0.48, faceY + faceR * 0.28);
        ctx.bezierCurveTo(cx + s * faceR * 0.52, faceY + faceR * 0.1, cx + s * faceR * 0.58, topY + faceR * 0.5, cx + s * faceR * 0.62, topY + faceR * 0.15);
        ctx.closePath(); ctx.fill();
      });
      // ぱっつん前髪（直線的）
      ctx.fillStyle = hairGrad(topY - faceR * 0.1, topY + faceR * 0.45);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.6, topY + faceR * 0.12);
      ctx.lineTo(cx - faceR * 0.58, topY + faceR * 0.42);
      ctx.lineTo(cx - faceR * 0.42, topY + faceR * 0.44);
      ctx.lineTo(cx - faceR * 0.25, topY + faceR * 0.43);
      ctx.lineTo(cx - faceR * 0.1, topY + faceR * 0.44);
      ctx.lineTo(cx + faceR * 0.1, topY + faceR * 0.44);
      ctx.lineTo(cx + faceR * 0.25, topY + faceR * 0.43);
      ctx.lineTo(cx + faceR * 0.42, topY + faceR * 0.44);
      ctx.lineTo(cx + faceR * 0.58, topY + faceR * 0.42);
      ctx.lineTo(cx + faceR * 0.6, topY + faceR * 0.12);
      ctx.bezierCurveTo(cx + faceR * 0.45, topY - faceR * 0.15, cx - faceR * 0.45, topY - faceR * 0.15, cx - faceR * 0.6, topY + faceR * 0.12);
      ctx.closePath(); ctx.fill();
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.35, topY + faceR * 0.1, cx - faceR * 0.1, topY - faceR * 0.2, cx + faceR * 0.2, topY - faceR * 0.15],
        [cx + faceR * 0.05, topY + faceR * 0.08, cx + faceR * 0.25, topY - faceR * 0.15, cx + faceR * 0.45, topY - faceR * 0.05]
      ]);
      _drawPartLine(cx, topY - faceR * 0.08, topY + faceR * 0.12);
      _drawStrands([
        [cx - faceR * 0.52, topY + faceR * 0.15, cx - faceR * 0.48, topY + faceR * 0.3, cx - faceR * 0.42, topY + faceR * 0.42],
        [cx - faceR * 0.35, topY + faceR * 0.14, cx - faceR * 0.28, topY + faceR * 0.3, cx - faceR * 0.2, topY + faceR * 0.42],
        [cx - faceR * 0.15, topY + faceR * 0.14, cx - faceR * 0.08, topY + faceR * 0.3, cx, topY + faceR * 0.43],
        [cx + faceR * 0.08, topY + faceR * 0.14, cx + faceR * 0.15, topY + faceR * 0.3, cx + faceR * 0.22, topY + faceR * 0.42],
        [cx + faceR * 0.28, topY + faceR * 0.14, cx + faceR * 0.35, topY + faceR * 0.3, cx + faceR * 0.42, topY + faceR * 0.43],
        [cx + faceR * 0.48, topY + faceR * 0.15, cx + faceR * 0.52, topY + faceR * 0.3, cx + faceR * 0.55, topY + faceR * 0.42],
        [cx - faceR * 0.55, topY + faceR * 0.12, cx - faceR * 0.42, topY - faceR * 0.02, cx - faceR * 0.25, topY - faceR * 0.08],
        [cx + faceR * 0.2, topY + faceR * 0.08, cx + faceR * 0.35, topY - faceR * 0.06, cx + faceR * 0.5, topY + faceR * 0.02]
      ]);
      break;
    case 9: // おだんご — ミディアム風ベース + 前髪
      // ベースの頭頂部（ミディアム風）
      ctx.fillStyle = hairGrad(topY - faceR * 0.3, topY + faceR * 0.5);
      ctx.beginPath(); ctx.arc(cx, topY + faceR * 0.12, faceR * 0.8, Math.PI * 0.85, Math.PI * 2.15); ctx.fill();
      // サイドの髪（ミディアム風）
      [-1, 1].forEach(function(s) {
        var dSideGrad = ctx.createLinearGradient(cx + s * faceR * 0.5, topY, cx + s * faceR * 0.7, faceY + faceR * 0.45);
        dSideGrad.addColorStop(0, darker); dSideGrad.addColorStop(0.4, color); dSideGrad.addColorStop(0.8, lighter); dSideGrad.addColorStop(1, color);
        ctx.fillStyle = dSideGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.65, topY + faceR * 0.15);
        ctx.bezierCurveTo(cx + s * faceR * 0.82, topY + faceR * 0.4, cx + s * faceR * 0.78, faceY + faceR * 0.15, cx + s * faceR * 0.65, faceY + faceR * 0.4);
        ctx.bezierCurveTo(cx + s * faceR * 0.55, faceY + faceR * 0.48, cx + s * faceR * 0.45, faceY + faceR * 0.4, cx + s * faceR * 0.48, faceY + faceR * 0.3);
        ctx.bezierCurveTo(cx + s * faceR * 0.52, faceY + faceR * 0.1, cx + s * faceR * 0.58, topY + faceR * 0.45, cx + s * faceR * 0.62, topY + faceR * 0.15);
        ctx.closePath(); ctx.fill();
      });
      // 前髪
      ctx.fillStyle = hairGrad(topY - faceR * 0.1, topY + faceR * 0.45);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.55, topY + faceR * 0.18);
      ctx.bezierCurveTo(cx - faceR * 0.5, topY + faceR * 0.38, cx - faceR * 0.3, topY + faceR * 0.46, cx - faceR * 0.1, topY + faceR * 0.44);
      ctx.bezierCurveTo(cx + faceR * 0.05, topY + faceR * 0.4, cx + faceR * 0.2, topY + faceR * 0.44, cx + faceR * 0.35, topY + faceR * 0.4);
      ctx.bezierCurveTo(cx + faceR * 0.48, topY + faceR * 0.35, cx + faceR * 0.55, topY + faceR * 0.25, cx + faceR * 0.58, topY + faceR * 0.18);
      ctx.lineTo(cx + faceR * 0.62, topY + faceR * 0.05);
      ctx.bezierCurveTo(cx + faceR * 0.48, topY - faceR * 0.15, cx - faceR * 0.48, topY - faceR * 0.15, cx - faceR * 0.58, topY + faceR * 0.05);
      ctx.closePath(); ctx.fill();
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.4, topY + faceR * 0.1, cx - faceR * 0.15, topY - faceR * 0.2, cx + faceR * 0.2, topY - faceR * 0.15]
      ]);
      _drawPartLine(cx, topY - faceR * 0.08, topY + faceR * 0.12);
      _drawStrands([
        [cx - faceR * 0.48, topY + faceR * 0.2, cx - faceR * 0.4, topY + faceR * 0.32, cx - faceR * 0.25, topY + faceR * 0.44],
        [cx - faceR * 0.28, topY + faceR * 0.18, cx - faceR * 0.15, topY + faceR * 0.32, cx - faceR * 0.02, topY + faceR * 0.42],
        [cx + faceR * 0.05, topY + faceR * 0.18, cx + faceR * 0.15, topY + faceR * 0.32, cx + faceR * 0.28, topY + faceR * 0.4],
        [cx + faceR * 0.22, topY + faceR * 0.18, cx + faceR * 0.35, topY + faceR * 0.28, cx + faceR * 0.48, topY + faceR * 0.35],
        [cx - faceR * 0.55, topY + faceR * 0.15, cx - faceR * 0.4, topY - faceR * 0.05, cx - faceR * 0.15, topY - faceR * 0.1],
        [cx + faceR * 0.15, topY + faceR * 0.08, cx + faceR * 0.3, topY - faceR * 0.06, cx + faceR * 0.48, topY + faceR * 0.02]
      ]);
      break;
    case 10: // ツインテ — 左右にテール、前髪あり
      // ベースの頭頂部
      ctx.fillStyle = hairGrad(topY - faceR * 0.3, topY + faceR * 0.4);
      ctx.beginPath(); ctx.arc(cx, topY + faceR * 0.1, faceR * 0.7, Math.PI, 2 * Math.PI); ctx.fill();
      // 前髪
      ctx.fillStyle = hairGrad(topY - faceR * 0.1, topY + faceR * 0.45);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.55, topY + faceR * 0.15);
      ctx.bezierCurveTo(cx - faceR * 0.5, topY + faceR * 0.36, cx - faceR * 0.32, topY + faceR * 0.44, cx - faceR * 0.12, topY + faceR * 0.42);
      ctx.bezierCurveTo(cx, topY + faceR * 0.38, cx + faceR * 0.12, topY + faceR * 0.42, cx + faceR * 0.32, topY + faceR * 0.38);
      ctx.bezierCurveTo(cx + faceR * 0.48, topY + faceR * 0.32, cx + faceR * 0.55, topY + faceR * 0.22, cx + faceR * 0.58, topY + faceR * 0.15);
      ctx.lineTo(cx + faceR * 0.6, topY + faceR * 0.02);
      ctx.bezierCurveTo(cx + faceR * 0.45, topY - faceR * 0.15, cx - faceR * 0.45, topY - faceR * 0.15, cx - faceR * 0.58, topY + faceR * 0.02);
      ctx.closePath(); ctx.fill();
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.3, topY + faceR * 0.05, cx - faceR * 0.1, topY - faceR * 0.12, cx + faceR * 0.15, topY - faceR * 0.08]
      ]);
      _drawPartLine(cx, topY - faceR * 0.08, topY + faceR * 0.1);
      _drawStrands([
        [cx - faceR * 0.48, topY + faceR * 0.18, cx - faceR * 0.38, topY + faceR * 0.3, cx - faceR * 0.22, topY + faceR * 0.4],
        [cx - faceR * 0.2, topY + faceR * 0.16, cx - faceR * 0.08, topY + faceR * 0.3, cx + faceR * 0.05, topY + faceR * 0.38],
        [cx + faceR * 0.1, topY + faceR * 0.16, cx + faceR * 0.22, topY + faceR * 0.28, cx + faceR * 0.35, topY + faceR * 0.35],
        [cx + faceR * 0.35, topY + faceR * 0.15, cx + faceR * 0.45, topY + faceR * 0.22, cx + faceR * 0.52, topY + faceR * 0.28]
      ]);
      break;
    case 11: // ウェーブ — ボリューミーなウェーブ、センターパート
      // ベースの頭頂部（大きめ、ボリューム）
      ctx.fillStyle = hairGrad(topY - faceR * 0.35, topY + faceR * 0.5);
      ctx.beginPath(); ctx.arc(cx, topY + faceR * 0.12, faceR * 0.88, Math.PI * 0.7, Math.PI * 2.3); ctx.fill();
      // サイドのウェーブ髪
      [-1, 1].forEach(function(s) {
        var wvGrad = ctx.createLinearGradient(cx + s * faceR * 0.5, topY, cx + s * faceR * 0.9, faceY + faceR * 0.8);
        wvGrad.addColorStop(0, darker); wvGrad.addColorStop(0.3, color); wvGrad.addColorStop(0.6, lighter); wvGrad.addColorStop(1, color);
        ctx.fillStyle = wvGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.72, topY + faceR * 0.12);
        // ウェーブ（sin波をベジェで表現、左右交互に波打つ）
        ctx.bezierCurveTo(cx + s * faceR * 0.95, topY + faceR * 0.4, cx + s * faceR * 0.8, faceY - faceR * 0.1, cx + s * faceR * 0.95, faceY + faceR * 0.15);
        ctx.bezierCurveTo(cx + s * faceR * 1.0, faceY + faceR * 0.35, cx + s * faceR * 0.82, faceY + faceR * 0.55, ctx.canvas ? cx + s * faceR * 0.9 : cx + s * faceR * 0.9, faceY + faceR * 0.7);
        ctx.bezierCurveTo(cx + s * faceR * 0.85, faceY + faceR * 0.85, cx + s * faceR * 0.7, faceY + faceR * 0.82, cx + s * faceR * 0.62, faceY + faceR * 0.75);
        ctx.bezierCurveTo(cx + s * faceR * 0.55, faceY + faceR * 0.5, cx + s * faceR * 0.65, faceY + faceR * 0.2, cx + s * faceR * 0.6, faceY - faceR * 0.1);
        ctx.bezierCurveTo(cx + s * faceR * 0.58, topY + faceR * 0.4, cx + s * faceR * 0.62, topY + faceR * 0.2, cx + s * faceR * 0.68, topY + faceR * 0.12);
        ctx.closePath(); ctx.fill();
      });
      // センターパート（前髪なし、分け目を中央に）
      ctx.fillStyle = hairGrad(topY - faceR * 0.1, topY + faceR * 0.35);
      ctx.beginPath();
      ctx.moveTo(cx, topY - faceR * 0.1);
      ctx.bezierCurveTo(cx - faceR * 0.35, topY - faceR * 0.08, cx - faceR * 0.58, topY + faceR * 0.1, cx - faceR * 0.65, topY + faceR * 0.25);
      ctx.bezierCurveTo(cx - faceR * 0.6, topY + faceR * 0.15, cx - faceR * 0.45, topY + faceR * 0.05, cx - faceR * 0.2, topY + faceR * 0.12);
      ctx.lineTo(cx, topY + faceR * 0.18);
      ctx.lineTo(cx + faceR * 0.2, topY + faceR * 0.12);
      ctx.bezierCurveTo(cx + faceR * 0.45, topY + faceR * 0.05, cx + faceR * 0.6, topY + faceR * 0.15, cx + faceR * 0.65, topY + faceR * 0.25);
      ctx.bezierCurveTo(cx + faceR * 0.58, topY + faceR * 0.1, cx + faceR * 0.35, topY - faceR * 0.08, cx, topY - faceR * 0.1);
      ctx.closePath(); ctx.fill();
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.45, topY + faceR * 0.1, cx - faceR * 0.2, topY - faceR * 0.2, cx + faceR * 0.1, topY - faceR * 0.18],
        [cx + faceR * 0.1, topY + faceR * 0.1, cx + faceR * 0.3, topY - faceR * 0.18, cx + faceR * 0.55, topY - faceR * 0.05]
      ]);
      _drawPartLine(cx, topY - faceR * 0.1, topY + faceR * 0.18);
      _drawStrands([
        [cx - faceR * 0.6, topY + faceR * 0.18, cx - faceR * 0.5, topY - faceR * 0.02, cx - faceR * 0.3, topY - faceR * 0.08],
        [cx - faceR * 0.35, topY + faceR * 0.1, cx - faceR * 0.15, topY - faceR * 0.12, cx + faceR * 0.02, topY - faceR * 0.1],
        [cx + faceR * 0.02, topY + faceR * 0.1, cx + faceR * 0.15, topY - faceR * 0.12, cx + faceR * 0.35, topY - faceR * 0.08],
        [cx + faceR * 0.35, topY + faceR * 0.12, cx + faceR * 0.5, topY - faceR * 0.02, cx + faceR * 0.65, topY + faceR * 0.1]
      ]);
      break;
    case 12: // ワンレン — ストレート、7:3サイドパート
      // ベースの頭頂部
      ctx.fillStyle = hairGrad(topY - faceR * 0.3, topY + faceR * 0.5);
      ctx.beginPath(); ctx.arc(cx, topY + faceR * 0.12, faceR * 0.82, Math.PI * 0.8, Math.PI * 2.2); ctx.fill();
      // サイドの髪（ストレート、均一な長さ）
      [-1, 1].forEach(function(s) {
        var wlSideGrad = ctx.createLinearGradient(cx + s * faceR * 0.5, topY, cx + s * faceR * 0.8, faceY + faceR * 0.5);
        wlSideGrad.addColorStop(0, darker); wlSideGrad.addColorStop(0.4, color); wlSideGrad.addColorStop(0.8, lighter); wlSideGrad.addColorStop(1, darker);
        ctx.fillStyle = wlSideGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.68, topY + faceR * 0.15);
        ctx.bezierCurveTo(cx + s * faceR * 0.88, topY + faceR * 0.35, cx + s * faceR * 0.85, faceY + faceR * 0.1, cx + s * faceR * 0.78, faceY + faceR * 0.45);
        ctx.lineTo(cx + s * faceR * 0.62, faceY + faceR * 0.45);
        ctx.bezierCurveTo(cx + s * faceR * 0.6, faceY + faceR * 0.15, cx + s * faceR * 0.58, topY + faceR * 0.5, cx + s * faceR * 0.62, topY + faceR * 0.15);
        ctx.closePath(); ctx.fill();
      });
      // 7:3分けの前髪（サイドパート、片側が耳にかかる）
      ctx.fillStyle = hairGrad(topY - faceR * 0.1, topY + faceR * 0.45);
      ctx.beginPath();
      // 分け目は左寄り（cx - faceR * 0.3）
      ctx.moveTo(cx - faceR * 0.3, topY - faceR * 0.05);
      // 左側（少なめ）
      ctx.bezierCurveTo(cx - faceR * 0.45, topY + faceR * 0.05, cx - faceR * 0.58, topY + faceR * 0.2, cx - faceR * 0.6, topY + faceR * 0.35);
      ctx.lineTo(cx - faceR * 0.58, topY + faceR * 0.38);
      ctx.bezierCurveTo(cx - faceR * 0.5, topY + faceR * 0.25, cx - faceR * 0.4, topY + faceR * 0.15, cx - faceR * 0.3, topY + faceR * 0.12);
      // 右側（多め、流れるように）
      ctx.lineTo(cx - faceR * 0.3, topY + faceR * 0.12);
      ctx.bezierCurveTo(cx - faceR * 0.1, topY + faceR * 0.2, cx + faceR * 0.15, topY + faceR * 0.35, cx + faceR * 0.35, topY + faceR * 0.42);
      ctx.bezierCurveTo(cx + faceR * 0.48, topY + faceR * 0.45, cx + faceR * 0.58, topY + faceR * 0.38, cx + faceR * 0.62, topY + faceR * 0.28);
      ctx.lineTo(cx + faceR * 0.65, topY + faceR * 0.1);
      ctx.bezierCurveTo(cx + faceR * 0.5, topY - faceR * 0.12, cx - faceR * 0.1, topY - faceR * 0.12, cx - faceR * 0.3, topY - faceR * 0.05);
      ctx.closePath(); ctx.fill();
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.1, topY + faceR * 0.1, cx + faceR * 0.15, topY - faceR * 0.15, cx + faceR * 0.45, topY - faceR * 0.05],
        [cx + faceR * 0.15, topY + faceR * 0.12, cx + faceR * 0.35, topY - faceR * 0.1, cx + faceR * 0.55, topY + faceR * 0.02]
      ]);
      _drawPartLine(cx - faceR * 0.3, topY - faceR * 0.05, topY + faceR * 0.12);
      _drawStrands([
        [cx - faceR * 0.25, topY + faceR * 0.12, cx + faceR * 0.05, topY + faceR * 0.28, cx + faceR * 0.25, topY + faceR * 0.4],
        [cx - faceR * 0.2, topY + faceR * 0.15, cx + faceR * 0.1, topY + faceR * 0.3, cx + faceR * 0.35, topY + faceR * 0.42],
        [cx - faceR * 0.15, topY + faceR * 0.18, cx + faceR * 0.15, topY + faceR * 0.32, cx + faceR * 0.42, topY + faceR * 0.4],
        [cx + faceR * 0.45, topY + faceR * 0.15, cx + faceR * 0.52, topY + faceR * 0.25, cx + faceR * 0.58, topY + faceR * 0.32],
        [cx - faceR * 0.5, topY + faceR * 0.2, cx - faceR * 0.48, topY + faceR * 0.28, cx - faceR * 0.55, topY + faceR * 0.35]
      ]);
      break;
    case 13: // ハーフアップ — 上半分を後ろで留め、下半分はおろす
      // ベースの頭頂部
      ctx.fillStyle = hairGrad(topY - faceR * 0.3, topY + faceR * 0.4);
      ctx.beginPath(); ctx.arc(cx, topY + faceR * 0.1, faceR * 0.75, Math.PI, 2 * Math.PI); ctx.fill();
      // 後ろに留めた上半分（まとまった感じ）
      ctx.fillStyle = hairGrad(topY - faceR * 0.15, topY + faceR * 0.25);
      ctx.beginPath();
      ctx.moveTo(cx + faceR * 0.2, topY - faceR * 0.05);
      ctx.bezierCurveTo(cx + faceR * 0.45, topY - faceR * 0.1, cx + faceR * 0.55, topY + faceR * 0.05, cx + faceR * 0.5, topY + faceR * 0.2);
      ctx.bezierCurveTo(cx + faceR * 0.42, topY + faceR * 0.25, cx + faceR * 0.3, topY + faceR * 0.18, cx + faceR * 0.2, topY + faceR * 0.12);
      ctx.closePath(); ctx.fill();
      // 下半分のサイド髪（肩にかかる）
      [-1, 1].forEach(function(s) {
        var huGrad = ctx.createLinearGradient(cx + s * faceR * 0.5, topY + faceR * 0.3, cx + s * faceR * 0.7, faceY + faceR * 0.55);
        huGrad.addColorStop(0, darker); huGrad.addColorStop(0.4, color); huGrad.addColorStop(0.8, lighter); huGrad.addColorStop(1, color);
        ctx.fillStyle = huGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.6, topY + faceR * 0.25);
        ctx.bezierCurveTo(cx + s * faceR * 0.82, topY + faceR * 0.45, cx + s * faceR * 0.78, faceY + faceR * 0.15, cx + s * faceR * 0.68, faceY + faceR * 0.5);
        ctx.bezierCurveTo(cx + s * faceR * 0.58, faceY + faceR * 0.55, cx + s * faceR * 0.48, faceY + faceR * 0.45, cx + s * faceR * 0.5, faceY + faceR * 0.3);
        ctx.bezierCurveTo(cx + s * faceR * 0.52, faceY + faceR * 0.05, cx + s * faceR * 0.55, topY + faceR * 0.5, cx + s * faceR * 0.58, topY + faceR * 0.25);
        ctx.closePath(); ctx.fill();
      });
      // 前髪
      ctx.fillStyle = hairGrad(topY - faceR * 0.1, topY + faceR * 0.42);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.52, topY + faceR * 0.15);
      ctx.bezierCurveTo(cx - faceR * 0.48, topY + faceR * 0.35, cx - faceR * 0.3, topY + faceR * 0.42, cx - faceR * 0.1, topY + faceR * 0.4);
      ctx.bezierCurveTo(cx + faceR * 0.05, topY + faceR * 0.38, cx + faceR * 0.2, topY + faceR * 0.4, cx + faceR * 0.35, topY + faceR * 0.36);
      ctx.bezierCurveTo(cx + faceR * 0.48, topY + faceR * 0.3, cx + faceR * 0.52, topY + faceR * 0.22, cx + faceR * 0.55, topY + faceR * 0.15);
      ctx.lineTo(cx + faceR * 0.58, topY + faceR * 0.02);
      ctx.bezierCurveTo(cx + faceR * 0.42, topY - faceR * 0.15, cx - faceR * 0.42, topY - faceR * 0.15, cx - faceR * 0.55, topY + faceR * 0.02);
      ctx.closePath(); ctx.fill();
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.3, topY + faceR * 0.05, cx - faceR * 0.1, topY - faceR * 0.15, cx + faceR * 0.15, topY - faceR * 0.1]
      ]);
      _drawPartLine(cx - faceR * 0.1, topY - faceR * 0.05, topY + faceR * 0.1);
      _drawStrands([
        [cx - faceR * 0.45, topY + faceR * 0.18, cx - faceR * 0.35, topY + faceR * 0.3, cx - faceR * 0.2, topY + faceR * 0.4],
        [cx - faceR * 0.2, topY + faceR * 0.16, cx - faceR * 0.05, topY + faceR * 0.3, cx + faceR * 0.1, topY + faceR * 0.38],
        [cx + faceR * 0.1, topY + faceR * 0.16, cx + faceR * 0.22, topY + faceR * 0.28, cx + faceR * 0.35, topY + faceR * 0.34],
        [cx + faceR * 0.32, topY + faceR * 0.15, cx + faceR * 0.42, topY + faceR * 0.22, cx + faceR * 0.5, topY + faceR * 0.28]
      ]);
      break;
    case 14: // マッシュ — 丸いマッシュルームシルエット
      // ベースの丸いシルエット（耳が隠れる大きさ）
      ctx.fillStyle = hairGrad(topY - faceR * 0.35, topY + faceR * 0.5);
      ctx.beginPath(); ctx.arc(cx, topY + faceR * 0.15, faceR * 0.85, Math.PI * 0.75, Math.PI * 2.25); ctx.fill();
      // サイドの丸い髪（耳を隠す）
      [-1, 1].forEach(function(s) {
        var msGrad = ctx.createLinearGradient(cx + s * faceR * 0.5, topY, cx + s * faceR * 0.8, faceY + faceR * 0.25);
        msGrad.addColorStop(0, darker); msGrad.addColorStop(0.5, color); msGrad.addColorStop(1, lighter);
        ctx.fillStyle = msGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.7, topY + faceR * 0.18);
        ctx.bezierCurveTo(cx + s * faceR * 0.9, topY + faceR * 0.35, cx + s * faceR * 0.88, faceY - faceR * 0.05, cx + s * faceR * 0.78, faceY + faceR * 0.2);
        ctx.bezierCurveTo(cx + s * faceR * 0.7, faceY + faceR * 0.28, cx + s * faceR * 0.58, faceY + faceR * 0.22, cx + s * faceR * 0.55, faceY + faceR * 0.12);
        ctx.bezierCurveTo(cx + s * faceR * 0.53, faceY - faceR * 0.1, cx + s * faceR * 0.58, topY + faceR * 0.45, cx + s * faceR * 0.65, topY + faceR * 0.18);
        ctx.closePath(); ctx.fill();
      });
      // 重め前髪（眉にかかる）
      ctx.fillStyle = hairGrad(topY - faceR * 0.12, topY + faceR * 0.5);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.62, topY + faceR * 0.15);
      ctx.bezierCurveTo(cx - faceR * 0.58, topY + faceR * 0.42, cx - faceR * 0.4, topY + faceR * 0.52, cx - faceR * 0.2, topY + faceR * 0.5);
      ctx.bezierCurveTo(cx - faceR * 0.05, topY + faceR * 0.48, cx + faceR * 0.05, topY + faceR * 0.48, cx + faceR * 0.2, topY + faceR * 0.5);
      ctx.bezierCurveTo(cx + faceR * 0.4, topY + faceR * 0.52, cx + faceR * 0.58, topY + faceR * 0.42, cx + faceR * 0.62, topY + faceR * 0.15);
      ctx.bezierCurveTo(cx + faceR * 0.48, topY - faceR * 0.18, cx - faceR * 0.48, topY - faceR * 0.18, cx - faceR * 0.62, topY + faceR * 0.15);
      ctx.closePath(); ctx.fill();
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.35, topY + faceR * 0.12, cx - faceR * 0.1, topY - faceR * 0.15, cx + faceR * 0.2, topY - faceR * 0.12],
        [cx + faceR * 0.05, topY + faceR * 0.1, cx + faceR * 0.25, topY - faceR * 0.12, cx + faceR * 0.45, topY - faceR * 0.02]
      ]);
      _drawStrands([
        [cx - faceR * 0.55, topY + faceR * 0.2, cx - faceR * 0.48, topY + faceR * 0.35, cx - faceR * 0.35, topY + faceR * 0.48],
        [cx - faceR * 0.35, topY + faceR * 0.18, cx - faceR * 0.22, topY + faceR * 0.35, cx - faceR * 0.1, topY + faceR * 0.48],
        [cx - faceR * 0.1, topY + faceR * 0.16, cx + faceR * 0.02, topY + faceR * 0.35, cx + faceR * 0.12, topY + faceR * 0.48],
        [cx + faceR * 0.12, topY + faceR * 0.16, cx + faceR * 0.25, topY + faceR * 0.35, cx + faceR * 0.38, topY + faceR * 0.48],
        [cx + faceR * 0.38, topY + faceR * 0.18, cx + faceR * 0.48, topY + faceR * 0.35, cx + faceR * 0.55, topY + faceR * 0.48],
        [cx - faceR * 0.55, topY + faceR * 0.15, cx - faceR * 0.4, topY - faceR * 0.02, cx - faceR * 0.2, topY - faceR * 0.1],
        [cx + faceR * 0.2, topY + faceR * 0.1, cx + faceR * 0.38, topY - faceR * 0.05, cx + faceR * 0.52, topY + faceR * 0.05]
      ]);
      break;
    case 15: // センター分け — 真ん中分けストレート、知的な印象
      // ベースの頭頂部
      ctx.fillStyle = hairGrad(topY - faceR * 0.3, topY + faceR * 0.5);
      ctx.beginPath(); ctx.arc(cx, topY + faceR * 0.12, faceR * 0.82, Math.PI * 0.8, Math.PI * 2.2); ctx.fill();
      // サイドの髪（ストレート、耳下まで）
      [-1, 1].forEach(function(s) {
        var cpSideGrad = ctx.createLinearGradient(cx + s * faceR * 0.5, topY, cx + s * faceR * 0.8, faceY + faceR * 0.5);
        cpSideGrad.addColorStop(0, darker); cpSideGrad.addColorStop(0.4, color); cpSideGrad.addColorStop(0.8, lighter); cpSideGrad.addColorStop(1, darker);
        ctx.fillStyle = cpSideGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.68, topY + faceR * 0.15);
        ctx.bezierCurveTo(cx + s * faceR * 0.88, topY + faceR * 0.35, cx + s * faceR * 0.85, faceY + faceR * 0.1, cx + s * faceR * 0.75, faceY + faceR * 0.45);
        ctx.lineTo(cx + s * faceR * 0.6, faceY + faceR * 0.45);
        ctx.bezierCurveTo(cx + s * faceR * 0.58, faceY + faceR * 0.15, cx + s * faceR * 0.58, topY + faceR * 0.5, cx + s * faceR * 0.62, topY + faceR * 0.15);
        ctx.closePath(); ctx.fill();
      });
      // センター分けの前髪（左右対称、中央から分かれる）
      ctx.fillStyle = hairGrad(topY - faceR * 0.1, topY + faceR * 0.45);
      ctx.beginPath();
      // 左半分
      ctx.moveTo(cx, topY - faceR * 0.08);
      ctx.bezierCurveTo(cx - faceR * 0.15, topY + faceR * 0.05, cx - faceR * 0.35, topY + faceR * 0.15, cx - faceR * 0.5, topY + faceR * 0.35);
      ctx.bezierCurveTo(cx - faceR * 0.55, topY + faceR * 0.42, cx - faceR * 0.6, topY + faceR * 0.35, cx - faceR * 0.62, topY + faceR * 0.25);
      ctx.bezierCurveTo(cx - faceR * 0.6, topY + faceR * 0.1, cx - faceR * 0.5, topY - faceR * 0.1, cx - faceR * 0.3, topY - faceR * 0.12);
      ctx.lineTo(cx, topY - faceR * 0.08);
      ctx.closePath(); ctx.fill();
      // 右半分
      ctx.beginPath();
      ctx.moveTo(cx, topY - faceR * 0.08);
      ctx.bezierCurveTo(cx + faceR * 0.15, topY + faceR * 0.05, cx + faceR * 0.35, topY + faceR * 0.15, cx + faceR * 0.5, topY + faceR * 0.35);
      ctx.bezierCurveTo(cx + faceR * 0.55, topY + faceR * 0.42, cx + faceR * 0.6, topY + faceR * 0.35, cx + faceR * 0.62, topY + faceR * 0.25);
      ctx.bezierCurveTo(cx + faceR * 0.6, topY + faceR * 0.1, cx + faceR * 0.5, topY - faceR * 0.1, cx + faceR * 0.3, topY - faceR * 0.12);
      ctx.lineTo(cx, topY - faceR * 0.08);
      ctx.closePath(); ctx.fill();
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.45, topY + faceR * 0.1, cx - faceR * 0.2, topY - faceR * 0.15, cx - faceR * 0.05, topY - faceR * 0.08],
        [cx + faceR * 0.05, topY + faceR * 0.1, cx + faceR * 0.2, topY - faceR * 0.15, cx + faceR * 0.45, topY - faceR * 0.05]
      ]);
      _drawPartLine(cx, topY - faceR * 0.1, topY + faceR * 0.15);
      _drawStrands([
        [cx - faceR * 0.05, topY - faceR * 0.05, cx - faceR * 0.25, topY + faceR * 0.1, cx - faceR * 0.45, topY + faceR * 0.3],
        [cx - faceR * 0.1, topY, cx - faceR * 0.3, topY + faceR * 0.15, cx - faceR * 0.5, topY + faceR * 0.35],
        [cx + faceR * 0.05, topY - faceR * 0.05, cx + faceR * 0.25, topY + faceR * 0.1, cx + faceR * 0.45, topY + faceR * 0.3],
        [cx + faceR * 0.1, topY, cx + faceR * 0.3, topY + faceR * 0.15, cx + faceR * 0.5, topY + faceR * 0.35],
        [cx - faceR * 0.55, topY + faceR * 0.2, cx - faceR * 0.45, topY - faceR * 0.02, cx - faceR * 0.25, topY - faceR * 0.1],
        [cx + faceR * 0.25, topY + faceR * 0.08, cx + faceR * 0.4, topY - faceR * 0.05, cx + faceR * 0.55, topY + faceR * 0.05]
      ]);
      break;
    case 16: // 外ハネ — 毛先が外にハネるミディアム
      // ベースの頭頂部
      ctx.fillStyle = hairGrad(topY - faceR * 0.3, topY + faceR * 0.5);
      ctx.beginPath(); ctx.arc(cx, topY + faceR * 0.12, faceR * 0.8, Math.PI * 0.85, Math.PI * 2.15); ctx.fill();
      // サイドの髪（外ハネ）
      [-1, 1].forEach(function(s) {
        var ohSideGrad = ctx.createLinearGradient(cx + s * faceR * 0.5, topY, cx + s * faceR * 0.8, faceY + faceR * 0.55);
        ohSideGrad.addColorStop(0, darker); ohSideGrad.addColorStop(0.4, color); ohSideGrad.addColorStop(0.8, lighter); ohSideGrad.addColorStop(1, color);
        ctx.fillStyle = ohSideGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.65, topY + faceR * 0.15);
        ctx.bezierCurveTo(cx + s * faceR * 0.85, topY + faceR * 0.4, cx + s * faceR * 0.82, faceY + faceR * 0.1, cx + s * faceR * 0.72, faceY + faceR * 0.35);
        // 外ハネカール（毛先を外側に跳ねさせる）
        ctx.bezierCurveTo(cx + s * faceR * 0.78, faceY + faceR * 0.52, cx + s * faceR * 0.9, faceY + faceR * 0.5, cx + s * faceR * 0.88, faceY + faceR * 0.38);
        // 内側に戻る
        ctx.bezierCurveTo(cx + s * faceR * 0.82, faceY + faceR * 0.25, cx + s * faceR * 0.6, faceY + faceR * 0.1, cx + s * faceR * 0.55, faceY - faceR * 0.05);
        ctx.bezierCurveTo(cx + s * faceR * 0.55, topY + faceR * 0.45, cx + s * faceR * 0.58, topY + faceR * 0.2, cx + s * faceR * 0.62, topY + faceR * 0.15);
        ctx.closePath(); ctx.fill();
      });
      // 前髪（ふんわり斜め）
      ctx.fillStyle = hairGrad(topY - faceR * 0.1, topY + faceR * 0.45);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.55, topY + faceR * 0.18);
      ctx.bezierCurveTo(cx - faceR * 0.5, topY + faceR * 0.38, cx - faceR * 0.3, topY + faceR * 0.46, cx - faceR * 0.1, topY + faceR * 0.44);
      ctx.bezierCurveTo(cx + faceR * 0.05, topY + faceR * 0.4, cx + faceR * 0.2, topY + faceR * 0.44, cx + faceR * 0.35, topY + faceR * 0.4);
      ctx.bezierCurveTo(cx + faceR * 0.48, topY + faceR * 0.35, cx + faceR * 0.55, topY + faceR * 0.25, cx + faceR * 0.58, topY + faceR * 0.18);
      ctx.lineTo(cx + faceR * 0.62, topY + faceR * 0.05);
      ctx.bezierCurveTo(cx + faceR * 0.48, topY - faceR * 0.15, cx - faceR * 0.48, topY - faceR * 0.15, cx - faceR * 0.58, topY + faceR * 0.05);
      ctx.closePath(); ctx.fill();
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.4, topY + faceR * 0.1, cx - faceR * 0.15, topY - faceR * 0.2, cx + faceR * 0.2, topY - faceR * 0.15],
        [cx, topY + faceR * 0.12, cx + faceR * 0.2, topY - faceR * 0.18, cx + faceR * 0.5, topY - faceR * 0.08]
      ]);
      _drawPartLine(cx - faceR * 0.1, topY - faceR * 0.08, topY + faceR * 0.12);
      _drawStrands([
        [cx - faceR * 0.5, topY + faceR * 0.22, cx - faceR * 0.45, topY + faceR * 0.35, cx - faceR * 0.25, topY + faceR * 0.44],
        [cx - faceR * 0.35, topY + faceR * 0.2, cx - faceR * 0.2, topY + faceR * 0.35, cx - faceR * 0.05, topY + faceR * 0.42],
        [cx - faceR * 0.15, topY + faceR * 0.18, cx + faceR * 0.05, topY + faceR * 0.35, cx + faceR * 0.2, topY + faceR * 0.4],
        [cx + faceR * 0.1, topY + faceR * 0.2, cx + faceR * 0.25, topY + faceR * 0.32, cx + faceR * 0.4, topY + faceR * 0.38],
        [cx + faceR * 0.3, topY + faceR * 0.18, cx + faceR * 0.42, topY + faceR * 0.28, cx + faceR * 0.52, topY + faceR * 0.32]
      ]);
      break;
    case 17: // ベリーショート — 坊主に近い超短髪
      // 非常に短い髪のベース（頭皮にぴったり）
      ctx.fillStyle = hairGrad(topY - faceR * 0.15, topY + faceR * 0.25);
      ctx.beginPath(); ctx.arc(cx, topY + faceR * 0.1, faceR * 0.58, Math.PI, 2 * Math.PI); ctx.fill();
      // 短い刈り上げテクスチャ（極短の毛を密に描く）
      if (detail) {
        ctx.save();
        ctx.lineCap = 'round';
        var vsCount = 40;
        for (var vi = 0; vi < vsCount; vi++) {
          var va = Math.PI + (vi / (vsCount - 1)) * Math.PI;
          var vx = cx + Math.cos(va) * faceR * (0.2 + Math.random() * 0.32);
          var vy = topY + faceR * 0.08 + Math.sin(va) * faceR * 0.12;
          var vlen = faceR * (0.03 + Math.random() * 0.04);
          var vangle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
          var vtx = vx + Math.cos(vangle) * vlen;
          var vty = vy + Math.sin(vangle) * vlen;
          ctx.strokeStyle = Math.random() > 0.5 ? color : darker;
          ctx.lineWidth = faceR * (0.012 + Math.random() * 0.01);
          ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(vtx, vty); ctx.stroke();
        }
        ctx.restore();
      }
      // サイドの刈り上げ（薄いカバー）
      ctx.globalAlpha = 0.5;
      var vsGrad = ctx.createLinearGradient(cx, topY, cx, topY + faceR * 0.4);
      vsGrad.addColorStop(0, darker); vsGrad.addColorStop(1, color);
      ctx.fillStyle = vsGrad;
      [-1, 1].forEach(function(s) {
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.55, topY + faceR * 0.1);
        ctx.bezierCurveTo(cx + s * faceR * 0.65, topY + faceR * 0.15, cx + s * faceR * 0.68, topY + faceR * 0.3, cx + s * faceR * 0.6, topY + faceR * 0.4);
        ctx.bezierCurveTo(cx + s * faceR * 0.55, topY + faceR * 0.35, cx + s * faceR * 0.52, topY + faceR * 0.2, cx + s * faceR * 0.55, topY + faceR * 0.1);
        ctx.closePath(); ctx.fill();
      });
      ctx.globalAlpha = 1;
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.2, topY + faceR * 0.05, cx, topY - faceR * 0.1, cx + faceR * 0.2, topY - faceR * 0.05]
      ]);
      break;
    case 18: // ゆるふわ — ふんわりパーマ、ボリューム感
      // ベースの頭頂部（大きめ、ボリューム）
      ctx.fillStyle = hairGrad(topY - faceR * 0.4, topY + faceR * 0.5);
      ctx.beginPath(); ctx.arc(cx, topY + faceR * 0.12, faceR * 0.9, Math.PI * 0.7, Math.PI * 2.3); ctx.fill();
      // サイドのふわふわ髪（ウェーブより柔らかい）
      [-1, 1].forEach(function(s) {
        var yfSideGrad = ctx.createLinearGradient(cx + s * faceR * 0.5, topY, cx + s * faceR * 0.95, faceY + faceR * 0.7);
        yfSideGrad.addColorStop(0, darker); yfSideGrad.addColorStop(0.3, color); yfSideGrad.addColorStop(0.6, lighter); yfSideGrad.addColorStop(1, color);
        ctx.fillStyle = yfSideGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.75, topY + faceR * 0.12);
        // ふんわりシルエット（大きめに膨らむカーブ）
        ctx.bezierCurveTo(cx + s * faceR * 1.0, topY + faceR * 0.35, cx + s * faceR * 0.92, faceY - faceR * 0.1, cx + s * faceR * 0.98, faceY + faceR * 0.2);
        // ランダム風のカールの山谷
        ctx.bezierCurveTo(cx + s * faceR * 0.95, faceY + faceR * 0.4, cx + s * faceR * 0.85, faceY + faceR * 0.5, cx + s * faceR * 0.92, faceY + faceR * 0.62);
        ctx.bezierCurveTo(cx + s * faceR * 0.88, faceY + faceR * 0.75, cx + s * faceR * 0.72, faceY + faceR * 0.72, cx + s * faceR * 0.62, faceY + faceR * 0.6);
        ctx.bezierCurveTo(cx + s * faceR * 0.55, faceY + faceR * 0.35, cx + s * faceR * 0.6, faceY, cx + s * faceR * 0.58, topY + faceR * 0.4);
        ctx.bezierCurveTo(cx + s * faceR * 0.6, topY + faceR * 0.2, cx + s * faceR * 0.65, topY + faceR * 0.12, cx + s * faceR * 0.72, topY + faceR * 0.12);
        ctx.closePath(); ctx.fill();
      });
      // ふんわり前髪（エアリー）
      ctx.fillStyle = hairGrad(topY - faceR * 0.12, topY + faceR * 0.48);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.6, topY + faceR * 0.15);
      // 束感のあるカールバングス
      ctx.bezierCurveTo(cx - faceR * 0.55, topY + faceR * 0.4, cx - faceR * 0.4, topY + faceR * 0.5, cx - faceR * 0.22, topY + faceR * 0.45);
      ctx.bezierCurveTo(cx - faceR * 0.1, topY + faceR * 0.42, cx - faceR * 0.02, topY + faceR * 0.48, cx + faceR * 0.1, topY + faceR * 0.45);
      ctx.bezierCurveTo(cx + faceR * 0.25, topY + faceR * 0.5, cx + faceR * 0.42, topY + faceR * 0.42, cx + faceR * 0.55, topY + faceR * 0.35);
      ctx.bezierCurveTo(cx + faceR * 0.6, topY + faceR * 0.25, cx + faceR * 0.65, topY + faceR * 0.15, cx + faceR * 0.65, topY + faceR * 0.1);
      ctx.bezierCurveTo(cx + faceR * 0.5, topY - faceR * 0.2, cx - faceR * 0.5, topY - faceR * 0.2, cx - faceR * 0.62, topY + faceR * 0.05);
      ctx.closePath(); ctx.fill();
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.45, topY + faceR * 0.1, cx - faceR * 0.2, topY - faceR * 0.22, cx + faceR * 0.1, topY - faceR * 0.18],
        [cx + faceR * 0.1, topY + faceR * 0.1, cx + faceR * 0.3, topY - faceR * 0.2, cx + faceR * 0.55, topY - faceR * 0.08]
      ]);
      _drawStrands([
        [cx - faceR * 0.55, topY + faceR * 0.2, cx - faceR * 0.45, topY + faceR * 0.35, cx - faceR * 0.3, topY + faceR * 0.45],
        [cx - faceR * 0.3, topY + faceR * 0.18, cx - faceR * 0.15, topY + faceR * 0.38, cx, topY + faceR * 0.46],
        [cx - faceR * 0.05, topY + faceR * 0.2, cx + faceR * 0.1, topY + faceR * 0.38, cx + faceR * 0.22, topY + faceR * 0.44],
        [cx + faceR * 0.15, topY + faceR * 0.18, cx + faceR * 0.3, topY + faceR * 0.35, cx + faceR * 0.45, topY + faceR * 0.4],
        [cx + faceR * 0.35, topY + faceR * 0.15, cx + faceR * 0.48, topY + faceR * 0.25, cx + faceR * 0.55, topY + faceR * 0.32],
        [cx - faceR * 0.55, topY + faceR * 0.12, cx - faceR * 0.4, topY - faceR * 0.05, cx - faceR * 0.2, topY - faceR * 0.12],
        [cx + faceR * 0.2, topY + faceR * 0.08, cx + faceR * 0.4, topY - faceR * 0.08, cx + faceR * 0.55, topY + faceR * 0.02]
      ]);
      break;
    case 19: // 姫カット — サイド顎ライン切り揃え＋後ろロング
      // ベースの頭頂部
      ctx.fillStyle = hairGrad(topY - faceR * 0.3, topY + faceR * 0.5);
      ctx.beginPath(); ctx.arc(cx, topY + faceR * 0.12, faceR * 0.85, Math.PI * 0.75, Math.PI * 2.25); ctx.fill();
      // サイドの髪（顎ラインで切り揃え — 姫カットの特徴）
      [-1, 1].forEach(function(s) {
        var hmSideGrad = ctx.createLinearGradient(cx + s * faceR * 0.5, topY, cx + s * faceR * 0.8, faceY + faceR * 0.35);
        hmSideGrad.addColorStop(0, darker); hmSideGrad.addColorStop(0.5, color); hmSideGrad.addColorStop(1, lighter);
        ctx.fillStyle = hmSideGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.68, topY + faceR * 0.15);
        ctx.bezierCurveTo(cx + s * faceR * 0.88, topY + faceR * 0.35, cx + s * faceR * 0.85, faceY - faceR * 0.1, cx + s * faceR * 0.8, faceY + faceR * 0.18);
        // 顎ラインでスパッと切り揃え（姫カット特有の直線的なカット）
        ctx.lineTo(cx + s * faceR * 0.78, faceY + faceR * 0.25);
        ctx.lineTo(cx + s * faceR * 0.55, faceY + faceR * 0.25);
        ctx.bezierCurveTo(cx + s * faceR * 0.53, faceY - faceR * 0.05, cx + s * faceR * 0.55, topY + faceR * 0.45, cx + s * faceR * 0.62, topY + faceR * 0.15);
        ctx.closePath(); ctx.fill();
      });
      // 後ろの長い髪がサイドから見える（肩を超える長さ）
      [-1, 1].forEach(function(s) {
        var hmLongGrad = ctx.createLinearGradient(cx + s * faceR * 0.5, faceY + faceR * 0.2, cx + s * faceR * 0.7, faceY + faceR * 0.9);
        hmLongGrad.addColorStop(0, color); hmLongGrad.addColorStop(0.5, lighter); hmLongGrad.addColorStop(1, darker);
        ctx.fillStyle = hmLongGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.6, faceY + faceR * 0.25);
        ctx.bezierCurveTo(cx + s * faceR * 0.72, faceY + faceR * 0.4, cx + s * faceR * 0.7, faceY + faceR * 0.7, cx + s * faceR * 0.62, faceY + faceR * 0.9);
        ctx.bezierCurveTo(cx + s * faceR * 0.52, faceY + faceR * 0.85, cx + s * faceR * 0.48, faceY + faceR * 0.55, cx + s * faceR * 0.5, faceY + faceR * 0.3);
        ctx.closePath(); ctx.fill();
      });
      // ぱっつん前髪（姫カットの定番）
      ctx.fillStyle = hairGrad(topY - faceR * 0.1, topY + faceR * 0.45);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.6, topY + faceR * 0.12);
      ctx.lineTo(cx - faceR * 0.58, topY + faceR * 0.42);
      ctx.lineTo(cx - faceR * 0.42, topY + faceR * 0.44);
      ctx.lineTo(cx - faceR * 0.25, topY + faceR * 0.43);
      ctx.lineTo(cx - faceR * 0.1, topY + faceR * 0.44);
      ctx.lineTo(cx + faceR * 0.1, topY + faceR * 0.44);
      ctx.lineTo(cx + faceR * 0.25, topY + faceR * 0.43);
      ctx.lineTo(cx + faceR * 0.42, topY + faceR * 0.44);
      ctx.lineTo(cx + faceR * 0.58, topY + faceR * 0.42);
      ctx.lineTo(cx + faceR * 0.6, topY + faceR * 0.12);
      ctx.bezierCurveTo(cx + faceR * 0.45, topY - faceR * 0.15, cx - faceR * 0.45, topY - faceR * 0.15, cx - faceR * 0.6, topY + faceR * 0.12);
      ctx.closePath(); ctx.fill();
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.35, topY + faceR * 0.1, cx - faceR * 0.1, topY - faceR * 0.2, cx + faceR * 0.2, topY - faceR * 0.15],
        [cx + faceR * 0.05, topY + faceR * 0.08, cx + faceR * 0.25, topY - faceR * 0.15, cx + faceR * 0.45, topY - faceR * 0.05]
      ]);
      _drawPartLine(cx, topY - faceR * 0.08, topY + faceR * 0.12);
      _drawStrands([
        [cx - faceR * 0.52, topY + faceR * 0.15, cx - faceR * 0.48, topY + faceR * 0.3, cx - faceR * 0.42, topY + faceR * 0.42],
        [cx - faceR * 0.35, topY + faceR * 0.14, cx - faceR * 0.28, topY + faceR * 0.3, cx - faceR * 0.2, topY + faceR * 0.42],
        [cx - faceR * 0.15, topY + faceR * 0.14, cx - faceR * 0.08, topY + faceR * 0.3, cx, topY + faceR * 0.43],
        [cx + faceR * 0.08, topY + faceR * 0.14, cx + faceR * 0.15, topY + faceR * 0.3, cx + faceR * 0.22, topY + faceR * 0.42],
        [cx + faceR * 0.28, topY + faceR * 0.14, cx + faceR * 0.35, topY + faceR * 0.3, cx + faceR * 0.42, topY + faceR * 0.43],
        [cx + faceR * 0.48, topY + faceR * 0.15, cx + faceR * 0.52, topY + faceR * 0.3, cx + faceR * 0.55, topY + faceR * 0.42]
      ]);
      break;
    case 20: // オールバック — 前髪を後ろに流した男性的なスタイル
      // ベースの頭頂部（きっちり後ろに流したシルエット）
      var abGrad = ctx.createLinearGradient(cx, topY - faceR * 0.2, cx, topY + faceR * 0.3);
      abGrad.addColorStop(0, lighter); abGrad.addColorStop(0.3, color); abGrad.addColorStop(1, darker);
      ctx.fillStyle = abGrad;
      ctx.beginPath();
      // フラットな額ライン → 後ろに流れるシルエット
      ctx.moveTo(cx - faceR * 0.65, topY + faceR * 0.3);
      ctx.lineTo(cx - faceR * 0.62, topY + faceR * 0.05);
      ctx.bezierCurveTo(cx - faceR * 0.58, topY - faceR * 0.1, cx - faceR * 0.3, topY - faceR * 0.2, cx, topY - faceR * 0.22);
      ctx.bezierCurveTo(cx + faceR * 0.3, topY - faceR * 0.2, cx + faceR * 0.58, topY - faceR * 0.1, cx + faceR * 0.62, topY + faceR * 0.05);
      ctx.lineTo(cx + faceR * 0.65, topY + faceR * 0.3);
      ctx.closePath(); ctx.fill();
      // サイドの刈り上げ風テクスチャ
      var abSideGrad = ctx.createLinearGradient(cx - faceR * 0.8, 0, cx - faceR * 0.6, 0);
      abSideGrad.addColorStop(0, darker); abSideGrad.addColorStop(1, color);
      ctx.fillStyle = abSideGrad;
      ctx.globalAlpha = 0.6;
      [-1, 1].forEach(function(s) {
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.75, topY + faceR * 0.12);
        ctx.lineTo(cx + s * faceR * 0.65, topY + faceR * 0.05);
        ctx.lineTo(cx + s * faceR * 0.65, topY + faceR * 0.45);
        ctx.lineTo(cx + s * faceR * 0.75, topY + faceR * 0.42);
        ctx.closePath(); ctx.fill();
      });
      ctx.globalAlpha = 1.0;
      // 後方に流れる髪の膨らみ
      ctx.fillStyle = hairGrad(topY - faceR * 0.15, topY + faceR * 0.2);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.1, topY - faceR * 0.15);
      ctx.bezierCurveTo(cx + faceR * 0.2, topY - faceR * 0.2, cx + faceR * 0.5, topY - faceR * 0.15, cx + faceR * 0.55, topY + faceR * 0.05);
      ctx.bezierCurveTo(cx + faceR * 0.5, topY + faceR * 0.15, cx + faceR * 0.3, topY + faceR * 0.18, cx + faceR * 0.1, topY + faceR * 0.1);
      ctx.bezierCurveTo(cx - faceR * 0.05, topY + faceR * 0.05, cx - faceR * 0.1, topY - faceR * 0.05, cx - faceR * 0.1, topY - faceR * 0.15);
      ctx.closePath(); ctx.fill();
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.4, topY + faceR * 0.18, cx - faceR * 0.25, topY, cx - faceR * 0.1, topY - faceR * 0.15],
        [cx - faceR * 0.05, topY + faceR * 0.15, cx + faceR * 0.05, topY - faceR * 0.02, cx + faceR * 0.15, topY - faceR * 0.18],
        [cx + faceR * 0.2, topY + faceR * 0.18, cx + faceR * 0.3, topY, cx + faceR * 0.45, topY - faceR * 0.1]
      ]);
      // 後方に流れるストランド
      _drawStrands([
        [cx - faceR * 0.5, topY + faceR * 0.2, cx - faceR * 0.35, topY + faceR * 0.05, cx - faceR * 0.15, topY - faceR * 0.12],
        [cx - faceR * 0.3, topY + faceR * 0.18, cx - faceR * 0.15, topY + faceR * 0.02, cx, topY - faceR * 0.15],
        [cx - faceR * 0.1, topY + faceR * 0.15, cx + faceR * 0.05, topY, cx + faceR * 0.2, topY - faceR * 0.12],
        [cx + faceR * 0.1, topY + faceR * 0.15, cx + faceR * 0.25, topY, cx + faceR * 0.4, topY - faceR * 0.08],
        [cx + faceR * 0.3, topY + faceR * 0.18, cx + faceR * 0.42, topY + faceR * 0.05, cx + faceR * 0.55, topY + faceR * 0.02]
      ]);
      // 刈り上げテクスチャ（細い横線）
      if (detail) {
        ctx.strokeStyle = darker;
        ctx.lineWidth = Math.max(0.3, faceR * 0.006);
        ctx.globalAlpha = 0.2;
        [-1, 1].forEach(function(s) {
          for (var oi = 0; oi < 8; oi++) {
            var oy = topY + faceR * 0.12 + oi * faceR * 0.04;
            ctx.beginPath(); ctx.moveTo(cx + s * faceR * 0.65, oy); ctx.lineTo(cx + s * faceR * 0.75, oy); ctx.stroke();
          }
        });
        ctx.globalAlpha = 1.0;
      }
      break;
    case 21: // クレオ — クレオパトラ風（ぱっつん前髪＋直線的サイド＋肩で切り揃え）
      // ベースの頭頂部（滑らかで広い）
      ctx.fillStyle = hairGrad(topY - faceR * 0.3, topY + faceR * 0.5);
      ctx.beginPath(); ctx.arc(cx, topY + faceR * 0.1, faceR * 0.85, Math.PI * 0.75, Math.PI * 2.25); ctx.fill();
      // サイドの直線的な髪（クレオパトラの特徴：ストレートで肩まで）
      [-1, 1].forEach(function(s) {
        var cleoGrad = ctx.createLinearGradient(cx + s * faceR * 0.5, topY, cx + s * faceR * 0.85, faceY + faceR * 0.7);
        cleoGrad.addColorStop(0, darker); cleoGrad.addColorStop(0.3, color); cleoGrad.addColorStop(0.6, lighter); cleoGrad.addColorStop(1, darker);
        ctx.fillStyle = cleoGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.7, topY + faceR * 0.1);
        // 外側ライン — 直線的に下へ、やや外に広がる
        ctx.bezierCurveTo(cx + s * faceR * 0.88, topY + faceR * 0.3, cx + s * faceR * 0.9, faceY + faceR * 0.1, cx + s * faceR * 0.85, faceY + faceR * 0.6);
        // 毛先のカットライン — まっすぐスパッと（クレオパトラの特徴）
        ctx.lineTo(cx + s * faceR * 0.82, faceY + faceR * 0.7);
        ctx.lineTo(cx + s * faceR * 0.52, faceY + faceR * 0.7);
        // 内側ライン — 顔に沿って上へ
        ctx.bezierCurveTo(cx + s * faceR * 0.55, faceY + faceR * 0.3, cx + s * faceR * 0.58, topY + faceR * 0.5, cx + s * faceR * 0.62, topY + faceR * 0.1);
        ctx.closePath(); ctx.fill();
      });
      // ぱっつん前髪（クレオパトラの象徴 — 眉上で水平に切り揃え）
      ctx.fillStyle = hairGrad(topY - faceR * 0.15, topY + faceR * 0.42);
      ctx.beginPath();
      // 頭頂部のカーブ
      ctx.moveTo(cx - faceR * 0.68, topY + faceR * 0.08);
      ctx.bezierCurveTo(cx - faceR * 0.55, topY - faceR * 0.2, cx + faceR * 0.55, topY - faceR * 0.2, cx + faceR * 0.68, topY + faceR * 0.08);
      // 右側から前髪の下端を水平に
      ctx.lineTo(cx + faceR * 0.65, topY + faceR * 0.35);
      // 前髪の下端ライン（ほぼ水平、わずかにアーチ）
      ctx.lineTo(cx + faceR * 0.55, topY + faceR * 0.38);
      ctx.lineTo(cx + faceR * 0.35, topY + faceR * 0.39);
      ctx.lineTo(cx + faceR * 0.15, topY + faceR * 0.4);
      ctx.lineTo(cx - faceR * 0.15, topY + faceR * 0.4);
      ctx.lineTo(cx - faceR * 0.35, topY + faceR * 0.39);
      ctx.lineTo(cx - faceR * 0.55, topY + faceR * 0.38);
      ctx.lineTo(cx - faceR * 0.65, topY + faceR * 0.35);
      ctx.closePath(); ctx.fill();
      // 前髪の下端の影ライン（切り揃え感を強調）
      if (detail) {
        ctx.save();
        ctx.strokeStyle = _skinDarker(color, 45);
        ctx.lineWidth = Math.max(0.8, faceR * 0.02);
        ctx.globalAlpha = 0.35;
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(cx - faceR * 0.62, topY + faceR * 0.37);
        ctx.lineTo(cx - faceR * 0.35, topY + faceR * 0.39);
        ctx.lineTo(cx, topY + faceR * 0.4);
        ctx.lineTo(cx + faceR * 0.35, topY + faceR * 0.39);
        ctx.lineTo(cx + faceR * 0.62, topY + faceR * 0.37);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      // シャイン（頭頂部の天使の輪）
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.45, topY + faceR * 0.05, cx - faceR * 0.15, topY - faceR * 0.22, cx + faceR * 0.15, topY - faceR * 0.18],
        [cx - faceR * 0.05, topY + faceR * 0.08, cx + faceR * 0.2, topY - faceR * 0.2, cx + faceR * 0.5, topY - faceR * 0.08]
      ]);
      // ストランド（縦方向の直線的な流れ）
      _drawStrands([
        [cx - faceR * 0.55, topY + faceR * 0.1, cx - faceR * 0.52, topY + faceR * 0.25, cx - faceR * 0.5, topY + faceR * 0.38],
        [cx - faceR * 0.38, topY + faceR * 0.08, cx - faceR * 0.36, topY + faceR * 0.22, cx - faceR * 0.35, topY + faceR * 0.38],
        [cx - faceR * 0.18, topY + faceR * 0.08, cx - faceR * 0.17, topY + faceR * 0.22, cx - faceR * 0.16, topY + faceR * 0.39],
        [cx + faceR * 0.02, topY + faceR * 0.08, cx + faceR * 0.02, topY + faceR * 0.22, cx + faceR * 0.02, topY + faceR * 0.4],
        [cx + faceR * 0.2, topY + faceR * 0.08, cx + faceR * 0.2, topY + faceR * 0.22, cx + faceR * 0.2, topY + faceR * 0.39],
        [cx + faceR * 0.38, topY + faceR * 0.08, cx + faceR * 0.39, topY + faceR * 0.22, cx + faceR * 0.39, topY + faceR * 0.38],
        [cx + faceR * 0.55, topY + faceR * 0.1, cx + faceR * 0.55, topY + faceR * 0.25, cx + faceR * 0.55, topY + faceR * 0.37],
        // 頭頂部→左右への放射状
        [cx - faceR * 0.1, topY - faceR * 0.1, cx - faceR * 0.3, topY - faceR * 0.05, cx - faceR * 0.5, topY + faceR * 0.05],
        [cx + faceR * 0.1, topY - faceR * 0.1, cx + faceR * 0.3, topY - faceR * 0.05, cx + faceR * 0.5, topY + faceR * 0.05]
      ]);
      break;
  }
  ctx.restore();
}

function drawAccessory(ctx, cx, faceY, eyeY, faceR, eyeSpacing, acc, hairColor) {
  if (acc === 0) return;
  var lx = cx - eyeSpacing, rx = cx + eyeSpacing;
  var detail = faceR >= 20;
  ctx.save();
  switch(acc) {
    case 1: // 丸メガネ
      var gr = faceR * 0.18;
      // フレームの影
      if (detail) {
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = faceR * 0.05;
        ctx.beginPath(); ctx.arc(lx, eyeY + faceR * 0.005, gr, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(rx, eyeY + faceR * 0.005, gr, 0, Math.PI * 2); ctx.stroke();
      }
      // メインフレーム
      ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = faceR * 0.04;
      ctx.beginPath(); ctx.arc(lx, eyeY, gr, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(rx, eyeY, gr, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(lx + gr, eyeY); ctx.lineTo(rx - gr, eyeY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(lx - gr, eyeY); ctx.lineTo(lx - gr - faceR * 0.12, eyeY - faceR * 0.03); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx + gr, eyeY); ctx.lineTo(rx + gr + faceR * 0.12, eyeY - faceR * 0.03); ctx.stroke();
      // レンズの微かな反射
      if (detail) {
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath(); ctx.arc(lx, eyeY, gr * 0.85, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(rx, eyeY, gr * 0.85, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 2: // 四角メガネ
      var sqW = faceR * 0.2;
      var sqH = faceR * 0.15;
      var sqR = faceR * 0.03;
      // フレームの影
      if (detail) {
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = faceR * 0.05;
        ctx.beginPath(); ctx.roundRect(lx - sqW, eyeY - sqH + faceR * 0.005, sqW * 2, sqH * 2, sqR); ctx.stroke();
        ctx.beginPath(); ctx.roundRect(rx - sqW, eyeY - sqH + faceR * 0.005, sqW * 2, sqH * 2, sqR); ctx.stroke();
      }
      // メインフレーム
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = faceR * 0.04;
      ctx.beginPath(); ctx.roundRect(lx - sqW, eyeY - sqH, sqW * 2, sqH * 2, sqR); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(rx - sqW, eyeY - sqH, sqW * 2, sqH * 2, sqR); ctx.stroke();
      // ブリッジ（まっすぐ）
      ctx.beginPath(); ctx.moveTo(lx + sqW, eyeY); ctx.lineTo(rx - sqW, eyeY); ctx.stroke();
      // テンプル（つる）
      ctx.beginPath(); ctx.moveTo(lx - sqW, eyeY - sqH * 0.3); ctx.lineTo(lx - sqW - faceR * 0.14, eyeY - faceR * 0.04); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx + sqW, eyeY - sqH * 0.3); ctx.lineTo(rx + sqW + faceR * 0.14, eyeY - faceR * 0.04); ctx.stroke();
      // レンズの微かな反射
      if (detail) {
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath(); ctx.roundRect(lx - sqW * 0.8, eyeY - sqH * 0.8, sqW * 1.6, sqH * 1.6, sqR); ctx.fill();
        ctx.beginPath(); ctx.roundRect(rx - sqW * 0.8, eyeY - sqH * 0.8, sqW * 1.6, sqH * 1.6, sqR); ctx.fill();
      }
      break;
    case 3: // アンダーリム
      var urW = faceR * 0.18;
      var urH = faceR * 0.14;
      // フレームの影
      if (detail) {
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = faceR * 0.04;
        ctx.beginPath(); ctx.arc(lx, eyeY + faceR * 0.005, urW, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.arc(rx, eyeY + faceR * 0.005, urW, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      }
      // 下半分フレーム（アンダーリム）
      ctx.strokeStyle = '#333'; ctx.lineWidth = faceR * 0.035;
      // 左レンズ下半分
      ctx.beginPath(); ctx.arc(lx, eyeY, urW, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      // 右レンズ下半分
      ctx.beginPath(); ctx.arc(rx, eyeY, urW, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      // 下フレームの端を上に繋ぐ細い線（左右の端）
      ctx.lineWidth = faceR * 0.015;
      // 左レンズの左端縦線
      var ulAng1 = 0.85 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(lx + Math.cos(ulAng1) * urW, eyeY + Math.sin(ulAng1) * urW);
      ctx.lineTo(lx + Math.cos(ulAng1) * urW, eyeY - urH * 0.3);
      ctx.stroke();
      // 左レンズの右端縦線
      var ulAng2 = 0.15 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(lx + Math.cos(ulAng2) * urW, eyeY + Math.sin(ulAng2) * urW);
      ctx.lineTo(lx + Math.cos(ulAng2) * urW, eyeY - urH * 0.3);
      ctx.stroke();
      // 右レンズの左端縦線
      ctx.beginPath();
      ctx.moveTo(rx + Math.cos(ulAng1) * urW, eyeY + Math.sin(ulAng1) * urW);
      ctx.lineTo(rx + Math.cos(ulAng1) * urW, eyeY - urH * 0.3);
      ctx.stroke();
      // 右レンズの右端縦線
      ctx.beginPath();
      ctx.moveTo(rx + Math.cos(ulAng2) * urW, eyeY + Math.sin(ulAng2) * urW);
      ctx.lineTo(rx + Math.cos(ulAng2) * urW, eyeY - urH * 0.3);
      ctx.stroke();
      // ブリッジ
      ctx.lineWidth = faceR * 0.025;
      ctx.beginPath(); ctx.moveTo(lx + urW * 0.95, eyeY); ctx.lineTo(rx - urW * 0.95, eyeY); ctx.stroke();
      // テンプル
      ctx.beginPath(); ctx.moveTo(lx - urW, eyeY); ctx.lineTo(lx - urW - faceR * 0.12, eyeY - faceR * 0.03); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx + urW, eyeY); ctx.lineTo(rx + urW + faceR * 0.12, eyeY - faceR * 0.03); ctx.stroke();
      break;
    case 4: // サングラス
      var sgR = faceR * 0.22;
      // レンズ塗りつぶし（グラデーション）
      var sgGradL = ctx.createRadialGradient(lx - sgR * 0.2, eyeY - sgR * 0.3, sgR * 0.1, lx, eyeY, sgR);
      sgGradL.addColorStop(0, '#4a3728'); sgGradL.addColorStop(0.6, '#2a1a10'); sgGradL.addColorStop(1, '#1a0e08');
      var sgGradR = ctx.createRadialGradient(rx - sgR * 0.2, eyeY - sgR * 0.3, sgR * 0.1, rx, eyeY, sgR);
      sgGradR.addColorStop(0, '#4a3728'); sgGradR.addColorStop(0.6, '#2a1a10'); sgGradR.addColorStop(1, '#1a0e08');
      // 左レンズ塗り
      ctx.fillStyle = sgGradL;
      ctx.beginPath(); ctx.arc(lx, eyeY, sgR, 0, Math.PI * 2); ctx.fill();
      // 右レンズ塗り
      ctx.fillStyle = sgGradR;
      ctx.beginPath(); ctx.arc(rx, eyeY, sgR, 0, Math.PI * 2); ctx.fill();
      // 太めのフレーム
      ctx.strokeStyle = '#111'; ctx.lineWidth = faceR * 0.055;
      ctx.beginPath(); ctx.arc(lx, eyeY, sgR, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(rx, eyeY, sgR, 0, Math.PI * 2); ctx.stroke();
      // ブリッジ
      ctx.lineWidth = faceR * 0.05;
      ctx.beginPath(); ctx.moveTo(lx + sgR, eyeY); ctx.lineTo(rx - sgR, eyeY); ctx.stroke();
      // テンプル（太め）
      ctx.lineWidth = faceR * 0.045;
      ctx.beginPath(); ctx.moveTo(lx - sgR, eyeY); ctx.lineTo(lx - sgR - faceR * 0.15, eyeY - faceR * 0.04); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx + sgR, eyeY); ctx.lineTo(rx + sgR + faceR * 0.15, eyeY - faceR * 0.04); ctx.stroke();
      // レンズの反射ハイライト
      if (detail) {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.save();
        ctx.beginPath(); ctx.ellipse(lx - sgR * 0.25, eyeY - sgR * 0.25, sgR * 0.35, sgR * 0.2, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(rx - sgR * 0.25, eyeY - sgR * 0.25, sgR * 0.35, sgR * 0.2, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      break;
    case 5: // 帽子
      var hatY = faceY - faceR - faceR * 0.05;
      // 帽子本体（グラデーション）
      var hatGrad = ctx.createLinearGradient(cx, hatY - faceR * 0.3, cx, hatY + faceR * 0.15);
      hatGrad.addColorStop(0, '#ef5350');
      hatGrad.addColorStop(0.5, '#e74c3c');
      hatGrad.addColorStop(1, '#c62828');
      ctx.fillStyle = hatGrad;
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.7, hatY + faceR * 0.15);
      ctx.lineTo(cx + faceR * 0.7, hatY + faceR * 0.15);
      ctx.lineTo(cx + faceR * 0.5, hatY - faceR * 0.3);
      ctx.lineTo(cx - faceR * 0.5, hatY - faceR * 0.3);
      ctx.closePath(); ctx.fill();
      // ツバ（グラデーション）
      var brimGrad = ctx.createLinearGradient(cx, hatY + faceR * 0.1, cx, hatY + faceR * 0.2);
      brimGrad.addColorStop(0, '#c0392b');
      brimGrad.addColorStop(1, '#8e2420');
      ctx.fillStyle = brimGrad;
      ctx.beginPath();
      ctx.ellipse(cx, hatY + faceR * 0.15, faceR * 0.85, faceR * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 6: // リボン
      var ribY = faceY - faceR - faceR * 0.1;
      // リボン影
      if (detail) {
        ctx.fillStyle = 'rgba(200,50,120,0.3)';
        ctx.beginPath(); ctx.ellipse(cx - faceR * 0.2, ribY + faceR * 0.01, faceR * 0.19, faceR * 0.13, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + faceR * 0.2, ribY + faceR * 0.01, faceR * 0.19, faceR * 0.13, 0.3, 0, Math.PI * 2); ctx.fill();
      }
      // リボン本体（グラデーション）
      var ribGrad1 = ctx.createRadialGradient(cx - faceR * 0.2, ribY - faceR * 0.03, faceR * 0.02, cx - faceR * 0.2, ribY, faceR * 0.18);
      ribGrad1.addColorStop(0, '#ff85c8'); ribGrad1.addColorStop(1, '#ff69b4');
      ctx.fillStyle = ribGrad1;
      ctx.beginPath(); ctx.ellipse(cx - faceR * 0.2, ribY, faceR * 0.18, faceR * 0.12, -0.3, 0, Math.PI * 2); ctx.fill();
      var ribGrad2 = ctx.createRadialGradient(cx + faceR * 0.2, ribY - faceR * 0.03, faceR * 0.02, cx + faceR * 0.2, ribY, faceR * 0.18);
      ribGrad2.addColorStop(0, '#ff85c8'); ribGrad2.addColorStop(1, '#ff69b4');
      ctx.fillStyle = ribGrad2;
      ctx.beginPath(); ctx.ellipse(cx + faceR * 0.2, ribY, faceR * 0.18, faceR * 0.12, 0.3, 0, Math.PI * 2); ctx.fill();
      // 結び目
      var knotGrad = ctx.createRadialGradient(cx, ribY, faceR * 0.01, cx, ribY, faceR * 0.06);
      knotGrad.addColorStop(0, '#ff90d0'); knotGrad.addColorStop(1, '#e05090');
      ctx.fillStyle = knotGrad;
      ctx.beginPath(); ctx.arc(cx, ribY, faceR * 0.06, 0, Math.PI * 2); ctx.fill();
      break;
    case 7: // ヘアバンド
      // ヘアバンド影
      if (detail) {
        ctx.strokeStyle = 'rgba(150,30,30,0.2)'; ctx.lineWidth = faceR * 0.09;
        ctx.beginPath(); ctx.arc(cx, faceY + faceR * 0.005, faceR * 1.02, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      }
      // ヘアバンド本体（グラデーション）
      var hbGrad = ctx.createLinearGradient(cx - faceR, faceY - faceR, cx + faceR, faceY - faceR);
      hbGrad.addColorStop(0, '#c0392b'); hbGrad.addColorStop(0.5, '#e74c3c'); hbGrad.addColorStop(1, '#c0392b');
      ctx.strokeStyle = hbGrad; ctx.lineWidth = faceR * 0.07;
      ctx.beginPath(); ctx.arc(cx, faceY, faceR * 1.02, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      break;
  }
  ctx.restore();
}

function getAvatarHtml(avatarStr, size) {
  if (!avatarStr) avatarStr = '😀';
  if (avatarStr.startsWith('custom:')) {
    var dataUrl = renderCustomAvatar(avatarStr, size * 2); // 2x for retina
    if (dataUrl) return '<img src="' + dataUrl + '" class="avatar-img-inline" style="width:' + size + 'px;height:' + size + 'px;" alt="avatar">';
  }
  return '<span style="font-size:' + Math.round(size * 0.7) + 'px;line-height:1;">' + avatarStr + '</span>';
}
