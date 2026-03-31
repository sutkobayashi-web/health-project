// ============================================================
//  Admin_JS_Mail: 個別メッセージ・通知管理
// ============================================================

// ---- メールボックス切替 ----
function switchMailBox(boxType) {
  currentMailBox = boxType;
  document.getElementById('btn-box-inbox').classList.remove('active');
  document.getElementById('btn-box-sent').classList.remove('active');
  document.getElementById('btn-box-' + boxType).classList.add('active');
  document.getElementById('mail-box-title').innerHTML =
    boxType === 'inbox'
      ? '<i class="fas fa-inbox"></i> 受信トレイ'
      : '<i class="fas fa-paper-plane"></i> 送信済み';
  renderMailList();
}

// ---- 通知一覧読み込み ----
function loadPersonalNotices() {
  const area = document.getElementById('personal-list-area');
  area.innerHTML = '<div class="text-center p-5 text-muted"><div class="spinner-border spinner-border-sm"></div> 読み込み中...</div>';
  getPersonalNoticesAdmin()
    .then(function(res) {
      mailDataCache.inbox = [];
      mailDataCache.sent = [];
      let unreadCount = 0;
      if (res && res.list) {
        res.list.forEach(function(n) {
          mailDataCache.sent.push(n);
          if (n.reply) {
            mailDataCache.inbox.push(n);
            if (n.status === 'read' && !n.adminRead) {
              unreadCount++;
            }
          }
        });
      }
      updateMailBadges(unreadCount);
      renderMailList();
    })
    .catch(function(err) {
      area.innerHTML = '<div class="text-center p-5 text-danger"><i class="fas fa-exclamation-triangle me-2"></i>読み込みエラー: ' + escapeHtml(err.message || '不明') + '</div>';
    });
}

// ---- バッジ更新 ----
function updateMailBadges(count) {
  const badgeOuter = document.getElementById('personal-badge');
  const badgeInner = document.getElementById('mail-unread-badge-inner');
  if (count > 0) {
    if (badgeOuter) { badgeOuter.innerText = count; badgeOuter.style.display = 'block'; }
    if (badgeInner) { badgeInner.innerText = count; badgeInner.style.display = 'block'; }
  } else {
    if (badgeOuter) { badgeOuter.style.display = 'none'; }
    if (badgeInner) { badgeInner.style.display = 'none'; }
  }
}

// ---- メール一覧描画 ----
function renderMailList() {
  const list = mailDataCache[currentMailBox] || [];
  const container = document.getElementById('personal-list-area');
  if (list.length === 0) {
    container.innerHTML = '<div class="text-center p-5 text-muted"><i class="fas fa-inbox fa-3x mb-3 d-block" style="opacity:0.3;"></i>メールはありません</div>';
    return;
  }
  var html = '';
  list.forEach(function(n) {
    const isUnread = (currentMailBox === 'inbox' && n.status === 'read' && !n.adminRead);
    const bgStyle = isUnread
      ? 'background:#fff3e6; border-left:4px solid #fd7e14;'
      : 'background:#fff; border-left:4px solid transparent;';
    const icon = currentMailBox === 'inbox'
      ? '<i class="fas fa-reply text-success me-2"></i>'
      : '<i class="fas fa-arrow-right text-secondary me-2"></i>';
    const subject = currentMailBox === 'inbox' ? (n.reply || '') : (n.content || '');
    const partner = n.targetName || '不明';
    const unreadDot = isUnread ? '<span class="badge bg-warning text-dark ms-2" style="font-size:0.65rem;">未読</span>' : '';
    html += '<div class="mail-item d-flex align-items-center px-4 py-3 border-bottom" style="cursor:pointer; ' + bgStyle + '" onclick="openMailDetail(\'' + escapeHtml(n.id) + '\')">' +
      '<div class="mail-sender me-3" style="min-width:120px; font-weight:600;">' + icon + escapeHtml(partner) + unreadDot + '</div>' +
      '<div class="mail-subject text-truncate flex-grow-1 text-secondary">' + escapeHtml(subject.substring(0, 80)) + '</div>' +
      '<div class="mail-date text-muted small ms-3" style="white-space:nowrap;">' + escapeHtml(n.date || '') + '</div>' +
    '</div>';
  });
  container.innerHTML = html;
}

