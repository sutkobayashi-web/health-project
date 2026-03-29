/* ====================================================
 *  admin-chat-notify.js – チャット新着通知システム
 *  - 30秒ポーリングで未読チャットを検知
 *  - 投稿カードに未読バッジ表示
 *  - トースト通知で新着を即座に知らせる
 * ==================================================== */

(function () {
  var POLL_INTERVAL = 30000; // 30秒
  var pollTimer = null;
  var lastUnreadState = {}; // 前回の未読状態（差分検知用）
  var currentUnreadMap = {}; // 最新の未読データ（グローバル保持）
  var toastContainer = null;

  /* ── トースト通知コンテナ ── */
  function ensureToastContainer() {
    if (toastContainer) return toastContainer;
    toastContainer = document.createElement('div');
    toastContainer.id = 'chat-toast-container';
    toastContainer.style.cssText = 'position:fixed; top:16px; right:16px; z-index:9999; display:flex; flex-direction:column; gap:8px; pointer-events:none; max-width:360px;';
    document.body.appendChild(toastContainer);
    return toastContainer;
  }

  /* ── トースト表示 ── */
  function showToast(member, message, postId) {
    var container = ensureToastContainer();
    var toast = document.createElement('div');
    toast.style.cssText = 'pointer-events:auto; background:white; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.15); padding:12px 16px; display:flex; align-items:flex-start; gap:10px; cursor:pointer; animation:chatToastIn 0.3s ease-out; border-left:4px solid #667eea; min-width:280px;';
    toast.innerHTML =
      '<div style="flex-shrink:0; width:36px; height:36px; background:linear-gradient(135deg,#667eea,#764ba2); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:0.9rem; font-weight:bold;">' +
        '<i class="fas fa-comment-dots"></i>' +
      '</div>' +
      '<div style="flex:1; min-width:0;">' +
        '<div style="font-size:0.75rem; color:#667eea; font-weight:700;">新着チャット</div>' +
        '<div style="font-size:0.85rem; font-weight:600; color:#333; margin-top:1px;">' + escapeHtml(member) + '</div>' +
        '<div style="font-size:0.8rem; color:#666; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + escapeHtml(message.substring(0, 60)) + '</div>' +
      '</div>' +
      '<div style="flex-shrink:0; font-size:0.65rem; color:#bbb; cursor:pointer; padding:2px;" onclick="event.stopPropagation(); this.parentElement.remove();">&times;</div>';

    toast.onclick = function () {
      toast.remove();
      // 投稿一覧タブに切り替えてからモーダルを開く
      if (typeof switchTab === 'function') switchTab('evaluation');
      setTimeout(function () {
        if (typeof openPriorityModal === 'function') openPriorityModal(postId);
      }, 300);
    };
    container.appendChild(toast);

    // 5秒後に自動消去
    setTimeout(function () {
      if (toast.parentElement) {
        toast.style.animation = 'chatToastOut 0.3s ease-in forwards';
        setTimeout(function () { if (toast.parentElement) toast.remove(); }, 300);
      }
    }, 5000);
  }

  /* ── トーストアニメーションCSS注入 ── */
  (function injectCSS() {
    var style = document.createElement('style');
    style.textContent =
      '@keyframes chatToastIn { from { opacity:0; transform:translateX(60px); } to { opacity:1; transform:translateX(0); } }' +
      '@keyframes chatToastOut { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(60px); } }' +
      '.chat-unread-badge { display:inline-flex; align-items:center; gap:3px; background:linear-gradient(135deg,#667eea,#764ba2); color:white; border-radius:10px; padding:1px 8px; font-size:0.65rem; font-weight:700; animation:chatBadgePulse 2s infinite; }' +
      '@keyframes chatBadgePulse { 0%,100% { box-shadow:0 0 0 0 rgba(102,126,234,0.4); } 50% { box-shadow:0 0 0 4px rgba(102,126,234,0); } }';
    document.head.appendChild(style);
  })();

  /* ── バッジ更新（DOM上の要素に反映） ── */
  function applyBadgesToDOM(unreadMap) {
    // 投稿カードの未読バッジ更新
    for (var postId in unreadMap) {
      var data = unreadMap[postId];
      var badgeEl = document.getElementById('chat-unread-' + postId);
      if (badgeEl) {
        badgeEl.innerHTML = '<i class="fas fa-bell"></i> NEW +' + data.unread;
        badgeEl.style.display = 'inline-flex';
        badgeEl.className = 'chat-unread-badge';
        badgeEl.title = '新着チャットあり — タップで議論を開く';
      }
    }
    // 既読になった投稿のバッジを非表示
    var allBadges = document.querySelectorAll('[id^="chat-unread-"]');
    allBadges.forEach(function (el) {
      var pid = el.id.replace('chat-unread-', '');
      if (!unreadMap[pid]) {
        el.style.display = 'none';
      }
    });

    // ナビのInboxタブに全体未読数バッジ
    var totalUnread = 0;
    for (var k in unreadMap) totalUnread += unreadMap[k].unread;
    var navBadge = document.getElementById('chat-notify-nav-badge');
    if (navBadge) {
      if (totalUnread > 0) {
        navBadge.innerText = totalUnread;
        navBadge.style.display = '';
      } else {
        navBadge.style.display = 'none';
      }
    }
  }

  /* ── 差分検知（状態保存のみ、トースト無し） ── */
  function detectNewAndNotify(unreadMap) {
    lastUnreadState = JSON.parse(JSON.stringify(unreadMap));
  }

  /* ── ポーリング本体 ── */
  function pollChatUnread() {
    var email = (window.currentAdminProfile && window.currentAdminProfile.email) || '';
    if (!email) return;

    getChatUnread(email).then(function (res) {
      if (!res || !res.success) return;
      currentUnreadMap = res.unread || {};
      applyBadgesToDOM(currentUnreadMap);
      detectNewAndNotify(currentUnreadMap);
    }).catch(function () { /* silent */ });
  }

  /* ── 初回起動＆ポーリング開始 ── */
  window.startChatNotifyPolling = function () {
    if (pollTimer) clearInterval(pollTimer);
    // 初回は少し待ってから（プロフィールロード待ち）
    setTimeout(function () {
      pollChatUnread();
      pollTimer = setInterval(pollChatUnread, POLL_INTERVAL);
    }, 2000);
  };

  /* ── カード描画後に呼び出す（タブ切替時にバッジを再適用） ── */
  window.applyChatUnreadBadges = function () {
    applyBadgesToDOM(currentUnreadMap);
  };

  /* ── 既読マーク（モーダルを開いた時に呼ぶ） ── */
  window.markChatAsRead = function (postId) {
    var email = (window.currentAdminProfile && window.currentAdminProfile.email) || '';
    if (!email || !postId) return;
    markChatRead(email, postId).then(function () {
      // バッジを即座に消す
      var badgeEl = document.getElementById('chat-unread-' + postId);
      if (badgeEl) badgeEl.style.display = 'none';
      // 内部状態も更新
      if (currentUnreadMap[postId]) delete currentUnreadMap[postId];
      if (lastUnreadState[postId]) delete lastUnreadState[postId];
      // ナビバッジも再計算
      applyBadgesToDOM(currentUnreadMap);
    });
  };

  /* ── 停止 ── */
  window.stopChatNotifyPolling = function () {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  };
})();
