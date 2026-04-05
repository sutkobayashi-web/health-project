// ====================================================
// タイムライン: 投稿カード表示、共感フォーム、詳細モーダル
// ====================================================

/* -- Inject empathy UI CSS -- */
(function(){var s=document.createElement('style'); s.textContent=`
  .empathy-badges { display:flex; flex-wrap:wrap; gap:4px; align-items:center; margin-left:auto; }
  .empathy-badge { display:inline-flex; align-items:center; gap:2px; background:#f5f5f5; border-radius:12px; padding:2px 8px; font-size:0.72rem; font-weight:700; color:#555; white-space:nowrap; }
  .empathy-badge.has-count { background:#eef2ff; color:#4a5568; }
  .empathy-form { padding:16px; }
  .empathy-form-title { font-size:0.95rem; font-weight:700; color:#333; margin-bottom:14px; text-align:center; }
  .empathy-type-group { display:flex; flex-direction:column; gap:10px; margin-bottom:18px; }
  .empathy-type-btn { display:flex; align-items:center; justify-content:center; gap:6px; min-height:50px; padding:12px 16px; border-radius:14px; border:2px solid #e0e0e0; background:white; font-size:0.95rem; font-weight:700; color:#444; cursor:pointer; transition:all 0.2s; text-align:center; -webkit-tap-highlight-color:transparent; }
  .empathy-type-btn:active { transform:scale(0.97); }
  .empathy-type-btn.selected { border-color:#667eea; background:linear-gradient(135deg,rgba(102,126,234,0.06),rgba(118,75,162,0.06)); color:#4a3cb5; box-shadow:0 2px 8px rgba(102,126,234,0.2); }
  .empathy-questions { display:none; animation:empFadeIn 0.3s ease; }
  .empathy-questions.visible { display:block; }
  .empathy-q-card { background:#fafbff; border-radius:12px; padding:14px; margin-bottom:14px; border:1px solid #eef0f5; }
  .empathy-q-label { font-size:0.85rem; font-weight:700; color:#333; margin-bottom:10px; }
  .empathy-q-choices { display:flex; flex-direction:column; gap:6px; }
  .empathy-q-choice { display:flex; align-items:center; justify-content:center; min-height:44px; padding:10px 14px; border-radius:10px; border:2px solid #e8e8e8; background:white; font-size:0.88rem; font-weight:600; color:#555; cursor:pointer; transition:all 0.15s; -webkit-tap-highlight-color:transparent; }
  .empathy-q-choice:active { transform:scale(0.97); }
  .empathy-q-choice.selected { border-color:#667eea; background:#667eea; color:white; }
  .empathy-comment-area { margin-top:16px; margin-bottom:16px; }
  .empathy-comment-area label { display:block; font-size:0.82rem; font-weight:600; color:#666; margin-bottom:6px; }
  .empathy-comment-input { width:100%; min-height:60px; padding:10px 12px; border-radius:10px; border:1.5px solid #ddd; font-size:0.88rem; resize:vertical; font-family:inherit; box-sizing:border-box; transition:border-color 0.2s; }
  .empathy-comment-input:focus { outline:none; border-color:#667eea; }
  .empathy-submit-btn { width:100%; min-height:50px; padding:14px; background:linear-gradient(135deg,#667eea,#764ba2); color:white; border:none; border-radius:14px; font-weight:700; font-size:0.95rem; cursor:pointer; transition:all 0.2s; -webkit-tap-highlight-color:transparent; }
  .empathy-submit-btn:disabled { opacity:0.45; cursor:default; }
  .empathy-submit-btn:active:not(:disabled) { transform:scale(0.97); }
  .empathy-thanks { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; text-align:center; animation:empFadeIn 0.4s ease; }
  .empathy-thanks-icon { font-size:3rem; margin-bottom:12px; animation:empBounce 0.6s ease; }
  .empathy-thanks-text { font-size:1.1rem; font-weight:700; color:#333; }
  .empathy-summary { display:flex; flex-wrap:wrap; gap:8px; padding:12px 0; margin-top:10px; border-top:1px solid #f0f0f0; }
  .empathy-summary-chip { display:inline-flex; align-items:center; gap:4px; background:linear-gradient(135deg,#f0f0ff,rgba(252,228,236,0.12)); border:1px solid #e0e0e0; border-radius:20px; padding:6px 12px; font-size:0.82rem; font-weight:700; color:#444; }
  .empathy-summary-chip .chip-count { background:#667eea; color:white; border-radius:10px; padding:1px 7px; font-size:0.72rem; margin-left:2px; }
  @keyframes empFadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
  @keyframes empBounce { 0%{transform:scale(0.3);} 50%{transform:scale(1.15);} 100%{transform:scale(1);} }
`; document.head.appendChild(s);})();