// ---- メール詳細表示 (モーダル化) ----
function openMailDetail(nid) {
  const n = (mailDataCache[currentMailBox] || []).find(function(x) { return x.id === nid; });
  if (!n) return;

  // 受信トレイで未読なら既読にする
  if (currentMailBox === 'inbox' && !n.adminRead) {
    markAdminRead(nid);
  }

  // モーダルHTML組み立て
  var html = '<div class="modal-overlay" id="mail-detail-overlay" style="display:flex; z-index:4200; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); justify-content:center; align-items:center;">' +
    '<div style="background:white; border-radius:16px; max-width:560px; width:90%; max-height:80vh; overflow-y:auto; padding:25px; box-shadow:0 8px 32px rgba(0,0,0,0.2);">' +
      '<div class="d-flex justify-content-between align-items-center mb-3">' +
        '<h6 class="fw-bold m-0"><i class="fas fa-envelope-open-text text-primary me-2"></i>メッセージ詳細</h6>' +
        '<button class="btn btn-sm btn-light rounded-circle" onclick="closeMailDetail()"><i class="fas fa-times"></i></button>' +
      '</div>' +
      '<div class="mb-3 p-3 bg-light rounded">' +
        '<div class="row small text-muted">' +
          '<div class="col-4 fw-bold">送信日時</div><div class="col-8">' + escapeHtml(n.date || '') + '</div>' +
          '<div class="col-4 fw-bold mt-1">相手</div><div class="col-8 mt-1">' + escapeHtml(n.targetName || '不明') + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="mb-3">' +
        '<label class="small fw-bold text-muted mb-1"><i class="fas fa-paper-plane me-1"></i>送信内容</label>' +
        '<div class="p-3 border rounded bg-white" style="white-space:pre-wrap; font-size:0.9rem;">' + escapeHtml(n.content || '') + '</div>' +
      '</div>';

  if (n.reply) {
    html += '<div class="mb-3">' +
      '<label class="small fw-bold text-success mb-1"><i class="fas fa-reply me-1"></i>返信内容</label>' +
      '<div class="p-3 border border-success rounded bg-white" style="white-space:pre-wrap; font-size:0.9rem;">' + escapeHtml(n.reply) + '</div>' +
      (n.readAt ? '<div class="text-end small text-muted mt-1">閲覧: ' + escapeHtml(n.readAt) + '</div>' : '') +
    '</div>';
  } else if (n.status === 'read' || n.readAt) {
    html += '<div class="p-3 text-center text-success bg-light rounded"><i class="fas fa-check-circle me-2"></i>既読済み' + (n.readAt ? '（' + escapeHtml(n.readAt) + '）' : '') + '</div>';
  } else {
    html += '<div class="p-3 text-center text-muted bg-light rounded"><i class="fas fa-hourglass-half me-2"></i>未読</div>';
  }

  html += '<div class="text-end mt-3"><button class="btn btn-secondary btn-sm" onclick="closeMailDetail()">閉じる</button></div>' +
    '</div></div>';

  // 既存のモーダルがあれば削除
  closeMailDetail();
  document.body.insertAdjacentHTML('beforeend', html);
}

function closeMailDetail() {
  const el = document.getElementById('mail-detail-overlay');
  if (el) el.remove();
}

// ---- 既読マーク ----
function markAdminRead(nid) {
  markAdminNoticeAsRead(nid)
    .then(function() {
      const item = (mailDataCache.inbox || []).find(function(x) { return x.id === nid; });
      if (item) item.adminRead = true;
      // バッジ更新
      const badgeInner = document.getElementById('mail-unread-badge-inner');
      let count = parseInt((badgeInner && badgeInner.innerText) || '0');
      if (count > 0) count--;
      updateMailBadges(count);
      renderMailList();
    })
    .catch(function(err) {
      console.error('既読マーク失敗:', err);
    });
}

// ---- 一斉通知送信 (broadcastモーダル用) ----
function openBroadcastModal() {
  document.getElementById('broadcast-msg').value = '';
  const modal = document.getElementById('broadcast-modal');
  if (modal) modal.style.display = 'flex';
}

function closeBroadcastModal() {
  const modal = document.getElementById('broadcast-modal');
  if (modal) modal.style.display = 'none';
}

function sendBroadcast() {
  const msg = (document.getElementById('broadcast-msg') || {}).value;
  if (!msg || !msg.trim()) { alert('メッセージを入力してください'); return; }
  if (!confirm('全ユーザーに通知を送信しますか？')) return;

  showLoading('通知送信中...');
  saveAdminNotice({ content: msg.trim(), isBroadcast: true, sender: currentAdminProfile.name || 'Admin' })
    .then(function(res) {
      hideLoading();
      if (res && res.success) {
        alert('送信完了: ' + (res.msg || ''));
        closeBroadcastModal();
      } else {
        alert('送信エラー: ' + ((res && res.msg) || '不明'));
      }
    })
    .catch(function(err) {
      hideLoading();
      alert('エラー: ' + (err.message || '不明'));
    });
}

// ---- 個別メッセージ送信 (Inbox詳細から呼ばれる) ----
function sendPersonalMessage(targetUid, targetName) {
  const msg = prompt('「' + targetName + '」さんにバディー経由でメッセージを送信:\n(バディーチャット画面に表示されます)');
  if (!msg || !msg.trim()) return;

  showLoading('送信中...');
  saveAdminNotice({ content: '【BUDDY】' + msg.trim(), isBroadcast: false, targetUid: targetUid, sender: currentAdminProfile.name || 'Admin' })
    .then(function(res) {
      hideLoading();
      if (res && res.success) {
        alert('送信しました');
      } else {
        alert('送信エラー: ' + ((res && res.msg) || '不明'));
      }
    })
    .catch(function(err) {
      hideLoading();
      alert('エラー: ' + (err.message || '不明'));
    });
}

// ---- 解決済みアーカイブ読み込み ----
function loadResolvedList() {
  const area = document.getElementById('resolved-list-area');
  if (!area) return;
  area.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm"></div></div>';
  getResolvedData()
    .then(function(posts) {
      if (!posts || posts.length === 0) {
        area.innerHTML = '<div class="text-center text-muted p-4">解決済みの投稿はありません</div>';
        return;
      }
      let html = '';
      posts.forEach(function(r) {
        html += '<div class="p-3 border-bottom">' +
          '<div class="d-flex justify-content-between">' +
            '<strong>' + escapeHtml(String(r[2] || '').substring(0, 40)) + '</strong>' +
            '<span class="small text-muted">' + escapeHtml(String(r[14] || '')) + '</span>' +
          '</div>' +
          '<div class="small text-secondary mt-1">' + escapeHtml(String(r[4] || '').substring(0, 100)) + '</div>' +
        '</div>';
      });
      area.innerHTML = html;
    })
    .catch(function(err) {
      area.innerHTML = '<div class="text-center text-danger p-3">読み込みエラー</div>';
    });
}
