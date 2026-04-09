var AB_SKINS = ['#FDEBD0','#F5CBA7','#D08B5B','#A0522D','#614335','#3E2723'];
var AB_HAIRS = ['#1A1A1A','#4A3728','#8B4513','#FFD700','#FF6347','#C0C0C0'];
var AB_BGS = ['#E8F5E9','#E3F2FD','#FFF3E0','#FCE4EC','#F3E5F5','#E0F7FA','#FFF9C4','#EFEBE9'];
var AB_FACES = [14,16,18];
var AB_EYE_NAMES = ['ドット','ライン','まんまる','ウインク','閉じ目','たれ目','つり目','キラキラ','ジト目','ぱっちり','ネコ目','三白眼','笑い目','涙目'];
var AB_MOUTH_NAMES = ['にっこり','わーい','一文字','ぽかん','むすっ','にやり','べー','アヒル口','への字','ω口','キス','歯見せ'];
var AB_HAIR_NAMES = ['なし','ショート','ミディアム','ロング','スパイキー','ひよこ','チカラ','ポニテ','ボブ','おだんご','ツインテ','ウェーブ','ワンレン','ハーフアップ','マッシュ','センター分け','外ハネ','ベリーショート','ゆるふわ','姫カット','オールバック','クレオ','アフロ','モヒカン','三つ編み','カーリー','ソフモヒ'];
var AB_ACC_NAMES = ['なし','丸メガネ','四角メガネ','アンダーリム','サングラス','帽子','リボン','ヘアバンド','ピアス','ネックレス','花冠','ベレー帽','ヘッドフォン'];
var AB_FACE_SHAPE_NAMES = ['まるがお','おもなが','しかくめ','たまご','ホームベース','おにぎり','ほそおも','えら張り','ハート','ダイヤ','洋なし'];
var AB_EYEBROW_NAMES = ['ナチュラル','太め','キリッと','ハの字','ほそめ','なし'];
var AB_NOSE_NAMES = ['ちょこん','まるい','たかい','なし','だんご','すじ','にんにく','わし'];
var AB_BEARD_NAMES = ['なし','ちょびひげ','あごひげ','フルひげ','口ひげ','もみあげ','無精ひげ','やぎひげ'];
var AB_CHEEK_NAMES = ['なし','うすく','しっかり','バカボン'];
var AB_EAR_NAMES = ['ふつう','ちいさめ','おおきめ','とがり','まるい','エルフ'];
var AB_EYE_COLORS = ['#3B2F2F','#5D4037','#1B5E20','#0D47A1','#4A148C','#37474F'];
var AB_EYE_COLOR_NAMES = ['こげ茶','茶','緑','青','紫','グレー'];
// 化粧パラメータ
var AB_LIP_COLORS = ['#C0454E','#C02068','#D00020','#E05030','#6A0838','#B07060'];
var AB_LIP_COLOR_NAMES = ['ナチュラル','ローズ','レッド','コーラル','ベリー','ヌード'];
var AB_EYESHADOW_COLORS = [null,'rgba(230,130,170,0.8)','rgba(170,110,80,0.8)','rgba(150,100,200,0.85)','rgba(90,140,220,0.8)','rgba(210,170,70,0.8)'];
var AB_EYESHADOW_NAMES = ['なし','ピンク','ブラウン','パープル','ブルー','ゴールド'];
var AB_LASH_NAMES = ['ナチュラル','ロング','ボリューム'];
var AB_CHEEK_COLORS = ['rgba(240,70,120,','rgba(240,110,70,','rgba(200,50,110,','rgba(235,120,50,'];
var AB_CHEEK_COLOR_NAMES = ['ピンク','コーラル','ローズ','オレンジ'];
// 動物キャラ
var AB_ANIMAL_NAMES = ['にんげん','ひよこ','ねこ','いぬ','うさぎ','くま','パンダ','ペンギン','たぬき','きつね','かえる','ハムスター','ふくろう'];
var AB_ANIMAL_COLORS = {
  1:  { body: '#FFE066', belly: '#FFF8DC', accent: '#FF8C00' },  // ひよこ
  2:  { body: '#808080', belly: '#E0E0E0', accent: '#FF69B4' },  // ねこ
  3:  { body: '#D2691E', belly: '#FAEBD7', accent: '#2F1A0E' },  // いぬ
  4:  { body: '#FFF0F5', belly: '#FFFFFF', accent: '#FF69B4' },  // うさぎ
  5:  { body: '#8B4513', belly: '#DEB887', accent: '#5C2E05' },  // くま
  6:  { body: '#FFFFFF', belly: '#FFFFFF', accent: '#1A1A1A' },  // パンダ
  7:  { body: '#2F2F2F', belly: '#FFFFFF', accent: '#FF8C00' },  // ペンギン
  8:  { body: '#A0522D', belly: '#FAEBD7', accent: '#2F1A0E' },  // たぬき
  9:  { body: '#FF8C00', belly: '#FFF8DC', accent: '#FFFFFF' },  // きつね
  10: { body: '#228B22', belly: '#98FB98', accent: '#FFD700' },  // かえる
  11: { body: '#FFF0E0', belly: '#FFFFFF', accent: '#FF8C69' },  // ハムスター
  12: { body: '#8B6914', belly: '#FAEBD7', accent: '#FF8C00' }   // ふくろう
};
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
    // 化粧パラメータ（v3追加）
    var lipColorIdx = parseInt(parts[30]) || 0;
    var eyeshadowType = parseInt(parts[31]) || 0;
    var lashType = parseInt(parts[32]) || 0;
    var cheekColorIdx = parseInt(parts[33]) || 0;
    // アクセサリー位置・大きさ（v4追加、後方互換）
    var posAccVal = parseInt(parts[34]) || 0;
    var sizeAccVal = parseInt(parts[35]) || 0;
    // v5追加パラメータ
    var sizeBrowVal = parseInt(parts[36]) || 0;
    var posBeardVal = parseInt(parts[37]) || 0;
    var sizeBeardVal = parseInt(parts[38]) || 0;
    var posCheekVal = parseInt(parts[39]) || 0;
    var sizeCheekVal = parseInt(parts[40]) || 0;
    var posLipVal = parseInt(parts[41]) || 0;
    var sizeLipVal = parseInt(parts[42]) || 0;
    var cheekSpacingVal = parseInt(parts[43]) || 0;
    // v6: 動物キャラ（後方互換: 未指定は0=にんげん）
    var species = parseInt(parts[44]) || 0;

    // 動物キャラの場合は専用レンダラーへ分岐
    if (species > 0 && species < AB_ANIMAL_NAMES.length) {
      var animalResult = renderAnimalAvatar(size, species, bgColor, eyeType, mouthType, accessories, cheekType, sizeFaceVal);
      if (animalResult) { _avatarCache[cacheKey] = animalResult; }
      return animalResult;
    }

    var canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    var ctx = canvas.getContext('2d');
    var cx = size / 2, cy = size / 2, r = size / 2;

    // 背景円
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = bgColor; ctx.fill();

    // 顔（輪郭形状反映）- 少し下寄せで髪との間隔を確保
    var faceR = r * faceSize / 24 * (1 + sizeFaceVal * 0.06);
    var faceY = cy + r * 0.08;

    // 髪のオフセット
    var hairYOff = posHairVal * faceR * 0.12;
    var hairScale = 1 + sizeHairVal * 0.08;
    var hairWidthScale = 1 + widthHairVal * 0.08;

    // 髪（後ろ部分 - ポニテのテール等は顔の後ろに描画）
    ctx.save();
    ctx.translate(cx, 0); ctx.scale(hairWidthScale, 1); ctx.translate(-cx, 0);
    drawHairBack(ctx, cx, faceY + hairYOff, faceR * hairScale, hairType, hairColor);
    ctx.restore();

    // 顔（後ろ髪の上に描画）
    drawFace(ctx, cx, faceY, faceR, faceShapeType, skinColor, earType, posEarVal, sizeEarVal, earSpacingVal);

    // 位置オフセット計算（1単位 = faceR * 0.04）
    var eyeYOff = posEyeVal * faceR * 0.06;
    var mouthYOff = posMouthVal * faceR * 0.08;
    var noseYOff = posNoseVal * faceR * 0.06;
    var browYOff = posBrowVal * faceR * 0.06;
    var spacingOff = eyeSpacingVal * faceR * 0.045;

    // 目 - にがおえ風の大きめ配置
    var eyeY = faceY + faceR * 0.02 + eyeYOff;
    var eyeSpacing = faceR * 0.33 + spacingOff;
    var eyeSize = faceR * (0.045 + sizeEyeVal * 0.015);

    // 眉毛
    var browScale = 1 + sizeBrowVal * 0.1;
    ctx.save();
    ctx.translate(cx, eyeY + browYOff);
    ctx.scale(browScale, browScale);
    ctx.translate(-cx, -(eyeY + browYOff));
    drawEyebrows(ctx, cx, eyeY + browYOff, eyeSpacing, faceR, eyebrowType);
    ctx.restore();

    // アイシャドウ（目の前に描画）
    if (eyeshadowType > 0 && AB_EYESHADOW_COLORS[eyeshadowType]) {
      drawEyeshadow(ctx, cx, eyeY, eyeSpacing, eyeSize, faceR, eyeshadowType);
    }

    // 目
    drawEyes(ctx, cx, eyeY, eyeSpacing, eyeSize, eyeType, faceR, eyeColor, lashType);

    // 鼻 — faceYベースで独立（口の位置に依存しない）
    var mouthYRaw = faceY + faceR * 0.35 + mouthYOff;
    var mouthY = Math.max(faceY + faceR * 0.05, mouthYRaw);
    var noseY = faceY + faceR * 0.18 + noseYOff;
    var noseFaceR = faceR * (1.5 + sizeNoseVal * 0.15);
    drawNose(ctx, cx, noseY, noseFaceR, noseType);

    // 口（リップ含む）— mouthYOffで位置調整、リップスライダーで追加オフセット
    var lipYOff = posLipVal * faceR * 0.05;
    var lipScale = 1 + sizeLipVal * 0.1;
    var mouthFaceR = faceR * (1 + sizeMouthVal * 0.1);
    var finalMouthY = mouthY + lipYOff;
    ctx.save();
    ctx.translate(cx, finalMouthY);
    ctx.scale(lipScale, lipScale);
    ctx.translate(-cx, -finalMouthY);
    drawMouth(ctx, cx, finalMouthY, mouthFaceR, mouthType, lipColorIdx);
    ctx.restore();

    // ヒゲ — 独立した位置制御
    var beardYOff = posBeardVal * faceR * 0.05;
    var beardScale = 1 + sizeBeardVal * 0.1;
    var beardBaseY = faceY + faceR * 0.35 + beardYOff;
    ctx.save();
    ctx.translate(cx, beardBaseY);
    ctx.scale(beardScale, beardScale);
    ctx.translate(-cx, -beardBaseY);
    drawBeard(ctx, cx, beardBaseY, faceR, beardType, hairColor);
    ctx.restore();

    // チーク（カラー対応）— 独立した位置制御
    var cheekYOff = posCheekVal * faceR * 0.05;
    var cheekScale = 1 + sizeCheekVal * 0.08;
    var cheekBaseY = faceY + faceR * 0.1 + cheekYOff;
    ctx.save();
    ctx.translate(cx, cheekBaseY);
    ctx.scale(cheekScale, cheekScale);
    ctx.translate(-cx, -cheekBaseY);
    drawCheeks(ctx, cx, cheekBaseY, eyeSpacing, faceR, cheekType, cheekColorIdx, cheekSpacingVal);
    ctx.restore();

    // 髪（前部分）
    ctx.save();
    ctx.translate(cx, 0); ctx.scale(hairWidthScale, 1); ctx.translate(-cx, 0);
    drawHair(ctx, cx, faceY + hairYOff, faceR * hairScale, hairType, hairColor);
    ctx.restore();

    // アクセサリー
    var accYOff = posAccVal * faceR * 0.06;
    var accScale = 1 + sizeAccVal * 0.08;
    accessories.forEach(function(acc) {
      drawAccessory(ctx, cx, faceY, eyeY, faceR, eyeSpacing, acc, hairColor, accYOff, accScale);
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
    case 8: // ハート — heart-shaped, wide forehead narrowing to pointed chin
      ctx.beginPath();
      ctx.moveTo(cx, faceY - faceR * 0.95);
      ctx.bezierCurveTo(cx + faceR * 1.05, faceY - faceR * 0.95, cx + faceR * 1.0, faceY + faceR * 0.05, cx + faceR * 0.65, faceY + faceR * 0.5);
      ctx.quadraticCurveTo(cx, faceY + faceR * 1.25, cx - faceR * 0.65, faceY + faceR * 0.5);
      ctx.bezierCurveTo(cx - faceR * 1.0, faceY + faceR * 0.05, cx - faceR * 1.05, faceY - faceR * 0.95, cx, faceY - faceR * 0.95);
      ctx.closePath();
      break;
    case 9: // ダイヤ — diamond-shaped, widest at cheekbones
      ctx.beginPath();
      ctx.moveTo(cx, faceY - faceR * 1.05);
      ctx.quadraticCurveTo(cx + faceR * 0.5, faceY - faceR * 0.7, cx + faceR * 0.95, faceY);
      ctx.quadraticCurveTo(cx + faceR * 0.5, faceY + faceR * 0.7, cx, faceY + faceR * 1.05);
      ctx.quadraticCurveTo(cx - faceR * 0.5, faceY + faceR * 0.7, cx - faceR * 0.95, faceY);
      ctx.quadraticCurveTo(cx - faceR * 0.5, faceY - faceR * 0.7, cx, faceY - faceR * 1.05);
      ctx.closePath();
      break;
    case 10: // 洋なし — pear-shaped, narrow forehead wider jaw
      ctx.beginPath();
      ctx.moveTo(cx, faceY - faceR * 0.95);
      ctx.bezierCurveTo(cx + faceR * 0.7, faceY - faceR * 0.95, cx + faceR * 0.7, faceY - faceR * 0.2, cx + faceR * 0.95, faceY + faceR * 0.2);
      ctx.bezierCurveTo(cx + faceR * 1.05, faceY + faceR * 0.55, cx + faceR * 0.7, faceY + faceR * 0.95, cx, faceY + faceR * 1.05);
      ctx.bezierCurveTo(cx - faceR * 0.7, faceY + faceR * 0.95, cx - faceR * 1.05, faceY + faceR * 0.55, cx - faceR * 0.95, faceY + faceR * 0.2);
      ctx.bezierCurveTo(cx - faceR * 0.7, faceY - faceR * 0.2, cx - faceR * 0.7, faceY - faceR * 0.95, cx, faceY - faceR * 0.95);
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
  var earX = faceR * 0.95 + earSpacingVal * faceR * 0.09;
  var earYOff = posEarVal * faceR * 0.075;
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
    case 2: // ミディアム - ふんわり内巻きサイド
      ctx.save();
      [-1, 1].forEach(function(s) {
        var mGrad = ctx.createLinearGradient(cx + s * faceR * 0.6, faceY - faceR * 0.6, cx + s * faceR * 0.9, faceY + faceR * 0.55);
        mGrad.addColorStop(0, darker); mGrad.addColorStop(0.35, color); mGrad.addColorStop(0.7, lighter); mGrad.addColorStop(1, color);
        ctx.fillStyle = mGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.72, faceY - faceR * 0.55);
        // 頭頂部からサイドへ自然なカーブ
        ctx.bezierCurveTo(cx + s * faceR * 1.0, faceY - faceR * 0.3, cx + s * faceR * 0.98, faceY + faceR * 0.1, cx + s * faceR * 0.88, faceY + faceR * 0.35);
        // 内巻きの毛先（顔側へ丸く巻き込む）
        ctx.bezierCurveTo(cx + s * faceR * 0.82, faceY + faceR * 0.48, cx + s * faceR * 0.68, faceY + faceR * 0.55, cx + s * faceR * 0.58, faceY + faceR * 0.48);
        ctx.bezierCurveTo(cx + s * faceR * 0.52, faceY + faceR * 0.4, cx + s * faceR * 0.55, faceY + faceR * 0.2, cx + s * faceR * 0.6, faceY - faceR * 0.05);
        ctx.bezierCurveTo(cx + s * faceR * 0.63, faceY - faceR * 0.3, cx + s * faceR * 0.66, faceY - faceR * 0.45, cx + s * faceR * 0.72, faceY - faceR * 0.55);
        ctx.closePath(); ctx.fill();
      });
      if (detail) {
        ctx.strokeStyle = darker; ctx.globalAlpha = 0.1; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
        [-1, 1].forEach(function(s) {
          for (var i = 0; i < 5; i++) {
            var off = (i - 2) * faceR * 0.025;
            ctx.beginPath();
            ctx.moveTo(cx + s * faceR * 0.74 + off, faceY - faceR * 0.45);
            ctx.bezierCurveTo(cx + s * faceR * 0.92 + off, faceY - faceR * 0.1, cx + s * faceR * 0.88 + off, faceY + faceR * 0.2, cx + s * faceR * 0.68 + off, faceY + faceR * 0.45);
            ctx.stroke();
          }
        });
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      break;
    case 3: // ロング - 胸元まで伸びるサイドの髪
      ctx.save();
      [-1, 1].forEach(function(s) {
        var sGrad = ctx.createLinearGradient(cx + s * faceR * 0.6, faceY - faceR * 0.6, cx + s * faceR * 0.9, faceY + faceR * 1.1);
        sGrad.addColorStop(0, darker); sGrad.addColorStop(0.25, color); sGrad.addColorStop(0.55, lighter); sGrad.addColorStop(0.8, color); sGrad.addColorStop(1, darker);
        ctx.fillStyle = sGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.72, faceY - faceR * 0.58);
        // 後頭部から広がる自然な膨らみ
        ctx.bezierCurveTo(cx + s * faceR * 1.05, faceY - faceR * 0.25, cx + s * faceR * 1.02, faceY + faceR * 0.2, cx + s * faceR * 0.92, faceY + faceR * 0.55);
        // 中間部 — やや絞ってからまた広がる自然なウェーブ
        ctx.bezierCurveTo(cx + s * faceR * 0.88, faceY + faceR * 0.75, cx + s * faceR * 0.82, faceY + faceR * 0.9, cx + s * faceR * 0.72, faceY + faceR * 1.02);
        // 毛先 — 軽やかにテーパー
        ctx.bezierCurveTo(cx + s * faceR * 0.65, faceY + faceR * 1.08, cx + s * faceR * 0.55, faceY + faceR * 1.0, cx + s * faceR * 0.5, faceY + faceR * 0.88);
        // 内側ラインを戻る
        ctx.bezierCurveTo(cx + s * faceR * 0.52, faceY + faceR * 0.6, cx + s * faceR * 0.56, faceY + faceR * 0.2, cx + s * faceR * 0.6, faceY - faceR * 0.1);
        ctx.bezierCurveTo(cx + s * faceR * 0.63, faceY - faceR * 0.35, cx + s * faceR * 0.66, faceY - faceR * 0.48, cx + s * faceR * 0.72, faceY - faceR * 0.58);
        ctx.closePath(); ctx.fill();
      });
      if (detail) {
        ctx.strokeStyle = darker; ctx.globalAlpha = 0.1; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
        [-1, 1].forEach(function(s) {
          for (var i = 0; i < 6; i++) {
            var off = (i - 2.5) * faceR * 0.022;
            ctx.beginPath();
            ctx.moveTo(cx + s * faceR * 0.74 + off, faceY - faceR * 0.48);
            ctx.bezierCurveTo(cx + s * faceR * 0.96 + off, faceY - faceR * 0.05, cx + s * faceR * 0.9 + off, faceY + faceR * 0.5, cx + s * faceR * 0.65 + off, faceY + faceR * 0.95);
            ctx.stroke();
          }
        });
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      break;
    case 7: // ポニテ - 後頭部から垂れるふんわりテール
      ctx.save();
      // テール開始（後頭部の高い位置、やや右寄り）
      var ptStartX = cx + faceR * 0.12;
      var ptStartY = faceY - faceR * 0.72;
      // テール終了（背中方向へ自然に弧を描く）
      var ptEndX = cx + faceR * 0.55;
      var ptEndY = faceY + faceR * 0.6;
      // テール本体（太い根元→しなやかに細くなる毛先）
      var pGrad = ctx.createLinearGradient(ptStartX, ptStartY, ptEndX, ptEndY);
      pGrad.addColorStop(0, darker); pGrad.addColorStop(0.2, color); pGrad.addColorStop(0.5, lighter); pGrad.addColorStop(0.8, color); pGrad.addColorStop(1, darker);
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      // テール左側（太→細へ自然にテーパー）
      ctx.moveTo(ptStartX - faceR * 0.15, ptStartY);
      ctx.bezierCurveTo(
        ptStartX - faceR * 0.12, ptStartY + faceR * 0.4,
        ptStartX + faceR * 0.08, ptStartY + faceR * 0.8,
        ptEndX - faceR * 0.12, ptEndY
      );
      // 毛先（軽やかな先端）
      ctx.quadraticCurveTo(ptEndX, ptEndY + faceR * 0.08, ptEndX + faceR * 0.08, ptEndY - faceR * 0.02);
      // テール右側（戻り）
      ctx.bezierCurveTo(
        ptStartX + faceR * 0.4, ptStartY + faceR * 0.8,
        ptStartX + faceR * 0.3, ptStartY + faceR * 0.4,
        ptStartX + faceR * 0.2, ptStartY
      );
      ctx.closePath(); ctx.fill();
      // 結び目（ゴム）
      var pkGrad = ctx.createRadialGradient(ptStartX + faceR * 0.025, ptStartY, faceR * 0.015, ptStartX + faceR * 0.025, ptStartY, faceR * 0.09);
      pkGrad.addColorStop(0, _skinDarker(color, 25)); pkGrad.addColorStop(1, _skinDarker(color, 50));
      ctx.fillStyle = pkGrad;
      ctx.beginPath(); ctx.ellipse(ptStartX + faceR * 0.025, ptStartY, faceR * 0.09, faceR * 0.06, 0.2, 0, Math.PI * 2); ctx.fill();
      // 根元の束感を表現（放射状の短い線）
      if (detail) {
        ctx.strokeStyle = darker; ctx.globalAlpha = 0.15; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
        for (var pi = 0; pi < 7; pi++) {
          var pOff = (pi - 3) * faceR * 0.035;
          ctx.beginPath();
          ctx.moveTo(ptStartX + faceR * 0.025 + pOff * 0.25, ptStartY + faceR * 0.06);
          ctx.bezierCurveTo(
            ptStartX + pOff * 0.5, ptStartY + faceR * 0.45,
            ptStartX + faceR * 0.18 + pOff * 0.7, ptStartY + faceR * 0.8,
            ptEndX + pOff * 0.4 - faceR * 0.04, ptEndY - faceR * 0.08
          );
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      // 後頭部の膨らみ（結び目の上）
      ctx.fillStyle = _hairBackGrad(cx, faceY - faceR * 0.6, faceR * 0.45);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.35, faceY - faceR * 0.8);
      ctx.bezierCurveTo(cx + faceR * 0.1, faceY - faceR * 0.95, cx + faceR * 0.35, faceY - faceR * 0.85, cx + faceR * 0.3, faceY - faceR * 0.6);
      ctx.bezierCurveTo(cx + faceR * 0.25, faceY - faceR * 0.5, cx - faceR * 0.1, faceY - faceR * 0.5, cx - faceR * 0.35, faceY - faceR * 0.8);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      break;
    case 8: // ボブ - ふっくら丸みのある顎ラインで内巻き
      ctx.save();
      [-1, 1].forEach(function(s) {
        var bGrad = ctx.createLinearGradient(cx + s * faceR * 0.6, faceY - faceR * 0.5, cx + s * faceR * 0.9, faceY + faceR * 0.4);
        bGrad.addColorStop(0, darker); bGrad.addColorStop(0.3, color); bGrad.addColorStop(0.65, lighter); bGrad.addColorStop(1, color);
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.7, faceY - faceR * 0.5);
        // ふっくら丸いシルエット
        ctx.bezierCurveTo(cx + s * faceR * 1.02, faceY - faceR * 0.22, cx + s * faceR * 1.0, faceY + faceR * 0.08, cx + s * faceR * 0.88, faceY + faceR * 0.28);
        // 顎ラインで内巻き（しっかり内側に巻き込む）
        ctx.bezierCurveTo(cx + s * faceR * 0.78, faceY + faceR * 0.42, cx + s * faceR * 0.62, faceY + faceR * 0.45, cx + s * faceR * 0.52, faceY + faceR * 0.35);
        ctx.bezierCurveTo(cx + s * faceR * 0.48, faceY + faceR * 0.25, cx + s * faceR * 0.55, faceY + faceR * 0.05, cx + s * faceR * 0.6, faceY - faceR * 0.15);
        ctx.bezierCurveTo(cx + s * faceR * 0.63, faceY - faceR * 0.35, cx + s * faceR * 0.66, faceY - faceR * 0.45, cx + s * faceR * 0.7, faceY - faceR * 0.5);
        ctx.closePath(); ctx.fill();
      });
      if (detail) {
        ctx.strokeStyle = darker; ctx.globalAlpha = 0.1; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
        [-1, 1].forEach(function(s) {
          for (var i = 0; i < 4; i++) {
            var off = (i - 1.5) * faceR * 0.025;
            ctx.beginPath();
            ctx.moveTo(cx + s * faceR * 0.72 + off, faceY - faceR * 0.42);
            ctx.bezierCurveTo(cx + s * faceR * 0.95 + off, faceY - faceR * 0.05, cx + s * faceR * 0.88 + off, faceY + faceR * 0.18, cx + s * faceR * 0.62 + off, faceY + faceR * 0.35);
            ctx.stroke();
          }
        });
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      break;
    case 9: // おだんご - 立体的なお団子 + ふんわりサイド
      ctx.save();
      var topY9 = faceY - faceR - faceR * 0.12;
      // お団子本体（ふっくら丸い）
      var dGrad = ctx.createRadialGradient(cx - faceR * 0.06, topY9 - faceR * 0.48, faceR * 0.06, cx, topY9 - faceR * 0.38, faceR * 0.4);
      dGrad.addColorStop(0, lighter); dGrad.addColorStop(0.35, color); dGrad.addColorStop(0.75, darker); dGrad.addColorStop(1, _skinDarker(color, 40));
      ctx.fillStyle = dGrad;
      ctx.beginPath(); ctx.arc(cx, topY9 - faceR * 0.38, faceR * 0.37, 0, Math.PI * 2); ctx.fill();
      // お団子のハイライト（天使の輪）
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.ellipse(cx - faceR * 0.1, topY9 - faceR * 0.55, faceR * 0.14, faceR * 0.07, -0.35, 0, Math.PI * 2); ctx.fill();
      // お団子の巻き模様（渦巻き状）
      if (detail) {
        ctx.strokeStyle = darker; ctx.globalAlpha = 0.18; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
        for (var di = 0; di < 6; di++) {
          var dAngle = (di / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(cx, topY9 - faceR * 0.38, faceR * (0.15 + di * 0.035), dAngle, dAngle + Math.PI * 0.5);
          ctx.stroke();
        }
        // 後れ毛（うなじから自然にこぼれる）
        ctx.strokeStyle = color; ctx.globalAlpha = 0.35; ctx.lineWidth = Math.max(0.5, faceR * 0.012);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - faceR * 0.18, topY9 - faceR * 0.05);
        ctx.bezierCurveTo(cx - faceR * 0.22, topY9 + faceR * 0.15, cx - faceR * 0.2, topY9 + faceR * 0.35, cx - faceR * 0.25, topY9 + faceR * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + faceR * 0.15, topY9 - faceR * 0.02);
        ctx.bezierCurveTo(cx + faceR * 0.2, topY9 + faceR * 0.15, cx + faceR * 0.17, topY9 + faceR * 0.3, cx + faceR * 0.22, topY9 + faceR * 0.48);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + faceR * 0.32, topY9 + faceR * 0.08);
        ctx.bezierCurveTo(cx + faceR * 0.36, topY9 + faceR * 0.22, cx + faceR * 0.33, topY9 + faceR * 0.38, cx + faceR * 0.3, topY9 + faceR * 0.52);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // サイドの髪（ミディアム風、ふんわり）
      [-1, 1].forEach(function(s) {
        var d9Grad = ctx.createLinearGradient(cx + s * faceR * 0.6, faceY - faceR * 0.55, cx + s * faceR * 0.9, faceY + faceR * 0.5);
        d9Grad.addColorStop(0, darker); d9Grad.addColorStop(0.4, color); d9Grad.addColorStop(0.8, lighter); d9Grad.addColorStop(1, color);
        ctx.fillStyle = d9Grad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.72, faceY - faceR * 0.52);
        ctx.bezierCurveTo(cx + s * faceR * 0.98, faceY - faceR * 0.2, cx + s * faceR * 0.92, faceY + faceR * 0.15, cx + s * faceR * 0.78, faceY + faceR * 0.4);
        ctx.bezierCurveTo(cx + s * faceR * 0.68, faceY + faceR * 0.48, cx + s * faceR * 0.55, faceY + faceR * 0.42, cx + s * faceR * 0.55, faceY + faceR * 0.28);
        ctx.bezierCurveTo(cx + s * faceR * 0.56, faceY + faceR * 0.05, cx + s * faceR * 0.62, faceY - faceR * 0.2, cx + s * faceR * 0.72, faceY - faceR * 0.52);
        ctx.closePath(); ctx.fill();
      });
      ctx.restore();
      break;
    case 10: // ツインテ - 左右のふんわりテール
      ctx.save();
      [-1, 1].forEach(function(s) {
        var tGrad = ctx.createLinearGradient(cx + s * faceR * 0.45, faceY - faceR * 0.65, cx + s * faceR * 0.8, faceY + faceR * 0.9);
        tGrad.addColorStop(0, darker); tGrad.addColorStop(0.2, color); tGrad.addColorStop(0.5, lighter); tGrad.addColorStop(0.8, color); tGrad.addColorStop(1, darker);
        ctx.fillStyle = tGrad;
        ctx.beginPath();
        // 結び目位置（耳の上あたり）
        ctx.moveTo(cx + s * faceR * 0.52, faceY - faceR * 0.58);
        // 外側に膨らみながら下へ
        ctx.bezierCurveTo(cx + s * faceR * 0.9, faceY - faceR * 0.52, cx + s * faceR * 0.95, faceY + faceR * 0.05, cx + s * faceR * 0.85, faceY + faceR * 0.5);
        // やや内側に絞ってからまた広がる（自然なウェーブ）
        ctx.bezierCurveTo(cx + s * faceR * 0.82, faceY + faceR * 0.7, cx + s * faceR * 0.78, faceY + faceR * 0.85, cx + s * faceR * 0.7, faceY + faceR * 0.9);
        // 毛先（軽やかに）
        ctx.bezierCurveTo(cx + s * faceR * 0.62, faceY + faceR * 0.88, cx + s * faceR * 0.55, faceY + faceR * 0.78, cx + s * faceR * 0.52, faceY + faceR * 0.6);
        // 内側を戻る
        ctx.bezierCurveTo(cx + s * faceR * 0.5, faceY + faceR * 0.3, cx + s * faceR * 0.52, faceY - faceR * 0.1, cx + s * faceR * 0.48, faceY - faceR * 0.45);
        ctx.bezierCurveTo(cx + s * faceR * 0.47, faceY - faceR * 0.52, cx + s * faceR * 0.49, faceY - faceR * 0.58, cx + s * faceR * 0.52, faceY - faceR * 0.58);
        ctx.closePath(); ctx.fill();
        // 結び目（ふっくら楕円）
        var knGrad = ctx.createRadialGradient(cx + s * faceR * 0.52, faceY - faceR * 0.55, faceR * 0.015, cx + s * faceR * 0.52, faceY - faceR * 0.55, faceR * 0.085);
        knGrad.addColorStop(0, _skinLighter(color, 15)); knGrad.addColorStop(1, _skinDarker(color, 40));
        ctx.fillStyle = knGrad;
        ctx.beginPath(); ctx.ellipse(cx + s * faceR * 0.52, faceY - faceR * 0.55, faceR * 0.08, faceR * 0.06, s * 0.3, 0, Math.PI * 2); ctx.fill();
      });
      // テールのストランド
      if (detail) {
        ctx.strokeStyle = darker; ctx.globalAlpha = 0.12; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
        [-1, 1].forEach(function(s) {
          for (var ti = 0; ti < 5; ti++) {
            var tOff = (ti - 2) * faceR * 0.022;
            ctx.beginPath();
            ctx.moveTo(cx + s * faceR * 0.54 + tOff, faceY - faceR * 0.5);
            ctx.bezierCurveTo(cx + s * faceR * 0.88 + tOff, faceY - faceR * 0.08, cx + s * faceR * 0.82 + tOff, faceY + faceR * 0.4, cx + s * faceR * 0.65 + tOff, faceY + faceR * 0.82);
            ctx.stroke();
          }
        });
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      break;
    case 11: // ウェーブ - ボリューミーなウェーブサイド
      ctx.save();
      [-1, 1].forEach(function(s) {
        var wGrad = ctx.createLinearGradient(cx + s * faceR * 0.6, faceY - faceR * 0.55, cx + s * faceR * 0.95, faceY + faceR * 0.85);
        wGrad.addColorStop(0, darker); wGrad.addColorStop(0.2, color); wGrad.addColorStop(0.45, lighter); wGrad.addColorStop(0.7, color); wGrad.addColorStop(1, darker);
        ctx.fillStyle = wGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.7, faceY - faceR * 0.52);
        // 第1ウェーブ（外へ膨らむ）
        ctx.bezierCurveTo(cx + s * faceR * 1.05, faceY - faceR * 0.25, cx + s * faceR * 0.88, faceY + faceR * 0.05, cx + s * faceR * 1.02, faceY + faceR * 0.25);
        // 第2ウェーブ（内へ絞ってまた外へ）
        ctx.bezierCurveTo(cx + s * faceR * 1.1, faceY + faceR * 0.42, cx + s * faceR * 0.9, faceY + faceR * 0.55, cx + s * faceR * 1.0, faceY + faceR * 0.68);
        // 毛先（ふんわりと終わる）
        ctx.bezierCurveTo(cx + s * faceR * 0.95, faceY + faceR * 0.82, cx + s * faceR * 0.78, faceY + faceR * 0.85, cx + s * faceR * 0.68, faceY + faceR * 0.78);
        // 内側ライン
        ctx.bezierCurveTo(cx + s * faceR * 0.6, faceY + faceR * 0.6, cx + s * faceR * 0.65, faceY + faceR * 0.35, cx + s * faceR * 0.68, faceY + faceR * 0.15);
        ctx.bezierCurveTo(cx + s * faceR * 0.72, faceY - faceR * 0.05, cx + s * faceR * 0.6, faceY - faceR * 0.25, cx + s * faceR * 0.62, faceY - faceR * 0.42);
        ctx.closePath(); ctx.fill();
      });
      if (detail) {
        ctx.strokeStyle = darker; ctx.globalAlpha = 0.1; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
        [-1, 1].forEach(function(s) {
          for (var wi = 0; wi < 5; wi++) {
            var wOff = (wi - 2) * faceR * 0.022;
            ctx.beginPath();
            ctx.moveTo(cx + s * faceR * 0.72 + wOff, faceY - faceR * 0.45);
            ctx.bezierCurveTo(cx + s * faceR * 1.0 + wOff, faceY - faceR * 0.08, cx + s * faceR * 0.85 + wOff, faceY + faceR * 0.25, cx + s * faceR * 0.95 + wOff, faceY + faceR * 0.55);
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
    case 13: // ハーフアップ - 上半分をまとめ、下半分は自然に流す
      ctx.save();
      // 下ろした部分のサイド髪（肩にかかる自然な流れ）
      [-1, 1].forEach(function(s) {
        var haGrad = ctx.createLinearGradient(cx + s * faceR * 0.6, faceY - faceR * 0.35, cx + s * faceR * 0.85, faceY + faceR * 0.65);
        haGrad.addColorStop(0, darker); haGrad.addColorStop(0.3, color); haGrad.addColorStop(0.6, lighter); haGrad.addColorStop(1, color);
        ctx.fillStyle = haGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.7, faceY - faceR * 0.35);
        // ふんわりサイドのカーブ
        ctx.bezierCurveTo(cx + s * faceR * 0.95, faceY - faceR * 0.1, cx + s * faceR * 0.92, faceY + faceR * 0.25, cx + s * faceR * 0.82, faceY + faceR * 0.52);
        // 毛先 — ゆるい内巻き
        ctx.bezierCurveTo(cx + s * faceR * 0.75, faceY + faceR * 0.65, cx + s * faceR * 0.62, faceY + faceR * 0.62, cx + s * faceR * 0.55, faceY + faceR * 0.5);
        // 内側を戻る
        ctx.bezierCurveTo(cx + s * faceR * 0.55, faceY + faceR * 0.3, cx + s * faceR * 0.6, faceY + faceR * 0.02, cx + s * faceR * 0.63, faceY - faceR * 0.2);
        ctx.closePath(); ctx.fill();
      });
      // 後ろの留めた部分（クリップ／バレッタ）
      var clipGrad = ctx.createRadialGradient(cx, faceY - faceR * 0.88, faceR * 0.02, cx, faceY - faceR * 0.88, faceR * 0.08);
      clipGrad.addColorStop(0, '#ffe0a0'); clipGrad.addColorStop(1, '#e8a030');
      ctx.fillStyle = clipGrad;
      ctx.beginPath(); ctx.ellipse(cx, faceY - faceR * 0.88, faceR * 0.08, faceR * 0.055, 0, 0, Math.PI * 2); ctx.fill();
      // まとめた部分の膨らみ（後頭部）
      ctx.fillStyle = _hairBackGrad(cx, faceY - faceR * 0.7, faceR * 0.35);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.28, faceY - faceR * 0.85);
      ctx.bezierCurveTo(cx - faceR * 0.05, faceY - faceR * 1.0, cx + faceR * 0.25, faceY - faceR * 0.95, cx + faceR * 0.3, faceY - faceR * 0.7);
      ctx.bezierCurveTo(cx + faceR * 0.22, faceY - faceR * 0.55, cx - faceR * 0.15, faceY - faceR * 0.55, cx - faceR * 0.28, faceY - faceR * 0.85);
      ctx.closePath(); ctx.fill();
      if (detail) {
        ctx.strokeStyle = darker; ctx.globalAlpha = 0.1; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
        [-1, 1].forEach(function(s) {
          for (var hi = 0; hi < 4; hi++) {
            var hOff = (hi - 1.5) * faceR * 0.022;
            ctx.beginPath();
            ctx.moveTo(cx + s * faceR * 0.72 + hOff, faceY - faceR * 0.28);
            ctx.bezierCurveTo(cx + s * faceR * 0.9 + hOff, faceY + faceR * 0.05, cx + s * faceR * 0.85 + hOff, faceY + faceR * 0.35, cx + s * faceR * 0.65 + hOff, faceY + faceR * 0.55);
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
    case 16: // 外ハネ - ミディアム長、毛先が元気に外ハネ
      ctx.save();
      [-1, 1].forEach(function(s) {
        var ohGrad = ctx.createLinearGradient(cx + s * faceR * 0.6, faceY - faceR * 0.55, cx + s * faceR * 0.95, faceY + faceR * 0.55);
        ohGrad.addColorStop(0, darker); ohGrad.addColorStop(0.3, color); ohGrad.addColorStop(0.65, lighter); ohGrad.addColorStop(1, color);
        ctx.fillStyle = ohGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.72, faceY - faceR * 0.52);
        // サイドの自然なカーブ
        ctx.bezierCurveTo(cx + s * faceR * 1.0, faceY - faceR * 0.22, cx + s * faceR * 0.95, faceY + faceR * 0.08, cx + s * faceR * 0.82, faceY + faceR * 0.3);
        // 外ハネ（毛先が勢いよく外側へ跳ねる）
        ctx.bezierCurveTo(cx + s * faceR * 0.85, faceY + faceR * 0.42, cx + s * faceR * 0.95, faceY + faceR * 0.52, cx + s * faceR * 1.02, faceY + faceR * 0.45);
        // ハネの先端から戻る
        ctx.bezierCurveTo(cx + s * faceR * 1.0, faceY + faceR * 0.38, cx + s * faceR * 0.88, faceY + faceR * 0.28, cx + s * faceR * 0.78, faceY + faceR * 0.18);
        // 内側を戻る
        ctx.bezierCurveTo(cx + s * faceR * 0.68, faceY + faceR * 0.05, cx + s * faceR * 0.62, faceY - faceR * 0.15, cx + s * faceR * 0.62, faceY - faceR * 0.35);
        ctx.bezierCurveTo(cx + s * faceR * 0.63, faceY - faceR * 0.45, cx + s * faceR * 0.67, faceY - faceR * 0.5, cx + s * faceR * 0.72, faceY - faceR * 0.52);
        ctx.closePath(); ctx.fill();
      });
      if (detail) {
        ctx.strokeStyle = darker; ctx.globalAlpha = 0.1; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
        [-1, 1].forEach(function(s) {
          for (var i = 0; i < 4; i++) {
            var off = (i - 1.5) * faceR * 0.025;
            ctx.beginPath();
            ctx.moveTo(cx + s * faceR * 0.74 + off, faceY - faceR * 0.42);
            ctx.bezierCurveTo(cx + s * faceR * 0.92 + off, faceY - faceR * 0.05, cx + s * faceR * 0.85 + off, faceY + faceR * 0.18, cx + s * faceR * 0.9 + off, faceY + faceR * 0.4);
            ctx.stroke();
          }
        });
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      break;
    case 17: // ベリーショート - 後ろ髪なし
      break;
    case 18: // ゆるふわ - ふわっとボリューミーな後ろ髪
      ctx.save();
      [-1, 1].forEach(function(s) {
        var yfGrad = ctx.createLinearGradient(cx + s * faceR * 0.6, faceY - faceR * 0.55, cx + s * faceR * 1.0, faceY + faceR * 0.75);
        yfGrad.addColorStop(0, darker); yfGrad.addColorStop(0.2, color); yfGrad.addColorStop(0.45, lighter); yfGrad.addColorStop(0.7, color); yfGrad.addColorStop(1, darker);
        ctx.fillStyle = yfGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.72, faceY - faceR * 0.52);
        // ふわっと大きく膨らむシルエット
        ctx.bezierCurveTo(cx + s * faceR * 1.1, faceY - faceR * 0.22, cx + s * faceR * 1.05, faceY + faceR * 0.15, cx + s * faceR * 1.08, faceY + faceR * 0.38);
        // カール感のある中間部
        ctx.bezierCurveTo(cx + s * faceR * 1.05, faceY + faceR * 0.55, cx + s * faceR * 0.92, faceY + faceR * 0.65, cx + s * faceR * 0.98, faceY + faceR * 0.72);
        // 毛先はふわっと軽く
        ctx.bezierCurveTo(cx + s * faceR * 0.92, faceY + faceR * 0.82, cx + s * faceR * 0.75, faceY + faceR * 0.78, cx + s * faceR * 0.65, faceY + faceR * 0.68);
        // 内側を戻る
        ctx.bezierCurveTo(cx + s * faceR * 0.58, faceY + faceR * 0.45, cx + s * faceR * 0.6, faceY + faceR * 0.1, cx + s * faceR * 0.62, faceY - faceR * 0.15);
        ctx.bezierCurveTo(cx + s * faceR * 0.64, faceY - faceR * 0.38, cx + s * faceR * 0.67, faceY - faceR * 0.48, cx + s * faceR * 0.72, faceY - faceR * 0.52);
        ctx.closePath(); ctx.fill();
      });
      if (detail) {
        ctx.strokeStyle = darker; ctx.globalAlpha = 0.1; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
        [-1, 1].forEach(function(s) {
          for (var i = 0; i < 5; i++) {
            var off = (i - 2) * faceR * 0.025;
            ctx.beginPath();
            ctx.moveTo(cx + s * faceR * 0.74 + off, faceY - faceR * 0.42);
            ctx.bezierCurveTo(cx + s * faceR * 1.02 + off, faceY - faceR * 0.02, cx + s * faceR * 0.95 + off, faceY + faceR * 0.35, cx + s * faceR * 0.78 + off, faceY + faceR * 0.68);
            ctx.stroke();
          }
        });
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      break;
    case 19: // 姫カット - 後ろはストレートロング
      ctx.save();
      [-1, 1].forEach(function(s) {
        var hmGrad = ctx.createLinearGradient(cx + s * faceR * 0.5, faceY - faceR * 0.6, cx + s * faceR * 0.85, faceY + faceR * 1.05);
        hmGrad.addColorStop(0, darker); hmGrad.addColorStop(0.2, color); hmGrad.addColorStop(0.45, lighter); hmGrad.addColorStop(0.7, color); hmGrad.addColorStop(1, darker);
        ctx.fillStyle = hmGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.72, faceY - faceR * 0.58);
        // 後頭部から真っ直ぐ下へ（ストレートロング）
        ctx.bezierCurveTo(cx + s * faceR * 1.02, faceY - faceR * 0.25, cx + s * faceR * 0.98, faceY + faceR * 0.2, cx + s * faceR * 0.9, faceY + faceR * 0.6);
        // 毛先まで真っ直ぐに
        ctx.bezierCurveTo(cx + s * faceR * 0.85, faceY + faceR * 0.82, ctx.canvas ? cx + s * faceR * 0.78 : cx + s * faceR * 0.78, faceY + faceR * 0.95, cx + s * faceR * 0.68, faceY + faceR * 1.0);
        // 毛先（軽やかなストレート）
        ctx.bezierCurveTo(cx + s * faceR * 0.58, faceY + faceR * 0.95, cx + s * faceR * 0.52, faceY + faceR * 0.78, cx + s * faceR * 0.54, faceY + faceR * 0.5);
        // 内側を戻る
        ctx.bezierCurveTo(cx + s * faceR * 0.56, faceY + faceR * 0.15, cx + s * faceR * 0.6, faceY - faceR * 0.15, cx + s * faceR * 0.63, faceY - faceR * 0.35);
        ctx.bezierCurveTo(cx + s * faceR * 0.66, faceY - faceR * 0.48, cx + s * faceR * 0.68, faceY - faceR * 0.55, cx + s * faceR * 0.72, faceY - faceR * 0.58);
        ctx.closePath(); ctx.fill();
      });
      if (detail) {
        ctx.strokeStyle = darker; ctx.globalAlpha = 0.1; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
        [-1, 1].forEach(function(s) {
          for (var i = 0; i < 6; i++) {
            var off = (i - 2.5) * faceR * 0.022;
            ctx.beginPath();
            ctx.moveTo(cx + s * faceR * 0.74 + off, faceY - faceR * 0.48);
            ctx.bezierCurveTo(cx + s * faceR * 0.95 + off, faceY - faceR * 0.02, cx + s * faceR * 0.9 + off, faceY + faceR * 0.5, cx + s * faceR * 0.68 + off, faceY + faceR * 0.92);
            ctx.stroke();
          }
        });
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      break;
    case 20: // オールバック - 後ろ髪なし（短い）
      break;
    case 21: // クレオ — クレオパトラ風、重厚なストレート後ろ髪
      ctx.save();
      [-1, 1].forEach(function(s) {
        var cleoBackGrad = ctx.createLinearGradient(cx + s * faceR * 0.5, faceY - faceR * 0.55, cx + s * faceR * 0.88, faceY + faceR * 0.78);
        cleoBackGrad.addColorStop(0, darker); cleoBackGrad.addColorStop(0.25, color); cleoBackGrad.addColorStop(0.5, lighter); cleoBackGrad.addColorStop(0.75, color); cleoBackGrad.addColorStop(1, darker);
        ctx.fillStyle = cleoBackGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.72, faceY - faceR * 0.52);
        // 重厚なストレートライン
        ctx.bezierCurveTo(cx + s * faceR * 0.98, faceY - faceR * 0.22, cx + s * faceR * 0.95, faceY + faceR * 0.2, cx + s * faceR * 0.9, faceY + faceR * 0.58);
        // 毛先はスパッと水平に切り揃え（クレオパトラの象徴）
        ctx.lineTo(cx + s * faceR * 0.88, faceY + faceR * 0.72);
        ctx.lineTo(cx + s * faceR * 0.52, faceY + faceR * 0.72);
        // 内側を戻る
        ctx.bezierCurveTo(cx + s * faceR * 0.55, faceY + faceR * 0.35, cx + s * faceR * 0.58, faceY - faceR * 0.05, cx + s * faceR * 0.62, faceY - faceR * 0.3);
        ctx.bezierCurveTo(cx + s * faceR * 0.65, faceY - faceR * 0.45, cx + s * faceR * 0.68, faceY - faceR * 0.5, cx + s * faceR * 0.72, faceY - faceR * 0.52);
        ctx.closePath(); ctx.fill();
        // 毛先の水平カットライン（影で強調）
        if (detail) {
          ctx.save();
          ctx.strokeStyle = _skinDarker(color, 40); ctx.globalAlpha = 0.25; ctx.lineWidth = Math.max(0.8, faceR * 0.018);
          ctx.lineCap = 'butt';
          ctx.beginPath();
          ctx.moveTo(cx + s * faceR * 0.54, faceY + faceR * 0.72);
          ctx.lineTo(cx + s * faceR * 0.87, faceY + faceR * 0.72);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.restore();
          // ストランドライン
          ctx.strokeStyle = darker; ctx.globalAlpha = 0.1; ctx.lineWidth = Math.max(0.5, faceR * 0.01);
          for (var ci = 0; ci < 5; ci++) {
            var coff = (ci - 2) * faceR * 0.025;
            ctx.beginPath();
            ctx.moveTo(cx + s * faceR * 0.74 + coff, faceY - faceR * 0.42);
            ctx.bezierCurveTo(cx + s * faceR * 0.92 + coff, faceY - faceR * 0.02, cx + s * faceR * 0.88 + coff, faceY + faceR * 0.35, cx + s * faceR * 0.72 + coff, faceY + faceR * 0.7);
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
      var dotGrad = ctx.createRadialGradient(cx, noseY, 0, cx, noseY, faceR * 0.06);
      dotGrad.addColorStop(0, 'rgba(0,0,0,0.35)');
      dotGrad.addColorStop(0.6, 'rgba(0,0,0,0.18)');
      dotGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = dotGrad;
      ctx.beginPath(); ctx.arc(cx, noseY, faceR * 0.06, 0, Math.PI * 2); ctx.fill();
      // 鼻筋ハイライト
      if (detail) {
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = Math.max(0.5, faceR * 0.02);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, noseY - faceR * 0.1);
        ctx.lineTo(cx, noseY - faceR * 0.02);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath(); ctx.arc(cx, noseY - faceR * 0.01, faceR * 0.016, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 1: // まるい
      // 小鼻の影（両サイド）
      if (detail) {
        [-1, 1].forEach(function(s) {
          var sideGrad = ctx.createRadialGradient(cx + s * faceR * 0.08, noseY + faceR * 0.01, 0, cx + s * faceR * 0.08, noseY + faceR * 0.01, faceR * 0.08);
          sideGrad.addColorStop(0, 'rgba(0,0,0,0.2)');
          sideGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = sideGrad;
          ctx.beginPath(); ctx.arc(cx + s * faceR * 0.08, noseY + faceR * 0.01, faceR * 0.08, 0, Math.PI * 2); ctx.fill();
        });
      }
      // メイン影
      var roundGrad = ctx.createRadialGradient(cx, noseY, faceR * 0.01, cx, noseY, faceR * 0.12);
      roundGrad.addColorStop(0, 'rgba(0,0,0,0.3)');
      roundGrad.addColorStop(0.5, 'rgba(0,0,0,0.18)');
      roundGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = roundGrad;
      ctx.beginPath(); ctx.ellipse(cx, noseY, faceR * 0.12, faceR * 0.09, 0, 0, Math.PI * 2); ctx.fill();
      // 鼻の穴
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.arc(cx - faceR * 0.045, noseY + faceR * 0.03, faceR * 0.02, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + faceR * 0.045, noseY + faceR * 0.03, faceR * 0.02, 0, Math.PI * 2); ctx.fill();
      // 鼻筋ハイライト
      if (detail) {
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = Math.max(0.5, faceR * 0.022);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, noseY - faceR * 0.14);
        ctx.lineTo(cx, noseY - faceR * 0.03);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath(); ctx.arc(cx, noseY - faceR * 0.01, faceR * 0.022, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 2: // たかい
      // 鼻筋の影線（片側）
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = Math.max(0.8, faceR * 0.025);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + faceR * 0.012, noseY - faceR * 0.16);
      ctx.bezierCurveTo(cx + faceR * 0.025, noseY - faceR * 0.06, cx + faceR * 0.03, noseY + faceR * 0.02, cx + faceR * 0.012, noseY + faceR * 0.08);
      ctx.stroke();
      // 小鼻の影（両サイド）
      if (detail) {
        [-1, 1].forEach(function(s) {
          var sGrad = ctx.createRadialGradient(cx + s * faceR * 0.05, noseY + faceR * 0.06, 0, cx + s * faceR * 0.05, noseY + faceR * 0.06, faceR * 0.05);
          sGrad.addColorStop(0, 'rgba(0,0,0,0.18)');
          sGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = sGrad;
          ctx.beginPath(); ctx.arc(cx + s * faceR * 0.05, noseY + faceR * 0.06, faceR * 0.05, 0, Math.PI * 2); ctx.fill();
        });
      }
      // 鼻筋ハイライト（中央の白い縦線）
      if (detail) {
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = Math.max(0.8, faceR * 0.02);
        ctx.beginPath();
        ctx.moveTo(cx - faceR * 0.005, noseY - faceR * 0.14);
        ctx.lineTo(cx - faceR * 0.005, noseY + faceR * 0.05);
        ctx.stroke();
      }
      // 鼻先の丸みハイライト
      var tipGrad = ctx.createRadialGradient(cx, noseY + faceR * 0.07, 0, cx, noseY + faceR * 0.07, faceR * 0.05);
      tipGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
      tipGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = tipGrad;
      ctx.beginPath(); ctx.arc(cx, noseY + faceR * 0.07, faceR * 0.05, 0, Math.PI * 2); ctx.fill();
      break;
    case 4: // だんご鼻 — round bulbous nose
      var dangoGrad = ctx.createRadialGradient(cx, noseY, faceR * 0.02, cx, noseY, faceR * 0.13);
      dangoGrad.addColorStop(0, 'rgba(0,0,0,0.22)');
      dangoGrad.addColorStop(0.5, 'rgba(0,0,0,0.14)');
      dangoGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = dangoGrad;
      ctx.beginPath(); ctx.ellipse(cx, noseY, faceR * 0.13, faceR * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      // 左右の膨らみ
      [-1, 1].forEach(function(s) {
        var bulgeGrad = ctx.createRadialGradient(cx + s * faceR * 0.07, noseY + faceR * 0.02, 0, cx + s * faceR * 0.07, noseY + faceR * 0.02, faceR * 0.07);
        bulgeGrad.addColorStop(0, 'rgba(0,0,0,0.15)');
        bulgeGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bulgeGrad;
        ctx.beginPath(); ctx.arc(cx + s * faceR * 0.07, noseY + faceR * 0.02, faceR * 0.07, 0, Math.PI * 2); ctx.fill();
      });
      // 鼻の穴
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.arc(cx - faceR * 0.045, noseY + faceR * 0.04, faceR * 0.02, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + faceR * 0.045, noseY + faceR * 0.04, faceR * 0.02, 0, Math.PI * 2); ctx.fill();
      // ハイライト
      if (detail) {
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath(); ctx.arc(cx, noseY - faceR * 0.02, faceR * 0.025, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 5: // すじ鼻 — long straight nose bridge
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = Math.max(0.5, faceR * 0.018);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + faceR * 0.008, noseY - faceR * 0.16);
      ctx.lineTo(cx + faceR * 0.008, noseY + faceR * 0.06);
      ctx.stroke();
      // 鼻先の小さな影
      var sujiGrad = ctx.createRadialGradient(cx, noseY + faceR * 0.06, 0, cx, noseY + faceR * 0.06, faceR * 0.04);
      sujiGrad.addColorStop(0, 'rgba(0,0,0,0.15)');
      sujiGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sujiGrad;
      ctx.beginPath(); ctx.arc(cx, noseY + faceR * 0.06, faceR * 0.04, 0, Math.PI * 2); ctx.fill();
      // ハイライト（鼻筋の白線）
      if (detail) {
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = Math.max(0.5, faceR * 0.012);
        ctx.beginPath();
        ctx.moveTo(cx - faceR * 0.005, noseY - faceR * 0.14);
        ctx.lineTo(cx - faceR * 0.005, noseY + faceR * 0.04);
        ctx.stroke();
      }
      break;
    case 6: // にんにく鼻 — garlic-shaped, wide nostrils
      var ninnikuGrad = ctx.createRadialGradient(cx, noseY, faceR * 0.01, cx, noseY, faceR * 0.15);
      ninnikuGrad.addColorStop(0, 'rgba(0,0,0,0.2)');
      ninnikuGrad.addColorStop(0.6, 'rgba(0,0,0,0.1)');
      ninnikuGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ninnikuGrad;
      ctx.beginPath(); ctx.ellipse(cx, noseY, faceR * 0.15, faceR * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      // 左右の大きな膨らみ（にんにくの房）
      [-1, 1].forEach(function(s) {
        var nGrad = ctx.createRadialGradient(cx + s * faceR * 0.09, noseY + faceR * 0.01, 0, cx + s * faceR * 0.09, noseY + faceR * 0.01, faceR * 0.09);
        nGrad.addColorStop(0, 'rgba(0,0,0,0.18)');
        nGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = nGrad;
        ctx.beginPath(); ctx.arc(cx + s * faceR * 0.09, noseY + faceR * 0.01, faceR * 0.09, 0, Math.PI * 2); ctx.fill();
      });
      // 大きめの鼻の穴
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.ellipse(cx - faceR * 0.05, noseY + faceR * 0.04, faceR * 0.025, faceR * 0.018, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + faceR * 0.05, noseY + faceR * 0.04, faceR * 0.025, faceR * 0.018, 0, 0, Math.PI * 2); ctx.fill();
      // 鼻筋ハイライト
      if (detail) {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath(); ctx.arc(cx, noseY - faceR * 0.02, faceR * 0.02, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 7: // わし鼻 — aquiline/hook nose with curved bridge
      // 鼻筋の曲線（鉤状）
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = Math.max(0.5, faceR * 0.022);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + faceR * 0.01, noseY - faceR * 0.14);
      ctx.bezierCurveTo(cx + faceR * 0.04, noseY - faceR * 0.06, cx + faceR * 0.05, noseY + faceR * 0.02, cx + faceR * 0.02, noseY + faceR * 0.07);
      ctx.stroke();
      // 鼻先の突出（鉤部分の影）
      var washiGrad = ctx.createRadialGradient(cx + faceR * 0.02, noseY + faceR * 0.04, 0, cx + faceR * 0.02, noseY + faceR * 0.04, faceR * 0.06);
      washiGrad.addColorStop(0, 'rgba(0,0,0,0.18)');
      washiGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = washiGrad;
      ctx.beginPath(); ctx.ellipse(cx + faceR * 0.01, noseY + faceR * 0.05, faceR * 0.06, faceR * 0.04, 0, 0, Math.PI * 2); ctx.fill();
      // 小鼻の影
      if (detail) {
        [-1, 1].forEach(function(s) {
          var wsGrad = ctx.createRadialGradient(cx + s * faceR * 0.04, noseY + faceR * 0.06, 0, cx + s * faceR * 0.04, noseY + faceR * 0.06, faceR * 0.035);
          wsGrad.addColorStop(0, 'rgba(0,0,0,0.1)');
          wsGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = wsGrad;
          ctx.beginPath(); ctx.arc(cx + s * faceR * 0.04, noseY + faceR * 0.06, faceR * 0.035, 0, Math.PI * 2); ctx.fill();
        });
        // ハイライト
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = Math.max(0.5, faceR * 0.012);
        ctx.beginPath();
        ctx.moveTo(cx - faceR * 0.005, noseY - faceR * 0.12);
        ctx.lineTo(cx - faceR * 0.005, noseY);
        ctx.stroke();
      }
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
    case 4: // 口ひげ — handlebar mustache
      ctx.lineWidth = faceR * 0.045; ctx.lineCap = 'round';
      // 左側（大きめのカール）
      ctx.beginPath(); ctx.moveTo(cx - faceR * 0.02, mouthY - faceR * 0.07);
      ctx.bezierCurveTo(cx - faceR * 0.1, mouthY - faceR * 0.14, cx - faceR * 0.22, mouthY - faceR * 0.12, cx - faceR * 0.28, mouthY - faceR * 0.04);
      ctx.stroke();
      // 右側
      ctx.beginPath(); ctx.moveTo(cx + faceR * 0.02, mouthY - faceR * 0.07);
      ctx.bezierCurveTo(cx + faceR * 0.1, mouthY - faceR * 0.14, cx + faceR * 0.22, mouthY - faceR * 0.12, cx + faceR * 0.28, mouthY - faceR * 0.04);
      ctx.stroke();
      // 中央の厚み
      ctx.beginPath(); ctx.ellipse(cx, mouthY - faceR * 0.07, faceR * 0.05, faceR * 0.025, 0, 0, Math.PI * 2); ctx.fill();
      _drawBeardHairs(cx - faceR * 0.15, mouthY - faceR * 0.1, faceR * 0.25, faceR * 0.08, 20);
      _drawBeardHairs(cx + faceR * 0.15, mouthY - faceR * 0.1, faceR * 0.25, faceR * 0.08, 20);
      break;
    case 5: // もみあげ — sideburns only
      [-1, 1].forEach(function(s) {
        var sideGrad = ctx.createLinearGradient(cx + s * faceR * 0.65, mouthY - faceR * 0.4, cx + s * faceR * 0.65, mouthY + faceR * 0.15);
        sideGrad.addColorStop(0, beardColor);
        sideGrad.addColorStop(1, _skinDarker(beardColor, 15));
        ctx.fillStyle = sideGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.72, mouthY - faceR * 0.45);
        ctx.quadraticCurveTo(cx + s * faceR * 0.78, mouthY - faceR * 0.1, cx + s * faceR * 0.7, mouthY + faceR * 0.15);
        ctx.lineTo(cx + s * faceR * 0.58, mouthY + faceR * 0.1);
        ctx.quadraticCurveTo(cx + s * faceR * 0.62, mouthY - faceR * 0.1, cx + s * faceR * 0.6, mouthY - faceR * 0.45);
        ctx.closePath(); ctx.fill();
        _drawBeardHairs(cx + s * faceR * 0.66, mouthY - faceR * 0.15, faceR * 0.14, faceR * 0.5, 25);
      });
      break;
    case 6: // 無精ひげ — stubble dots
      if (detail) {
        ctx.fillStyle = _skinDarker(beardColor, 10);
        ctx.globalAlpha = 0.3;
        for (var si = 0; si < 60; si++) {
          var sx = cx + (Math.random() - 0.5) * faceR * 0.7;
          var sy = mouthY + faceR * 0.05 + Math.random() * faceR * 0.3;
          var sr = faceR * (0.005 + Math.random() * 0.008);
          ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
        }
        // 口周り
        for (var si2 = 0; si2 < 20; si2++) {
          var sx2 = cx + (Math.random() - 0.5) * faceR * 0.35;
          var sy2 = mouthY - faceR * 0.08 + Math.random() * faceR * 0.12;
          var sr2 = faceR * (0.004 + Math.random() * 0.006);
          ctx.beginPath(); ctx.arc(sx2, sy2, sr2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      break;
    case 7: // やぎひげ — goatee
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.1, mouthY + faceR * 0.1);
      ctx.quadraticCurveTo(cx - faceR * 0.12, mouthY + faceR * 0.28, cx, mouthY + faceR * 0.35);
      ctx.quadraticCurveTo(cx + faceR * 0.12, mouthY + faceR * 0.28, cx + faceR * 0.1, mouthY + faceR * 0.1);
      ctx.closePath(); ctx.fill();
      _drawBeardHairs(cx, mouthY + faceR * 0.22, faceR * 0.18, faceR * 0.2, 20);
      break;
  }
}

// アイシャドウ描画
function drawEyeshadow(ctx, cx, eyeY, eyeSpacing, eyeSize, faceR, shadowType) {
  if (shadowType <= 0 || !AB_EYESHADOW_COLORS[shadowType]) return;
  var baseColor = AB_EYESHADOW_COLORS[shadowType];
  var lx = cx - eyeSpacing, rx = cx + eyeSpacing;
  var eW = eyeSize * 3.5, eH = eyeSize * 3.0;
  ctx.save();
  [lx, rx].forEach(function(ex) {
    // 第1層：広い淡いぼかし（アイホール全体）
    var sg1 = ctx.createRadialGradient(ex, eyeY - eH * 0.35, eW * 0.15, ex, eyeY - eH * 0.2, eW * 1.5);
    sg1.addColorStop(0, baseColor);
    sg1.addColorStop(0.5, baseColor.replace(/[\d.]+\)$/, function(m) { return (parseFloat(m) * 0.5) + ')'; }));
    sg1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg1;
    ctx.beginPath(); ctx.ellipse(ex, eyeY - eH * 0.25, eW * 1.4, eH * 1.0, 0, Math.PI, 2 * Math.PI); ctx.fill();
    // 第2層：中間の発色（まぶた上）
    var sg2 = ctx.createRadialGradient(ex, eyeY - eH * 0.2, eW * 0.1, ex, eyeY - eH * 0.15, eW * 1.0);
    sg2.addColorStop(0, baseColor.replace(/[\d.]+\)$/, function(m) { return Math.min(1, parseFloat(m) * 1.3) + ')'; }));
    sg2.addColorStop(0.6, baseColor.replace(/[\d.]+\)$/, function(m) { return (parseFloat(m) * 0.6) + ')'; }));
    sg2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg2;
    ctx.beginPath(); ctx.ellipse(ex, eyeY - eH * 0.18, eW * 1.0, eH * 0.65, 0, Math.PI, 2 * Math.PI); ctx.fill();
    // 第3層：まぶた際の濃いアクセント
    var sg3 = ctx.createLinearGradient(ex, eyeY, ex, eyeY - eH * 0.6);
    sg3.addColorStop(0, baseColor.replace(/[\d.]+\)$/, function(m) { return Math.min(1, parseFloat(m) * 1.5) + ')'; }));
    sg3.addColorStop(0.3, baseColor.replace(/[\d.]+\)$/, function(m) { return (parseFloat(m) * 0.8) + ')'; }));
    sg3.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg3;
    ctx.beginPath(); ctx.ellipse(ex, eyeY - eH * 0.08, eW * 0.85, eH * 0.4, 0, Math.PI, 2 * Math.PI); ctx.fill();
  });
  ctx.restore();
}

function drawCheeks(ctx, cx, eyeY, eyeSpacing, faceR, type, colorIdx, spacingVal) {
  if (type === 0) return;
  var cheekY = eyeY + faceR * 0.2;
  var spacingOff = (spacingVal || 0) * faceR * 0.06;
  var cheekX = eyeSpacing + faceR * 0.08 + spacingOff;
  var cheekR = faceR * 0.16;
  var baseRgba = AB_CHEEK_COLORS[colorIdx || 0] || AB_CHEEK_COLORS[0];
  ctx.save();

  if (type === 3) {
    // バカボン — ナルト渦巻きのみ（色なし）
    var bR = cheekR * 1.2;
    [cx - cheekX, cx + cheekX].forEach(function(x, si) {
      ctx.strokeStyle = 'rgba(80,50,30,0.5)';
      ctx.lineWidth = Math.max(1.5, faceR * 0.025);
      ctx.lineCap = 'round';
      ctx.beginPath();
      var dir = si === 0 ? 1 : -1;
      for (var t = 0; t < Math.PI * 5; t += 0.08) {
        var sr = faceR * 0.01 + t * bR * 0.1;
        var sx = x + Math.cos(t * dir) * sr;
        var sy = cheekY + Math.sin(t * dir) * sr;
        if (t === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        if (sr > bR * 0.9) break;
      }
      ctx.stroke();
    });
  } else {
    // うすく / しっかり
    var alpha = type === 1 ? 0.3 : 0.5;
    [cx - cheekX, cx + cheekX].forEach(function(x) {
      var cg = ctx.createRadialGradient(x, cheekY, 0, x, cheekY, cheekR);
      cg.addColorStop(0, baseRgba + alpha + ')');
      cg.addColorStop(0.3, baseRgba + (alpha * 0.7) + ')');
      cg.addColorStop(0.6, baseRgba + (alpha * 0.3) + ')');
      cg.addColorStop(1, baseRgba + '0)');
      ctx.fillStyle = cg;
      ctx.shadowColor = baseRgba + (alpha * 0.3) + ')';
      ctx.shadowBlur = cheekR * 1.2;
      ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      ctx.beginPath(); ctx.ellipse(x, cheekY, cheekR, cheekR * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      var cg2 = ctx.createRadialGradient(x, cheekY, 0, x, cheekY, cheekR * 1.4);
      cg2.addColorStop(0, baseRgba + (alpha * 0.4) + ')');
      cg2.addColorStop(0.5, baseRgba + (alpha * 0.15) + ')');
      cg2.addColorStop(1, baseRgba + '0)');
      ctx.fillStyle = cg2;
      ctx.beginPath(); ctx.ellipse(x, cheekY, cheekR * 1.4, cheekR * 1.0, 0, 0, Math.PI * 2); ctx.fill();
    });
  }
  ctx.restore();
}

function _drawRealisticEye(ctx, ex, ey, sz, faceR, eyeColor, scaleX, scaleY, lidDroop, lashType) {
  lashType = lashType || 0;
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

  // 上まつ毛（lashTypeで本数・長さ・太さを変化）
  if (detail) {
    ctx.save();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineCap = 'round';
    var lashCount = [5, 7, 9][lashType] || 5;
    var lashLenMul = [1.0, 1.4, 1.2][lashType] || 1.0;
    var lashWidthMul = [1.0, 1.0, 1.6][lashType] || 1.0;
    for (var li = 0; li < lashCount; li++) {
      var lt = (li + 0.5) / lashCount;
      var lashX = ex - eW * 1.05 + lt * eW * 2.1;
      var cpY = ey - eH * 1.2;
      var lashY = (1-lt)*(1-lt)*(ey + lidDroop * sz * 0.8) + 2*(1-lt)*lt*cpY + lt*lt*(ey - lidDroop * sz * 0.8);
      var lashAngle = -Math.PI * 0.5 + (lt - 0.5) * Math.PI * 0.5;
      var lashLen = sz * (0.5 + Math.sin(lt * Math.PI) * 0.4) * lashLenMul;
      ctx.lineWidth = Math.max(0.5, sz * 0.1 * (1 + Math.sin(lt * Math.PI) * 0.5) * lashWidthMul);
      ctx.beginPath();
      ctx.moveTo(lashX, lashY);
      var endX = lashX + Math.cos(lashAngle) * lashLen;
      var endY = lashY + Math.sin(lashAngle) * lashLen;
      var cpX = lashX + Math.cos(lashAngle + 0.3) * lashLen * 0.6;
      var cpLY = lashY + Math.sin(lashAngle + 0.3) * lashLen * 0.6;
      ctx.quadraticCurveTo(cpX, cpLY, endX, endY);
      ctx.stroke();
    }
    // 下まつ毛（lashType 1,2で追加）
    var downCount = [2, 3, 4][lashType] || 2;
    ctx.strokeStyle = 'rgba(30,30,30,' + (lashType >= 2 ? '0.3' : '0.2') + ')';
    ctx.lineWidth = Math.max(0.3, sz * 0.06 * lashWidthMul);
    for (var di = 0; di < downCount; di++) {
      var dt = 0.25 + di * (0.5 / downCount);
      var dlx = ex - eW * 0.6 + dt * eW * 1.2;
      var dly = ey + eH * 0.75;
      var dlLen = sz * 0.25 * lashLenMul;
      ctx.beginPath();
      ctx.moveTo(dlx, dly);
      ctx.quadraticCurveTo(dlx + (dt - 0.5) * sz * 0.15, dly + dlLen * 0.6, dlx + (dt - 0.5) * sz * 0.25, dly + dlLen);
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

function _drawClosedEye(ctx, ex, ey, sz, faceR, lashType) {
  lashType = lashType || 0;
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

function drawEyes(ctx, cx, eyeY, spacing, sz, type, faceR, eyeColor, lashType) {
  var lx = cx - spacing, rx = cx + spacing;
  if (!eyeColor) eyeColor = AB_EYE_COLORS[0];
  lashType = lashType || 0;
  var detail = faceR >= 20;
  ctx.save();
  switch(type) {
    case 0:
      _drawRealisticEye(ctx, lx, eyeY, sz, faceR, eyeColor, 1, 1, 0, lashType);
      _drawRealisticEye(ctx, rx, eyeY, sz, faceR, eyeColor, 1, 1, 0, lashType);
      break;
    case 1:
      _drawRealisticEye(ctx, lx, eyeY, sz, faceR, eyeColor, 1.2, 0.6, 0, lashType);
      _drawRealisticEye(ctx, rx, eyeY, sz, faceR, eyeColor, 1.2, 0.6, 0, lashType);
      break;
    case 2:
      _drawRealisticEye(ctx, lx, eyeY, sz, faceR, eyeColor, 1.3, 1.3, 0, lashType);
      _drawRealisticEye(ctx, rx, eyeY, sz, faceR, eyeColor, 1.3, 1.3, 0, lashType);
      break;
    case 3:
      _drawRealisticEye(ctx, lx, eyeY, sz, faceR, eyeColor, 1, 1, 0, lashType);
      _drawClosedEye(ctx, rx, eyeY, sz, faceR, lashType);
      break;
    case 4:
      _drawClosedEye(ctx, lx, eyeY, sz, faceR, lashType);
      _drawClosedEye(ctx, rx, eyeY, sz, faceR, lashType);
      break;
    case 5:
      _drawRealisticEye(ctx, lx, eyeY, sz, faceR, eyeColor, 1, 1, 0.6, lashType);
      _drawRealisticEye(ctx, rx, eyeY, sz, faceR, eyeColor, 1, 1, 0.6, lashType);
      break;
    case 6: // つり目
      _drawRealisticEye(ctx, lx, eyeY, sz, faceR, eyeColor, 1.1, 0.9, -0.7, lashType);
      _drawRealisticEye(ctx, rx, eyeY, sz, faceR, eyeColor, 1.1, 0.9, -0.7, lashType);
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
    case 9: // ぱっちり — large bright eyes with double eyelid
      _drawRealisticEye(ctx, lx, eyeY, sz, faceR, eyeColor, 1.4, 1.4, 0, lashType);
      _drawRealisticEye(ctx, rx, eyeY, sz, faceR, eyeColor, 1.4, 1.4, 0, lashType);
      // 強調された二重ライン
      if (detail) {
        var eW9 = sz * 2.2 * 1.4, eH9 = sz * 1.6 * 1.4;
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = Math.max(0.5, sz * 0.12);
        ctx.lineCap = 'round';
        [lx, rx].forEach(function(ex) {
          ctx.beginPath();
          ctx.moveTo(ex - eW9 * 0.9, eyeY - eH9 * 0.7);
          ctx.quadraticCurveTo(ex, eyeY - eH9 * 1.4, ex + eW9 * 0.9, eyeY - eH9 * 0.7);
          ctx.stroke();
        });
      }
      break;
    case 10: // ネコ目 — cat eyes, narrow and tilted
      _drawRealisticEye(ctx, lx, eyeY, sz, faceR, eyeColor, 1.3, 0.7, -0.5, lashType);
      _drawRealisticEye(ctx, rx, eyeY, sz, faceR, eyeColor, 1.3, 0.7, -0.5, lashType);
      break;
    case 11: // 三白眼 — sanpaku eyes, iris high showing white below
      var eW11 = sz * 2.2, eH11 = sz * 1.6;
      var iR11 = sz * 1.1, pR11 = iR11 * 0.45;
      [lx, rx].forEach(function(ex) {
        // 白目
        ctx.fillStyle = '#FAFAFA';
        ctx.beginPath(); ctx.ellipse(ex, eyeY, eW11, eH11, 0, 0, Math.PI * 2); ctx.fill();
        // 虹彩（上寄り配置）
        var irisY = eyeY - sz * 0.35;
        ctx.save();
        ctx.beginPath(); ctx.arc(ex, irisY, iR11, 0, Math.PI * 2); ctx.clip();
        var ig11 = ctx.createRadialGradient(ex, irisY, pR11 * 0.3, ex, irisY, iR11);
        ig11.addColorStop(0, _skinLighter(eyeColor, 45));
        ig11.addColorStop(0.4, eyeColor);
        ig11.addColorStop(1, _skinDarker(eyeColor, 40));
        ctx.fillStyle = ig11;
        ctx.beginPath(); ctx.arc(ex, irisY, iR11, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // 虹彩外縁
        ctx.strokeStyle = _skinDarker(eyeColor, 55);
        ctx.lineWidth = Math.max(0.5, sz * 0.08);
        ctx.beginPath(); ctx.arc(ex, irisY, iR11, 0, Math.PI * 2); ctx.stroke();
        // 瞳孔
        ctx.fillStyle = '#080808';
        ctx.beginPath(); ctx.arc(ex, irisY, pR11, 0, Math.PI * 2); ctx.fill();
        // ハイライト
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath(); ctx.ellipse(ex + iR11 * 0.3, irisY - iR11 * 0.25, iR11 * 0.22, iR11 * 0.16, -0.3, 0, Math.PI * 2); ctx.fill();
        // まぶたライン
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = Math.max(0.8, sz * 0.2);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex - eW11 * 1.05, eyeY);
        ctx.quadraticCurveTo(ex, eyeY - eH11 * 1.1, ex + eW11 * 1.05, eyeY);
        ctx.stroke();
      });
      break;
    case 12: // 笑い目 — smiling crescent eyes
      var eW12 = sz * 2.2;
      [lx, rx].forEach(function(ex) {
        // 上向きの三日月（笑い目）
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = Math.max(1, sz * 0.3);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex - eW12 * 0.9, eyeY + sz * 0.15);
        ctx.quadraticCurveTo(ex, eyeY - sz * 0.6, ex + eW12 * 0.9, eyeY + sz * 0.15);
        ctx.stroke();
        // まつ毛
        if (detail && lashType > 0) {
          ctx.strokeStyle = '#1a1a1a';
          ctx.lineWidth = Math.max(0.5, sz * 0.1);
          for (var l12 = 0; l12 < 3; l12++) {
            var t12 = (l12 + 1) / 4;
            var lx12 = ex - eW12 * 0.9 + t12 * eW12 * 1.8;
            var ly12 = eyeY + sz * 0.15 - Math.sin(t12 * Math.PI) * sz * 0.75;
            ctx.beginPath();
            ctx.moveTo(lx12, ly12);
            ctx.lineTo(lx12, ly12 - sz * 0.25);
            ctx.stroke();
          }
        }
      });
      break;
    case 13: // 涙目 — teary eyes with tear drop
      _drawRealisticEye(ctx, lx, eyeY, sz, faceR, eyeColor, 1.1, 1.1, 0.3, lashType);
      _drawRealisticEye(ctx, rx, eyeY, sz, faceR, eyeColor, 1.1, 1.1, 0.3, lashType);
      // 涙（右目の下に小さなしずく）
      var tearX = rx + sz * 0.3;
      var tearY = eyeY + sz * 1.8;
      ctx.fillStyle = 'rgba(120,180,255,0.45)';
      ctx.beginPath();
      ctx.moveTo(tearX, tearY - sz * 0.3);
      ctx.quadraticCurveTo(tearX + sz * 0.2, tearY, tearX, tearY + sz * 0.15);
      ctx.quadraticCurveTo(tearX - sz * 0.2, tearY, tearX, tearY - sz * 0.3);
      ctx.closePath(); ctx.fill();
      // 涙のハイライト
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.arc(tearX + sz * 0.05, tearY - sz * 0.08, sz * 0.06, 0, Math.PI * 2); ctx.fill();
      break;
  }
  ctx.restore();
}

function drawMouth(ctx, cx, my, faceR, type, lipColorIdx) {
  var mw = faceR * 0.32;
  var baseLip = AB_LIP_COLORS[lipColorIdx || 0] || AB_LIP_COLORS[0];
  var lipTop = baseLip;
  var lipBot = _skinLighter(baseLip, 25);
  var lipDark = _skinDarker(baseLip, 40);
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
    case 7: // アヒル口 — ぷっくり突き出した唇
      // 上唇（大きくぷっくり）
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.5, my);
      ctx.bezierCurveTo(cx - mw * 0.3, my - mw * 0.25, cx - mw * 0.08, my - mw * 0.3, cx, my - mw * 0.18);
      ctx.bezierCurveTo(cx + mw * 0.08, my - mw * 0.3, cx + mw * 0.3, my - mw * 0.25, cx + mw * 0.5, my);
      var ahiruTopGrad = ctx.createLinearGradient(cx, my - mw * 0.3, cx, my);
      ahiruTopGrad.addColorStop(0, lipTop); ahiruTopGrad.addColorStop(1, lipDark);
      ctx.fillStyle = ahiruTopGrad; ctx.fill();
      // 下唇（さらにぷっくり）
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.5, my + mw * 0.02);
      ctx.bezierCurveTo(cx - mw * 0.25, my + mw * 0.4, cx + mw * 0.25, my + mw * 0.4, cx + mw * 0.5, my + mw * 0.02);
      var ahiruBotGrad = ctx.createLinearGradient(cx, my, cx, my + mw * 0.4);
      ahiruBotGrad.addColorStop(0, lipBot); ahiruBotGrad.addColorStop(0.6, _skinLighter(lipBot, 15)); ahiruBotGrad.addColorStop(1, lipDark);
      ctx.fillStyle = ahiruBotGrad; ctx.fill();
      _drawLipHighlight(my + mw * 0.18, mw * 0.8);
      // 口の線
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.48, my + mw * 0.01);
      ctx.bezierCurveTo(cx - mw * 0.15, my + mw * 0.08, cx + mw * 0.15, my + mw * 0.08, cx + mw * 0.48, my + mw * 0.01);
      ctx.strokeStyle = lipDark; ctx.lineWidth = faceR * 0.02; ctx.stroke();
      _drawCornerShadow(cx - mw * 0.52, my + mw * 0.02);
      _drawCornerShadow(cx + mw * 0.52, my + mw * 0.02);
      break;
    case 8: // への字 — 不満げな下がり口
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.55, my - mw * 0.12);
      ctx.bezierCurveTo(cx - mw * 0.2, my - mw * 0.05, cx + mw * 0.1, my + mw * 0.08, cx + mw * 0.55, my + mw * 0.15);
      ctx.strokeStyle = lipDark; ctx.lineWidth = faceR * 0.04; ctx.stroke();
      // 上唇の薄い影
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.45, my - mw * 0.16);
      ctx.bezierCurveTo(cx - mw * 0.15, my - mw * 0.12, cx + mw * 0.1, my + mw * 0.02, cx + mw * 0.45, my + mw * 0.1);
      ctx.strokeStyle = 'rgba(180,80,80,0.25)'; ctx.lineWidth = faceR * 0.02; ctx.stroke();
      _drawCornerShadow(cx - mw * 0.58, my - mw * 0.1);
      _drawCornerShadow(cx + mw * 0.58, my + mw * 0.17);
      break;
    case 9: // ω口 — 猫口
      // 上唇の中央がへこんでω型
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.55, my);
      ctx.bezierCurveTo(cx - mw * 0.35, my + mw * 0.18, cx - mw * 0.1, my + mw * 0.08, cx, my + mw * 0.15);
      ctx.bezierCurveTo(cx + mw * 0.1, my + mw * 0.08, cx + mw * 0.35, my + mw * 0.18, cx + mw * 0.55, my);
      ctx.strokeStyle = lipDark; ctx.lineWidth = faceR * 0.035; ctx.stroke();
      // 下の丸み
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.4, my + mw * 0.1);
      ctx.bezierCurveTo(cx - mw * 0.15, my + mw * 0.3, cx + mw * 0.15, my + mw * 0.3, cx + mw * 0.4, my + mw * 0.1);
      var omegaGrad = ctx.createLinearGradient(cx, my + mw * 0.1, cx, my + mw * 0.3);
      omegaGrad.addColorStop(0, 'rgba(196,116,110,0.25)');
      omegaGrad.addColorStop(1, 'rgba(180,100,95,0.1)');
      ctx.fillStyle = omegaGrad; ctx.fill();
      _drawLipHighlight(my + mw * 0.18, mw * 0.5);
      _drawCornerShadow(cx - mw * 0.58, my + mw * 0.02);
      _drawCornerShadow(cx + mw * 0.58, my + mw * 0.02);
      break;
    case 10: // キス — すぼめた唇
      // 小さな丸い口
      ctx.beginPath();
      ctx.ellipse(cx, my + mw * 0.05, mw * 0.18, mw * 0.22, 0, 0, Math.PI * 2);
      var kissGrad = ctx.createRadialGradient(cx, my + mw * 0.05, mw * 0.03, cx, my + mw * 0.05, mw * 0.22);
      kissGrad.addColorStop(0, '#1a0a0b'); kissGrad.addColorStop(1, '#2D1517');
      ctx.fillStyle = kissGrad; ctx.fill();
      // 唇リング（ぷっくり）
      ctx.beginPath();
      ctx.ellipse(cx, my + mw * 0.05, mw * 0.22, mw * 0.26, 0, 0, Math.PI * 2);
      var kissLipGrad = ctx.createLinearGradient(cx, my - mw * 0.2, cx, my + mw * 0.3);
      kissLipGrad.addColorStop(0, lipTop); kissLipGrad.addColorStop(0.5, lipBot); kissLipGrad.addColorStop(1, lipDark);
      ctx.strokeStyle = kissLipGrad; ctx.lineWidth = faceR * 0.045; ctx.stroke();
      // ハイライト
      if (detail) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath(); ctx.ellipse(cx - mw * 0.05, my - mw * 0.08, mw * 0.08, mw * 0.05, -0.3, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 11: // 歯見せ — 上歯が見える笑顔
      // 口内
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.7, my);
      ctx.bezierCurveTo(cx - mw * 0.3, my + mw * 0.45, cx + mw * 0.3, my + mw * 0.45, cx + mw * 0.7, my);
      ctx.bezierCurveTo(cx + mw * 0.3, my - mw * 0.08, cx - mw * 0.3, my - mw * 0.08, cx - mw * 0.7, my);
      ctx.closePath();
      var teethMouthGrad = ctx.createLinearGradient(cx, my, cx, my + mw * 0.45);
      teethMouthGrad.addColorStop(0, '#1a0a0b'); teethMouthGrad.addColorStop(1, '#2D1517');
      ctx.fillStyle = teethMouthGrad; ctx.fill();
      // 歯（上の白い四角群）
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.7, my);
      ctx.bezierCurveTo(cx - mw * 0.3, my + mw * 0.45, cx + mw * 0.3, my + mw * 0.45, cx + mw * 0.7, my);
      ctx.bezierCurveTo(cx + mw * 0.3, my - mw * 0.08, cx - mw * 0.3, my - mw * 0.08, cx - mw * 0.7, my);
      ctx.closePath(); ctx.clip();
      ctx.fillStyle = '#F8F8F0';
      var tw = mw * 0.2, th = mw * 0.2;
      for (var ti = -2; ti <= 2; ti++) {
        var tx = cx + ti * tw - tw * 0.5;
        ctx.beginPath();
        ctx.roundRect(tx + mw * 0.02, my - mw * 0.02, tw - mw * 0.04, th, faceR * 0.01);
        ctx.fill();
      }
      // 歯の隙間線
      ctx.strokeStyle = 'rgba(200,190,180,0.4)'; ctx.lineWidth = Math.max(0.3, faceR * 0.008);
      for (var tl = -2; tl <= 2; tl++) {
        var tlx = cx + tl * tw - tw * 0.5 + tw;
        ctx.beginPath(); ctx.moveTo(tlx, my - mw * 0.02); ctx.lineTo(tlx, my + th - mw * 0.02); ctx.stroke();
      }
      ctx.restore();
      // 上唇
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.75, my);
      ctx.bezierCurveTo(cx - mw * 0.4, my - mw * 0.15, cx - mw * 0.12, my - mw * 0.22, cx, my - mw * 0.1);
      ctx.bezierCurveTo(cx + mw * 0.12, my - mw * 0.22, cx + mw * 0.4, my - mw * 0.15, cx + mw * 0.75, my);
      ctx.strokeStyle = lipTop; ctx.lineWidth = faceR * 0.035; ctx.stroke();
      // 下唇
      ctx.beginPath();
      ctx.moveTo(cx - mw * 0.6, my + mw * 0.02);
      ctx.bezierCurveTo(cx - mw * 0.2, my + mw * 0.45, cx + mw * 0.2, my + mw * 0.45, cx + mw * 0.6, my + mw * 0.02);
      ctx.strokeStyle = lipBot; ctx.lineWidth = faceR * 0.03; ctx.stroke();
      _drawCornerShadow(cx - mw * 0.73, my + mw * 0.02);
      _drawCornerShadow(cx + mw * 0.73, my + mw * 0.02);
      break;
  }
  ctx.restore();
}

function _drawHairShine(ctx, cx, topY, faceR, color, paths) {
  // ツヤ線を描画（はっきり見えるように）
  ctx.save();
  ctx.strokeStyle = _skinLighter(color, 100);
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = Math.max(1.0, faceR * 0.04);
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
  var lighter = _skinLighter(color, 70);
  var darker = _skinDarker(color, 50);
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
    ctx.strokeStyle = _skinLighter(color, 60);
    ctx.globalAlpha = alpha || 0.45;
    ctx.lineWidth = Math.max(0.8, faceR * 0.022);
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

  // 髪のベース描画ヘルパー（無効化）
  function hairCapFill() {}

  ctx.save();
  switch(type) {
    case 1: // ショート
      ctx.fillStyle = hairGrad(topY - faceR * 0.3, topY + faceR * 0.4);
      // ヘアーキャップ（デフォルトの半分サイズ）
      ctx.beginPath(); ctx.arc(cx, topY + faceR * 0.1, faceR * 0.325, Math.PI, 2 * Math.PI); ctx.fill();
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
      // ベースの頭頂部（丸みのあるシルエット）
      ctx.fillStyle = hairGrad(topY - faceR * 0.35, topY + faceR * 0.5);
      hairCapFill(cx, topY + faceR * 0.1, faceR * 0.82, null, Math.PI * 0.82, Math.PI * 2.18);
      // サイドの髪（肩にかかる長さ、ふんわり内巻き）
      [-1, 1].forEach(function(s) {
        var sideGrad2 = ctx.createLinearGradient(cx + s * faceR * 0.45, topY, cx + s * faceR * 0.8, faceY + faceR * 0.58);
        sideGrad2.addColorStop(0, darker); sideGrad2.addColorStop(0.3, color); sideGrad2.addColorStop(0.65, lighter); sideGrad2.addColorStop(1, color);
        ctx.fillStyle = sideGrad2;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.68, topY + faceR * 0.12);
        // 顔に沿って自然に流れるサイドライン
        ctx.bezierCurveTo(cx + s * faceR * 0.9, topY + faceR * 0.35, cx + s * faceR * 0.88, faceY + faceR * 0.05, cx + s * faceR * 0.78, faceY + faceR * 0.35);
        // 毛先の内巻き（顔側へ柔らかく巻き込む）
        ctx.bezierCurveTo(cx + s * faceR * 0.72, faceY + faceR * 0.5, cx + s * faceR * 0.58, faceY + faceR * 0.55, cx + s * faceR * 0.48, faceY + faceR * 0.48);
        ctx.bezierCurveTo(cx + s * faceR * 0.42, faceY + faceR * 0.42, cx + s * faceR * 0.45, faceY + faceR * 0.3, cx + s * faceR * 0.5, faceY + faceR * 0.18);
        ctx.bezierCurveTo(cx + s * faceR * 0.55, faceY - faceR * 0.05, cx + s * faceR * 0.6, topY + faceR * 0.45, cx + s * faceR * 0.65, topY + faceR * 0.12);
        ctx.closePath(); ctx.fill();
      });
      // 前髪（ふんわり斜め流し — 左から右へ柔らかく）
      ctx.fillStyle = hairGrad(topY - faceR * 0.12, topY + faceR * 0.48);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.58, topY + faceR * 0.08);
      ctx.bezierCurveTo(cx - faceR * 0.55, topY + faceR * 0.3, cx - faceR * 0.42, topY + faceR * 0.45, cx - faceR * 0.22, topY + faceR * 0.48);
      ctx.bezierCurveTo(cx - faceR * 0.08, topY + faceR * 0.5, cx + faceR * 0.08, topY + faceR * 0.47, cx + faceR * 0.22, topY + faceR * 0.44);
      ctx.bezierCurveTo(cx + faceR * 0.38, topY + faceR * 0.4, cx + faceR * 0.5, topY + faceR * 0.32, cx + faceR * 0.58, topY + faceR * 0.2);
      ctx.lineTo(cx + faceR * 0.65, topY + faceR * 0.05);
      ctx.bezierCurveTo(cx + faceR * 0.52, topY - faceR * 0.18, cx - faceR * 0.48, topY - faceR * 0.18, cx - faceR * 0.62, topY + faceR * 0.02);
      ctx.closePath(); ctx.fill();
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.42, topY + faceR * 0.08, cx - faceR * 0.18, topY - faceR * 0.22, cx + faceR * 0.15, topY - faceR * 0.18],
        [cx - faceR * 0.05, topY + faceR * 0.1, cx + faceR * 0.18, topY - faceR * 0.2, cx + faceR * 0.48, topY - faceR * 0.1]
      ]);
      _drawPartLine(cx - faceR * 0.15, topY - faceR * 0.1, topY + faceR * 0.1);
      _drawStrands([
        [cx - faceR * 0.52, topY + faceR * 0.12, cx - faceR * 0.42, topY + faceR * 0.32, cx - faceR * 0.28, topY + faceR * 0.46],
        [cx - faceR * 0.38, topY + faceR * 0.15, cx - faceR * 0.2, topY + faceR * 0.35, cx - faceR * 0.05, topY + faceR * 0.48],
        [cx - faceR * 0.18, topY + faceR * 0.14, cx + faceR * 0.02, topY + faceR * 0.35, cx + faceR * 0.18, topY + faceR * 0.44],
        [cx + faceR * 0.08, topY + faceR * 0.16, cx + faceR * 0.22, topY + faceR * 0.32, cx + faceR * 0.38, topY + faceR * 0.4],
        [cx + faceR * 0.28, topY + faceR * 0.14, cx + faceR * 0.4, topY + faceR * 0.25, cx + faceR * 0.52, topY + faceR * 0.3],
        [cx - faceR * 0.58, topY + faceR * 0.1, cx - faceR * 0.48, topY - faceR * 0.05, cx - faceR * 0.3, topY - faceR * 0.12],
        [cx + faceR * 0.12, topY + faceR * 0.06, cx + faceR * 0.28, topY - faceR * 0.12, cx + faceR * 0.48, topY - faceR * 0.05],
        [cx - faceR * 0.28, topY + faceR * 0.08, cx - faceR * 0.1, topY - faceR * 0.16, cx + faceR * 0.08, topY - faceR * 0.14]
      ]);
      break;
    case 3: // ロング — 胸元まで伸びる長い髪
      // ベースの頭頂部（ふっくら丸みのあるシルエット）
      ctx.fillStyle = hairGrad(topY - faceR * 0.38, topY + faceR * 0.6);
      hairCapFill(cx, topY + faceR * 0.1, faceR * 0.88, null, Math.PI * 0.7, Math.PI * 2.3);
      // サイドの長い髪（胸元まで、自然なウェーブ）
      [-1, 1].forEach(function(s) {
        var longGrad = ctx.createLinearGradient(cx + s * faceR * 0.45, topY, cx + s * faceR * 0.85, faceY + faceR * 1.05);
        longGrad.addColorStop(0, darker); longGrad.addColorStop(0.2, color); longGrad.addColorStop(0.5, lighter); longGrad.addColorStop(0.8, color); longGrad.addColorStop(1, darker);
        ctx.fillStyle = longGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.72, topY + faceR * 0.1);
        // 顔のフレーミング — 頬に沿って自然に流れる
        ctx.bezierCurveTo(cx + s * faceR * 0.95, topY + faceR * 0.35, cx + s * faceR * 0.92, faceY + faceR * 0.05, cx + s * faceR * 0.85, faceY + faceR * 0.4);
        // ゆるやかなウェーブ感
        ctx.bezierCurveTo(cx + s * faceR * 0.82, faceY + faceR * 0.65, cx + s * faceR * 0.78, faceY + faceR * 0.85, cx + s * faceR * 0.7, faceY + faceR * 1.0);
        // 毛先（軽やかにテーパー）
        ctx.bezierCurveTo(cx + s * faceR * 0.62, faceY + faceR * 1.05, cx + s * faceR * 0.52, faceY + faceR * 0.92, cx + s * faceR * 0.48, faceY + faceR * 0.72);
        // 内側を顔に沿って戻る
        ctx.bezierCurveTo(cx + s * faceR * 0.48, faceY + faceR * 0.4, cx + s * faceR * 0.52, faceY - faceR * 0.05, cx + s * faceR * 0.56, topY + faceR * 0.45);
        ctx.bezierCurveTo(cx + s * faceR * 0.6, topY + faceR * 0.2, cx + s * faceR * 0.65, topY + faceR * 0.1, cx + s * faceR * 0.7, topY + faceR * 0.1);
        ctx.closePath(); ctx.fill();
      });
      // 斜め流し前髪（長め、エレガント）
      ctx.fillStyle = hairGrad(topY - faceR * 0.12, topY + faceR * 0.52);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.62, topY + faceR * 0.1);
      ctx.bezierCurveTo(cx - faceR * 0.58, topY + faceR * 0.32, cx - faceR * 0.45, topY + faceR * 0.48, cx - faceR * 0.25, topY + faceR * 0.52);
      ctx.bezierCurveTo(cx - faceR * 0.08, topY + faceR * 0.52, cx + faceR * 0.1, topY + faceR * 0.48, cx + faceR * 0.28, topY + faceR * 0.4);
      ctx.bezierCurveTo(cx + faceR * 0.45, topY + faceR * 0.32, cx + faceR * 0.58, topY + faceR * 0.2, cx + faceR * 0.65, topY + faceR * 0.08);
      ctx.lineTo(cx + faceR * 0.7, topY + faceR * 0.02);
      ctx.bezierCurveTo(cx + faceR * 0.55, topY - faceR * 0.2, cx - faceR * 0.5, topY - faceR * 0.2, cx - faceR * 0.65, topY + faceR * 0.02);
      ctx.closePath(); ctx.fill();
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.48, topY + faceR * 0.08, cx - faceR * 0.2, topY - faceR * 0.25, cx + faceR * 0.12, topY - faceR * 0.22],
        [cx - faceR * 0.08, topY + faceR * 0.12, cx + faceR * 0.18, topY - faceR * 0.22, cx + faceR * 0.48, topY - faceR * 0.12],
        [cx + faceR * 0.12, topY + faceR * 0.08, cx + faceR * 0.35, topY - faceR * 0.18, cx + faceR * 0.58, topY + faceR * 0.02]
      ]);
      _drawPartLine(cx - faceR * 0.22, topY - faceR * 0.12, topY + faceR * 0.12);
      _drawStrands([
        [cx - faceR * 0.56, topY + faceR * 0.15, cx - faceR * 0.48, topY + faceR * 0.35, cx - faceR * 0.32, topY + faceR * 0.5],
        [cx - faceR * 0.4, topY + faceR * 0.18, cx - faceR * 0.25, topY + faceR * 0.38, cx - faceR * 0.1, topY + faceR * 0.5],
        [cx - faceR * 0.22, topY + faceR * 0.16, cx - faceR * 0.05, topY + faceR * 0.38, cx + faceR * 0.12, topY + faceR * 0.46],
        [cx + faceR * 0.02, topY + faceR * 0.18, cx + faceR * 0.18, topY + faceR * 0.34, cx + faceR * 0.32, topY + faceR * 0.38],
        [cx + faceR * 0.22, topY + faceR * 0.15, cx + faceR * 0.38, topY + faceR * 0.26, cx + faceR * 0.52, topY + faceR * 0.3],
        [cx - faceR * 0.62, topY + faceR * 0.12, cx - faceR * 0.52, topY - faceR * 0.08, cx - faceR * 0.35, topY - faceR * 0.14],
        [cx + faceR * 0.18, topY + faceR * 0.08, cx + faceR * 0.35, topY - faceR * 0.1, cx + faceR * 0.55, topY],
        [cx - faceR * 0.32, topY + faceR * 0.08, cx - faceR * 0.12, topY - faceR * 0.2, cx + faceR * 0.08, topY - faceR * 0.2]
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
      hairCapFill(cx, topY + faceR * 0.2, faceR * 0.55, null, Math.PI, 2 * Math.PI);
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
      // ベースの頭頂部（後ろへ自然に流れるシルエット）
      ctx.fillStyle = hairGrad(topY - faceR * 0.35, topY + faceR * 0.42);
      hairCapFill(cx, topY + faceR * 0.08, faceR * 0.75, null, Math.PI * 0.85, Math.PI * 2.15);
      // 頭頂部から後ろへ集まる髪の流れ（ボリューム感のある膨らみ）
      ctx.fillStyle = hairGrad(topY - faceR * 0.2, topY + faceR * 0.3);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.05, topY - faceR * 0.12);
      ctx.bezierCurveTo(cx + faceR * 0.25, topY - faceR * 0.22, cx + faceR * 0.52, topY - faceR * 0.18, cx + faceR * 0.55, topY + faceR * 0.02);
      ctx.bezierCurveTo(cx + faceR * 0.56, topY + faceR * 0.18, cx + faceR * 0.4, topY + faceR * 0.25, cx + faceR * 0.2, topY + faceR * 0.18);
      ctx.bezierCurveTo(cx + faceR * 0.08, topY + faceR * 0.12, cx - faceR * 0.02, topY + faceR * 0.05, cx - faceR * 0.05, topY - faceR * 0.12);
      ctx.closePath(); ctx.fill();
      // サイドヘア（こめかみ〜耳横に少し残る髪）
      [-1, 1].forEach(function(s) {
        var ptSideGrad = ctx.createLinearGradient(cx + s * faceR * 0.55, topY + faceR * 0.1, cx + s * faceR * 0.65, faceY + faceR * 0.1);
        ptSideGrad.addColorStop(0, darker); ptSideGrad.addColorStop(0.5, color); ptSideGrad.addColorStop(1, lighter);
        ctx.fillStyle = ptSideGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.6, topY + faceR * 0.15);
        ctx.bezierCurveTo(cx + s * faceR * 0.72, topY + faceR * 0.28, cx + s * faceR * 0.7, faceY - faceR * 0.1, cx + s * faceR * 0.62, faceY + faceR * 0.08);
        ctx.bezierCurveTo(cx + s * faceR * 0.55, faceY + faceR * 0.12, cx + s * faceR * 0.5, faceY - faceR * 0.02, cx + s * faceR * 0.52, topY + faceR * 0.35);
        ctx.bezierCurveTo(cx + s * faceR * 0.54, topY + faceR * 0.2, cx + s * faceR * 0.57, topY + faceR * 0.15, cx + s * faceR * 0.6, topY + faceR * 0.15);
        ctx.closePath(); ctx.fill();
      });
      // 前髪（流し前髪 — 左から右へ優雅に流れる）
      ctx.fillStyle = hairGrad(topY - faceR * 0.12, topY + faceR * 0.48);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.6, topY + faceR * 0.04);
      ctx.bezierCurveTo(cx - faceR * 0.56, topY + faceR * 0.22, cx - faceR * 0.48, topY + faceR * 0.38, cx - faceR * 0.3, topY + faceR * 0.46);
      ctx.bezierCurveTo(cx - faceR * 0.15, topY + faceR * 0.5, cx + faceR * 0.02, topY + faceR * 0.48, cx + faceR * 0.18, topY + faceR * 0.42);
      ctx.bezierCurveTo(cx + faceR * 0.32, topY + faceR * 0.35, cx + faceR * 0.45, topY + faceR * 0.25, cx + faceR * 0.54, topY + faceR * 0.14);
      ctx.lineTo(cx + faceR * 0.6, topY + faceR * 0.02);
      ctx.bezierCurveTo(cx + faceR * 0.48, topY - faceR * 0.2, cx - faceR * 0.48, topY - faceR * 0.2, cx - faceR * 0.62, topY + faceR * 0.02);
      ctx.closePath(); ctx.fill();
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.38, topY + faceR * 0.06, cx - faceR * 0.12, topY - faceR * 0.15, cx + faceR * 0.18, topY - faceR * 0.1],
        [cx + faceR * 0.02, topY + faceR * 0.05, cx + faceR * 0.22, topY - faceR * 0.12, cx + faceR * 0.45, topY - faceR * 0.04]
      ]);
      _drawPartLine(cx - faceR * 0.22, topY - faceR * 0.1, topY + faceR * 0.06);
      _drawStrands([
        [cx - faceR * 0.52, topY + faceR * 0.1, cx - faceR * 0.35, topY + faceR * 0.3, cx - faceR * 0.15, topY + faceR * 0.45],
        [cx - faceR * 0.38, topY + faceR * 0.08, cx - faceR * 0.15, topY + faceR * 0.3, cx + faceR * 0.08, topY + faceR * 0.44],
        [cx - faceR * 0.18, topY + faceR * 0.06, cx + faceR * 0.08, topY + faceR * 0.26, cx + faceR * 0.28, topY + faceR * 0.35],
        [cx + faceR * 0.02, topY + faceR * 0.05, cx + faceR * 0.22, topY + faceR * 0.18, cx + faceR * 0.42, topY + faceR * 0.22],
        [cx - faceR * 0.12, topY - faceR * 0.08, cx + faceR * 0.12, topY - faceR * 0.15, cx + faceR * 0.38, topY - faceR * 0.08],
        [cx - faceR * 0.02, topY - faceR * 0.1, cx + faceR * 0.2, topY - faceR * 0.18, cx + faceR * 0.48, topY - faceR * 0.05],
        [cx + faceR * 0.08, topY - faceR * 0.08, cx + faceR * 0.28, topY - faceR * 0.12, cx + faceR * 0.5, topY + faceR * 0.02]
      ]);
      break;
    case 8: // ボブ — ふっくら丸みのある顎ライン内巻き、ぱっつん前髪
      // ベースの頭頂部（丸く膨らんだシルエット）
      ctx.fillStyle = hairGrad(topY - faceR * 0.35, topY + faceR * 0.5);
      hairCapFill(cx, topY + faceR * 0.08, faceR * 0.85, null, Math.PI * 0.78, Math.PI * 2.22);
      // サイドの髪（ふっくら丸い、顎ラインで内巻き）
      [-1, 1].forEach(function(s) {
        var bobGrad = ctx.createLinearGradient(cx + s * faceR * 0.45, topY, cx + s * faceR * 0.85, faceY + faceR * 0.45);
        bobGrad.addColorStop(0, darker); bobGrad.addColorStop(0.3, color); bobGrad.addColorStop(0.65, lighter); bobGrad.addColorStop(1, color);
        ctx.fillStyle = bobGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.7, topY + faceR * 0.1);
        // ふっくらと頬を包む丸いシルエット
        ctx.bezierCurveTo(cx + s * faceR * 0.95, topY + faceR * 0.32, cx + s * faceR * 0.92, faceY + faceR * 0.02, cx + s * faceR * 0.82, faceY + faceR * 0.25);
        // 内巻き（顎下で柔らかく内側に巻き込む）
        ctx.bezierCurveTo(cx + s * faceR * 0.75, faceY + faceR * 0.4, cx + s * faceR * 0.6, faceY + faceR * 0.45, cx + s * faceR * 0.48, faceY + faceR * 0.38);
        ctx.bezierCurveTo(cx + s * faceR * 0.42, faceY + faceR * 0.3, cx + s * faceR * 0.45, faceY + faceR * 0.15, cx + s * faceR * 0.5, faceY - faceR * 0.02);
        ctx.bezierCurveTo(cx + s * faceR * 0.54, topY + faceR * 0.45, cx + s * faceR * 0.6, topY + faceR * 0.18, cx + s * faceR * 0.66, topY + faceR * 0.1);
        ctx.closePath(); ctx.fill();
      });
      // ぱっつん前髪（柔らかな束感、わずかなアーチ）
      ctx.fillStyle = hairGrad(topY - faceR * 0.12, topY + faceR * 0.48);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.62, topY + faceR * 0.1);
      // 頭頂部のカーブ
      ctx.bezierCurveTo(cx - faceR * 0.48, topY - faceR * 0.18, cx + faceR * 0.48, topY - faceR * 0.18, cx + faceR * 0.62, topY + faceR * 0.1);
      // 右端から前髪の下端へ
      ctx.lineTo(cx + faceR * 0.6, topY + faceR * 0.4);
      // ぱっつんライン（束感のある微妙な凹凸）
      ctx.bezierCurveTo(cx + faceR * 0.52, topY + faceR * 0.44, cx + faceR * 0.42, topY + faceR * 0.42, cx + faceR * 0.3, topY + faceR * 0.44);
      ctx.bezierCurveTo(cx + faceR * 0.18, topY + faceR * 0.46, cx + faceR * 0.08, topY + faceR * 0.44, cx, topY + faceR * 0.45);
      ctx.bezierCurveTo(cx - faceR * 0.08, topY + faceR * 0.46, cx - faceR * 0.18, topY + faceR * 0.44, cx - faceR * 0.3, topY + faceR * 0.45);
      ctx.bezierCurveTo(cx - faceR * 0.42, topY + faceR * 0.46, cx - faceR * 0.52, topY + faceR * 0.44, cx - faceR * 0.6, topY + faceR * 0.4);
      ctx.closePath(); ctx.fill();
      // ぱっつん前髪の下端の影ライン
      if (detail) {
        ctx.save();
        ctx.strokeStyle = _skinDarker(color, 42);
        ctx.lineWidth = Math.max(0.7, faceR * 0.018);
        ctx.globalAlpha = 0.3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - faceR * 0.58, topY + faceR * 0.41);
        ctx.bezierCurveTo(cx - faceR * 0.3, topY + faceR * 0.46, cx + faceR * 0.3, topY + faceR * 0.46, cx + faceR * 0.58, topY + faceR * 0.41);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.38, topY + faceR * 0.08, cx - faceR * 0.12, topY - faceR * 0.22, cx + faceR * 0.18, topY - faceR * 0.18],
        [cx + faceR * 0.02, topY + faceR * 0.06, cx + faceR * 0.22, topY - faceR * 0.18, cx + faceR * 0.48, topY - faceR * 0.08]
      ]);
      _drawPartLine(cx, topY - faceR * 0.1, topY + faceR * 0.1);
      _drawStrands([
        [cx - faceR * 0.54, topY + faceR * 0.12, cx - faceR * 0.5, topY + faceR * 0.28, cx - faceR * 0.45, topY + faceR * 0.43],
        [cx - faceR * 0.36, topY + faceR * 0.1, cx - faceR * 0.3, topY + faceR * 0.28, cx - faceR * 0.25, topY + faceR * 0.44],
        [cx - faceR * 0.18, topY + faceR * 0.1, cx - faceR * 0.12, topY + faceR * 0.28, cx - faceR * 0.05, topY + faceR * 0.45],
        [cx + faceR * 0.05, topY + faceR * 0.1, cx + faceR * 0.12, topY + faceR * 0.28, cx + faceR * 0.18, topY + faceR * 0.44],
        [cx + faceR * 0.25, topY + faceR * 0.1, cx + faceR * 0.32, topY + faceR * 0.28, cx + faceR * 0.38, topY + faceR * 0.44],
        [cx + faceR * 0.45, topY + faceR * 0.12, cx + faceR * 0.5, topY + faceR * 0.28, cx + faceR * 0.55, topY + faceR * 0.42],
        [cx - faceR * 0.58, topY + faceR * 0.1, cx - faceR * 0.45, topY - faceR * 0.04, cx - faceR * 0.28, topY - faceR * 0.1],
        [cx + faceR * 0.18, topY + faceR * 0.06, cx + faceR * 0.35, topY - faceR * 0.08, cx + faceR * 0.52, topY]
      ]);
      break;
    case 9: // おだんご — ふんわりベース + シースルー前髪
      // ベースの頭頂部（丸みのあるシルエット）
      ctx.fillStyle = hairGrad(topY - faceR * 0.35, topY + faceR * 0.5);
      hairCapFill(cx, topY + faceR * 0.1, faceR * 0.82, null, Math.PI * 0.82, Math.PI * 2.18);
      // サイドの髪（ふんわりミディアム風）
      [-1, 1].forEach(function(s) {
        var dSideGrad = ctx.createLinearGradient(cx + s * faceR * 0.45, topY, cx + s * faceR * 0.78, faceY + faceR * 0.48);
        dSideGrad.addColorStop(0, darker); dSideGrad.addColorStop(0.3, color); dSideGrad.addColorStop(0.65, lighter); dSideGrad.addColorStop(1, color);
        ctx.fillStyle = dSideGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.68, topY + faceR * 0.12);
        ctx.bezierCurveTo(cx + s * faceR * 0.88, topY + faceR * 0.35, cx + s * faceR * 0.85, faceY + faceR * 0.05, cx + s * faceR * 0.72, faceY + faceR * 0.35);
        // ふんわり内巻きの毛先
        ctx.bezierCurveTo(cx + s * faceR * 0.65, faceY + faceR * 0.48, cx + s * faceR * 0.52, faceY + faceR * 0.48, cx + s * faceR * 0.46, faceY + faceR * 0.38);
        ctx.bezierCurveTo(cx + s * faceR * 0.42, faceY + faceR * 0.25, cx + s * faceR * 0.48, faceY + faceR * 0.05, cx + s * faceR * 0.52, topY + faceR * 0.42);
        ctx.bezierCurveTo(cx + s * faceR * 0.56, topY + faceR * 0.22, cx + s * faceR * 0.62, topY + faceR * 0.12, cx + s * faceR * 0.66, topY + faceR * 0.12);
        ctx.closePath(); ctx.fill();
      });
      // シースルー前髪（薄め、透け感あり）
      ctx.fillStyle = hairGrad(topY - faceR * 0.12, topY + faceR * 0.46);
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.58, topY + faceR * 0.08);
      ctx.bezierCurveTo(cx - faceR * 0.46, topY - faceR * 0.18, cx + faceR * 0.46, topY - faceR * 0.18, cx + faceR * 0.58, topY + faceR * 0.08);
      ctx.lineTo(cx + faceR * 0.55, topY + faceR * 0.22);
      // 束感のあるシースルー前髪（隙間ありの束）
      ctx.bezierCurveTo(cx + faceR * 0.48, topY + faceR * 0.38, cx + faceR * 0.38, topY + faceR * 0.42, cx + faceR * 0.28, topY + faceR * 0.4);
      ctx.bezierCurveTo(cx + faceR * 0.22, topY + faceR * 0.35, cx + faceR * 0.18, topY + faceR * 0.42, cx + faceR * 0.08, topY + faceR * 0.44);
      ctx.bezierCurveTo(cx, topY + faceR * 0.38, cx - faceR * 0.05, topY + faceR * 0.44, cx - faceR * 0.12, topY + faceR * 0.42);
      ctx.bezierCurveTo(cx - faceR * 0.2, topY + faceR * 0.36, cx - faceR * 0.25, topY + faceR * 0.44, cx - faceR * 0.35, topY + faceR * 0.42);
      ctx.bezierCurveTo(cx - faceR * 0.45, topY + faceR * 0.38, cx - faceR * 0.52, topY + faceR * 0.3, cx - faceR * 0.55, topY + faceR * 0.22);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.42, topY + faceR * 0.08, cx - faceR * 0.18, topY - faceR * 0.22, cx + faceR * 0.15, topY - faceR * 0.18],
        [cx + faceR * 0.02, topY + faceR * 0.06, cx + faceR * 0.22, topY - faceR * 0.18, cx + faceR * 0.48, topY - faceR * 0.08]
      ]);
      _drawPartLine(cx - faceR * 0.05, topY - faceR * 0.1, topY + faceR * 0.1);
      _drawStrands([
        [cx - faceR * 0.5, topY + faceR * 0.12, cx - faceR * 0.42, topY + faceR * 0.28, cx - faceR * 0.32, topY + faceR * 0.4],
        [cx - faceR * 0.3, topY + faceR * 0.1, cx - faceR * 0.18, topY + faceR * 0.3, cx - faceR * 0.08, topY + faceR * 0.42],
        [cx + faceR * 0.02, topY + faceR * 0.1, cx + faceR * 0.12, topY + faceR * 0.3, cx + faceR * 0.22, topY + faceR * 0.42],
        [cx + faceR * 0.2, topY + faceR * 0.1, cx + faceR * 0.32, topY + faceR * 0.26, cx + faceR * 0.45, topY + faceR * 0.35],
        [cx - faceR * 0.56, topY + faceR * 0.1, cx - faceR * 0.42, topY - faceR * 0.06, cx - faceR * 0.2, topY - faceR * 0.12],
        [cx + faceR * 0.12, topY + faceR * 0.06, cx + faceR * 0.3, topY - faceR * 0.08, cx + faceR * 0.48, topY]
      ]);
      break;
    case 10: // ツインテ — 左右にテール、かわいい前髪
      // ベースの頭頂部（ふんわり丸い）
      ctx.fillStyle = hairGrad(topY - faceR * 0.35, topY + faceR * 0.42);
      hairCapFill(cx, topY + faceR * 0.08, faceR * 0.75, null, Math.PI * 0.85, Math.PI * 2.15);
      // サイドヘア（こめかみから耳横へ流れる短い髪）
      [-1, 1].forEach(function(s) {
        var twSideGrad = ctx.createLinearGradient(cx + s * faceR * 0.5, topY + faceR * 0.1, cx + s * faceR * 0.65, faceY + faceR * 0.05);
        twSideGrad.addColorStop(0, darker); twSideGrad.addColorStop(0.5, color); twSideGrad.addColorStop(1, lighter);
        ctx.fillStyle = twSideGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.58, topY + faceR * 0.15);
        ctx.bezierCurveTo(cx + s * faceR * 0.7, topY + faceR * 0.3, cx + s * faceR * 0.68, faceY - faceR * 0.12, cx + s * faceR * 0.6, faceY + faceR * 0.05);
        ctx.bezierCurveTo(cx + s * faceR * 0.52, faceY + faceR * 0.08, cx + s * faceR * 0.48, faceY - faceR * 0.08, cx + s * faceR * 0.5, topY + faceR * 0.35);
        ctx.bezierCurveTo(cx + s * faceR * 0.52, topY + faceR * 0.22, cx + s * faceR * 0.55, topY + faceR * 0.15, cx + s * faceR * 0.58, topY + faceR * 0.15);
        ctx.closePath(); ctx.fill();
      });
      // ふんわり前髪（柔らかい束感）
      ctx.fillStyle = hairGrad(topY - faceR * 0.12, topY + faceR * 0.48);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.58, topY + faceR * 0.06);
      ctx.bezierCurveTo(cx - faceR * 0.45, topY - faceR * 0.18, cx + faceR * 0.45, topY - faceR * 0.18, cx + faceR * 0.58, topY + faceR * 0.06);
      ctx.lineTo(cx + faceR * 0.55, topY + faceR * 0.2);
      ctx.bezierCurveTo(cx + faceR * 0.5, topY + faceR * 0.36, cx + faceR * 0.38, topY + faceR * 0.44, cx + faceR * 0.25, topY + faceR * 0.42);
      ctx.bezierCurveTo(cx + faceR * 0.15, topY + faceR * 0.4, cx + faceR * 0.08, topY + faceR * 0.44, cx, topY + faceR * 0.45);
      ctx.bezierCurveTo(cx - faceR * 0.08, topY + faceR * 0.44, cx - faceR * 0.15, topY + faceR * 0.46, cx - faceR * 0.25, topY + faceR * 0.44);
      ctx.bezierCurveTo(cx - faceR * 0.38, topY + faceR * 0.42, cx - faceR * 0.5, topY + faceR * 0.35, cx - faceR * 0.55, topY + faceR * 0.2);
      ctx.closePath(); ctx.fill();
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.32, topY + faceR * 0.04, cx - faceR * 0.1, topY - faceR * 0.14, cx + faceR * 0.18, topY - faceR * 0.1],
        [cx + faceR * 0.05, topY + faceR * 0.04, cx + faceR * 0.22, topY - faceR * 0.12, cx + faceR * 0.42, topY - faceR * 0.04]
      ]);
      _drawPartLine(cx, topY - faceR * 0.1, topY + faceR * 0.08);
      _drawStrands([
        [cx - faceR * 0.5, topY + faceR * 0.1, cx - faceR * 0.4, topY + faceR * 0.28, cx - faceR * 0.28, topY + faceR * 0.42],
        [cx - faceR * 0.25, topY + faceR * 0.1, cx - faceR * 0.12, topY + faceR * 0.3, cx, topY + faceR * 0.44],
        [cx + faceR * 0.05, topY + faceR * 0.1, cx + faceR * 0.18, topY + faceR * 0.28, cx + faceR * 0.3, topY + faceR * 0.4],
        [cx + faceR * 0.3, topY + faceR * 0.1, cx + faceR * 0.42, topY + faceR * 0.24, cx + faceR * 0.5, topY + faceR * 0.32],
        [cx - faceR * 0.55, topY + faceR * 0.08, cx - faceR * 0.42, topY - faceR * 0.06, cx - faceR * 0.22, topY - faceR * 0.12],
        [cx + faceR * 0.15, topY + faceR * 0.04, cx + faceR * 0.32, topY - faceR * 0.08, cx + faceR * 0.48, topY]
      ]);
      break;
    case 11: // ウェーブ — ボリューミーなウェーブ、センターパート
      // ベースの頭頂部（大きめ、ふっくらボリューム）
      ctx.fillStyle = hairGrad(topY - faceR * 0.4, topY + faceR * 0.5);
      hairCapFill(cx, topY + faceR * 0.1, faceR * 0.9, null, Math.PI * 0.68, Math.PI * 2.32);
      // サイドのウェーブ髪（はっきりとしたS字カーブ）
      [-1, 1].forEach(function(s) {
        var wvGrad = ctx.createLinearGradient(cx + s * faceR * 0.45, topY, cx + s * faceR * 0.95, faceY + faceR * 0.85);
        wvGrad.addColorStop(0, darker); wvGrad.addColorStop(0.2, color); wvGrad.addColorStop(0.45, lighter); wvGrad.addColorStop(0.7, color); wvGrad.addColorStop(1, darker);
        ctx.fillStyle = wvGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.74, topY + faceR * 0.08);
        // 第1ウェーブ（外側に膨らむ）
        ctx.bezierCurveTo(cx + s * faceR * 1.0, topY + faceR * 0.35, cx + s * faceR * 0.85, faceY - faceR * 0.15, cx + s * faceR * 0.98, faceY + faceR * 0.1);
        // 第2ウェーブ（内側に絞ってまた外へ）
        ctx.bezierCurveTo(cx + s * faceR * 1.06, faceY + faceR * 0.3, cx + s * faceR * 0.88, faceY + faceR * 0.48, cx + s * faceR * 1.0, faceY + faceR * 0.6);
        // 毛先（ふんわり終わる）
        ctx.bezierCurveTo(cx + s * faceR * 0.95, faceY + faceR * 0.78, cx + s * faceR * 0.78, faceY + faceR * 0.82, cx + s * faceR * 0.65, faceY + faceR * 0.75);
        // 内側を戻る
        ctx.bezierCurveTo(cx + s * faceR * 0.55, faceY + faceR * 0.55, cx + s * faceR * 0.62, faceY + faceR * 0.25, cx + s * faceR * 0.6, faceY - faceR * 0.05);
        ctx.bezierCurveTo(cx + s * faceR * 0.58, topY + faceR * 0.38, cx + s * faceR * 0.62, topY + faceR * 0.15, cx + s * faceR * 0.7, topY + faceR * 0.08);
        ctx.closePath(); ctx.fill();
      });
      // センターパート（中央から左右へ分かれる自然なカーテンバングス）
      [-1, 1].forEach(function(s) {
        ctx.fillStyle = hairGrad(topY - faceR * 0.12, topY + faceR * 0.38);
        ctx.beginPath();
        ctx.moveTo(cx, topY - faceR * 0.12);
        ctx.bezierCurveTo(cx + s * faceR * 0.15, topY + faceR * 0.02, cx + s * faceR * 0.35, topY + faceR * 0.12, cx + s * faceR * 0.52, topY + faceR * 0.3);
        ctx.bezierCurveTo(cx + s * faceR * 0.58, topY + faceR * 0.38, cx + s * faceR * 0.62, topY + faceR * 0.32, cx + s * faceR * 0.65, topY + faceR * 0.22);
        ctx.bezierCurveTo(cx + s * faceR * 0.62, topY + faceR * 0.08, cx + s * faceR * 0.5, topY - faceR * 0.08, cx + s * faceR * 0.32, topY - faceR * 0.14);
        ctx.lineTo(cx, topY - faceR * 0.12);
        ctx.closePath(); ctx.fill();
      });
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.48, topY + faceR * 0.08, cx - faceR * 0.22, topY - faceR * 0.22, cx + faceR * 0.08, topY - faceR * 0.2],
        [cx + faceR * 0.08, topY + faceR * 0.08, cx + faceR * 0.32, topY - faceR * 0.2, cx + faceR * 0.55, topY - faceR * 0.08]
      ]);
      _drawPartLine(cx, topY - faceR * 0.12, topY + faceR * 0.15);
      _drawStrands([
        [cx - faceR * 0.05, topY - faceR * 0.08, cx - faceR * 0.28, topY + faceR * 0.08, cx - faceR * 0.48, topY + faceR * 0.25],
        [cx - faceR * 0.1, topY - faceR * 0.02, cx - faceR * 0.32, topY + faceR * 0.12, cx - faceR * 0.55, topY + faceR * 0.3],
        [cx + faceR * 0.05, topY - faceR * 0.08, cx + faceR * 0.28, topY + faceR * 0.08, cx + faceR * 0.48, topY + faceR * 0.25],
        [cx + faceR * 0.1, topY - faceR * 0.02, cx + faceR * 0.32, topY + faceR * 0.12, cx + faceR * 0.55, topY + faceR * 0.3],
        [cx - faceR * 0.62, topY + faceR * 0.15, cx - faceR * 0.52, topY - faceR * 0.05, cx - faceR * 0.32, topY - faceR * 0.12],
        [cx + faceR * 0.32, topY + faceR * 0.08, cx + faceR * 0.48, topY - faceR * 0.05, cx + faceR * 0.62, topY + faceR * 0.08]
      ]);
      break;
    case 12: // ワンレン — ストレート、7:3サイドパート
      // ベースの頭頂部
      ctx.fillStyle = hairGrad(topY - faceR * 0.3, topY + faceR * 0.5);
      hairCapFill(cx, topY + faceR * 0.12, faceR * 0.82, null, Math.PI * 0.8, Math.PI * 2.2);
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
      // ベースの頭頂部（きれいに後ろへまとまるシルエット）
      ctx.fillStyle = hairGrad(topY - faceR * 0.35, topY + faceR * 0.42);
      hairCapFill(cx, topY + faceR * 0.08, faceR * 0.78, null, Math.PI * 0.82, Math.PI * 2.18);
      // 後ろに留めた上半分の膨らみ
      ctx.fillStyle = hairGrad(topY - faceR * 0.18, topY + faceR * 0.28);
      ctx.beginPath();
      ctx.moveTo(cx + faceR * 0.15, topY - faceR * 0.08);
      ctx.bezierCurveTo(cx + faceR * 0.4, topY - faceR * 0.15, cx + faceR * 0.55, topY - faceR * 0.02, cx + faceR * 0.52, topY + faceR * 0.15);
      ctx.bezierCurveTo(cx + faceR * 0.48, topY + faceR * 0.25, cx + faceR * 0.32, topY + faceR * 0.22, cx + faceR * 0.18, topY + faceR * 0.12);
      ctx.bezierCurveTo(cx + faceR * 0.08, topY + faceR * 0.05, cx + faceR * 0.1, topY - faceR * 0.02, cx + faceR * 0.15, topY - faceR * 0.08);
      ctx.closePath(); ctx.fill();
      // 下半分のサイド髪（ふんわり肩まで）
      [-1, 1].forEach(function(s) {
        var huGrad = ctx.createLinearGradient(cx + s * faceR * 0.45, topY + faceR * 0.2, cx + s * faceR * 0.8, faceY + faceR * 0.58);
        huGrad.addColorStop(0, darker); huGrad.addColorStop(0.3, color); huGrad.addColorStop(0.65, lighter); huGrad.addColorStop(1, color);
        ctx.fillStyle = huGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.62, topY + faceR * 0.2);
        // 顔のフレーミングを意識した自然なカーブ
        ctx.bezierCurveTo(cx + s * faceR * 0.85, topY + faceR * 0.42, cx + s * faceR * 0.82, faceY + faceR * 0.1, cx + s * faceR * 0.72, faceY + faceR * 0.42);
        // 毛先（ゆるい内巻き）
        ctx.bezierCurveTo(cx + s * faceR * 0.65, faceY + faceR * 0.55, cx + s * faceR * 0.52, faceY + faceR * 0.52, cx + s * faceR * 0.46, faceY + faceR * 0.4);
        ctx.bezierCurveTo(cx + s * faceR * 0.44, faceY + faceR * 0.25, cx + s * faceR * 0.48, faceY - faceR * 0.02, cx + s * faceR * 0.52, topY + faceR * 0.45);
        ctx.bezierCurveTo(cx + s * faceR * 0.55, topY + faceR * 0.3, cx + s * faceR * 0.58, topY + faceR * 0.2, cx + s * faceR * 0.62, topY + faceR * 0.2);
        ctx.closePath(); ctx.fill();
      });
      // 前髪（ふんわり斜め流し）
      ctx.fillStyle = hairGrad(topY - faceR * 0.12, topY + faceR * 0.45);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.55, topY + faceR * 0.06);
      ctx.bezierCurveTo(cx - faceR * 0.52, topY + faceR * 0.28, cx - faceR * 0.38, topY + faceR * 0.42, cx - faceR * 0.18, topY + faceR * 0.45);
      ctx.bezierCurveTo(cx - faceR * 0.02, topY + faceR * 0.46, cx + faceR * 0.12, topY + faceR * 0.44, cx + faceR * 0.28, topY + faceR * 0.4);
      ctx.bezierCurveTo(cx + faceR * 0.42, topY + faceR * 0.34, cx + faceR * 0.52, topY + faceR * 0.24, cx + faceR * 0.56, topY + faceR * 0.14);
      ctx.lineTo(cx + faceR * 0.6, topY + faceR * 0.02);
      ctx.bezierCurveTo(cx + faceR * 0.46, topY - faceR * 0.18, cx - faceR * 0.44, topY - faceR * 0.18, cx - faceR * 0.58, topY + faceR * 0.02);
      ctx.closePath(); ctx.fill();
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.35, topY + faceR * 0.04, cx - faceR * 0.1, topY - faceR * 0.18, cx + faceR * 0.18, topY - faceR * 0.14],
        [cx + faceR * 0.05, topY + faceR * 0.04, cx + faceR * 0.25, topY - faceR * 0.15, cx + faceR * 0.48, topY - faceR * 0.05]
      ]);
      _drawPartLine(cx - faceR * 0.12, topY - faceR * 0.08, topY + faceR * 0.08);
      _drawStrands([
        [cx - faceR * 0.48, topY + faceR * 0.1, cx - faceR * 0.38, topY + faceR * 0.28, cx - faceR * 0.22, topY + faceR * 0.42],
        [cx - faceR * 0.25, topY + faceR * 0.1, cx - faceR * 0.1, topY + faceR * 0.3, cx + faceR * 0.05, topY + faceR * 0.44],
        [cx + faceR * 0.05, topY + faceR * 0.1, cx + faceR * 0.18, topY + faceR * 0.28, cx + faceR * 0.32, topY + faceR * 0.38],
        [cx + faceR * 0.28, topY + faceR * 0.1, cx + faceR * 0.4, topY + faceR * 0.22, cx + faceR * 0.5, topY + faceR * 0.3],
        [cx - faceR * 0.52, topY + faceR * 0.08, cx - faceR * 0.4, topY - faceR * 0.06, cx - faceR * 0.2, topY - faceR * 0.12],
        [cx + faceR * 0.12, topY + faceR * 0.04, cx + faceR * 0.3, topY - faceR * 0.1, cx + faceR * 0.5, topY - faceR * 0.02]
      ]);
      break;
    case 14: // マッシュ — 丸いマッシュルームシルエット
      // ベースの丸いシルエット（耳が隠れる大きさ）
      ctx.fillStyle = hairGrad(topY - faceR * 0.35, topY + faceR * 0.5);
      hairCapFill(cx, topY + faceR * 0.15, faceR * 0.85, null, Math.PI * 0.75, Math.PI * 2.25);
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
      hairCapFill(cx, topY + faceR * 0.12, faceR * 0.82, null, Math.PI * 0.8, Math.PI * 2.2);
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
    case 16: // 外ハネ — 毛先が元気に外にハネるミディアム
      // ベースの頭頂部（ふんわり丸い）
      ctx.fillStyle = hairGrad(topY - faceR * 0.35, topY + faceR * 0.5);
      hairCapFill(cx, topY + faceR * 0.1, faceR * 0.82, null, Math.PI * 0.82, Math.PI * 2.18);
      // サイドの髪（外ハネ — 毛先が勢いよく外側へ）
      [-1, 1].forEach(function(s) {
        var ohSideGrad = ctx.createLinearGradient(cx + s * faceR * 0.45, topY, cx + s * faceR * 0.88, faceY + faceR * 0.55);
        ohSideGrad.addColorStop(0, darker); ohSideGrad.addColorStop(0.3, color); ohSideGrad.addColorStop(0.6, lighter); ohSideGrad.addColorStop(1, color);
        ctx.fillStyle = ohSideGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.68, topY + faceR * 0.12);
        // 顔に沿って自然に流れるサイドライン
        ctx.bezierCurveTo(cx + s * faceR * 0.9, topY + faceR * 0.35, cx + s * faceR * 0.88, faceY + faceR * 0.02, cx + s * faceR * 0.78, faceY + faceR * 0.28);
        // 外ハネ！（毛先が外側へぴょんと跳ねる）
        ctx.bezierCurveTo(cx + s * faceR * 0.82, faceY + faceR * 0.42, cx + s * faceR * 0.92, faceY + faceR * 0.5, cx + s * faceR * 0.98, faceY + faceR * 0.42);
        // ハネの先端から丸く戻る
        ctx.bezierCurveTo(cx + s * faceR * 1.0, faceY + faceR * 0.35, cx + s * faceR * 0.92, faceY + faceR * 0.25, cx + s * faceR * 0.82, faceY + faceR * 0.15);
        // 内側を戻る
        ctx.bezierCurveTo(cx + s * faceR * 0.7, faceY - faceR * 0.02, cx + s * faceR * 0.58, topY + faceR * 0.4, cx + s * faceR * 0.58, topY + faceR * 0.25);
        ctx.bezierCurveTo(cx + s * faceR * 0.6, topY + faceR * 0.15, cx + s * faceR * 0.64, topY + faceR * 0.12, cx + s * faceR * 0.68, topY + faceR * 0.12);
        ctx.closePath(); ctx.fill();
      });
      // 前髪（ふんわり斜め流し）
      ctx.fillStyle = hairGrad(topY - faceR * 0.12, topY + faceR * 0.48);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.58, topY + faceR * 0.08);
      ctx.bezierCurveTo(cx - faceR * 0.52, topY + faceR * 0.3, cx - faceR * 0.38, topY + faceR * 0.46, cx - faceR * 0.18, topY + faceR * 0.48);
      ctx.bezierCurveTo(cx - faceR * 0.02, topY + faceR * 0.48, cx + faceR * 0.12, topY + faceR * 0.46, cx + faceR * 0.28, topY + faceR * 0.42);
      ctx.bezierCurveTo(cx + faceR * 0.42, topY + faceR * 0.36, cx + faceR * 0.52, topY + faceR * 0.26, cx + faceR * 0.58, topY + faceR * 0.14);
      ctx.lineTo(cx + faceR * 0.62, topY + faceR * 0.04);
      ctx.bezierCurveTo(cx + faceR * 0.5, topY - faceR * 0.18, cx - faceR * 0.48, topY - faceR * 0.18, cx - faceR * 0.6, topY + faceR * 0.04);
      ctx.closePath(); ctx.fill();
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.42, topY + faceR * 0.08, cx - faceR * 0.18, topY - faceR * 0.22, cx + faceR * 0.15, topY - faceR * 0.18],
        [cx - faceR * 0.02, topY + faceR * 0.1, cx + faceR * 0.2, topY - faceR * 0.2, cx + faceR * 0.48, topY - faceR * 0.1]
      ]);
      _drawPartLine(cx - faceR * 0.12, topY - faceR * 0.1, topY + faceR * 0.1);
      _drawStrands([
        [cx - faceR * 0.52, topY + faceR * 0.12, cx - faceR * 0.42, topY + faceR * 0.32, cx - faceR * 0.25, topY + faceR * 0.46],
        [cx - faceR * 0.35, topY + faceR * 0.14, cx - faceR * 0.2, topY + faceR * 0.35, cx - faceR * 0.05, topY + faceR * 0.46],
        [cx - faceR * 0.15, topY + faceR * 0.14, cx + faceR * 0.02, topY + faceR * 0.35, cx + faceR * 0.18, topY + faceR * 0.42],
        [cx + faceR * 0.08, topY + faceR * 0.16, cx + faceR * 0.22, topY + faceR * 0.32, cx + faceR * 0.38, topY + faceR * 0.4],
        [cx + faceR * 0.28, topY + faceR * 0.14, cx + faceR * 0.4, topY + faceR * 0.26, cx + faceR * 0.52, topY + faceR * 0.32],
        [cx - faceR * 0.56, topY + faceR * 0.1, cx - faceR * 0.45, topY - faceR * 0.05, cx - faceR * 0.28, topY - faceR * 0.12],
        [cx + faceR * 0.15, topY + faceR * 0.06, cx + faceR * 0.32, topY - faceR * 0.1, cx + faceR * 0.5, topY - faceR * 0.04]
      ]);
      break;
    case 17: // ベリーショート — 坊主に近い超短髪
      // 非常に短い髪のベース（頭皮にぴったり）
      ctx.fillStyle = hairGrad(topY - faceR * 0.15, topY + faceR * 0.25);
      // ヘアーキャップ（デフォルトの半分サイズ）
      ctx.beginPath(); ctx.arc(cx, topY + faceR * 0.1, faceR * 0.29, Math.PI, 2 * Math.PI); ctx.fill();
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
    case 18: // ゆるふわ — ふんわりパーマ、エアリーなボリューム感
      // ベースの頭頂部（大きめ、ふわっとボリューム）
      ctx.fillStyle = hairGrad(topY - faceR * 0.42, topY + faceR * 0.5);
      hairCapFill(cx, topY + faceR * 0.1, faceR * 0.92, null, Math.PI * 0.65, Math.PI * 2.35);
      // サイドのふわふわ髪（柔らかいカール感）
      [-1, 1].forEach(function(s) {
        var yfSideGrad = ctx.createLinearGradient(cx + s * faceR * 0.45, topY, cx + s * faceR * 1.0, faceY + faceR * 0.78);
        yfSideGrad.addColorStop(0, darker); yfSideGrad.addColorStop(0.2, color); yfSideGrad.addColorStop(0.45, lighter); yfSideGrad.addColorStop(0.7, color); yfSideGrad.addColorStop(1, darker);
        ctx.fillStyle = yfSideGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.76, topY + faceR * 0.08);
        // ふわっと大きく膨らむシルエット
        ctx.bezierCurveTo(cx + s * faceR * 1.05, topY + faceR * 0.3, cx + s * faceR * 0.98, faceY - faceR * 0.12, cx + s * faceR * 1.04, faceY + faceR * 0.15);
        // カール感のある中間部（やわらかいS字）
        ctx.bezierCurveTo(cx + s * faceR * 1.02, faceY + faceR * 0.35, cx + s * faceR * 0.9, faceY + faceR * 0.45, cx + s * faceR * 0.96, faceY + faceR * 0.55);
        // もうひとつのカール
        ctx.bezierCurveTo(cx + s * faceR * 0.98, faceY + faceR * 0.68, cx + s * faceR * 0.85, faceY + faceR * 0.75, cx + s * faceR * 0.72, faceY + faceR * 0.7);
        // 毛先（ふんわりと空気を含むように終わる）
        ctx.bezierCurveTo(cx + s * faceR * 0.62, faceY + faceR * 0.65, cx + s * faceR * 0.55, faceY + faceR * 0.48, ctx.canvas ? cx + s * faceR * 0.55 : cx + s * faceR * 0.55, faceY + faceR * 0.25);
        // 内側を戻る
        ctx.bezierCurveTo(cx + s * faceR * 0.56, faceY - faceR * 0.05, cx + s * faceR * 0.6, topY + faceR * 0.35, cx + s * faceR * 0.62, topY + faceR * 0.18);
        ctx.bezierCurveTo(cx + s * faceR * 0.65, topY + faceR * 0.1, cx + s * faceR * 0.7, topY + faceR * 0.08, cx + s * faceR * 0.74, topY + faceR * 0.08);
        ctx.closePath(); ctx.fill();
      });
      // ふんわりカールバングス（エアリー前髪）
      ctx.fillStyle = hairGrad(topY - faceR * 0.14, topY + faceR * 0.5);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.62, topY + faceR * 0.08);
      ctx.bezierCurveTo(cx - faceR * 0.52, topY - faceR * 0.22, cx + faceR * 0.52, topY - faceR * 0.22, cx + faceR * 0.65, topY + faceR * 0.06);
      ctx.lineTo(cx + faceR * 0.62, topY + faceR * 0.18);
      // 束感のあるカール前髪（波打つ下端）
      ctx.bezierCurveTo(cx + faceR * 0.55, topY + faceR * 0.38, cx + faceR * 0.42, topY + faceR * 0.48, cx + faceR * 0.28, topY + faceR * 0.44);
      ctx.bezierCurveTo(cx + faceR * 0.18, topY + faceR * 0.4, cx + faceR * 0.1, topY + faceR * 0.48, cx, topY + faceR * 0.46);
      ctx.bezierCurveTo(cx - faceR * 0.1, topY + faceR * 0.5, cx - faceR * 0.18, topY + faceR * 0.44, cx - faceR * 0.28, topY + faceR * 0.48);
      ctx.bezierCurveTo(cx - faceR * 0.42, topY + faceR * 0.5, cx - faceR * 0.55, topY + faceR * 0.4, cx - faceR * 0.6, topY + faceR * 0.22);
      ctx.closePath(); ctx.fill();
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.48, topY + faceR * 0.08, cx - faceR * 0.22, topY - faceR * 0.24, cx + faceR * 0.08, topY - faceR * 0.2],
        [cx + faceR * 0.08, topY + faceR * 0.08, cx + faceR * 0.32, topY - faceR * 0.22, cx + faceR * 0.55, topY - faceR * 0.1]
      ]);
      _drawPartLine(cx - faceR * 0.05, topY - faceR * 0.12, topY + faceR * 0.08);
      _drawStrands([
        [cx - faceR * 0.55, topY + faceR * 0.12, cx - faceR * 0.45, topY + faceR * 0.32, cx - faceR * 0.32, topY + faceR * 0.46],
        [cx - faceR * 0.32, topY + faceR * 0.12, cx - faceR * 0.18, topY + faceR * 0.35, cx - faceR * 0.02, topY + faceR * 0.48],
        [cx - faceR * 0.08, topY + faceR * 0.14, cx + faceR * 0.08, topY + faceR * 0.38, cx + faceR * 0.2, topY + faceR * 0.46],
        [cx + faceR * 0.12, topY + faceR * 0.12, cx + faceR * 0.28, topY + faceR * 0.32, cx + faceR * 0.42, topY + faceR * 0.42],
        [cx + faceR * 0.32, topY + faceR * 0.1, cx + faceR * 0.48, topY + faceR * 0.25, cx + faceR * 0.58, topY + faceR * 0.35],
        [cx - faceR * 0.58, topY + faceR * 0.1, cx - faceR * 0.42, topY - faceR * 0.08, cx - faceR * 0.22, topY - faceR * 0.15],
        [cx + faceR * 0.18, topY + faceR * 0.06, cx + faceR * 0.38, topY - faceR * 0.1, cx + faceR * 0.55, topY - faceR * 0.02]
      ]);
      break;
    case 19: // 姫カット — サイド顎ライン切り揃え＋後ろストレートロング
      // ベースの頭頂部（ストレートで滑らかなシルエット）
      ctx.fillStyle = hairGrad(topY - faceR * 0.35, topY + faceR * 0.5);
      hairCapFill(cx, topY + faceR * 0.1, faceR * 0.88, null, Math.PI * 0.72, Math.PI * 2.28);
      // サイドの髪（顎ラインで切り揃え — 姫カットの特徴、ストレートで厚み）
      [-1, 1].forEach(function(s) {
        var hmSideGrad = ctx.createLinearGradient(cx + s * faceR * 0.45, topY, cx + s * faceR * 0.85, faceY + faceR * 0.3);
        hmSideGrad.addColorStop(0, darker); hmSideGrad.addColorStop(0.35, color); hmSideGrad.addColorStop(0.7, lighter); hmSideGrad.addColorStop(1, color);
        ctx.fillStyle = hmSideGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.7, topY + faceR * 0.1);
        ctx.bezierCurveTo(cx + s * faceR * 0.92, topY + faceR * 0.32, cx + s * faceR * 0.9, faceY - faceR * 0.12, cx + s * faceR * 0.85, faceY + faceR * 0.15);
        // 顎ラインで直線的に切り揃え（姫カット特有）
        ctx.lineTo(cx + s * faceR * 0.83, faceY + faceR * 0.25);
        ctx.lineTo(cx + s * faceR * 0.52, faceY + faceR * 0.25);
        // 内側を戻る
        ctx.bezierCurveTo(cx + s * faceR * 0.5, faceY - faceR * 0.05, cx + s * faceR * 0.55, topY + faceR * 0.42, cx + s * faceR * 0.62, topY + faceR * 0.1);
        ctx.closePath(); ctx.fill();
        // 姫カットの切りそろえライン影
        if (detail) {
          ctx.save();
          ctx.strokeStyle = _skinDarker(color, 42);
          ctx.lineWidth = Math.max(0.7, faceR * 0.018);
          ctx.globalAlpha = 0.3;
          ctx.lineCap = 'butt';
          ctx.beginPath();
          ctx.moveTo(cx + s * faceR * 0.54, faceY + faceR * 0.25);
          ctx.lineTo(cx + s * faceR * 0.82, faceY + faceR * 0.25);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      });
      // 後ろの長い髪がサイドから見える（肩を超えるストレート）
      [-1, 1].forEach(function(s) {
        var hmLongGrad = ctx.createLinearGradient(cx + s * faceR * 0.45, faceY + faceR * 0.2, cx + s * faceR * 0.72, faceY + faceR * 0.95);
        hmLongGrad.addColorStop(0, color); hmLongGrad.addColorStop(0.4, lighter); hmLongGrad.addColorStop(0.8, color); hmLongGrad.addColorStop(1, darker);
        ctx.fillStyle = hmLongGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.58, faceY + faceR * 0.25);
        ctx.bezierCurveTo(cx + s * faceR * 0.75, faceY + faceR * 0.38, cx + s * faceR * 0.73, faceY + faceR * 0.68, cx + s * faceR * 0.66, faceY + faceR * 0.92);
        // 毛先（軽やかにテーパー）
        ctx.bezierCurveTo(cx + s * faceR * 0.58, faceY + faceR * 0.95, cx + s * faceR * 0.48, faceY + faceR * 0.85, cx + s * faceR * 0.46, faceY + faceR * 0.65);
        ctx.bezierCurveTo(cx + s * faceR * 0.45, faceY + faceR * 0.45, cx + s * faceR * 0.48, faceY + faceR * 0.32, cx + s * faceR * 0.52, faceY + faceR * 0.25);
        ctx.closePath(); ctx.fill();
      });
      // ぱっつん前髪（姫カットの定番 — 厚みのある束感）
      ctx.fillStyle = hairGrad(topY - faceR * 0.12, topY + faceR * 0.48);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.62, topY + faceR * 0.1);
      ctx.bezierCurveTo(cx - faceR * 0.48, topY - faceR * 0.18, cx + faceR * 0.48, topY - faceR * 0.18, cx + faceR * 0.62, topY + faceR * 0.1);
      ctx.lineTo(cx + faceR * 0.6, topY + faceR * 0.38);
      // 束感のあるぱっつんライン
      ctx.bezierCurveTo(cx + faceR * 0.52, topY + faceR * 0.43, cx + faceR * 0.42, topY + faceR * 0.41, cx + faceR * 0.3, topY + faceR * 0.43);
      ctx.bezierCurveTo(cx + faceR * 0.18, topY + faceR * 0.45, cx + faceR * 0.08, topY + faceR * 0.43, cx, topY + faceR * 0.44);
      ctx.bezierCurveTo(cx - faceR * 0.08, topY + faceR * 0.45, cx - faceR * 0.18, topY + faceR * 0.43, cx - faceR * 0.3, topY + faceR * 0.44);
      ctx.bezierCurveTo(cx - faceR * 0.42, topY + faceR * 0.45, cx - faceR * 0.52, topY + faceR * 0.43, cx - faceR * 0.6, topY + faceR * 0.38);
      ctx.closePath(); ctx.fill();
      // ぱっつんの影
      if (detail) {
        ctx.save();
        ctx.strokeStyle = _skinDarker(color, 42);
        ctx.lineWidth = Math.max(0.7, faceR * 0.018);
        ctx.globalAlpha = 0.3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - faceR * 0.58, topY + faceR * 0.4);
        ctx.bezierCurveTo(cx - faceR * 0.3, topY + faceR * 0.45, cx + faceR * 0.3, topY + faceR * 0.45, cx + faceR * 0.58, topY + faceR * 0.4);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.38, topY + faceR * 0.08, cx - faceR * 0.12, topY - faceR * 0.22, cx + faceR * 0.18, topY - faceR * 0.18],
        [cx + faceR * 0.02, topY + faceR * 0.06, cx + faceR * 0.25, topY - faceR * 0.18, cx + faceR * 0.48, topY - faceR * 0.08]
      ]);
      _drawPartLine(cx, topY - faceR * 0.1, topY + faceR * 0.1);
      _drawStrands([
        [cx - faceR * 0.54, topY + faceR * 0.12, cx - faceR * 0.5, topY + faceR * 0.28, cx - faceR * 0.45, topY + faceR * 0.42],
        [cx - faceR * 0.36, topY + faceR * 0.1, cx - faceR * 0.32, topY + faceR * 0.28, cx - faceR * 0.28, topY + faceR * 0.43],
        [cx - faceR * 0.18, topY + faceR * 0.1, cx - faceR * 0.14, topY + faceR * 0.28, cx - faceR * 0.08, topY + faceR * 0.44],
        [cx + faceR * 0.05, topY + faceR * 0.1, cx + faceR * 0.1, topY + faceR * 0.28, cx + faceR * 0.15, topY + faceR * 0.43],
        [cx + faceR * 0.25, topY + faceR * 0.1, cx + faceR * 0.3, topY + faceR * 0.28, cx + faceR * 0.35, topY + faceR * 0.43],
        [cx + faceR * 0.45, topY + faceR * 0.12, cx + faceR * 0.5, topY + faceR * 0.28, cx + faceR * 0.55, topY + faceR * 0.41],
        [cx - faceR * 0.6, topY + faceR * 0.1, cx - faceR * 0.48, topY - faceR * 0.04, cx - faceR * 0.3, topY - faceR * 0.12],
        [cx + faceR * 0.2, topY + faceR * 0.06, cx + faceR * 0.38, topY - faceR * 0.08, cx + faceR * 0.55, topY]
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
    case 21: // クレオ — クレオパトラ風（重厚なぱっつん前髪＋ストレートサイド＋肩で切り揃え）
      // ベースの頭頂部（滑らかで重厚なシルエット）
      ctx.fillStyle = hairGrad(topY - faceR * 0.35, topY + faceR * 0.5);
      hairCapFill(cx, topY + faceR * 0.08, faceR * 0.88, null, Math.PI * 0.72, Math.PI * 2.28);
      // サイドの直線的な髪（ストレートで肩まで、外側にやや広がる台形）
      [-1, 1].forEach(function(s) {
        var cleoGrad = ctx.createLinearGradient(cx + s * faceR * 0.45, topY, cx + s * faceR * 0.9, faceY + faceR * 0.75);
        cleoGrad.addColorStop(0, darker); cleoGrad.addColorStop(0.2, color); cleoGrad.addColorStop(0.5, lighter); cleoGrad.addColorStop(0.8, color); cleoGrad.addColorStop(1, darker);
        ctx.fillStyle = cleoGrad;
        ctx.beginPath();
        ctx.moveTo(cx + s * faceR * 0.72, topY + faceR * 0.08);
        // 外側ライン — わずかにA字に広がりながら下へ
        ctx.bezierCurveTo(cx + s * faceR * 0.92, topY + faceR * 0.28, cx + s * faceR * 0.95, faceY + faceR * 0.05, cx + s * faceR * 0.9, faceY + faceR * 0.55);
        // 毛先カットライン — スパッと水平に切り揃え
        ctx.lineTo(cx + s * faceR * 0.88, faceY + faceR * 0.7);
        ctx.lineTo(cx + s * faceR * 0.5, faceY + faceR * 0.7);
        // 内側ライン — 顔に沿って上へ
        ctx.bezierCurveTo(cx + s * faceR * 0.52, faceY + faceR * 0.3, cx + s * faceR * 0.56, topY + faceR * 0.48, cx + s * faceR * 0.62, topY + faceR * 0.08);
        ctx.closePath(); ctx.fill();
        // カットラインの影（スパッと感を強調）
        if (detail) {
          ctx.save();
          ctx.strokeStyle = _skinDarker(color, 45);
          ctx.lineWidth = Math.max(0.8, faceR * 0.02);
          ctx.globalAlpha = 0.3;
          ctx.lineCap = 'butt';
          ctx.beginPath();
          ctx.moveTo(cx + s * faceR * 0.52, faceY + faceR * 0.7);
          ctx.lineTo(cx + s * faceR * 0.87, faceY + faceR * 0.7);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      });
      // ぱっつん前髪（クレオパトラの象徴 — 眉上で水平、重厚感）
      ctx.fillStyle = hairGrad(topY - faceR * 0.18, topY + faceR * 0.44);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.7, topY + faceR * 0.06);
      ctx.bezierCurveTo(cx - faceR * 0.56, topY - faceR * 0.22, cx + faceR * 0.56, topY - faceR * 0.22, cx + faceR * 0.7, topY + faceR * 0.06);
      ctx.lineTo(cx + faceR * 0.68, topY + faceR * 0.34);
      // 水平ライン（わずかなアーチ、束感のある凹凸）
      ctx.bezierCurveTo(cx + faceR * 0.58, topY + faceR * 0.39, cx + faceR * 0.45, topY + faceR * 0.37, cx + faceR * 0.32, topY + faceR * 0.39);
      ctx.bezierCurveTo(cx + faceR * 0.18, topY + faceR * 0.41, cx + faceR * 0.08, topY + faceR * 0.39, cx, topY + faceR * 0.4);
      ctx.bezierCurveTo(cx - faceR * 0.08, topY + faceR * 0.41, cx - faceR * 0.18, topY + faceR * 0.39, cx - faceR * 0.32, topY + faceR * 0.4);
      ctx.bezierCurveTo(cx - faceR * 0.45, topY + faceR * 0.41, cx - faceR * 0.58, topY + faceR * 0.39, cx - faceR * 0.68, topY + faceR * 0.34);
      ctx.closePath(); ctx.fill();
      // 前髪の影ライン
      if (detail) {
        ctx.save();
        ctx.strokeStyle = _skinDarker(color, 45);
        ctx.lineWidth = Math.max(0.8, faceR * 0.02);
        ctx.globalAlpha = 0.35;
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(cx - faceR * 0.66, topY + faceR * 0.36);
        ctx.bezierCurveTo(cx - faceR * 0.32, topY + faceR * 0.41, cx + faceR * 0.32, topY + faceR * 0.41, cx + faceR * 0.66, topY + faceR * 0.36);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      // シャイン（頭頂部の天使の輪 — クレオパトラの艶やかさ）
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.48, topY + faceR * 0.02, cx - faceR * 0.18, topY - faceR * 0.24, cx + faceR * 0.15, topY - faceR * 0.2],
        [cx - faceR * 0.05, topY + faceR * 0.05, cx + faceR * 0.22, topY - faceR * 0.22, cx + faceR * 0.52, topY - faceR * 0.1]
      ]);
      // ストランド（縦方向の直線的な流れ — クレオパトラのストレート感）
      _drawStrands([
        [cx - faceR * 0.58, topY + faceR * 0.08, cx - faceR * 0.56, topY + faceR * 0.22, cx - faceR * 0.54, topY + faceR * 0.38],
        [cx - faceR * 0.4, topY + faceR * 0.06, cx - faceR * 0.38, topY + faceR * 0.2, cx - faceR * 0.36, topY + faceR * 0.38],
        [cx - faceR * 0.2, topY + faceR * 0.06, cx - faceR * 0.19, topY + faceR * 0.2, cx - faceR * 0.18, topY + faceR * 0.39],
        [cx, topY + faceR * 0.06, cx, topY + faceR * 0.2, cx, topY + faceR * 0.4],
        [cx + faceR * 0.2, topY + faceR * 0.06, cx + faceR * 0.2, topY + faceR * 0.2, cx + faceR * 0.2, topY + faceR * 0.39],
        [cx + faceR * 0.4, topY + faceR * 0.06, cx + faceR * 0.4, topY + faceR * 0.2, cx + faceR * 0.4, topY + faceR * 0.38],
        [cx + faceR * 0.58, topY + faceR * 0.08, cx + faceR * 0.58, topY + faceR * 0.22, cx + faceR * 0.58, topY + faceR * 0.36],
        // 頭頂部→左右への放射状（ストレートの艶）
        [cx - faceR * 0.12, topY - faceR * 0.12, cx - faceR * 0.32, topY - faceR * 0.06, cx - faceR * 0.52, topY + faceR * 0.04],
        [cx + faceR * 0.12, topY - faceR * 0.12, cx + faceR * 0.32, topY - faceR * 0.06, cx + faceR * 0.52, topY + faceR * 0.04]
      ]);
      break;
    case 22: // アフロ — large round afro
      ctx.fillStyle = hairGrad(topY - faceR * 0.9, faceY + faceR * 0.5);
      ctx.beginPath();
      ctx.arc(cx, topY - faceR * 0.05, faceR * 1.25, 0, Math.PI * 2);
      ctx.fill();
      // ボリューム感の影
      if (detail) {
        var afroInner = ctx.createRadialGradient(cx, topY - faceR * 0.05, faceR * 0.6, cx, topY - faceR * 0.05, faceR * 1.25);
        afroInner.addColorStop(0, 'rgba(0,0,0,0)');
        afroInner.addColorStop(0.7, 'rgba(0,0,0,0.08)');
        afroInner.addColorStop(1, 'rgba(0,0,0,0.15)');
        ctx.fillStyle = afroInner;
        ctx.beginPath(); ctx.arc(cx, topY - faceR * 0.05, faceR * 1.25, 0, Math.PI * 2); ctx.fill();
      }
      // シャイン
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.5, topY - faceR * 0.5, cx - faceR * 0.1, topY - faceR * 0.9, cx + faceR * 0.3, topY - faceR * 0.7],
        [cx + faceR * 0.1, topY - faceR * 0.4, cx + faceR * 0.4, topY - faceR * 0.85, cx + faceR * 0.6, topY - faceR * 0.5]
      ]);
      break;
    case 23: // モヒカン — mohawk, tall center strip
      // 頭頂部ベース
      ctx.fillStyle = hairGrad(topY - faceR * 0.8, topY + faceR * 0.3);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.12, topY + faceR * 0.15);
      ctx.bezierCurveTo(cx - faceR * 0.15, topY - faceR * 0.3, cx - faceR * 0.1, topY - faceR * 0.7, cx, topY - faceR * 0.8);
      ctx.bezierCurveTo(cx + faceR * 0.1, topY - faceR * 0.7, cx + faceR * 0.15, topY - faceR * 0.3, cx + faceR * 0.12, topY + faceR * 0.15);
      ctx.closePath(); ctx.fill();
      // サイドの刈り上げ部分（薄い影で表現）
      if (detail) {
        [-1, 1].forEach(function(s) {
          ctx.fillStyle = 'rgba(0,0,0,0.06)';
          ctx.beginPath();
          ctx.moveTo(cx + s * faceR * 0.12, topY + faceR * 0.15);
          ctx.quadraticCurveTo(cx + s * faceR * 0.5, topY + faceR * 0.05, cx + s * faceR * 0.7, topY + faceR * 0.2);
          ctx.lineTo(cx + s * faceR * 0.65, topY + faceR * 0.3);
          ctx.quadraticCurveTo(cx + s * faceR * 0.4, topY + faceR * 0.2, cx + s * faceR * 0.12, topY + faceR * 0.25);
          ctx.closePath(); ctx.fill();
        });
      }
      // シャイン
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.05, topY - faceR * 0.2, cx, topY - faceR * 0.65, cx + faceR * 0.05, topY - faceR * 0.3]
      ]);
      break;
    case 24: // 三つ編み — braids hanging down sides
      // 頭頂部ベース
      ctx.fillStyle = hairGrad(topY - faceR * 0.3, topY + faceR * 0.4);
      // ヘアーキャップ（デフォルトの半分サイズ）
      ctx.beginPath(); ctx.arc(cx, topY + faceR * 0.08, faceR * 0.425, Math.PI * 0.75, Math.PI * 2.25); ctx.fill();
      // 分け目ライン
      if (detail) {
        ctx.strokeStyle = darker;
        ctx.lineWidth = Math.max(0.5, faceR * 0.015);
        ctx.globalAlpha = 0.2;
        ctx.beginPath(); ctx.moveTo(cx, topY - faceR * 0.15); ctx.lineTo(cx, topY + faceR * 0.15); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // 左右の三つ編み
      [-1, 1].forEach(function(s) {
        var braidX = cx + s * faceR * 0.7;
        var braidStartY = topY + faceR * 0.35;
        ctx.fillStyle = color;
        // 編み目を3段で表現
        for (var bi = 0; bi < 5; bi++) {
          var by = braidStartY + bi * faceR * 0.18;
          var boff = (bi % 2 === 0) ? s * faceR * 0.03 : -s * faceR * 0.03;
          ctx.fillStyle = (bi % 2 === 0) ? color : lighter;
          ctx.beginPath(); ctx.ellipse(braidX + boff, by, faceR * 0.08, faceR * 0.1, 0, 0, Math.PI * 2); ctx.fill();
        }
        // 毛先
        ctx.fillStyle = lighter;
        ctx.beginPath(); ctx.arc(braidX, braidStartY + faceR * 0.9, faceR * 0.04, 0, Math.PI * 2); ctx.fill();
      });
      // シャイン
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.4, topY + faceR * 0.0, cx - faceR * 0.1, topY - faceR * 0.2, cx + faceR * 0.2, topY - faceR * 0.15]
      ]);
      break;
    case 25: // カーリー — tight curls all around
      // ベースのカーリーシルエット
      ctx.fillStyle = hairGrad(topY - faceR * 0.5, faceY + faceR * 0.3);
      ctx.beginPath(); ctx.arc(cx, topY + faceR * 0.05, faceR * 1.05, 0, Math.PI * 2); ctx.fill();
      // カールのテクスチャ（小さな円の集合）
      if (detail) {
        ctx.fillStyle = lighter;
        ctx.globalAlpha = 0.25;
        for (var ci = 0; ci < 30; ci++) {
          var cAngle = (ci / 30) * Math.PI * 2;
          var cDist = faceR * (0.55 + Math.random() * 0.4);
          var ccx = cx + Math.cos(cAngle) * cDist;
          var ccy = topY + faceR * 0.05 + Math.sin(cAngle) * cDist;
          var csr = faceR * (0.06 + Math.random() * 0.05);
          ctx.beginPath(); ctx.arc(ccx, ccy, csr, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // 暗い部分のカール
        ctx.fillStyle = darker;
        ctx.globalAlpha = 0.15;
        for (var ci2 = 0; ci2 < 20; ci2++) {
          var cAngle2 = (ci2 / 20) * Math.PI * 2 + 0.3;
          var cDist2 = faceR * (0.5 + Math.random() * 0.45);
          var ccx2 = cx + Math.cos(cAngle2) * cDist2;
          var ccy2 = topY + faceR * 0.05 + Math.sin(cAngle2) * cDist2;
          var csr2 = faceR * (0.05 + Math.random() * 0.04);
          ctx.beginPath(); ctx.arc(ccx2, ccy2, csr2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      // シャイン
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.4, topY - faceR * 0.15, cx, topY - faceR * 0.55, cx + faceR * 0.35, topY - faceR * 0.2]
      ]);
      break;
    case 26: // ソフモヒ — soft mohawk, gentle center volume
      // ベース頭髪（サイドは短め）
      ctx.fillStyle = hairGrad(topY - faceR * 0.3, topY + faceR * 0.35);
      ctx.beginPath();
      ctx.arc(cx, topY + faceR * 0.1, faceR * 0.82, Math.PI * 0.8, Math.PI * 2.2);
      ctx.fill();
      // 中央の膨らみ（ソフトに盛り上がる）
      ctx.fillStyle = hairGrad(topY - faceR * 0.55, topY + faceR * 0.2);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.25, topY + faceR * 0.15);
      ctx.bezierCurveTo(cx - faceR * 0.28, topY - faceR * 0.15, cx - faceR * 0.15, topY - faceR * 0.45, cx, topY - faceR * 0.5);
      ctx.bezierCurveTo(cx + faceR * 0.15, topY - faceR * 0.45, cx + faceR * 0.28, topY - faceR * 0.15, cx + faceR * 0.25, topY + faceR * 0.15);
      ctx.closePath(); ctx.fill();
      // サイドのグラデーション（刈り上げ風）
      if (detail) {
        [-1, 1].forEach(function(s) {
          var sideGrad = ctx.createLinearGradient(cx + s * faceR * 0.25, topY, cx + s * faceR * 0.75, topY);
          sideGrad.addColorStop(0, 'rgba(0,0,0,0)');
          sideGrad.addColorStop(1, 'rgba(0,0,0,0.08)');
          ctx.fillStyle = sideGrad;
          ctx.beginPath();
          ctx.arc(cx, topY + faceR * 0.1, faceR * 0.82, s > 0 ? Math.PI * 1.7 : Math.PI * 0.8, s > 0 ? Math.PI * 2.2 : Math.PI * 1.3);
          ctx.lineTo(cx, topY + faceR * 0.1);
          ctx.closePath(); ctx.fill();
        });
      }
      // シャイン
      _drawHairShine(ctx, cx, topY, faceR, color, [
        [cx - faceR * 0.1, topY - faceR * 0.1, cx, topY - faceR * 0.4, cx + faceR * 0.1, topY - faceR * 0.15]
      ]);
      break;
  }
  ctx.restore();
}