// ====================================================
// 共感タイプ・質問データ定義
// ====================================================

var EMPATHY_CONFIG = {
  consult: {
    types: [
      { key: 'wakaru',  emoji: '\uD83D\uDE4B', label: '\u308F\u304B\u308B\u3001\u81EA\u5206\u3082' },
      { key: 'yabai',   emoji: '\uD83D\uDE30', label: '\u3053\u308C\u30E4\u30D0\u304F\u306A\u3044\uFF1F' },
      { key: 'kaisha',  emoji: '\uD83D\uDCA1', label: '\u4F1A\u793E\u304C\u52D5\u3051\u3070\u5909\u308F\u308B' }
    ],
    questions: {
      wakaru: [
        { q: '\u3069\u306E\u304F\u3089\u3044\u56F0\u3063\u3066\u308B\uFF1F', choices: ['\u3059\u3054\u304F', '\u307E\u3042\u307E\u3042', '\u5C11\u3057'] },
        { q: '\u3044\u3064\u9803\u304B\u3089\uFF1F', choices: ['\u6700\u8FD1', '\u534A\u5E74\u304F\u3089\u3044', '\u305A\u3063\u3068\u524D\u304B\u3089'] },
        { q: '\u81EA\u5206\u3067\u4F55\u304B\u5BFE\u7B56\u3057\u3066\u308B\uFF1F', choices: ['\u3057\u3066\u308B', '\u3057\u305F\u3044\u3051\u3069\u2026', '\u3057\u3066\u306A\u3044'] }
      ],
      yabai: [
        { q: '\u3069\u306E\u304F\u3089\u3044\u6DF1\u523B\u3060\u3068\u601D\u3046\uFF1F', choices: ['\u304B\u306A\u308A', '\u305D\u3053\u305D\u3053', '\u5C11\u3057\u6C17\u306B\u306A\u308B'] },
        { q: '\u6025\u3044\u3067\u5BFE\u5FDC\u3059\u3079\u304D\uFF1F', choices: ['\u3059\u3050\u306B', '\u305D\u306E\u3046\u3061', '\u69D8\u5B50\u898B\u3067\u3082'] },
        { q: '\u653E\u3063\u3066\u304A\u304F\u3068\u8AB0\u304B\u304C\u56F0\u308B\uFF1F', choices: ['\u78BA\u5B9F\u306B', '\u305F\u3076\u3093', '\u308F\u304B\u3089\u306A\u3044'] }
      ],
      kaisha: [
        { q: '\u4F1A\u793E\u304C\u5BFE\u7B56\u3057\u305F\u3089\u53C2\u52A0\u3059\u308B\uFF1F', choices: ['\u305C\u3072', '\u305F\u3076\u3093', '\u308F\u304B\u3089\u306A\u3044'] },
        { q: '\u5468\u308A\u306B\u3082\u540C\u3058\u60A9\u307F\u306E\u4EBA\u3044\u308B\uFF1F', choices: ['\u591A\u3044', '\u4F55\u4EBA\u304B\u306F', '\u81EA\u5206\u3060\u3051\u304B\u3082'] },
        { q: '\u5BFE\u7B56\u3057\u305F\u3089\u52B9\u679C\u3042\u308A\u305D\u3046\uFF1F', choices: ['\u304B\u306A\u308A', '\u591A\u5C11\u306F', '\u3042\u307E\u308A'] }
      ]
    }
  },
  food: {
    types: [
      { key: 'oishii',  emoji: '🤤', label: '食いてぇ！' },
      { key: 'sankou',  emoji: '👍', label: 'うまそう！' },
      { key: 'onaji',   emoji: '🙌', label: '真似する！' }
    ],
    questions: {
      oishii: [
        { q: '\u81EA\u5206\u306E\u98DF\u4E8B\u3068\u6BD4\u3079\u3066\u3069\u3046\uFF1F', choices: ['\u898B\u7FD2\u3044\u305F\u3044', '\u540C\u3058\u304F\u3089\u3044', '\u81EA\u5206\u306E\u65B9\u304C\u3044\u3044\u304B\u3082'] },
        { q: '\u3053\u3046\u3044\u3046\u98DF\u4E8B\u3092\u7D9A\u3051\u308B\u306E\u306F\uFF1F', choices: ['\u7C21\u5358\u305D\u3046', '\u3061\u3087\u3063\u3068\u5927\u5909\u305D\u3046', '\u304B\u306A\u308A\u5927\u5909\u305D\u3046'] },
        { q: '\u98DF\u4E8B\u306E\u60C5\u5831\u3001\u3082\u3063\u3068\u6B32\u3057\u3044\uFF1F', choices: ['\u305C\u3072', '\u3042\u308C\u3070\u898B\u308B', '\u5225\u306B\u3044\u3044'] }
      ],
      sankou: [
        { q: '\u771F\u4F3C\u3057\u3066\u307F\u305F\u3044\uFF1F', choices: ['\u3059\u3050\u8A66\u3059', '\u3044\u3064\u304B', '\u898B\u308B\u3060\u3051'] },
        { q: '\u666E\u6BB5\u306E\u98DF\u4E8B\u3067\u56F0\u3063\u3066\u308B\u3053\u3068\u3042\u308B\uFF1F', choices: ['\u3042\u308B', '\u5C11\u3057', '\u7279\u306B\u306A\u3044'] },
        { q: '\u4F1A\u793E\u3067\u98DF\u4E8B\u30B5\u30DD\u30FC\u30C8\u3042\u3063\u305F\u3089\u4F7F\u3046\uFF1F', choices: ['\u305C\u3072', '\u305F\u3076\u3093', '\u3044\u3089\u306A\u3044'] }
      ],
      onaji: [
        { q: '\u98DF\u4E8B\u306E\u504F\u308A\u3001\u6C17\u306B\u306A\u3063\u3066\u308B\uFF1F', choices: ['\u3059\u3054\u304F', '\u307E\u3042\u307E\u3042', '\u3042\u307E\u308A'] },
        { q: '\u6539\u5584\u3057\u305F\u3044\u3051\u3069\u96E3\u3057\u3044\u7406\u7531\u306F\uFF1F', choices: ['\u6642\u9593\u304C\u306A\u3044', '\u77E5\u8B58\u304C\u306A\u3044', '\u9762\u5012'] },
        { q: '\u304D\u3063\u304B\u3051\u304C\u3042\u308C\u3070\u5909\u3048\u3089\u308C\u305D\u3046\uFF1F', choices: ['\u5909\u3048\u305F\u3044', '\u305F\u3076\u3093', '\u96E3\u3057\u3044'] }
      ]
    }
  }
};

