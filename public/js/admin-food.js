// ====================================================
//  週間食事レポート: 自動配信レポート一覧＆議論
// ====================================================

function loadFoodUsers() { loadFoodWeeklyReports(); }

function loadFoodWeeklyReports() {
    var area = document.getElementById('food-weekly-area');
    if (!area) return;
    area.innerHTML = '<div class="text-center p-5 text-muted"><div class="spinner-border spinner-border-sm"></div> 読み込み中...</div>';

    getFoodWeeklyReports().then(function(res) {
        if (!res || !res.success || !res.reports) {
            area.innerHTML = '<div class="text-center p-5 text-muted"><i class="fas fa-exclamation-circle" style="font-size:2rem;opacity:0.3;color:#e53935;"></i><div class="mt-2">読み込みエラー。再ログインしてください。</div></div>';
            return;
        }
        if (res.reports.length === 0) {
            area.innerHTML = '<div class="text-center p-5 text-muted"><i class="fas fa-utensils" style="font-size:2rem;opacity:0.3;"></i><div class="mt-2">まだ週間レポートがありません。<br>毎週月曜7:00に自動生成されます。</div></div>';
            return;
        }

        // 週ごとにグループ化
        var byWeek = {};
        res.reports.forEach(function(r) {
            var key = r.week_start;
            if (!byWeek[key]) byWeek[key] = [];
            byWeek[key].push(r);
        });

        var html = '';
        var weeks = Object.keys(byWeek).sort().reverse();
        weeks.forEach(function(week) {
            var reports = byWeek[week];
            var weekEnd = reports[0].week_end || '';
            html += '<div style="margin-bottom:20px;">';
            html += '<div style="font-weight:800; font-size:0.95rem; color:#20c997; margin-bottom:10px; padding:8px 12px; background:linear-gradient(135deg,#f0faf4,#edf4ff); border-radius:10px; border-left:4px solid #20c997;">';
            html += '<i class="fas fa-calendar-week me-2"></i>' + week + ' 〜 ' + weekEnd + '（' + reports.length + '名分）</div>';

            reports.forEach(function(r) {
                var chatBadge = r.chat_count > 0 ? '<span style="background:#6c5ce7;color:white;font-size:0.6rem;padding:1px 6px;border-radius:8px;margin-left:6px;font-weight:700;">議論' + r.chat_count + '</span>' : '';
                html += '<div class="card mb-2 border-0 shadow-sm" style="border-left:3px solid #20c997 !important;">';
                html += '<div class="card-body" style="padding:12px 16px;">';
                // ヘッダー
                html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">';
                html += '<div><strong style="font-size:0.9rem;">' + escapeHtml(r.nickname) + '</strong>';
                html += '<span style="font-size:0.7rem; color:#999; margin-left:8px;">' + r.meal_count + '食分</span>' + chatBadge + '</div>';
                html += '<button class="btn btn-sm btn-outline-primary" style="font-size:0.68rem; padding:2px 10px;" onclick="toggleFoodReport(\'' + r.report_id + '\')"><i class="fas fa-chevron-down" id="food-rpt-icon-' + r.report_id + '"></i></button>';
                html += '</div>';
                // レポート本文（折りたたみ）
                html += '<div id="food-rpt-body-' + r.report_id + '" style="display:none;">';
                html += '<div style="background:#f8faf9; padding:14px; border-radius:10px; font-size:0.85rem; line-height:1.8; color:#333; white-space:pre-wrap; border-left:3px solid #38d9a9; margin-bottom:10px;">' + escapeHtml(r.report_text) + '</div>';
                // 議論エリア
                html += '<div id="food-rpt-chats-' + r.report_id + '" style="margin-bottom:8px;"></div>';
                html += '<div style="display:flex; gap:6px;">';
                html += '<input type="text" id="food-rpt-input-' + r.report_id + '" placeholder="コメントを追加..." style="flex:1; padding:8px 12px; border:1px solid #ddd; border-radius:10px; font-size:0.82rem;">';
                html += '<button class="btn btn-sm btn-primary fw-bold" style="border-radius:10px; font-size:0.75rem; padding:6px 14px;" onclick="sendFoodReportComment(\'' + r.report_id + '\')"><i class="fas fa-paper-plane"></i></button>';
                html += '</div>';
                html += '</div>'; // body end
                html += '</div></div>'; // card end
            });

            html += '</div>'; // week group end
        });

        area.innerHTML = html;
    }).catch(function(err) {
        area.innerHTML = '<div class="text-center p-5 text-danger">読み込みエラー: ' + escapeHtml(err.message) + '</div>';
    });
}

function toggleFoodReport(reportId) {
    var body = document.getElementById('food-rpt-body-' + reportId);
    var icon = document.getElementById('food-rpt-icon-' + reportId);
    if (!body) return;
    if (body.style.display === 'none') {
        body.style.display = 'block';
        if (icon) icon.className = 'fas fa-chevron-up';
        loadFoodReportChats(reportId);
    } else {
        body.style.display = 'none';
        if (icon) icon.className = 'fas fa-chevron-down';
    }
}

function loadFoodReportChats(reportId) {
    var area = document.getElementById('food-rpt-chats-' + reportId);
    if (!area) return;
    getFoodReportChats(reportId).then(function(res) {
        if (!res || !res.success || !res.chats || res.chats.length === 0) {
            area.innerHTML = '<div style="font-size:0.72rem; color:#bbb; padding:4px 0;">まだ議論はありません</div>';
            return;
        }
        area.innerHTML = res.chats.map(function(c) {
            var date = c.created_at ? new Date(c.created_at + 'Z').toLocaleString('ja-JP', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', timeZone:'Asia/Tokyo' }) : '';
            return '<div style="background:#f0f0ff; padding:8px 10px; border-radius:8px; margin-bottom:4px; font-size:0.82rem;">' +
                '<span style="font-weight:700; color:#6c5ce7;">' + escapeHtml(c.member_name) + '</span>' +
                '<span style="font-size:0.65rem; color:#bbb; margin-left:6px;">' + date + '</span>' +
                '<div style="color:#333; margin-top:2px;">' + escapeHtml(c.message) + '</div></div>';
        }).join('');
    });
}

function sendFoodReportComment(reportId) {
    var input = document.getElementById('food-rpt-input-' + reportId);
    if (!input || !input.value.trim()) return;
    var name = (window.currentAdminProfile && window.currentAdminProfile.name) || '管理者';
    postFoodReportChat(reportId, name, input.value.trim()).then(function(res) {
        if (res && res.success) {
            input.value = '';
            loadFoodReportChats(reportId);
        } else {
            alert('送信エラー');
        }
    });
}

function runFoodWeeklyManual() {
    if (!confirm('週間食事分析を今すぐ実行しますか？\n先週の食事投稿を対象に分析します。')) return;
    var btn = document.getElementById('food-weekly-run-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner-border spinner-border-sm me-1"></div>分析中...'; }
    runFoodWeeklyNow().then(function(res) {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-play me-1"></i>今すぐ実行'; }
        if (res && res.success) {
            if (res.skipped) {
                alert(res.reason === 'already_generated' ? 'この週のレポートは既に生成済みです' : '先週の食事投稿がありません');
            } else {
                var ok = res.results ? res.results.filter(function(r) { return r.success; }).length : 0;
                alert(ok + '名のレポートを生成しました');
                loadFoodWeeklyReports();
            }
        } else {
            alert('エラー: ' + (res ? res.msg : '不明'));
        }
    }).catch(function(err) {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-play me-1"></i>今すぐ実行'; }
        alert('通信エラー: ' + err.message);
    });
}
