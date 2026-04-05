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
                // 栄養バーチャート
                if (r.nutrition_scores) {
                    try {
                        var ns = typeof r.nutrition_scores === 'string' ? JSON.parse(r.nutrition_scores) : r.nutrition_scores;
                        html += buildAdminNutritionBar(ns);
                    } catch(e) {}
                }
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

// 栄養エビデンス対比バーチャート（Admin用）
function buildAdminNutritionBar(sc) {
    if (!sc) return '';
    // 旧形式検出
    var isLegacy = (typeof sc.protein === 'number' && sc.protein <= 5 && !sc.calories);
    if (isLegacy) {
        sc = {
            calories:{value:300+(sc.protein||3)*70,unit:'kcal'}, protein:{value:(sc.protein||3)*5,unit:'g'},
            fat:{value:15+(sc.fat||3)*3,unit:'%'}, carbs:{value:35+(sc.carbs||sc.carb||3)*6,unit:'%'},
            vitamin:{value:(sc.vitamin||3)*30,unit:'g'}, mineral:{value:(sc.mineral||3)*55,unit:'mg'},
            fiber:{value:(sc.vitamin||3)*1.5,unit:'g'}, salt:{value:4.0-(sc.salt||3)*0.5,unit:'g'},
            alcohol:{value:0,unit:'g'}
        };
    }
    var items = [
        {key:'calories',icon:'🔥',label:'カロリー',unit:'kcal',target:550,min:450,max:650,range:true},
        {key:'protein',icon:'🍖',label:'たんぱく質',unit:'g',target:20},
        {key:'fat',icon:'🫒',label:'脂質',unit:'%',target:25,min:20,max:30,range:true},
        {key:'carbs',icon:'🍚',label:'炭水化物',unit:'%',target:57.5,min:50,max:65,range:true},
        {key:'vitamin',icon:'🥬',label:'野菜量',unit:'g',target:120},
        {key:'mineral',icon:'🦴',label:'カルシウム',unit:'mg',target:227},
        {key:'fiber',icon:'🌾',label:'食物繊維',unit:'g',target:7},
        {key:'salt',icon:'🧂',label:'塩分',unit:'g',target:2.5,reverse:true},
        {key:'alcohol',icon:'🍺',label:'アルコール',unit:'g',target:20,reverse:true,optional:true}
    ];
    var html = '<div style="margin:10px 0;padding:12px;background:#f8faf9;border-radius:10px;border:1px solid #e0f0e8;">';
    html += '<div style="font-size:0.78rem;font-weight:800;color:#1a3c34;margin-bottom:8px;">📊 栄養バランス（エビデンス対比）</div>';
    items.forEach(function(item) {
        var raw = sc[item.key]; var val = 0;
        if (raw && typeof raw === 'object' && raw.value !== undefined) val = Number(raw.value);
        else if (typeof raw === 'number') val = raw;
        if (item.optional && val === 0) return;
        var barMax = item.target * 1.5;
        var pct = Math.min(100, (val / barMax) * 100);
        var status, color;
        if (item.reverse) {
            if (val <= item.target * 0.8) { status='良好'; color='#20c997'; }
            else if (val <= item.target) { status='適量'; color='#f59e0b'; }
            else { status='超過'; color='#ef4444'; }
        } else if (item.range) {
            if (val >= item.min && val <= item.max) { status='適量'; color='#20c997'; }
            else if (val < item.min) { status='不足'; color='#f59e0b'; }
            else { status='超過'; color='#ef4444'; }
        } else {
            var ratio = val / item.target;
            if (ratio >= 0.8 && ratio <= 1.3) { status='適量'; color='#20c997'; }
            else if (ratio < 0.8) { status='不足'; color='#f59e0b'; }
            else { status='超過'; color='#ef4444'; }
        }
        var targetPct = Math.min(100, (item.target / barMax) * 100);
        var dispVal = val % 1 === 0 ? val : val.toFixed(1);
        html += '<div style="margin-bottom:5px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:1px;">' +
                '<span style="font-size:0.72rem;font-weight:700;color:#444;">' + item.icon + ' ' + item.label + '</span>' +
                '<span style="font-size:0.68rem;font-weight:700;color:' + color + ';">' + dispVal + item.unit +
                    ' <span style="font-size:0.58rem;padding:1px 5px;border-radius:5px;background:'+color+'22;color:'+color+';">'+status+'</span></span>' +
            '</div>' +
            '<div style="position:relative;height:7px;background:#e9ecef;border-radius:3px;overflow:visible;margin-bottom:14px;">' +
                '<div style="width:'+pct+'%;height:100%;background:'+color+';border-radius:3px;"></div>' +
                '<div style="position:absolute;top:-2px;left:'+targetPct+'%;width:1.5px;height:11px;background:#333;border-radius:1px;opacity:0.4;"></div>' +
                '<div style="position:absolute;top:11px;left:'+targetPct+'%;transform:translateX(-50%);font-size:0.5rem;color:#888;white-space:nowrap;">'+item.target+'</div>' +
            '</div></div>';
    });
    html += '<div style="text-align:right;font-size:0.55rem;color:#aaa;margin-top:6px;">▮ 基準値｜食事摂取基準2025・スマートミール基準</div>';
    html += '</div>';
    return html;
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
