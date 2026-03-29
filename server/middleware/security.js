// ========== 入力サニタイズ・バリデーション ==========

// HTMLタグを除去（XSS対策）
function stripHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, '');
}

// オブジェクト内の全文字列値を再帰的にサニタイズ
function sanitizeBody(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return stripHtml(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeBody);
  if (typeof obj === 'object') {
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
      // base64画像データはサニタイズしない
      if (key === 'imageBase64' || key === 'pdfBase64') {
        result[key] = val;
      } else {
        result[key] = sanitizeBody(val);
      }
    }
    return result;
  }
  return obj;
}

// リクエストボディをサニタイズするミドルウェア
function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeBody(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = stripHtml(req.query[key]);
      }
    }
  }
  next();
}

module.exports = { sanitizeInput, stripHtml };