// ====================================================
// State
// ====================================================

var _postCache = {};
var _answeredPosts = {};
var _empathyCounts = {};

// ====================================================
// 初期化: 回答済み投稿を読み込み
// ====================================================

function loadAnsweredPosts() {
  if (!window.currentUser || !currentUser.uid) return Promise.resolve();
  return api('/posts/empathy-check', { uid: currentUser.uid }).then(function(res) {
    if (res && res.success && Array.isArray(res.answered)) {
      _answeredPosts = {};
      res.answered.forEach(function(row) { _answeredPosts[row] = true; });
    }
  }).catch(function() {});
}

// ====================================================
// ヘルパー: 投稿カテゴリ判定
// ====================================================

function getPostCategory(p) {
  if (p.content.includes('\u3010\u5199\u771F\u3011') || (p.analysis && p.analysis.includes('\u6804\u990A'))) {
    return 'food';
  }
  return 'consult';
}

function getEmpathyConfigForPost(p) {
  return EMPATHY_CONFIG[getPostCategory(p)];
}

// ====================================================
// 投稿カード描画
// ====================================================

function renderEmpathyBadges(row) {
  var counts = _empathyCounts[row];
  if (!counts) return '';
  var cat = _postCache[row] ? getPostCategory(_postCache[row]) : 'consult';
  var config = EMPATHY_CONFIG[cat];
  var html = '<span class="empathy-badges">';
  var hasAny = false;
  config.types.forEach(function(t) {
    var c = counts[t.key] || 0;
    if (c > 0) {
      hasAny = true;
      html += '<span class="empathy-badge has-count">' + t.emoji + c + '</span>';
    }
  });
  html += '</span>';
  return hasAny ? html : '';
}

