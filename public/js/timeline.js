// ====================================================
// タイムライン: 投稿カード表示、いいね、詳細モーダル
// ====================================================

// 投稿データキャッシュ
var _postCache = {};

function renderPost(p) {
  _postCache[p.row] = p;
  var headerClass = "header-consult"; var icon = "far fa-comment-dots"; var catName = "相談・提案";
  if (p.content.includes("【写真】") || (p.analysis && p.analysis.includes("栄養"))) { headerClass = "header-food"; icon = "fas fa-utensils"; catName = "食事チェック"; }
  var heartEmoji = p.isLiked ? '❤️' : '🤍';
  var heartClass = p.isLiked ? ' liked' : '';
  var likeId = 'like-' + p.row;
  return '<div class="post-card" data-row="' + p.row + '">' +
    '<div class="post-header-bar ' + headerClass + '"><span><i class="' + icon + '"></i> ' + catName + '</span><span>' + p.date + '</span></div>' +
    '<div class="post-content">' +
      '<div class="user-info">' +
        '<div class="avatar">' + p.avatar + '</div>' +
        '<div class="nick">' + p.nickname + ' <span class="rank">' + p.authorRank + '</span></div>' +
        '<span class="post-like-btn' + heartClass + '" id="' + likeId + '" data-row="' + p.row + '">' +
          '<span class="like-heart">' + heartEmoji + '</span>' +
          '<span class="like-num">' + p.likeCount + '</span>' +
        '</span>' +
      '</div>' +
      '<div class="post-body" data-row="' + p.row + '">' + p.content + '</div>' +
    '</div></div>';
}

// いいねUI更新
function updateLikeUI(el, liked, count) {
  el.innerHTML = '<span class="like-heart">' + (liked ? '❤️' : '🤍') + '</span><span class="like-num">' + count + '</span>';
  if (liked) el.classList.add('liked');
  else el.classList.remove('liked');
}

// いいね処理
function like(row, likeId) {
  var el = document.getElementById(likeId);
  if (!el) return;
  var numEl = el.querySelector('.like-num');
  var currentCount = parseInt(numEl.innerText) || 0;
  var isLiked = el.classList.contains('liked');
  // 即時UI更新
  updateLikeUI(el, !isLiked, isLiked ? Math.max(0, currentCount - 1) : currentCount + 1);
  // API
  toggleLike(row, currentUser.uid).then(function(res) {
    if (res && res.success) updateLikeUI(el, res.isLiked, res.count);
  });
}

// 投稿詳細モーダル
function openPostDetail(row) {
  var p = _postCache[row];
  if (!p) return;
  var imgHtml = (p.imageUrl && p.imageUrl.startsWith('http')) ? '<img src="' + p.imageUrl + '" style="width:100%;border-radius:12px;margin-bottom:12px;">' : '';
  var analysisHtml = p.analysis ? '<div class="ai-reply"><i class="fas fa-robot text-primary"></i> ' + p.analysis.replace(/\n/g, '<br>') + '</div>' : '';
  var sheet = document.getElementById('post-detail-sheet');
  sheet.innerHTML =
    '<div style="padding:12px 16px 8px;text-align:center;"><div style="width:40px;height:4px;background:#ddd;border-radius:2px;margin:0 auto;"></div></div>' +
    '<div style="padding:4px 18px 20px;">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">' +
        '<div class="avatar">' + p.avatar + '</div>' +
        '<div><div class="nick">' + p.nickname + ' <span class="rank">' + p.authorRank + '</span></div><div style="font-size:0.72rem;color:#999;">' + p.date + '</div></div>' +
      '</div>' +
      '<div style="font-size:0.92rem;line-height:1.8;color:#333;white-space:pre-wrap;margin-bottom:14px;">' + p.content + '</div>' +
      imgHtml + analysisHtml +
      '<button onclick="closePostDetail()" style="width:100%;margin-top:16px;padding:12px;background:#2c3e50;color:white;border:none;border-radius:12px;font-weight:700;font-size:0.9rem;cursor:pointer;">閉じる</button>' +
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
  // ハートタップ
  var likeEl = e.target.closest('.post-like-btn');
  if (likeEl) {
    e.stopPropagation();
    e.preventDefault();
    var row = parseInt(likeEl.getAttribute('data-row'));
    if (row) like(row, likeEl.id);
    return;
  }
  // カード本文タップ → 詳細モーダル
  var body = e.target.closest('.post-body');
  if (body) {
    var row = parseInt(body.getAttribute('data-row'));
    if (row) openPostDetail(row);
    return;
  }
});
