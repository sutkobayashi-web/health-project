// ====================================================
//  食事傾向分析: ユーザー一覧＆AIレポート生成
// ====================================================

function loadFoodUsers() {
    var area = document.getElementById('food-users-area');
    if (!area) return;
    area.innerHTML = '<div class="col-12 text-center p-5 text-muted"><div class="spinner-border spinner-border-sm"></div> 読み込み中...</div>';

    getFoodUsers().then(function(users) {
        if (!users || users.length === 0) {
            area.innerHTML = '<div class="col-12 text-center p-5 text-muted"><i class="fas fa-utensils fs-1 d-block mb-3" style="opacity:0.3;"></i>食事投稿が2件以上のユーザーはまだいません</div>';
            return;
        }
        area.innerHTML = users.map(function(u) {
            var avatar = u.avatar || '🙂';
            if (avatar.length > 4 || avatar.match(/\d{4}/)) avatar = '🙂';
            return '<div class="col-md-6 col-lg-4">' +
                '<div class="card h-100 shadow-sm border-0" style="border-top:4px solid #20c997 !important; transition:all 0.2s; cursor:default;" onmouseover="this.style.transform=\'translateY(-3px)\';this.style.boxShadow=\'0 8px 25px rgba(0,0,0,0.1)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\'">' +
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
                        '<button type="button" class="btn btn-success w-100 fw-bold" style="border-radius:12px;" onclick="sendFoodReport(\'' + u.id + '\',\'' + escapeHtml(u.nickname) + '\')" id="food-btn-' + u.id + '">' +
                            '<i class="fas fa-file-medical-alt me-2"></i>食事傾向レポートを送信' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }).join('');
    }).catch(function(err) {
        area.innerHTML = '<div class="col-12 text-center p-5 text-danger">読み込みエラー: ' + escapeHtml(err.message) + '</div>';
    });
}

function sendFoodReport(userId, nickname) {
    if (!confirm(nickname + 'さんの食事傾向をAI栄養士が分析し、レポートを送信しますか？\n\n※過去の食事投稿をもとに分析します')) return;

    var btn = document.getElementById('food-btn-' + userId);
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div>AI分析中...';
    }

    generateFoodReport(userId).then(function(res) {
        if (btn) {
            btn.disabled = false;
            if (res && res.success) {
                btn.innerHTML = '<i class="fas fa-check-circle me-2"></i>送信完了！';
                btn.className = 'btn btn-outline-success w-100 fw-bold';
                btn.style.borderRadius = '12px';
                alert(res.msg);
                // 3秒後にボタンを元に戻す
                setTimeout(function() {
                    btn.innerHTML = '<i class="fas fa-file-medical-alt me-2"></i>食事傾向レポートを送信';
                    btn.className = 'btn btn-success w-100 fw-bold';
                }, 3000);
            } else {
                btn.innerHTML = '<i class="fas fa-file-medical-alt me-2"></i>食事傾向レポートを送信';
                alert('エラー: ' + (res ? res.msg : '不明'));
            }
        }
    }).catch(function(err) {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-file-medical-alt me-2"></i>食事傾向レポートを送信';
        }
        alert('通信エラー: ' + err.message);
    });
}
