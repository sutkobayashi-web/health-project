// ====================================================
// タイムライン: 投稿カード表示、いいね、詳細モーダル
// ====================================================

var _postCache = {};

function renderPost(p) {
  _postCache[p.row] = p;
  var headerClass = "header-consult"; var icon = "far fa-comment-dots"; var catName = "相談・提案";
  if (p.content.includes("【写真】") || (p.analysis && p.analysis.includes("栄養"))) { headerClass = "header-food"; icon = "fas fa-utensils"; catName = "食事チェック"; }
  var likeId = 'like-' + p.row;
  var liked = p.isLiked;
  return '<div class="post-card" data-row="' + p.row + '">' +
    '<div class="post-header-bar ' + headerClass + '"><span><i class="' + icon + '"></i> ' + catName + '</span><span>' + p.date + '</span></div>' +
    '<div class="post-content">' +
      '<div class="user-info">' +
        '<div class="avatar">' + p.avatar + '</div>' +
        '<div class="nick">' + p.nickname + ' <span class="rank">' + p.authorRank + '</span></div>' +
        '<span class="post-like-btn" id="' + likeId + '" data-row="' + p.row + '" data-liked="' + (liked ? '1' : '0') + '">' +
          (liked ? '❤️' : '🤍') + ' <span class="like-num">' + p.likeCount + '</span>' +
        '</span>' +
      '</div>' +
      '<div class="post-body" data-row="' + p.row + '">' + p.content + '</div>' +
    '</div></div>';
}

// いいね処理
function like(row, likeId) {
  var el = document.getElementById(likeId);
  if (!el) return;
  var numSpan = el.querySelector('.like-num');
  var count = parseInt(numSpan.textContent) || 0;
  var liked = el.getAttribute('data-liked') === '1';

  // 即時UI更新
  var newLiked = !liked;
  var newCount = newLiked ? count + 1 : Math.max(0, count - 1);
  el.setAttribute('data-liked', newLiked ? '1' : '0');
  if (newLiked) { el.classList.add('liked'); }
  else { el.classList.remove('liked'); }
  // テキストノードを直接変更（innerHTMLを使わない）
  el.firstChild.textContent = newLiked ? '❤️ ' : '🤍 ';
  numSpan.textContent = newCount;

  // API呼び出し → サーバー値で補正
  toggleLike(row, currentUser.uid).then(function(res) {
    if (res && res.success) {
      el.setAttribute('data-liked', res.isLiked ? '1' : '0');
      if (res.isLiked) { el.classList.add('liked'); }
      else { el.classList.remove('liked'); }
      el.firstChild.textContent = res.isLiked ? '❤️ ' : '🤍 ';
      numSpan.textContent = res.count;
    }
  });
}

// 詳細モーダル
function openPostDetail(row) {
  var p = _postCache[row];
  if (!p) return;
  var imgHtml = (p.imageUrl && p.imageUrl.startsWith('http')) ? '<img src="' + p.imageUrl + '" style="width:100%;border-radius:12px;margin-bottom:12px;">' : '';
  var analysisHtml = p.analysis ? '<div class="ai-reply"><i class="fas fa-robot text-primary"></i> ' + p.analysis.replace(/\n/g, '<br>') + '</div>' : '';
  var sheet = document.getElementById('post-detail-sheet');
  sheet.innerHTML =
    '<div style="padding:12px 18px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #eee;flex-shrink:0;">' +
      '<div class="avatar" style="width:32px;height:32px;font-size:1rem;">' + p.avatar + '</div>' +
      '<div style="flex:1;"><div class="nick" style="font-size:0.85rem;">' + p.nickname + ' <span class="rank">' + p.authorRank + '</span></div><div style="font-size:0.65rem;color:#999;">' + p.date + '</div></div>' +
    '</div>' +
    '<div id="post-detail-body">' +
      '<div style="font-size:0.92rem;line-height:1.8;color:#333;white-space:pre-wrap;margin-bottom:14px;">' + p.content + '</div>' +
      imgHtml + analysisHtml +
    '</div>' +
    '<div id="post-detail-footer">' +
      '<button id="post-detail-close-btn" style="width:100%;padding:14px;background:linear-gradient(135deg,#2c3e50,#34495e);color:white;border:none;border-radius:14px;font-weight:700;font-size:0.95rem;cursor:pointer;">閉じる</button>' +
    '</div>';
  document.getElementById('post-detail-modal').classList.add('active');
  lockScroll();
}

function closePostDetail() {
  document.getElementById('post-detail-modal').classList.remove('active');
  unlockScroll();
}

// イベントデリゲーション
document.addEventListener('click', function(e) {
  // 詳細モーダルの閉じるボタン
  if (e.target.id === 'post-detail-close-btn') {
    e.stopPropagation();
    closePostDetail();
    return;
  }

  // 詳細モーダル内のクリックは何もしない（閉じない）
  if (e.target.closest('#post-detail-modal')) {
    return;
  }

  // ハートタップ
  var likeEl = e.target.closest('.post-like-btn');
  if (likeEl) {
    e.stopPropagation();
    e.preventDefault();
    var row = parseInt(likeEl.getAttribute('data-row'));
    if (row) like(row, likeEl.id);
    return;
  }

  // カード全体タップ → 詳細モーダル（ハート以外の場所）
  var card = e.target.closest('.post-card');
  if (card) {
    var row2 = parseInt(card.getAttribute('data-row'));
    if (row2) openPostDetail(row2);
    return;
  }
});