function renderPost(p) {
  _postCache[p.row] = p;
  var headerClass = 'header-consult'; var icon = 'far fa-comment-dots'; var catName = '\u76F8\u8AC7\u30FB\u63D0\u6848';
  if (getPostCategory(p) === 'food') { headerClass = 'header-food'; icon = 'fas fa-utensils'; catName = '\u98DF\u4E8B\u30C1\u30A7\u30C3\u30AF'; }

  if (p.empathyCounts) {
    _empathyCounts[p.row] = p.empathyCounts;
  }

  var badgesHtml = renderEmpathyBadges(p.row);
  var totalEmpathy = 0;
  if (_empathyCounts[p.row]) {
    Object.keys(_empathyCounts[p.row]).forEach(function(k) { totalEmpathy += _empathyCounts[p.row][k]; });
  }
  var countLabel = totalEmpathy > 0
    ? '<span class="empathy-badge has-count" style="background:#eef2ff;">\u2764\uFE0F ' + totalEmpathy + '</span>'
    : '';

  return '<div class="post-card" data-row="' + p.row + '">' +
    '<div class="post-header-bar ' + headerClass + '"><span><i class="' + icon + '"></i> ' + catName + '</span><span>' + p.date + '</span></div>' +
    '<div class="post-content">' +
      '<div class="user-info">' +
        '<div class="avatar">' + p.avatar + '</div>' +
        '<div class="nick">' + p.nickname + ' <span class="rank">' + p.authorRank + '</span></div>' +
        (badgesHtml || countLabel) +
      '</div>' +
      '<div class="post-body" data-row="' + p.row + '">' + p.content + '</div>' +
    '</div></div>';
}

// ====================================================
// 共感フォーム描画
// ====================================================

function renderEmpathyForm(postRow) {
  var p = _postCache[postRow];
  if (!p) return;
  var config = getEmpathyConfigForPost(p);
  var sheet = document.getElementById('post-detail-sheet');

  var html =
    '<div style="padding:12px 18px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #eee;flex-shrink:0;">' +
      '<div class="avatar" style="width:32px;height:32px;font-size:1rem;">' + p.avatar + '</div>' +
      '<div style="flex:1;">' +
        '<div class="nick" style="font-size:0.85rem;">' + p.nickname + '</div>' +
        '<div style="font-size:0.7rem;color:#999;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px;">' + p.content.substring(0, 40) + '\u2026</div>' +
      '</div>' +
    '</div>';

  html += '<div class="empathy-form" id="empathy-form-body">';
  html += '<div class="empathy-form-title">\u3053\u306E\u6295\u7A3F\u3078\u306E\u5171\u611F\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044</div>';

  html += '<div class="empathy-type-group" id="empathy-type-group">';
  config.types.forEach(function(t) {
    html += '<button class="empathy-type-btn" data-type-key="' + t.key + '">' + t.emoji + ' ' + t.label + '</button>';
  });
  html += '</div>';

  html += '<div class="empathy-questions" id="empathy-questions"></div>';

  html += '<div class="empathy-comment-area" id="empathy-comment-area" style="display:none;">';
  html += '<label>\u30B3\u30E1\u30F3\u30C8\uFF08\u4EFB\u610F\uFF09</label>';
  html += '<textarea class="empathy-comment-input" id="empathy-comment" placeholder="\u601D\u3063\u305F\u3053\u3068\u304C\u3042\u308C\u3070\u2026"></textarea>';
  html += '</div>';

  html += '<button class="empathy-submit-btn" id="empathy-submit-btn" disabled data-row="' + postRow + '">\u9001\u4FE1\u3059\u308B</button>';

  html += '</div>';

  sheet.innerHTML = html;
  document.getElementById('post-detail-modal').classList.add('active');
  lockScroll();

  bindEmpathyTypeSelection(postRow, config);
}

function bindEmpathyTypeSelection(postRow, config) {
  var group = document.getElementById('empathy-type-group');
  if (!group) return;

  group.addEventListener('click', function(e) {
    var btn = e.target.closest('.empathy-type-btn');
    if (!btn) return;
    var key = btn.getAttribute('data-type-key');

    var allBtns = group.querySelectorAll('.empathy-type-btn');
    for (var i = 0; i < allBtns.length; i++) { allBtns[i].classList.remove('selected'); }
    btn.classList.add('selected');

    showEmpathyQuestions(key, config, postRow);
  });
}

