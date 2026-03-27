// === 話題共感 管理画面 ===

function addBtChoiceInput() {
    var container = document.getElementById('bt-choices');
    var count = container.querySelectorAll('.bt-choice-input').length;
    if (count >= 6) { alert('選択肢は最大6つです'); return; }
    var input = document.createElement('input');
    input.className = 'bt-choice-input';
    input.type = 'text';
    input.placeholder = '選択肢' + (count + 1);
    input.style.cssText = 'border:1px solid #ddd; border-radius:6px; padding:6px 10px; font-size:0.82rem;';
    container.appendChild(input);
}

function createBuddyTopic() {
    var title = document.getElementById('bt-title').value.trim();
    if (!title) { alert('話題を入力してください'); return; }
    var inputs = document.querySelectorAll('.bt-choice-input');
    var choices = [];
    inputs.forEach(function(inp) {
        var v = inp.value.trim();
        if (v) choices.push(v);
    });
    if (choices.length < 2) { alert('選択肢を2つ以上入力してください'); return; }

    var now = new Date();
    var weekLabel = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日〜';

    fetch('/api/buddy-topics/admin/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getAdminToken() },
        body: JSON.stringify({ title: title, choices: choices, weekLabel: weekLabel })
    }).then(function(r) { return r.json(); }).then(function(data) {
        if (data && data.success) {
            alert('話題を配信しました！');
            document.getElementById('bt-title').value = '';
            renderBuddyTopicAdmin();
        } else {
            alert('失敗: ' + (data ? data.msg : ''));
        }
    }).catch(function(e) { alert('通信エラー: ' + e.message); });
}

function renderBuddyTopicAdmin() {
    var area = document.getElementById('bt-list-area');
    if (!area) return;
    area.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm"></div></div>';

    fetch('/api/buddy-topics/admin/list', {
        headers: { 'Authorization': 'Bearer ' + getAdminToken() }
    }).then(function(r) { return r.json(); }).then(function(topics) {
        if (!topics || topics.length === 0) {
            area.innerHTML = '<div style="text-align:center; padding:30px; color:#999;"><i class="far fa-comment-dots" style="font-size:2rem;"></i><div style="margin-top:8px;">まだ話題がありません</div></div>';
            return;
        }

        var html = '';
        topics.forEach(function(t) {
            var isActive = t.status === 'active';
            var statusBadge = isActive
                ? '<span style="background:#4caf50; color:white; font-size:0.65rem; padding:2px 8px; border-radius:10px; font-weight:700;">配信中</span>'
                : '<span style="background:#999; color:white; font-size:0.65rem; padding:2px 8px; border-radius:10px;">終了</span>';
            var responseRate = t.totalUsers > 0 ? Math.round(t.totalResponses / t.totalUsers * 100) : 0;

            html += '<div style="background:white; border-radius:12px; padding:14px; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border-left:4px solid ' + (isActive ? '#ff7043' : '#ccc') + ';">';
            html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">';
            html += '<div style="font-weight:700; font-size:0.88rem; color:#333;">' + escapeHtml(t.title) + '</div>';
            html += '<div style="display:flex; gap:6px; align-items:center;">' + statusBadge;
            if (isActive) {
                html += ' <button onclick="closeBuddyTopic(\'' + t.topicId + '\')" style="font-size:0.68rem; background:#f44336; color:white; border:none; border-radius:6px; padding:3px 10px; cursor:pointer;">終了</button>';
            }
            html += '</div></div>';

            // 集計バー
            html += '<div style="font-size:0.72rem; color:#999; margin-bottom:6px;">' + (t.weekLabel || '') + ' | 回答 ' + t.totalResponses + '/' + t.totalUsers + '人（' + responseRate + '%）</div>';
            var maxCount = Math.max.apply(null, t.choiceCounts.map(function(c) { return c.count; }).concat([1]));
            t.choiceCounts.forEach(function(c, i) {
                var pct = maxCount > 0 ? Math.round(c.count / maxCount * 100) : 0;
                var colors = ['#667eea', '#20c997', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4'];
                html += '<div style="display:flex; align-items:center; gap:8px; margin-bottom:3px;">';
                html += '<div style="width:120px; font-size:0.75rem; text-align:right; color:#555; flex-shrink:0;">' + escapeHtml(c.text) + '</div>';
                html += '<div style="flex:1; background:#f0f0f0; border-radius:4px; height:18px; overflow:hidden;">';
                html += '<div style="width:' + pct + '%; height:100%; background:' + colors[i % 6] + '; border-radius:4px; transition:width 0.5s;"></div>';
                html += '</div>';
                html += '<div style="width:30px; font-size:0.75rem; font-weight:700; color:#333;">' + c.count + '</div>';
                html += '</div>';
            });

            // 詳細ボタン
            html += '<div style="text-align:right; margin-top:8px;">';
            html += '<button onclick="showTopicDetail(\'' + t.topicId + '\')" style="font-size:0.72rem; background:none; border:1px solid #667eea; color:#667eea; border-radius:6px; padding:4px 12px; cursor:pointer;"><i class="fas fa-search me-1"></i>詳細・コメント</button>';
            html += '</div>';

            html += '</div>';
        });

        area.innerHTML = html;
    }).catch(function() {
        area.innerHTML = '<div style="color:red; padding:10px;">読み込みエラー</div>';
    });
}

function closeBuddyTopic(topicId) {
    if (!confirm('この話題を終了しますか？')) return;
    fetch('/api/buddy-topics/admin/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getAdminToken() },
        body: JSON.stringify({ topicId: topicId })
    }).then(function(r) { return r.json(); }).then(function(data) {
        if (data && data.success) {
            renderBuddyTopicAdmin();
        } else {
            alert('失敗: ' + (data ? data.msg : ''));
        }
    });
}

