// ====================================================
//  食事傾向分析: ユーザー一覧＆AIレポート生成
// ====================================================

function loadFoodUsers() {
    var area = document.getElementById('food-users-area');
    if (!area) return;
    area.innerHTML = '<div class="col-12 text-center p-5 text-muted"><div class="spinner-border spinner-border-sm"></div> 読み込み中...</div>';

    getFoodUsers().then(function(users) {
        if (!Array.isArray(users)) {
            area.innerHTML = '<div class="col-12 text-center p-5 text-muted"><i class="fas fa-exclamation-circle fs-1 d-block mb-3" style="opacity:0.3;color:#e53935;"></i>読み込みエラー。再ログインしてください。</div>';
            return;
        }
        if (!users || users.length === 0) {
            area.innerHTML = '<div class="col-12 text-center p-5 text-muted"><i class="fas fa-utensils fs-1 d-block mb-3" style="opacity:0.3;"></i>食事投稿が2件以上のユーザーはまだいません</div>';
            return;
        }
        area.innerHTML = users.map(function(u) {
            var avatar = u.avatar || '🙂';
            if (avatar.length > 4 || avatar.match(/\d{4}/)) avatar = '🙂';
            return '<div class="col-md-6 col-lg-4">' +
                '<div class="card h-100 shadow-sm border-0" style="border-top:4px solid #20c997 !important; transition:all 0.2s;" onmouseover="this.style.transform=\'translateY(-3px)\';this.style.boxShadow=\'0 8px 25px rgba(0,0,0,0.1)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\'">' +
                    '<div class="card-body">' +
                        '<div class="d-flex align-items-center mb-3">' +
                            '<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#f0faf4,#e0f7ed);display:flex;justify-content:center;align-items:center;font-size:1.5rem;margin-right:12px;box-shadow:0 2px 8px rgba(32,201,151,0.15);">' + avatar + '</div>' +
                            '<div>' +
                                '<div class="fw-bold" style="font-size:1rem;">' + escapeHtml(u.nickname) + '</div>' +
                                '<div class="text-muted" style="font-size:0.75rem;">' + escapeHtml(u.department || '') + '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="d-flex justify-content-between align-items-center mb-3 px-2 py-2" style="background:#f8f9fa;border-radius:10px;">' +
                            '<div class="text-center"><div style="font-size:1.3rem;font-weight:900;color:#20c997;">' + u.foodCount + '</div><div style="font-size:0.6rem;color:#999;">投稿数</div></div>' +
                            '<div class="text-center"><div style="font-size:0.85rem;font-weight:700;color:#555;">' + escapeHtml(u.lastPost) + '</div><div style="font-size:0.6rem;color:#999;">最終投稿</div></div>' +
                        '</div>' +
                        '<button type="button" class="btn btn-success w-100 fw-bold" style="border-radius:12px;" onclick="previewFoodReport(\'' + u.id + '\',\'' + escapeHtml(u.nickname) + '\')" id="food-btn-' + u.id + '">' +
                            '<i class="fas fa-file-medical-alt me-2"></i>食事傾向レポートを作成' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }).join('');
    }).catch(function(err) {
        area.innerHTML = '<div class="col-12 text-center p-5 text-danger">読み込みエラー: ' + escapeHtml(err.message) + '</div>';
    });
}

// プレビュー生成
function previewFoodReport(userId, nickname) {
    var btn = document.getElementById('food-btn-' + userId);
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div>AI食事アドバイザーが分析中...';
    }

    generateFoodReport(userId).then(function(res) {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-file-medical-alt me-2"></i>食事傾向レポートを作成';
        }
        if (res && res.success) {
            showFoodReportPreview(res);
        } else {
            alert('エラー: ' + (res ? res.msg : '不明'));
        }
    }).catch(function(err) {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-file-medical-alt me-2"></i>食事傾向レポートを作成';
        }
        alert('通信エラー: ' + err.message);
    });
}