function showEmpathyQuestions(typeKey, config, postRow) {
  var questions = config.questions[typeKey];
  if (!questions) return;

  var container = document.getElementById('empathy-questions');
  var html = '';
  questions.forEach(function(q, idx) {
    html += '<div class="empathy-q-card">';
    html += '<div class="empathy-q-label">Q' + (idx + 1) + '. ' + q.q + '</div>';
    html += '<div class="empathy-q-choices" data-q-idx="' + idx + '">';
    q.choices.forEach(function(ch, ci) {
      html += '<button class="empathy-q-choice" data-q="' + idx + '" data-choice="' + ci + '">' + ch + '</button>';
    });
    html += '</div></div>';
  });
  container.innerHTML = html;
  container.classList.add('visible');

  var commentArea = document.getElementById('empathy-comment-area');
  if (commentArea) commentArea.style.display = 'block';

  var submitBtn = document.getElementById('empathy-submit-btn');
  if (submitBtn) submitBtn.disabled = true;

  container.addEventListener('click', function(e) {
    var choiceBtn = e.target.closest('.empathy-q-choice');
    if (!choiceBtn) return;
    var qIdx = choiceBtn.getAttribute('data-q');

    var siblings = container.querySelectorAll('.empathy-q-choice[data-q="' + qIdx + '"]');
    for (var i = 0; i < siblings.length; i++) { siblings[i].classList.remove('selected'); }
    choiceBtn.classList.add('selected');

    checkEmpathyFormComplete(questions.length);
  });
}

function checkEmpathyFormComplete(totalQuestions) {
  var answered = 0;
  for (var i = 0; i < totalQuestions; i++) {
    if (document.querySelector('.empathy-q-choice.selected[data-q="' + i + '"]')) {
      answered++;
    }
  }
  var submitBtn = document.getElementById('empathy-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = (answered < totalQuestions);
  }
}

// ====================================================
// 共感送信
// ====================================================

function submitEmpathy(postRow) {
  var p = _postCache[postRow];
  if (!p) return;

  var selectedType = document.querySelector('.empathy-type-btn.selected');
  if (!selectedType) return;
  var typeKey = selectedType.getAttribute('data-type-key');

  var config = getEmpathyConfigForPost(p);
  var questions = config.questions[typeKey];
  var answers = [];
  questions.forEach(function(q, idx) {
    var sel = document.querySelector('.empathy-q-choice.selected[data-q="' + idx + '"]');
    answers.push({
      question: q.q,
      choiceIndex: sel ? parseInt(sel.getAttribute('data-choice')) : -1,
      choiceText: sel ? sel.textContent : ''
    });
  });

  var comment = '';
  var commentEl = document.getElementById('empathy-comment');
  if (commentEl) comment = commentEl.value.trim();

  var payload = {
    postRow: postRow,
    uid: currentUser.uid,
    typeKey: typeKey,
    answers: answers,
    comment: comment
  };

  var submitBtn = document.getElementById('empathy-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '\u9001\u4FE1\u4E2D\u2026';
  }

  api('/posts/empathy-submit', payload).then(function(res) {
    if (res && res.success) {
      _answeredPosts[postRow] = true;

      if (res.empathyCounts) {
        _empathyCounts[postRow] = res.empathyCounts;
      } else {
        if (!_empathyCounts[postRow]) _empathyCounts[postRow] = {};
        _empathyCounts[postRow][typeKey] = (_empathyCounts[postRow][typeKey] || 0) + 1;
      }

      refreshPostCard(postRow);
      showEmpathyThanks(postRow);
    } else {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '\u9001\u4FE1\u3059\u308B';
      }
      alert('\u9001\u4FE1\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002');
    }
  }).catch(function() {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '\u9001\u4FE1\u3059\u308B';
    }
    alert('\u901A\u4FE1\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F\u3002');
  });
}

function refreshPostCard(postRow) {
  var cardEl = document.querySelector('.post-card[data-row="' + postRow + '"]');
  if (!cardEl || !_postCache[postRow]) return;
  var newHtml = renderPost(_postCache[postRow]);
  var temp = document.createElement('div');
  temp.innerHTML = newHtml;
  var newCard = temp.firstChild;
  cardEl.parentNode.replaceChild(newCard, cardEl);
}

function showEmpathyThanks(postRow) {
  var sheet = document.getElementById('post-detail-sheet');
  sheet.innerHTML =
    '<div class="empathy-thanks">' +
      '<div class="empathy-thanks-icon">\uD83C\uDF89</div>' +
      '<div class="empathy-thanks-text">\u3042\u308A\u304C\u3068\u3046\uFF01</div>' +
    '</div>';

  setTimeout(function() {
    openPostDetailView(postRow);
  }, 1200);
}

// ====================================================
// 共感サマリー描画（詳細モーダル内）
// ====================================================