function drawAccessory(ctx, cx, faceY, eyeY, faceR, eyeSpacing, acc, hairColor, accYOff, accScale) {
  if (acc === 0) return;
  accYOff = accYOff || 0;
  accScale = accScale || 1;
  var lx = cx - eyeSpacing, rx = cx + eyeSpacing;
  var detail = faceR >= 20;
  ctx.save();
  // 位置・大きさ調整を適用
  ctx.translate(cx, eyeY + accYOff);
  ctx.scale(accScale, accScale);
  ctx.translate(-cx, -(eyeY + accYOff));
  ctx.translate(0, accYOff);
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
    case 8: // ピアス — earring studs on both sides
      [-1, 1].forEach(function(s) {
        var earX = cx + s * (faceR * 0.95 + faceR * 0.05);
        var earPY = faceY + faceR * 0.05;
        // ピアス本体（小さな光るスタッド）
        var piGrad = ctx.createRadialGradient(earX, earPY, 0, earX, earPY, faceR * 0.04);
        piGrad.addColorStop(0, '#FFFFFF');
        piGrad.addColorStop(0.3, '#E8E8E8');
        piGrad.addColorStop(0.6, '#C0C0C0');
        piGrad.addColorStop(1, '#909090');
        ctx.fillStyle = piGrad;
        ctx.beginPath(); ctx.arc(earX, earPY, faceR * 0.04, 0, Math.PI * 2); ctx.fill();
        // 光沢ハイライト
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.arc(earX - faceR * 0.01, earPY - faceR * 0.01, faceR * 0.015, 0, Math.PI * 2); ctx.fill();
      });
      break;
    case 9: // ネックレス — thin chain necklace
      var neckY = faceY + faceR * 0.85;
      // チェーン
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = Math.max(0.8, faceR * 0.02);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.28, neckY);
      ctx.quadraticCurveTo(cx, neckY + faceR * 0.2, cx + faceR * 0.28, neckY);
      ctx.stroke();
      // ペンダント（小さなダイヤ）
      ctx.fillStyle = '#D4AF37';
      ctx.beginPath();
      ctx.moveTo(cx, neckY + faceR * 0.17);
      ctx.lineTo(cx + faceR * 0.03, neckY + faceR * 0.21);
      ctx.lineTo(cx, neckY + faceR * 0.26);
      ctx.lineTo(cx - faceR * 0.03, neckY + faceR * 0.21);
      ctx.closePath(); ctx.fill();
      // ハイライト
      if (detail) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.arc(cx - faceR * 0.01, neckY + faceR * 0.2, faceR * 0.012, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 10: // 花冠 — flower crown across top of head
      var crownY = faceY - faceR * 0.92;
      var flowerCount = 7;
      for (var fi = 0; fi < flowerCount; fi++) {
        var fAngle = Math.PI * 1.15 + (fi / (flowerCount - 1)) * Math.PI * 0.7;
        var fx = cx + Math.cos(fAngle) * faceR * 1.02;
        var fy = faceY + Math.sin(fAngle) * faceR * 1.02;
        var fSize = faceR * 0.06;
        // 花びら
        var petalColors = ['#FF9AA2','#FFB7B2','#FFDAC1','#E2F0CB','#B5EAD7','#C7CEEA','#FF9AA2'];
        ctx.fillStyle = petalColors[fi % petalColors.length];
        for (var pi = 0; pi < 5; pi++) {
          var pa = (pi / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(fx + Math.cos(pa) * fSize * 0.5, fy + Math.sin(pa) * fSize * 0.5, fSize * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
        // 花の中心
        ctx.fillStyle = '#FFE066';
        ctx.beginPath(); ctx.arc(fx, fy, fSize * 0.3, 0, Math.PI * 2); ctx.fill();
      }
      // つる（花をつなぐ線）
      if (detail) {
        ctx.strokeStyle = '#7CB342';
        ctx.lineWidth = Math.max(0.5, faceR * 0.015);
        ctx.beginPath();
        ctx.arc(cx, faceY, faceR * 1.02, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      }
      break;
    case 11: // ベレー帽 — beret, tilted flat cap
      // ベレー帽本体
      var beretGrad = ctx.createRadialGradient(cx - faceR * 0.15, faceY - faceR * 1.05, faceR * 0.1, cx, faceY - faceR * 0.7, faceR * 0.8);
      beretGrad.addColorStop(0, '#2c3e50');
      beretGrad.addColorStop(0.5, '#34495e');
      beretGrad.addColorStop(1, '#2c3e50');
      ctx.fillStyle = beretGrad;
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.85, faceY - faceR * 0.8);
      ctx.bezierCurveTo(cx - faceR * 0.9, faceY - faceR * 1.2, cx + faceR * 0.3, faceY - faceR * 1.4, cx + faceR * 0.7, faceY - faceR * 1.0);
      ctx.quadraticCurveTo(cx + faceR * 0.8, faceY - faceR * 0.85, cx + faceR * 0.75, faceY - faceR * 0.8);
      ctx.lineTo(cx - faceR * 0.85, faceY - faceR * 0.8);
      ctx.closePath(); ctx.fill();
      // 縁のライン
      ctx.strokeStyle = '#1a252f';
      ctx.lineWidth = Math.max(0.8, faceR * 0.025);
      ctx.beginPath();
      ctx.moveTo(cx - faceR * 0.85, faceY - faceR * 0.8);
      ctx.lineTo(cx + faceR * 0.75, faceY - faceR * 0.8);
      ctx.stroke();
      // 頂点のちょこん
      if (detail) {
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath(); ctx.arc(cx - faceR * 0.05, faceY - faceR * 1.28, faceR * 0.04, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 12: // ヘッドフォン — headphones with band across top
      // ヘッドバンド
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = Math.max(1, faceR * 0.04);
      ctx.beginPath();
      ctx.arc(cx, faceY - faceR * 0.1, faceR * 1.08, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      // イヤーパッド（左右）
      [-1, 1].forEach(function(s) {
        var hpX = cx + s * faceR * 1.02;
        var hpY = faceY + faceR * 0.05;
        // パッド外側
        var padGrad = ctx.createLinearGradient(hpX - s * faceR * 0.12, hpY, hpX + s * faceR * 0.12, hpY);
        padGrad.addColorStop(0, '#444444');
        padGrad.addColorStop(0.5, '#555555');
        padGrad.addColorStop(1, '#333333');
        ctx.fillStyle = padGrad;
        ctx.beginPath(); ctx.ellipse(hpX, hpY, faceR * 0.12, faceR * 0.18, 0, 0, Math.PI * 2); ctx.fill();
        // パッド内側のクッション
        ctx.fillStyle = '#222222';
        ctx.beginPath(); ctx.ellipse(hpX, hpY, faceR * 0.08, faceR * 0.14, 0, 0, Math.PI * 2); ctx.fill();
        // ハイライト
        if (detail) {
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.beginPath(); ctx.ellipse(hpX - s * faceR * 0.03, hpY - faceR * 0.05, faceR * 0.04, faceR * 0.06, 0, 0, Math.PI * 2); ctx.fill();
        }
      });
      break;
  }
  ctx.restore();
}

// ====== 動物キャラ描画 ======
function renderAnimalAvatar(size, species, bgColor, eyeType, mouthType, accessories, cheekType, sizeFaceVal) {
  var canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  var ctx = canvas.getContext('2d');
  var cx = size / 2, cy = size / 2, r = size / 2;
  var colors = AB_ANIMAL_COLORS[species] || AB_ANIMAL_COLORS[1];

  // 背景円
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = bgColor; ctx.fill();

  var sizeAdj = 1 + (sizeFaceVal || 0) * 0.08;
  var faceR = r * 0.62 * sizeAdj;
  var faceY = cy + r * 0.06;

  // 動物ごとの特徴描画
  switch (species) {
    case 1: drawAnimalChick(ctx, cx, faceY, faceR, colors); break;
    case 2: drawAnimalCat(ctx, cx, faceY, faceR, colors); break;
    case 3: drawAnimalDog(ctx, cx, faceY, faceR, colors); break;
    case 4: drawAnimalRabbit(ctx, cx, faceY, faceR, colors); break;
    case 5: drawAnimalBear(ctx, cx, faceY, faceR, colors); break;
    case 6: drawAnimalPanda(ctx, cx, faceY, faceR, colors); break;
    case 7: drawAnimalPenguin(ctx, cx, faceY, faceR, colors); break;
    case 8: drawAnimalTanuki(ctx, cx, faceY, faceR, colors); break;
    case 9: drawAnimalFox(ctx, cx, faceY, faceR, colors); break;
    case 10: drawAnimalFrog(ctx, cx, faceY, faceR, colors); break;
    case 11: drawAnimalHamster(ctx, cx, faceY, faceR, colors); break;
    case 12: drawAnimalOwl(ctx, cx, faceY, faceR, colors); break;
  }

  // 共通: 目（eyeTypeから簡易表現）
  drawAnimalEyes(ctx, cx, faceY, faceR, eyeType, species);
  // 共通: 口（mouthTypeから簡易表現）
  drawAnimalMouth(ctx, cx, faceY, faceR, mouthType, species);
  // 共通: ほっぺ
  if (cheekType > 0) {
    var cheekAlpha = cheekType === 1 ? 0.25 : cheekType === 2 ? 0.4 : 0.55;
    var cheekR = faceR * 0.18;
    var cheekY = faceY + faceR * 0.15;
    ctx.beginPath(); ctx.arc(cx - faceR * 0.42, cheekY, cheekR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,100,120,' + cheekAlpha + ')'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx + faceR * 0.42, cheekY, cheekR, 0, Math.PI * 2);
    ctx.fill();
  }
  // 共通: アクセサリー（メガネ・リボン等）
  if (accessories && accessories.length > 0) {
    accessories.forEach(function(acc) {
      if (acc > 0) drawAnimalAccessory(ctx, cx, faceY, faceR, acc);
    });
  }
  return canvas.toDataURL('image/png');
}

// ── ひよこ ──
function drawAnimalChick(ctx, cx, fy, fr, c) {
  // 体（丸い）
  ctx.beginPath(); ctx.arc(cx, fy, fr, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
  // お腹
  ctx.beginPath(); ctx.arc(cx, fy + fr * 0.15, fr * 0.65, 0, Math.PI * 2);
  ctx.fillStyle = c.belly; ctx.fill();
  // くちばし
  ctx.beginPath();
  ctx.moveTo(cx - fr * 0.12, fy + fr * 0.08);
  ctx.lineTo(cx, fy + fr * 0.28);
  ctx.lineTo(cx + fr * 0.12, fy + fr * 0.08);
  ctx.closePath();
  ctx.fillStyle = c.accent; ctx.fill();
  // トサカ（頭の上の3つの毛）
  ctx.strokeStyle = c.accent; ctx.lineWidth = fr * 0.06; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx, fy - fr); ctx.lineTo(cx, fy - fr * 1.22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - fr * 0.12, fy - fr * 0.95); ctx.lineTo(cx - fr * 0.08, fy - fr * 1.15); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + fr * 0.12, fy - fr * 0.95); ctx.lineTo(cx + fr * 0.08, fy - fr * 1.15); ctx.stroke();
  // 小さい翼
  ctx.beginPath();
  ctx.ellipse(cx - fr * 0.85, fy + fr * 0.1, fr * 0.22, fr * 0.35, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx + fr * 0.85, fy + fr * 0.1, fr * 0.22, fr * 0.35, 0.3, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill(); ctx.stroke();
}

// ── ねこ ──
function drawAnimalCat(ctx, cx, fy, fr, c) {
  // 耳（三角）
  ctx.beginPath();
  ctx.moveTo(cx - fr * 0.7, fy - fr * 0.55); ctx.lineTo(cx - fr * 0.45, fy - fr * 1.15); ctx.lineTo(cx - fr * 0.1, fy - fr * 0.65);
  ctx.closePath(); ctx.fillStyle = c.body; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - fr * 0.6, fy - fr * 0.6); ctx.lineTo(cx - fr * 0.45, fy - fr * 1.0); ctx.lineTo(cx - fr * 0.2, fy - fr * 0.65);
  ctx.closePath(); ctx.fillStyle = c.accent; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + fr * 0.7, fy - fr * 0.55); ctx.lineTo(cx + fr * 0.45, fy - fr * 1.15); ctx.lineTo(cx + fr * 0.1, fy - fr * 0.65);
  ctx.closePath(); ctx.fillStyle = c.body; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + fr * 0.6, fy - fr * 0.6); ctx.lineTo(cx + fr * 0.45, fy - fr * 1.0); ctx.lineTo(cx + fr * 0.2, fy - fr * 0.65);
  ctx.closePath(); ctx.fillStyle = c.accent; ctx.fill();
  // 顔
  ctx.beginPath(); ctx.arc(cx, fy, fr, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
  // ヒゲ
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = fr * 0.02;
  [-1, 1].forEach(function(dir) {
    ctx.beginPath(); ctx.moveTo(cx + dir * fr * 0.2, fy + fr * 0.12); ctx.lineTo(cx + dir * fr * 0.85, fy + fr * 0.02); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + dir * fr * 0.2, fy + fr * 0.18); ctx.lineTo(cx + dir * fr * 0.82, fy + fr * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + dir * fr * 0.2, fy + fr * 0.24); ctx.lineTo(cx + dir * fr * 0.78, fy + fr * 0.35); ctx.stroke();
  });
  // 鼻
  ctx.beginPath();
  ctx.moveTo(cx, fy + fr * 0.05); ctx.lineTo(cx - fr * 0.06, fy + fr * 0.12); ctx.lineTo(cx + fr * 0.06, fy + fr * 0.12);
  ctx.closePath(); ctx.fillStyle = c.accent; ctx.fill();
}

// ── いぬ ──
function drawAnimalDog(ctx, cx, fy, fr, c) {
  // 垂れ耳
  ctx.beginPath();
  ctx.ellipse(cx - fr * 0.72, fy + fr * 0.1, fr * 0.28, fr * 0.55, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = c.accent; ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + fr * 0.72, fy + fr * 0.1, fr * 0.28, fr * 0.55, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = c.accent; ctx.fill();
  // 顔
  ctx.beginPath(); ctx.arc(cx, fy, fr, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
  // マズル
  ctx.beginPath(); ctx.ellipse(cx, fy + fr * 0.2, fr * 0.35, fr * 0.28, 0, 0, Math.PI * 2);
  ctx.fillStyle = c.belly; ctx.fill();
  // 鼻
  ctx.beginPath(); ctx.ellipse(cx, fy + fr * 0.08, fr * 0.1, fr * 0.07, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1A1A1A'; ctx.fill();
}

// ── うさぎ ──
function drawAnimalRabbit(ctx, cx, fy, fr, c) {
  // 長い耳
  ctx.beginPath();
  ctx.ellipse(cx - fr * 0.3, fy - fr * 1.1, fr * 0.16, fr * 0.55, -0.1, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx - fr * 0.3, fy - fr * 1.1, fr * 0.09, fr * 0.42, -0.1, 0, Math.PI * 2);
  ctx.fillStyle = c.accent; ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + fr * 0.3, fy - fr * 1.1, fr * 0.16, fr * 0.55, 0.1, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + fr * 0.3, fy - fr * 1.1, fr * 0.09, fr * 0.42, 0.1, 0, Math.PI * 2);
  ctx.fillStyle = c.accent; ctx.fill();
  // 顔
  ctx.beginPath(); ctx.arc(cx, fy, fr, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
  // 鼻
  ctx.beginPath();
  ctx.moveTo(cx, fy + fr * 0.05); ctx.lineTo(cx - fr * 0.05, fy + fr * 0.12); ctx.lineTo(cx + fr * 0.05, fy + fr * 0.12);
  ctx.closePath(); ctx.fillStyle = c.accent; ctx.fill();
}

// ── くま ──
function drawAnimalBear(ctx, cx, fy, fr, c) {
  // 丸い耳
  ctx.beginPath(); ctx.arc(cx - fr * 0.65, fy - fr * 0.65, fr * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
  ctx.beginPath(); ctx.arc(cx - fr * 0.65, fy - fr * 0.65, fr * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = c.belly; ctx.fill();
  ctx.beginPath(); ctx.arc(cx + fr * 0.65, fy - fr * 0.65, fr * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
  ctx.beginPath(); ctx.arc(cx + fr * 0.65, fy - fr * 0.65, fr * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = c.belly; ctx.fill();
  // 顔
  ctx.beginPath(); ctx.arc(cx, fy, fr, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
  // マズル
  ctx.beginPath(); ctx.ellipse(cx, fy + fr * 0.2, fr * 0.32, fr * 0.25, 0, 0, Math.PI * 2);
  ctx.fillStyle = c.belly; ctx.fill();
  // 鼻
  ctx.beginPath(); ctx.ellipse(cx, fy + fr * 0.1, fr * 0.1, fr * 0.07, 0, 0, Math.PI * 2);
  ctx.fillStyle = c.accent; ctx.fill();
}

// ── パンダ ──
function drawAnimalPanda(ctx, cx, fy, fr, c) {
  // 丸い耳（黒）
  ctx.beginPath(); ctx.arc(cx - fr * 0.62, fy - fr * 0.62, fr * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = c.accent; ctx.fill();
  ctx.beginPath(); ctx.arc(cx + fr * 0.62, fy - fr * 0.62, fr * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = c.accent; ctx.fill();
  // 顔（白）
  ctx.beginPath(); ctx.arc(cx, fy, fr, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
  // 目の周りの黒パッチ
  ctx.beginPath(); ctx.ellipse(cx - fr * 0.28, fy - fr * 0.08, fr * 0.2, fr * 0.22, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = c.accent; ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + fr * 0.28, fy - fr * 0.08, fr * 0.2, fr * 0.22, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = c.accent; ctx.fill();
  // 鼻
  ctx.beginPath(); ctx.ellipse(cx, fy + fr * 0.12, fr * 0.08, fr * 0.06, 0, 0, Math.PI * 2);
  ctx.fillStyle = c.accent; ctx.fill();
}

// ── ペンギン ──
function drawAnimalPenguin(ctx, cx, fy, fr, c) {
  // 体（黒）
  ctx.beginPath(); ctx.arc(cx, fy, fr, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
  // お腹（白）
  ctx.beginPath(); ctx.ellipse(cx, fy + fr * 0.1, fr * 0.6, fr * 0.72, 0, 0, Math.PI * 2);
  ctx.fillStyle = c.belly; ctx.fill();
  // くちばし
  ctx.beginPath();
  ctx.moveTo(cx - fr * 0.1, fy + fr * 0.08);
  ctx.lineTo(cx, fy + fr * 0.22);
  ctx.lineTo(cx + fr * 0.1, fy + fr * 0.08);
  ctx.closePath();
  ctx.fillStyle = c.accent; ctx.fill();
  // フリッパー
  ctx.beginPath();
  ctx.ellipse(cx - fr * 0.88, fy + fr * 0.15, fr * 0.14, fr * 0.38, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + fr * 0.88, fy + fr * 0.15, fr * 0.14, fr * 0.38, 0.4, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
}

// ── たぬき ──
function drawAnimalTanuki(ctx, cx, fy, fr, c) {
  // 丸い耳
  ctx.beginPath(); ctx.arc(cx - fr * 0.6, fy - fr * 0.7, fr * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
  ctx.beginPath(); ctx.arc(cx + fr * 0.6, fy - fr * 0.7, fr * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
  // 顔
  ctx.beginPath(); ctx.arc(cx, fy, fr, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
  // 目の周りのマーク
  ctx.beginPath(); ctx.ellipse(cx - fr * 0.28, fy - fr * 0.05, fr * 0.18, fr * 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = c.accent; ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + fr * 0.28, fy - fr * 0.05, fr * 0.18, fr * 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = c.accent; ctx.fill();
  // マズル
  ctx.beginPath(); ctx.ellipse(cx, fy + fr * 0.22, fr * 0.28, fr * 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = c.belly; ctx.fill();
  // 鼻
  ctx.beginPath(); ctx.ellipse(cx, fy + fr * 0.12, fr * 0.08, fr * 0.06, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1A1A1A'; ctx.fill();
}

// ── きつね ──
function drawAnimalFox(ctx, cx, fy, fr, c) {
  // 尖り耳
  ctx.beginPath();
  ctx.moveTo(cx - fr * 0.7, fy - fr * 0.45); ctx.lineTo(cx - fr * 0.5, fy - fr * 1.2); ctx.lineTo(cx - fr * 0.15, fy - fr * 0.6);
  ctx.closePath(); ctx.fillStyle = c.body; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - fr * 0.6, fy - fr * 0.5); ctx.lineTo(cx - fr * 0.5, fy - fr * 1.0); ctx.lineTo(cx - fr * 0.25, fy - fr * 0.6);
  ctx.closePath(); ctx.fillStyle = c.accent; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + fr * 0.7, fy - fr * 0.45); ctx.lineTo(cx + fr * 0.5, fy - fr * 1.2); ctx.lineTo(cx + fr * 0.15, fy - fr * 0.6);
  ctx.closePath(); ctx.fillStyle = c.body; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + fr * 0.6, fy - fr * 0.5); ctx.lineTo(cx + fr * 0.5, fy - fr * 1.0); ctx.lineTo(cx + fr * 0.25, fy - fr * 0.6);
  ctx.closePath(); ctx.fillStyle = c.accent; ctx.fill();
  // 顔
  ctx.beginPath(); ctx.arc(cx, fy, fr, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
  // マズル
  ctx.beginPath(); ctx.ellipse(cx, fy + fr * 0.18, fr * 0.3, fr * 0.22, 0, 0, Math.PI * 2);
  ctx.fillStyle = c.belly; ctx.fill();
  // 鼻
  ctx.beginPath(); ctx.ellipse(cx, fy + fr * 0.08, fr * 0.07, fr * 0.05, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1A1A1A'; ctx.fill();
}

// ── かえる ──
function drawAnimalFrog(ctx, cx, fy, fr, c) {
  // 目の突起（上に飛び出す大きな目）
  ctx.beginPath(); ctx.arc(cx - fr * 0.35, fy - fr * 0.75, fr * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
  ctx.beginPath(); ctx.arc(cx - fr * 0.35, fy - fr * 0.75, fr * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = c.belly; ctx.fill();
  ctx.beginPath(); ctx.arc(cx + fr * 0.35, fy - fr * 0.75, fr * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
  ctx.beginPath(); ctx.arc(cx + fr * 0.35, fy - fr * 0.75, fr * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = c.belly; ctx.fill();
  // 顔
  ctx.beginPath(); ctx.arc(cx, fy, fr, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
  // お腹
  ctx.beginPath(); ctx.ellipse(cx, fy + fr * 0.15, fr * 0.6, fr * 0.55, 0, 0, Math.PI * 2);
  ctx.fillStyle = c.belly; ctx.fill();
}

// ── ハムスター ──
function drawAnimalHamster(ctx, cx, fy, fr, c) {
  // 丸い耳
  ctx.beginPath(); ctx.arc(cx - fr * 0.6, fy - fr * 0.62, fr * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = c.accent; ctx.fill();
  ctx.beginPath(); ctx.arc(cx - fr * 0.6, fy - fr * 0.62, fr * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
  ctx.beginPath(); ctx.arc(cx + fr * 0.6, fy - fr * 0.62, fr * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = c.accent; ctx.fill();
  ctx.beginPath(); ctx.arc(cx + fr * 0.6, fy - fr * 0.62, fr * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
  // 顔
  ctx.beginPath(); ctx.arc(cx, fy, fr, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
  // ほっぺたの膨らみ
  ctx.beginPath(); ctx.arc(cx - fr * 0.5, fy + fr * 0.18, fr * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = c.belly; ctx.fill();
  ctx.beginPath(); ctx.arc(cx + fr * 0.5, fy + fr * 0.18, fr * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = c.belly; ctx.fill();
  // 鼻
  ctx.beginPath(); ctx.arc(cx, fy + fr * 0.08, fr * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = c.accent; ctx.fill();
}

// ── ふくろう ──
function drawAnimalOwl(ctx, cx, fy, fr, c) {
  // 耳の飾り羽
  ctx.beginPath();
  ctx.moveTo(cx - fr * 0.55, fy - fr * 0.6); ctx.lineTo(cx - fr * 0.4, fy - fr * 1.15); ctx.lineTo(cx - fr * 0.15, fy - fr * 0.65);
  ctx.closePath(); ctx.fillStyle = c.body; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + fr * 0.55, fy - fr * 0.6); ctx.lineTo(cx + fr * 0.4, fy - fr * 1.15); ctx.lineTo(cx + fr * 0.15, fy - fr * 0.65);
  ctx.closePath(); ctx.fillStyle = c.body; ctx.fill();
  // 顔
  ctx.beginPath(); ctx.arc(cx, fy, fr, 0, Math.PI * 2);
  ctx.fillStyle = c.body; ctx.fill();
  // 目の周りの円
  ctx.beginPath(); ctx.arc(cx - fr * 0.28, fy - fr * 0.08, fr * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = c.belly; ctx.fill();
  ctx.beginPath(); ctx.arc(cx + fr * 0.28, fy - fr * 0.08, fr * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = c.belly; ctx.fill();
  // お腹模様
  ctx.beginPath(); ctx.ellipse(cx, fy + fr * 0.35, fr * 0.35, fr * 0.35, 0, 0, Math.PI * 2);
  ctx.fillStyle = c.belly; ctx.fill();
  // くちばし
  ctx.beginPath();
  ctx.moveTo(cx - fr * 0.08, fy + fr * 0.12);
  ctx.lineTo(cx, fy + fr * 0.25);
  ctx.lineTo(cx + fr * 0.08, fy + fr * 0.12);
  ctx.closePath();
  ctx.fillStyle = c.accent; ctx.fill();
}

// ── 共通: 動物の目 ──
function drawAnimalEyes(ctx, cx, fy, fr, eyeType, species) {
  var eyeY = fy - fr * 0.12;
  var spacing = fr * 0.28;
  var eyeR = fr * 0.08;
  // パンダは目パッチの上に白目
  if (species === 6) { eyeR = fr * 0.1; }
  // かえるは上に飛び出しているので位置調整
  if (species === 10) { eyeY = fy - fr * 0.75; spacing = fr * 0.35; eyeR = fr * 0.1; }

  switch (eyeType) {
    case 0: // ドット
      ctx.beginPath(); ctx.arc(cx - spacing, eyeY, eyeR, 0, Math.PI * 2); ctx.fillStyle = '#1A1A1A'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx + spacing, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
      // ハイライト
      ctx.beginPath(); ctx.arc(cx - spacing + eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.35, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx + spacing + eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.35, 0, Math.PI * 2); ctx.fill();
      break;
    case 1: // ライン
      ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = fr * 0.04; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - spacing - eyeR, eyeY); ctx.lineTo(cx - spacing + eyeR, eyeY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + spacing - eyeR, eyeY); ctx.lineTo(cx + spacing + eyeR, eyeY); ctx.stroke();
      break;
    case 2: // まんまる
      ctx.beginPath(); ctx.arc(cx - spacing, eyeY, eyeR * 1.3, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = fr * 0.02; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx - spacing, eyeY, eyeR * 0.7, 0, Math.PI * 2); ctx.fillStyle = '#1A1A1A'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx + spacing, eyeY, eyeR * 1.3, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.strokeStyle = '#1A1A1A'; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + spacing, eyeY, eyeR * 0.7, 0, Math.PI * 2); ctx.fillStyle = '#1A1A1A'; ctx.fill();
      // ハイライト
      ctx.beginPath(); ctx.arc(cx - spacing + eyeR * 0.35, eyeY - eyeR * 0.35, eyeR * 0.35, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx + spacing + eyeR * 0.35, eyeY - eyeR * 0.35, eyeR * 0.35, 0, Math.PI * 2); ctx.fill();
      break;
    case 3: // ウインク
      ctx.beginPath(); ctx.arc(cx - spacing, eyeY, eyeR, 0, Math.PI * 2); ctx.fillStyle = '#1A1A1A'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx - spacing + eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.35, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = fr * 0.04; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx + spacing, eyeY, eyeR, 0, Math.PI, false); ctx.stroke();
      break;
    case 4: case 12: // 閉じ目 / 笑い目
      ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = fr * 0.04; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx - spacing, eyeY + eyeR * 0.3, eyeR, Math.PI * 0.1, Math.PI * 0.9, false); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + spacing, eyeY + eyeR * 0.3, eyeR, Math.PI * 0.1, Math.PI * 0.9, false); ctx.stroke();
      break;
    case 7: // キラキラ
      ctx.beginPath(); ctx.arc(cx - spacing, eyeY, eyeR * 1.5, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = fr * 0.02; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx - spacing, eyeY, eyeR * 0.8, 0, Math.PI * 2); ctx.fillStyle = '#4A148C'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx - spacing - eyeR * 0.2, eyeY - eyeR * 0.4, eyeR * 0.4, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx - spacing + eyeR * 0.3, eyeY + eyeR * 0.2, eyeR * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + spacing, eyeY, eyeR * 1.5, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = fr * 0.02; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + spacing, eyeY, eyeR * 0.8, 0, Math.PI * 2); ctx.fillStyle = '#4A148C'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx + spacing - eyeR * 0.2, eyeY - eyeR * 0.4, eyeR * 0.4, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx + spacing + eyeR * 0.3, eyeY + eyeR * 0.2, eyeR * 0.2, 0, Math.PI * 2); ctx.fill();
      break;
    default: // その他はドット
      ctx.beginPath(); ctx.arc(cx - spacing, eyeY, eyeR, 0, Math.PI * 2); ctx.fillStyle = '#1A1A1A'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx + spacing, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx - spacing + eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.35, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx + spacing + eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.35, 0, Math.PI * 2); ctx.fill();
      break;
  }
}

// ── 共通: 動物の口 ──
function drawAnimalMouth(ctx, cx, fy, fr, mouthType, species) {
  var my = fy + fr * 0.28;
  if (species === 10) my = fy + fr * 0.15; // かえるは口が広い
  ctx.strokeStyle = '#1A1A1A'; ctx.fillStyle = '#1A1A1A'; ctx.lineWidth = fr * 0.03; ctx.lineCap = 'round';

  switch (mouthType) {
    case 0: // にっこり
      ctx.beginPath(); ctx.arc(cx, my - fr * 0.05, fr * 0.12, 0.1, Math.PI - 0.1, false); ctx.stroke();
      break;
    case 1: // わーい
      ctx.beginPath(); ctx.arc(cx, my - fr * 0.08, fr * 0.14, 0, Math.PI, false);
      ctx.fillStyle = '#8B0000'; ctx.fill();
      break;
    case 2: // 一文字
      ctx.beginPath(); ctx.moveTo(cx - fr * 0.1, my); ctx.lineTo(cx + fr * 0.1, my); ctx.stroke();
      break;
    case 3: // ぽかん
      ctx.beginPath(); ctx.arc(cx, my, fr * 0.06, 0, Math.PI * 2);
      ctx.fillStyle = '#8B0000'; ctx.fill();
      break;
    case 4: // むすっ
      ctx.beginPath(); ctx.arc(cx, my + fr * 0.05, fr * 0.1, Math.PI + 0.3, -0.3, false); ctx.stroke();
      break;
    case 5: // にやり
      ctx.beginPath(); ctx.arc(cx + fr * 0.05, my - fr * 0.02, fr * 0.12, 0.2, Math.PI - 0.5, false); ctx.stroke();
      break;
    case 6: // べー
      ctx.beginPath(); ctx.arc(cx, my - fr * 0.05, fr * 0.1, 0.1, Math.PI - 0.1, false); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, my + fr * 0.06, fr * 0.06, fr * 0.08, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FF6B6B'; ctx.fill();
      break;
    case 9: // ω口
      ctx.beginPath();
      ctx.arc(cx - fr * 0.06, my, fr * 0.06, Math.PI, 0, false);
      ctx.arc(cx + fr * 0.06, my, fr * 0.06, Math.PI, 0, false);
      ctx.stroke();
      break;
    default:
      ctx.beginPath(); ctx.arc(cx, my - fr * 0.05, fr * 0.1, 0.1, Math.PI - 0.1, false); ctx.stroke();
      break;
  }
}

// ── 共通: 動物用アクセサリー（簡易版） ──
function drawAnimalAccessory(ctx, cx, fy, fr, acc) {
  switch (acc) {
    case 1: // 丸メガネ
      ctx.strokeStyle = '#333'; ctx.lineWidth = fr * 0.03;
      ctx.beginPath(); ctx.arc(cx - fr * 0.28, fy - fr * 0.12, fr * 0.15, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + fr * 0.28, fy - fr * 0.12, fr * 0.15, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - fr * 0.13, fy - fr * 0.12); ctx.lineTo(cx + fr * 0.13, fy - fr * 0.12); ctx.stroke();
      break;
    case 5: // 帽子
      ctx.fillStyle = '#c0392b';
      ctx.beginPath(); ctx.ellipse(cx, fy - fr * 0.75, fr * 0.65, fr * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - fr * 0.35, fy - fr * 0.75); ctx.quadraticCurveTo(cx - fr * 0.35, fy - fr * 1.25, cx, fy - fr * 1.3);
      ctx.quadraticCurveTo(cx + fr * 0.35, fy - fr * 1.25, cx + fr * 0.35, fy - fr * 0.75);
      ctx.closePath(); ctx.fill();
      break;
    case 6: // リボン
      ctx.fillStyle = '#FF69B4';
      ctx.beginPath(); ctx.ellipse(cx - fr * 0.15, fy - fr * 0.88, fr * 0.15, fr * 0.1, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + fr * 0.15, fy - fr * 0.88, fr * 0.15, fr * 0.1, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, fy - fr * 0.88, fr * 0.05, 0, Math.PI * 2); ctx.fill();
      break;
    case 10: // 花冠
      var crownY = fy - fr * 0.9;
      ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#FF69B4'].forEach(function(col, i) {
        var angle = -Math.PI * 0.7 + i * Math.PI * 0.35;
        var fx = cx + Math.cos(angle) * fr * 0.55;
        var fcy = crownY + Math.sin(angle) * fr * 0.15;
        ctx.beginPath(); ctx.arc(fx, fcy, fr * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
      });
      break;
    case 11: // ベレー帽
      ctx.fillStyle = '#2c3e50';
      ctx.beginPath();
      ctx.arc(cx - fr * 0.1, fy - fr * 0.82, fr * 0.38, Math.PI, 0, false);
      ctx.closePath(); ctx.fill();
      break;
    case 12: // ヘッドフォン
      ctx.strokeStyle = '#333'; ctx.lineWidth = fr * 0.05;
      ctx.beginPath(); ctx.arc(cx, fy - fr * 0.35, fr * 0.7, Math.PI + 0.4, -0.4, false); ctx.stroke();
      ctx.fillStyle = '#555';
      ctx.beginPath(); ctx.ellipse(cx - fr * 0.72, fy - fr * 0.05, fr * 0.1, fr * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + fr * 0.72, fy - fr * 0.05, fr * 0.1, fr * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      break;
  }
}

function getAvatarHtml(avatarStr, size) {
  if (!avatarStr) avatarStr = '😀';
  if (avatarStr.startsWith('custom:')) {
    var dataUrl = renderCustomAvatar(avatarStr, size * 2); // 2x for retina
    if (dataUrl) return '<img src="' + dataUrl + '" class="avatar-img-inline" style="width:' + size + 'px;height:' + size + 'px;" alt="avatar">';
  }
  return '<span style="font-size:' + Math.round(size * 0.7) + 'px;line-height:1;">' + avatarStr + '</span>';
}