function showTopicDetail(topicId) {
    fetch('/api/buddy-topics/admin/results/' + topicId, {
        headers: { 'Authorization': 'Bearer ' + getAdminToken() }
    }).then(function(r) { return r.json(); }).then(function(data) {
        if (!data || !data.success) { alert('取得失敗'); return; }

        var html = '<div style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:9999; display:flex; align-items:center; justify-content:center;" onclick="if(event.target===this)this.remove()">';
        html += '<div style="background:white; border-radius:16px; padding:20px; width:90%; max-width:500px; max-height:80vh; overflow-y:auto;">';
        html += '<div style="font-weight:700; font-size:1rem; color:#ff7043; margin-bottom:4px;"><i class="fas fa-comments me-1"></i>' + escapeHtml(data.title) + '</div>';
        html += '<div style="font-size:0.75rem; color:#999; margin-bottom:12px;">' + (data.weekLabel || '') + ' | 回答率 ' + data.totalResponses + '/' + data.totalUsers + '人</div>';

        // 選択肢別
        var colors = ['#667eea', '#20c997', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4'];
        data.choiceDetails.forEach(function(cd, i) {
            html += '<div style="margin-bottom:12px; padding:10px; background:#f8f9fa; border-radius:10px; border-left:3px solid ' + colors[i % 6] + ';">';
            html += '<div style="font-weight:700; font-size:0.85rem; color:' + colors[i % 6] + ';">' + escapeHtml(cd.text) + ' <span style="color:#333;">(' + cd.count + '人)</span></div>';
            if (cd.users.length > 0) {
                cd.users.forEach(function(u) {
                    html += '<div style="font-size:0.78rem; color:#555; margin-top:4px; padding-left:8px;">';
                    html += '<i class="fas fa-user" style="color:#ccc; margin-right:4px;"></i>' + escapeHtml(u.nickname);
                    if (u.department) html += ' <span style="color:#aaa;">(' + escapeHtml(u.department) + ')</span>';
                    if (u.comment) html += '<div style="margin-top:2px; padding:4px 8px; background:white; border-radius:6px; color:#333; font-size:0.75rem;"><i class="fas fa-quote-left" style="color:#ddd; margin-right:4px;"></i>' + escapeHtml(u.comment) + '</div>';
                    html += '</div>';
                });
            }
            html += '</div>';
        });

        // コメント一覧
        if (data.comments && data.comments.length > 0) {
            html += '<div style="margin-top:12px; font-weight:700; font-size:0.85rem; color:#333; margin-bottom:6px;"><i class="fas fa-comment-dots me-1"></i>コメント一覧</div>';
            data.comments.forEach(function(c) {
                html += '<div style="padding:8px; background:#fff3e0; border-radius:8px; margin-bottom:4px; font-size:0.78rem;">';
                html += '<span style="font-weight:600;">' + escapeHtml(c.nickname) + '</span> <span style="color:#999;">(' + escapeHtml(c.choice) + ')</span>';
                html += '<div style="color:#333; margin-top:2px;">' + escapeHtml(c.comment) + '</div>';
                html += '</div>';
            });
        }

        html += '<div style="text-align:center; margin-top:16px;"><button onclick="this.closest(\'div[style*=position\\:fixed]\').remove()" style="padding:8px 30px; background:#667eea; color:white; border:none; border-radius:8px; font-weight:700; cursor:pointer;">閉じる</button></div>';
        html += '</div></div>';

        document.body.insertAdjacentHTML('beforeend', html);
    });
}