function renderEmpathySummaryHtml(postRow) {
  var counts = _empathyCounts[postRow];
  if (!counts) return '';
  var p = _postCache[postRow];
  if (!p) return '';
  var config = getEmpathyConfigForPost(p);

  var html = '<div class="empathy-summary">';
  var hasAny = false;
  config.types.forEach(function(t) {
    var c = counts[t.key] || 0;
    if (c > 0) {
      hasAny = true;
      html += '<span class="empathy-summary-chip">' + t.emoji + ' ' + t.label + '<span class="chip-count">' + c + '</span></span>';
    }
  });
  html += '</div>';
  return hasAny ? html : '';
}

// ====================================================
// 詳細モーダル（通常表示）
// ====================================================

function openPostDetailView(row) {
  var p = _postCache[row];
  if (!p) return;
  var imgHtml = (p.imageUrl && p.imageUrl.startsWith('http'))
    ? '<img src="' + p.imageUrl + '" style="width:100%;border-radius:12px;margin-bottom:12px;">'
    : '';
  var analysisHtml = p.analysis
    ? '<div class="ai-reply"><i class="fas fa-robot text-primary"></i> ' + p.analysis.replace(/\n/g, '<br>') + '</div>'
    : '';
  var summaryHtml = renderEmpathySummaryHtml(row);

  var sheet = document.getElementById('post-detail-sheet');
  sheet.innerHTML =
    '<div style="padding:12px 18px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #eee;flex-shrink:0;">' +
      '<div class="avatar" style="width:32px;height:32px;font-size:1rem;">' + p.avatar + '</div>' +
      '<div style="flex:1;"><div class="nick" style="font-size:0.85rem;">' + p.nickname + ' <span class="rank">' + p.authorRank + '</span></div><div style="font-size:0.65rem;color:#999;">' + p.date + '</div></div>' +
    '</div>' +
    '<div id="post-detail-body">' +
      '<div style="font-size:0.92rem;line-height:1.8;color:#333;white-space:pre-wrap;margin-bottom:14px;">' + p.content + '</div>' +
      imgHtml + analysisHtml + summaryHtml +
    '</div>' +
    '<div id="post-detail-footer">' +
      '<button id="post-detail-close-btn" style="width:100%;padding:14px;background:linear-gradient(135deg,#2c3e50,#34495e);color:white;border:none;border-radius:14px;font-weight:700;font-size:0.95rem;cursor:pointer;">\u9589\u3058\u308B</button>' +
    '</div>';

  if (!document.getElementById('post-detail-modal').classList.contains('active')) {
    document.getElementById('post-detail-modal').classList.add('active');
    lockScroll();
  }
}

// ====================================================
// 詳細モーダル（エントリーポイント）
// ====================================================

function openPostDetail(row) {
  var p = _postCache[row];
  if (!p) return;

  // Own posts: skip empathy form
  if (window.currentUser && p.uid === currentUser.uid) {
    openPostDetailView(row);
    return;
  }

  // Already answered: show detail directly
  if (_answeredPosts[row]) {
    openPostDetailView(row);
    return;
  }

  // Show empathy form
  renderEmpathyForm(row);
}

function closePostDetail() {
  document.getElementById('post-detail-modal').classList.remove('active');
  unlockScroll();
}

// ====================================================
// イベントデリゲーション
// ====================================================

document.addEventListener('click', function(e) {
  if (e.target.id === 'post-detail-close-btn') {
    e.stopPropagation();
    closePostDetail();
    return;
  }

  if (e.target.id === 'empathy-submit-btn' || e.target.closest('#empathy-submit-btn')) {
    e.stopPropagation();
    var btn = e.target.id === 'empathy-submit-btn' ? e.target : e.target.closest('#empathy-submit-btn');
    if (btn.disabled) return;
    var postRow = parseInt(btn.getAttribute('data-row'));
    if (postRow) submitEmpathy(postRow);
    return;
  }

  if (e.target.closest('#post-detail-modal')) {
    return;
  }

  var card = e.target.closest('.post-card');
  if (card) {
    var row = parseInt(card.getAttribute('data-row'));
    if (row) openPostDetail(row);
    return;
  }
});

// ====================================================
// 初期化: ページロード時に回答済み投稿を取得
// ====================================================

(function() {
  var checkInterval = setInterval(function() {
    if (window.currentUser && currentUser.uid) {
      clearInterval(checkInterval);
      loadAnsweredPosts();
    }
  }, 300);
  setTimeout(function() { clearInterval(checkInterval); }, 10000);
})();