// プレビューモーダル表示
function showFoodReportPreview(data) {
    // 既存モーダルがあれば削除
    var old = document.getElementById('food-report-modal');
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.id = 'food-report-modal';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;justify-content:center;align-items:center;padding:16px;backdrop-filter:blur(4px);';

    var safeReport = escapeHtml(data.report);

    overlay.innerHTML =
        '<div style="background:white;border-radius:20px;max-width:600px;width:100%;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.25);">' +
            // ヘッダー
            '<div style="padding:18px 22px;background:linear-gradient(135deg,#20c997,#38d9a9);color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">' +
                '<div><div style="font-weight:800;font-size:1.1rem;"><i class="fas fa-utensils me-2"></i>食事傾向レポート</div>' +
                '<div style="font-size:0.75rem;opacity:0.85;">' + escapeHtml(data.nickname) + 'さん / ' + data.foodCount + '件の食事記録を分析</div></div>' +
                '<button onclick="document.getElementById(\'food-report-modal\').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:36px;height:36px;border-radius:50%;font-size:1.1rem;cursor:pointer;display:flex;justify-content:center;align-items:center;"><i class="fas fa-times"></i></button>' +
            '</div>' +
            // レポート本文
            '<div style="flex:1;overflow-y:auto;padding:22px;">' +
                '<div style="background:linear-gradient(135deg,#f0faf4,#edf4ff);padding:18px;border-radius:14px;font-size:0.92rem;line-height:1.9;color:#333;white-space:pre-wrap;border-left:4px solid #20c997;">' + safeReport + '</div>' +
                // 推進メンバーのコメント入力
                '<div style="margin-top:16px;padding:16px;background:#fff;border:2px solid #e0e0e0;border-radius:14px;">' +
                    '<div style="font-size:0.78rem;font-weight:700;color:#6c5ce7;margin-bottom:8px;"><i class="fas fa-comment-medical me-1"></i>推進メンバーからのひとこと（任意）</div>' +
                    '<textarea id="food-report-comment" rows="3" placeholder="例: いつも食事投稿ありがとうございます！野菜が増えてきましたね。この調子で続けましょう！" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px 14px;font-size:0.88rem;resize:none;font-family:Noto Sans JP,sans-serif;line-height:1.6;"></textarea>' +
                    '<div style="font-size:0.68rem;color:#aaa;margin-top:4px;">※レポートの最後に追記されます</div>' +
                '</div>' +
            '</div>' +
            // フッター（送信ボタン）
            '<div style="padding:14px 22px;border-top:1px solid #eee;display:flex;gap:10px;flex-shrink:0;background:#fafafa;">' +
                '<button type="button" onclick="document.getElementById(\'food-report-modal\').remove()" style="flex:1;padding:12px;background:white;color:#666;border:2px solid #ddd;border-radius:12px;font-weight:700;font-size:0.9rem;cursor:pointer;">キャンセル</button>' +
                '<button type="button" onclick="confirmSendFoodReport(\'' + data.userId + '\',\'' + escapeHtml(data.nickname) + '\')" style="flex:2;padding:12px;background:linear-gradient(135deg,#20c997,#38d9a9);color:white;border:none;border-radius:12px;font-weight:700;font-size:0.9rem;cursor:pointer;box-shadow:0 4px 14px rgba(32,201,151,0.3);"><i class="fas fa-paper-plane me-2"></i>' + escapeHtml(data.nickname) + 'さんに送信する</button>' +
            '</div>' +
        '</div>';

    document.body.appendChild(overlay);
}

// 送信確定
function confirmSendFoodReport(userId, nickname) {
    var modal = document.getElementById('food-report-modal');
    var commentEl = document.getElementById('food-report-comment');
    var memberComment = commentEl ? commentEl.value : '';
    var buttons = modal.querySelectorAll('button');
    buttons.forEach(function(b) { b.disabled = true; });
    var sendBtn = buttons[buttons.length - 1];
    sendBtn.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div>送信中...';

    sendFoodReportNow(userId, memberComment).then(function(res) {
        if (modal) modal.remove();
        if (res && res.success) {
            alert(res.msg);
            // ボタンを更新
            var btn = document.getElementById('food-btn-' + userId);
            if (btn) {
                btn.innerHTML = '<i class="fas fa-check-circle me-2"></i>送信完了！';
                btn.className = 'btn btn-outline-success w-100 fw-bold';
                btn.style.borderRadius = '12px';
                setTimeout(function() {
                    btn.innerHTML = '<i class="fas fa-file-medical-alt me-2"></i>食事傾向レポートを作成';
                    btn.className = 'btn btn-success w-100 fw-bold';
                }, 3000);
            }
        } else {
            alert('送信エラー: ' + (res ? res.msg : '不明'));
        }
    }).catch(function(err) {
        if (modal) modal.remove();
        alert('通信エラー: ' + err.message);
    });
}
