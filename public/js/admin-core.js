// ====================================================
//  Core: グローバル変数・初期化・タブ切替・認証
// ====================================================
window.addEventListener('submit', function(e) { e.preventDefault(); }, true);

// カスタムアバター描画ヘルパー
function _renderMemberAvatar(avatarStr, fallback, size) {
    if (avatarStr && String(avatarStr).startsWith('custom:') && typeof renderCustomAvatar === 'function') {
        var dataUrl = renderCustomAvatar(avatarStr, size * 2);
        if (dataUrl) return '<img src="' + dataUrl + '" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;display:block;">';
    }
    if (avatarStr && avatarStr.length <= 4) return avatarStr;
    return fallback || '😀';
}

// グローバル変数
var allPostData = [];
var currentPlanList = [];
var currentPid = null;
var currentChartInstance = null;
var humanRadarChart = null;
var proposalRadarChart = null;
var themeRadarChart = null;
var currentAdminProfile = null;
var currentInboxFilter = 'all';
var tempFeedbackMap = {};
var allPointsData = [];
var currentUserUid = null;
var mailDataCache = { inbox: [], sent: [] };
var currentMailBox = 'inbox';
var selectedThemePostIds = [];
var selectedMeetingPlan = null;
var currentActiveTab = 'evaluation';

const COLORS = { RED: '#ff6384', BLUE: '#36a2eb', YELLOW: '#ffce56', GREEN: '#4bc0c0' };

function getCategoryColor(x, y) {
    if (x >= 2.5 && y >= 15) return COLORS.RED;
    if (x >= 2.5 && y < 15) return COLORS.BLUE;
    if (x < 2.5 && y >= 15) return COLORS.YELLOW;
    return COLORS.GREEN;
}

function escapeHtml(str) {
    if(!str) return "";
    return str.replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}

function showLoading(msg) { const ol = document.getElementById('global-loading-overlay'); if(ol) { ol.style.display='flex'; if(msg) document.getElementById('loading-text').innerText = msg; } }
function hideLoading() { const ol = document.getElementById('global-loading-overlay'); if(ol) ol.style.display='none'; const txt = document.getElementById('loading-text'); if(txt) txt.innerText = ""; }

function logoutAdmin() { if(!confirm("ログアウトしますか？")) return; localStorage.removeItem('co_heart_admin_pass'); localStorage.removeItem('co_heart_admin_profile'); localStorage.removeItem('co_heart_admin_token'); localStorage.setItem('co_heart_no_autologin', '1'); window.location.href = '/'; }

// ★ 認証処理
function doAdminAuth() {
    const email = document.getElementById('admin-login-email').value.trim();
    const pass = document.getElementById('admin-login-pass').value.trim();
    const remember = document.getElementById('admin-login-remember').checked;
    if(!email || !pass) { alert("メールアドレスとパスワードを入力してください"); return; }
    showLoading("認証中...");
    loginCoreMember(email, pass).then(function(res) {
        hideLoading();
        if(!res) { alert("サーバー応答がnullです。デプロイを更新してください。"); return; }
        if(res.success) {
            setAdminToken(res.token);
            currentAdminProfile = res.profile;
            localStorage.setItem('co_heart_admin_profile', JSON.stringify(res.profile));
            if(remember) {
                localStorage.setItem('co_heart_admin_email', email);
            } else {
                localStorage.removeItem('co_heart_admin_email');
            }
            // 平文パスワードは保存しない
            localStorage.removeItem('co_heart_admin_pass');
            document.getElementById('admin-auth-overlay').style.display = 'none';
            renderHeaderInfo();
            loadData();
            switchTab('evaluation');
        } else { alert("認証失敗: " + res.msg); }
    }).catch(function(err) { hideLoading(); alert("通信エラー: " + err.message); });
}

window.onload = function() {
    // トークンベースの認証チェック
    const savedToken = getAdminToken();
    const savedProfile = localStorage.getItem('co_heart_admin_profile');

    if(savedToken && savedProfile) {
        // トークンの有効性をサーバーで確認（軽量APIで検証）
        try { currentAdminProfile = JSON.parse(savedProfile); } catch(e) {}
        fetch('/api/admin/members-status', { headers: { 'Authorization': 'Bearer ' + savedToken } })
        .then(function(r) {
            if (r.ok) {
                // トークン有効
                document.getElementById('admin-auth-overlay').style.display = 'none';
                renderHeaderInfo();
                loadData();
            } else {
                // トークン期限切れ → ログイン画面
                localStorage.removeItem('co_heart_admin_token');
                localStorage.removeItem('co_heart_admin_profile');
                currentAdminProfile = null;
                document.getElementById('admin-auth-overlay').style.display = 'flex';
                var savedEmail = localStorage.getItem('co_heart_admin_email');
                var el = document.getElementById('admin-login-email');
                if(el && savedEmail) { el.value = savedEmail; }
            }
        }).catch(function() {
            document.getElementById('admin-auth-overlay').style.display = 'flex';
        });
    } else {
        // トークンなし → ログイン画面を表示
        document.getElementById('admin-auth-overlay').style.display = 'flex';
        // メールアドレスだけ復元
        var savedEmail = localStorage.getItem('co_heart_admin_email');
        var el = document.getElementById('admin-login-email');
        if(el && savedEmail) { el.value = savedEmail; }
    }

    // スライダー初期化
    for(let i=1; i<=7; i++) {
        const el = document.getElementById('ts'+i);
        if(el) el.addEventListener('input', function() { document.getElementById('tv'+i).innerText = this.value; if(typeof updThemeRadar === 'function') updThemeRadar(); });
    }
    switchTab('evaluation');
    const loader = document.getElementById('global-loading-overlay');
    if(loader) loader.style.display = 'none';
};

function renderHeaderInfo() {
    const box = document.getElementById('admin-status-box');
    if(!box) return;
    const avatar = (currentAdminProfile && currentAdminProfile.avatar) ? currentAdminProfile.avatar : '<i class="fas fa-user-shield"></i>';
    const name = (currentAdminProfile && currentAdminProfile.name) ? currentAdminProfile.name : "管理者";
    const role = (currentAdminProfile && currentAdminProfile.isExec) ? 'Exec' : 'Admin';
    box.innerHTML = `<div class="status-avatar">${avatar}</div><div class="status-info"><div class="status-name">${name}</div><div class="status-role">${role}</div></div>`;
    box.style.display = 'flex';
}

function loadData() {
    showLoading("データ取得中...");
    getReportData().then(function(data) {
        hideLoading();
        if (!Array.isArray(data)) {
            // 認証失敗等でオブジェクトが返った場合
            if (data && data.msg && data.msg.indexOf('401') !== -1) {
                localStorage.removeItem('co_heart_admin_token');
                localStorage.removeItem('co_heart_admin_profile');
                document.getElementById('admin-auth-overlay').style.display = 'flex';
                alert('セッションの有効期限が切れました。再ログインしてください。');
                return;
            }
            allPostData = [];
        } else {
            allPostData = data;
        }
        if (typeof renderV2Dashboard === 'function') renderV2Dashboard();
    }).catch(function(err) { hideLoading(); alert("データ取得エラー: " + err.message); });
    // メンバーリスト＆ハートビート開始
    startHeartbeat();
    loadSidebarMembers();
    // オンラインユーザーヒート表示（ハートビート送信後に取得）
    setTimeout(loadOnlineHeat, 2000);
    setInterval(loadOnlineHeat, 30000);
    // CoWellコインランキング
    loadMariganRanking();
    // チャット新着通知ポーリング開始
    if (typeof startChatNotifyPolling === 'function') startChatNotifyPolling();
}

// ハートビート送信（30秒ごと）- 自動更新は廃止
function startHeartbeat() {
    function sendBeat() {
        if (!currentAdminProfile) return;
        api('/admin/heartbeat', {
            email: currentAdminProfile.email || '',
            name: currentAdminProfile.name || '',
            avatar: currentAdminProfile.avatar || '🛡️'
        }, getAdminToken()).catch(function(){});
    }
    sendBeat();
    setInterval(sendBeat, 30000);
}

function refreshActiveTab() {
    switch (currentActiveTab) {
        case 'evaluation': renderInbox(currentInboxFilter); break;
        case 'current': loadCurrentAnalysis(); break;
        case 'candidates': loadCandidates(); break;
        case 'resolved': loadResolved(); break;
        case 'personal': loadPersonalNotices(); break;
        case 'aimeeting': loadPlansForMeeting(); break;
        case 'bmi22': loadHealthPlan26(); break;
        case 'exec': loadExecPending(); break;
        case 'food': loadFoodUsers(); break;
        case 'members': loadMemberManagement(); break;
        case 'backup': loadBackupTab(); break;
        case 'v2dash': if(typeof renderV2Dashboard==='function') renderV2Dashboard(); break;
        case 'v2challenge': if(typeof renderV2Challenges==='function') renderV2Challenges(); break;
        case 'v2kpi': if(typeof renderV2KpiSelector==='function') renderV2KpiSelector(); break;
        case 'v2ambassador': if(typeof renderV2Ambassador==='function') renderV2Ambassador(); break;
        case 'ai-usage': loadAiUsage(); break;
    }
}

function loadAiUsage() {
    var body = document.getElementById('ai-usage-body');
    if (!body) return;
    body.innerHTML = '<div class="text-center py-5 text-muted"><div class="spinner-border spinner-border-sm"></div> 読み込み中...</div>';
    api('/admin/ai-usage', undefined, getAdminToken()).then(function(res) {
        if (!res || !res.success) { body.innerHTML = '<div class="text-muted text-center p-4">データを取得できませんでした</div>'; return; }

        // 課金推定（Gemini Flash: 入力$0.075/100万トークン, 出力$0.30/100万トークン）
        // Gemini Pro: 入力$1.25/100万, 出力$5.00/100万
        // 1ドル=150円で換算
        function estimateCost(tin, tout) {
            var inCost = (tin || 0) / 1000000 * 0.075;
            var outCost = (tout || 0) / 1000000 * 0.30;
            var usd = inCost + outCost;
            var jpy = Math.round(usd * 150);
            return { usd: usd.toFixed(4), jpy: jpy };
        }

        var html = '';
        // ========== 期間別サマリー ==========
        var periods = [
            { label: '今日', icon: 'fa-calendar-day', color: '#3b82f6', bg: '#eff6ff', data: res.todaySum },
            { label: '今週', icon: 'fa-calendar-week', color: '#8b5cf6', bg: '#f5f3ff', data: res.weekSum },
            { label: '今月', icon: 'fa-calendar-alt', color: '#059669', bg: '#ecfdf5', data: res.monthSum },
            { label: '累計', icon: 'fa-database', color: '#dc2626', bg: '#fef2f2', data: res.allSum }
        ];
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">';
        periods.forEach(function(p) {
            var d = p.data || {};
            var cost = estimateCost(d.tin, d.tout);
            var tokens = (d.tin || 0) + (d.tout || 0);
            var tokensStr = tokens > 1000000 ? (tokens/1000000).toFixed(1)+'M' : tokens > 1000 ? (tokens/1000).toFixed(0)+'K' : tokens;
            html += '<div style="background:' + p.bg + ';border-radius:14px;padding:14px;border:1.5px solid ' + p.color + '22;">';
            html += '<div style="font-size:0.68rem;color:' + p.color + ';font-weight:700;margin-bottom:4px;"><i class="fas ' + p.icon + ' me-1"></i>' + p.label + '</div>';
            html += '<div style="font-size:1.5rem;font-weight:900;color:#1e293b;">' + (d.calls || 0) + '<span style="font-size:0.65rem;color:#999;"> 回</span></div>';
            html += '<div style="font-size:0.65rem;color:#666;margin-top:2px;">トークン: ' + tokensStr + '</div>';
            html += '<div style="font-size:0.72rem;font-weight:800;color:' + p.color + ';margin-top:4px;">¥' + cost.jpy.toLocaleString() + ' <span style="font-size:0.58rem;color:#999;">($' + cost.usd + ')</span></div>';
            html += '</div>';
        });
        html += '</div>';

        // ========== モデル別 ==========
        if (res.byModel && res.byModel.length > 0) {
            html += '<div class="card mb-3 shadow-sm"><div class="card-header fw-bold" style="background:#f8f9fa;font-size:0.85rem;"><i class="fas fa-microchip text-info me-2"></i>モデル別</div>';
            html += '<div class="card-body p-0"><table class="table table-sm mb-0" style="font-size:0.8rem;"><thead><tr><th>モデル</th><th>回数</th><th>トークン</th><th>推定コスト</th></tr></thead><tbody>';
            res.byModel.forEach(function(m) {
                var cost = estimateCost(m.tin, m.tout);
                var tokens = ((m.tin||0) + (m.tout||0));
                html += '<tr><td class="fw-bold">' + (m.model||'不明') + '</td><td>' + m.calls + '</td><td>' + tokens.toLocaleString() + '</td><td style="color:#dc2626;font-weight:700;">¥' + cost.jpy.toLocaleString() + '</td></tr>';
            });
            html += '</tbody></table></div></div>';
        }

        // ========== 今日の詳細 ==========
        html += '<div class="card mb-3 shadow-sm"><div class="card-header fw-bold" style="background:#f8f9fa;font-size:0.85rem;"><i class="fas fa-calendar-day text-primary me-2"></i>今日の詳細</div>';
        html += '<div class="card-body p-0">';
        if (!res.today || res.today.length === 0) {
            html += '<div class="text-muted text-center p-3 small">今日はまだ使用されていません</div>';
        } else {
            html += '<table class="table table-sm mb-0" style="font-size:0.78rem;"><thead><tr><th>Provider</th><th>機能</th><th>回数</th><th>成功</th><th>失敗</th><th>トークン</th><th>コスト</th></tr></thead><tbody>';
            res.today.forEach(function(r) {
                var cost = estimateCost(r.tokens_in, r.tokens_out);
                html += '<tr><td><span class="badge" style="background:#4caf50;">' + r.provider + '</span></td>' +
                    '<td>' + r.function_name + '</td><td class="fw-bold">' + r.count + '</td>' +
                    '<td class="text-success">' + (r.ok||0) + '</td><td class="text-danger">' + (r.fail||0) + '</td>' +
                    '<td>' + ((r.tokens_in||0)+(r.tokens_out||0)).toLocaleString() + '</td>' +
                    '<td style="color:#dc2626;">¥' + cost.jpy + '</td></tr>';
            });
            html += '</tbody></table>';
        }
        html += '</div></div>';

        // ========== 今週の詳細 ==========
        html += '<div class="card mb-3 shadow-sm"><div class="card-header fw-bold" style="background:#f8f9fa;font-size:0.85rem;"><i class="fas fa-calendar-week text-purple me-2" style="color:#8b5cf6;"></i>今週の詳細</div>';
        html += '<div class="card-body p-0">';
        if (!res.week || res.week.length === 0) {
            html += '<div class="text-muted text-center p-3 small">今週はまだ使用されていません</div>';
        } else {
            html += '<table class="table table-sm mb-0" style="font-size:0.78rem;"><thead><tr><th>Provider</th><th>機能</th><th>回数</th><th>トークン</th><th>コスト</th></tr></thead><tbody>';
            res.week.forEach(function(r) {
                var cost = estimateCost(r.tokens_in, r.tokens_out);
                html += '<tr><td><span class="badge" style="background:#4caf50;">' + r.provider + '</span></td>' +
                    '<td>' + r.function_name + '</td><td class="fw-bold">' + r.count + '</td>' +
                    '<td>' + ((r.tokens_in||0)+(r.tokens_out||0)).toLocaleString() + '</td>' +
                    '<td style="color:#dc2626;">¥' + cost.jpy + '</td></tr>';
            });
            html += '</tbody></table>';
        }
        html += '</div></div>';

        // ========== 今月の詳細 ==========
        html += '<div class="card mb-3 shadow-sm"><div class="card-header fw-bold" style="background:#f8f9fa;font-size:0.85rem;"><i class="fas fa-calendar-alt text-success me-2"></i>今月の詳細</div>';
        html += '<div class="card-body p-0">';
        if (!res.month || res.month.length === 0) {
            html += '<div class="text-muted text-center p-3 small">今月はまだ使用されていません</div>';
        } else {
            html += '<table class="table table-sm mb-0" style="font-size:0.78rem;"><thead><tr><th>Provider</th><th>機能</th><th>回数</th><th>トークン</th><th>コスト</th></tr></thead><tbody>';
            res.month.forEach(function(r) {
                var cost = estimateCost(r.tokens_in, r.tokens_out);
                html += '<tr><td><span class="badge" style="background:#4caf50;">' + r.provider + '</span></td>' +
                    '<td>' + r.function_name + '</td><td class="fw-bold">' + r.count + '</td>' +
                    '<td>' + ((r.tokens_in||0)+(r.tokens_out||0)).toLocaleString() + '</td>' +
                    '<td style="color:#dc2626;">¥' + cost.jpy + '</td></tr>';
            });
            html += '</tbody></table>';
        }
        html += '</div></div>';

        // ========== 日別推移 ==========
        html += '<div class="card mb-3 shadow-sm"><div class="card-header fw-bold" style="background:#f8f9fa;font-size:0.85rem;"><i class="fas fa-chart-line text-warning me-2"></i>日別推移（30日）</div>';
        html += '<div class="card-body p-2">';
        if (!res.daily || res.daily.length === 0) {
            html += '<div class="text-muted text-center p-3 small">データなし</div>';
        } else {
            // 日付ごとに集約
            var dayMap = {};
            res.daily.forEach(function(d) {
                if (!dayMap[d.date]) dayMap[d.date] = { calls: 0, tin: 0, tout: 0 };
                dayMap[d.date].calls += d.count;
                dayMap[d.date].tin += (d.tin || 0);
                dayMap[d.date].tout += (d.tout || 0);
            });
            var days = Object.keys(dayMap).sort();
            var maxCalls = Math.max.apply(null, days.map(function(d) { return dayMap[d].calls; })) || 1;
            html += '<div style="display:flex;align-items:flex-end;gap:2px;height:100px;overflow-x:auto;padding:4px;">';
            days.forEach(function(d) {
                var dd = dayMap[d];
                var h = Math.max(4, (dd.calls / maxCalls) * 85);
                var cost = estimateCost(dd.tin, dd.tout);
                html += '<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;min-width:18px;" title="' + d + ': ' + dd.calls + '回 ¥' + cost.jpy + '">' +
                    '<div style="font-size:0.45rem;color:#999;">' + dd.calls + '</div>' +
                    '<div style="width:14px;height:' + h + 'px;background:linear-gradient(180deg,#4caf50,#2e7d32);border-radius:3px 3px 0 0;"></div>' +
                    '<div style="font-size:0.4rem;color:#bbb;margin-top:1px;">' + d.substring(5) + '</div></div>';
            });
            html += '</div>';
        }
        html += '</div></div>';

        // ========== ユーザー別TOP10 ==========
        if (res.topUsers && res.topUsers.length > 0) {
            html += '<div class="card shadow-sm"><div class="card-header fw-bold" style="background:#f8f9fa;font-size:0.85rem;"><i class="fas fa-users text-danger me-2"></i>ユーザー別 AI利用 TOP10</div>';
            html += '<div class="card-body p-0"><table class="table table-sm mb-0" style="font-size:0.78rem;"><thead><tr><th>#</th><th>ユーザー</th><th>回数</th><th>トークン</th><th>推定コスト</th></tr></thead><tbody>';
            res.topUsers.forEach(function(u, i) {
                var cost = estimateCost(u.tin, u.tout);
                html += '<tr><td>' + (i+1) + '</td><td class="fw-bold">' + (u.nickname || u.user_id.substring(0,8)) + '</td><td>' + u.calls + '</td><td>' + ((u.tin||0)+(u.tout||0)).toLocaleString() + '</td><td style="color:#dc2626;font-weight:700;">¥' + cost.jpy.toLocaleString() + '</td></tr>';
            });
            html += '</tbody></table></div></div>';
        }

        // 料金注記
        html += '<div style="font-size:0.62rem;color:#999;text-align:center;margin-top:12px;padding:8px;background:#f8f9fa;border-radius:8px;">' +
            '※ 推定コストはGemini Flash料金（入力$0.075/100万トークン, 出力$0.30/100万トークン）× 150円/ドルで算出。実際の請求額とは異なる場合があります。</div>';

        body.innerHTML = html;
    });
}

// メンバーリスト（キャッシュ）
var _membersCache = [];

function loadSidebarMembers() {
    api('/admin/members-status', undefined, getAdminToken()).then(function(members) {
        if (!members || !members.length) return;
        _membersCache = members;
        var approved = members.filter(function(m){ return m.status === 'approved'; });
        var pending = members.filter(function(m){ return m.status === 'pending'; });
        var onlineCount = approved.filter(function(m){ return m.online; }).length;
        // バッジ更新（承認待ちがあれば赤、なければ緑のオンライン数）
        var badge = document.getElementById('online-count-badge');
        if (badge) {
            if (pending.length > 0) {
                badge.style.display = 'flex';
                badge.style.background = '#e74c3c';
                badge.innerText = pending.length;
                badge.style.animation = 'pulseGlow 1.5s infinite';
            } else if (onlineCount > 0) {
                badge.style.display = 'flex';
                badge.style.background = '#4caf50';
                badge.innerText = onlineCount;
                badge.style.animation = '';
            } else {
                badge.style.display = 'none';
            }
        }
        var popup = document.getElementById('members-popup');
        if (popup && popup.style.display !== 'none') renderMembersPopup();
    });
}

function openMembersPopup() {
    var popup = document.getElementById('members-popup');
    if (popup.style.display !== 'none') { closeMembersPopup(); return; }
    popup.style.display = 'block';
    loadSidebarMembers();
    renderMembersPopup();
}

function closeMembersPopup() {
    document.getElementById('members-popup').style.display = 'none';
}

function renderMembersPopup() {
    var list = document.getElementById('members-popup-list');
    var subtitle = document.getElementById('members-popup-subtitle');
    if (!list) return;
    var members = _membersCache;
    var approved = members.filter(function(m){ return m.status === 'approved'; });
    var pending = members.filter(function(m){ return m.status === 'pending'; });
    approved.sort(function(a, b) { return (b.online ? 1 : 0) - (a.online ? 1 : 0); });
    var onlineCount = approved.filter(function(m){ return m.online; }).length;
    if (subtitle) subtitle.innerText = onlineCount + '人がオンライン / 全' + approved.length + '人' + (pending.length > 0 ? ' / 承認待ち' + pending.length + '人' : '');

    var html = '';
    // 承認待ちセクション
    if (pending.length > 0) {
        html += '<div style="background:linear-gradient(135deg,#fff3e0,#ffe0b2); border:2px solid #ff9800; border-radius:10px; padding:10px; margin-bottom:10px;">' +
            '<div style="font-size:0.75rem; font-weight:800; color:#e65100; margin-bottom:8px;"><i class="fas fa-exclamation-circle me-1"></i>承認待ち（' + pending.length + '件）</div>';
        pending.forEach(function(m) {
            var avatar = m.avatar || '🛡️';
            html += '<div style="display:flex; align-items:center; gap:8px; padding:8px; background:white; border-radius:8px; margin-bottom:6px; border:1px solid #ffe0b2;">' +
                '<div style="width:36px; height:36px; border-radius:50%; background:#fff3e0; display:flex; justify-content:center; align-items:center; font-size:1.1rem; flex-shrink:0;">' + avatar + '</div>' +
                '<div style="flex:1; min-width:0;">' +
                    '<div style="font-weight:700; font-size:0.82rem; color:#333;">' + (m.showRealName ? escapeHtml(m.name) : '●●●●') + (m.isUniversity ? ' <span style="font-size:0.55rem; background:#6c5ce7; color:white; padding:1px 5px; border-radius:6px;">大学</span>' : '') + '</div>' +
                    '<div style="font-size:0.65rem; color:#999;">' + escapeHtml(m.dept || m.universityOrg || m.email) + '</div>' +
                '</div>' +
                '<div style="display:flex; gap:4px; flex-shrink:0;">' +
                    '<button class="btn btn-sm btn-success" style="font-size:0.65rem; padding:3px 10px; font-weight:700;" onclick="handleApproveMember('+m.id+')"><i class="fas fa-check"></i> 承認</button>' +
                    '<button class="btn btn-sm btn-outline-danger" style="font-size:0.65rem; padding:3px 8px;" onclick="handleRejectMember('+m.id+')"><i class="fas fa-times"></i></button>' +
                '</div>' +
            '</div>';
        });
        html += '</div>';
    }
    // 承認済みメンバー
    html += approved.map(function(m) {
        var avatar = m.avatar || '🛡️';
        var online = m.online;
        return '<div style="display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:10px; margin-bottom:4px; background:' + (online ? '#f0fff4' : '#fafafa') + '; border:1px solid ' + (online ? '#c8e6c9' : '#f0f0f0') + ';">' +
            '<div style="position:relative; flex-shrink:0;">' +
                '<div style="width:38px; height:38px; border-radius:50%; background:' + (online ? '#e8f5e9' : '#f5f5f5') + '; display:flex; justify-content:center; align-items:center; font-size:1.2rem;">' + avatar + '</div>' +
                '<div style="position:absolute; bottom:0; right:0; width:12px; height:12px; border-radius:50%; border:2px solid white; background:' + (online ? '#4caf50' : '#bbb') + ';' + (online ? ' animation:heartbeat 1.5s ease-in-out infinite;' : '') + '"></div>' +
            '</div>' +
            '<div style="flex:1; min-width:0;">' +
                '<div style="font-weight:700; font-size:0.82rem; color:#333;">' + (m.showRealName ? escapeHtml(m.name) : '●●●●') + (m.isUniversity ? ' <span style="font-size:0.55rem; background:#6c5ce7; color:white; padding:1px 5px; border-radius:6px;">大学</span>' : '') + '</div>' +
                '<div style="font-size:0.65rem; color:#999; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + escapeHtml(m.email) + '</div>' +
            '</div>' +
            '<div style="font-size:0.6rem; font-weight:700; color:' + (online ? '#4caf50' : '#ccc') + ';">' + (online ? '●' : '○') + '</div>' +
        '</div>';
    }).join('');
    list.innerHTML = html;
}

function handleApproveMember(id) {
    if(!confirm('このメンバーを承認しますか？')) return;
    approveMember(id).then(function(res) {
        if(res && res.success) { alert(res.msg); loadSidebarMembers(); }
        else alert('エラー: ' + (res ? res.msg : '不明'));
    });
}

function handleRejectMember(id) {
    if(!confirm('この申請を却下しますか？（データは削除されます）')) return;
    rejectMember(id).then(function(res) {
        if(res && res.success) { alert(res.msg); loadSidebarMembers(); }
        else alert('エラー: ' + (res ? res.msg : '不明'));
    });
}

// =============================================
// メンバー管理
// =============================================
function loadMemberManagement() {
    Promise.all([
        getAllCoreMembers(),
        getAllGeneralUsers(),
        api('/admin/members-status', undefined, getAdminToken()).catch(function() { return []; }),
        api('/auth/online-users', undefined, getAdminToken()).catch(function() { return { online: [] }; })
    ]).then(function(results) {
        // メンバーのオンライン状態をマップ化（email → boolean）
        var memberStatusMap = {};
        var memberStatus = Array.isArray(results[2]) ? results[2] : [];
        memberStatus.forEach(function(m) { if (m && m.email) memberStatusMap[m.email] = m.online; });
        // ユーザーのオンライン状態をマップ化（uid → boolean）
        var userOnlineMap = {};
        var onlineData = (results[3] && Array.isArray(results[3].online)) ? results[3].online : [];
        onlineData.forEach(function(u) { if (u && u.uid) userOnlineMap[u.uid] = true; });
        renderCoreMembers(results[0], memberStatusMap);
        renderGeneralUsers(results[1], userOnlineMap);
    }).catch(function(e) {
        console.error('loadMemberManagement error:', e);
        // フォールバック: オンライン情報なしで描画
        Promise.all([getAllCoreMembers(), getAllGeneralUsers()]).then(function(r) {
            renderCoreMembers(r[0], {});
            renderGeneralUsers(r[1], {});
        });
    });
}

function renderCoreMembers(members, onlineMap) {
    var area = document.getElementById('core-members-list');
    if (!area) return;
    if (!members || members.length === 0) {
        area.innerHTML = '<div class="text-muted text-center p-4">コアメンバーがいません</div>';
        return;
    }
    var pending = members.filter(function(m) { return m.status === 'pending'; });
    var approved = members.filter(function(m) { return m.status !== 'pending'; });
    var html = '';

    // 承認待ちセクション
    if (pending.length > 0) {
        html += '<div style="background:linear-gradient(135deg,#fff3e0,#ffe0b2); border-bottom:2px solid #ff9800; padding:12px 16px;">' +
            '<div style="font-size:0.8rem; font-weight:800; color:#e65100; margin-bottom:10px;"><i class="fas fa-exclamation-circle me-1"></i>承認待ち（' + pending.length + '件）</div>';
        pending.forEach(function(m) {
            var avatarHtml = _renderMemberAvatar(m.avatar, '🛡️', 32);
            var pendingDisplayName = m.name ? escapeHtml(m.name) : '●●●●';
            html += '<div style="display:flex; align-items:center; gap:10px; padding:10px; background:white; border-radius:8px; margin-bottom:6px; border:1px solid #ffe0b2;">' +
                '<div style="width:32px;height:32px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">' + avatarHtml + '</div>' +
                '<div style="flex:1; min-width:0;">' +
                    '<div class="fw-bold" style="font-size:0.85rem;">' + pendingDisplayName + (m.is_university ? ' <span class="badge bg-info" style="font-size:0.55rem;">大学</span>' : '') + '</div>' +
                    '<div class="text-muted" style="font-size:0.7rem;">' + escapeHtml(m.email) + ' / ' + escapeHtml(m.dept || m.university_org || '') + '</div>' +
                '</div>' +
                '<button class="btn btn-sm btn-success fw-bold" style="font-size:0.7rem;" onclick="handleApproveMemberFromTab(' + m.id + ')"><i class="fas fa-check me-1"></i>承認</button>' +
                '<button class="btn btn-sm btn-outline-danger" style="font-size:0.7rem;" onclick="handleRejectMemberFromTab(' + m.id + ')"><i class="fas fa-times"></i></button>' +
            '</div>';
        });
        html += '</div>';
    }

    // 承認済みメンバーテーブル
    html += '<table class="table table-hover mb-0" style="font-size:0.85rem;">' +
        '<thead style="background:#f8f9fa;"><tr><th style="width:50px;"></th><th>氏名</th><th>部署</th><th>メール</th><th>役割</th><th>実名</th><th style="width:100px;">操作</th></tr></thead>' +
        '<tbody>' + approved.map(function(m) {
            var avatarHtml = _renderMemberAvatar(m.avatar, '🛡️', 32);
            var isOnline = onlineMap && onlineMap[m.email];
            var onlineDot = '<div style="position:absolute;bottom:0;right:0;width:10px;height:10px;border-radius:50%;border:2px solid white;background:' + (isOnline ? '#4caf50' : '#ccc') + ';"></div>';
            var roleLabel = m.is_exec ? '<span class="badge bg-danger">Exec</span>' : (m.is_university ? '<span class="badge bg-info">大学</span>' : '<span class="badge bg-secondary">Member</span>');
            var showName = m.show_real_name === 1;
            var nameVisible = !!m.name;
            var displayName = nameVisible ? escapeHtml(m.name) : '<span style="color:#999;">●●●●</span>';
            var toggleIcon = showName ? 'fa-eye' : 'fa-eye-slash';
            var toggleColor = showName ? '#4caf50' : '#ccc';
            return '<tr>' +
                '<td class="text-center"><div style="position:relative;width:32px;height:32px;display:inline-block;"><div style="width:32px;height:32px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:1.3rem;">' + avatarHtml + '</div>' + onlineDot + '</div></td>' +
                '<td class="fw-bold">' + displayName + '</td>' +
                '<td>' + escapeHtml(m.dept || m.university_org || '') + '</td>' +
                '<td class="text-muted small">' + escapeHtml(m.email) + '</td>' +
                '<td>' + roleLabel + '</td>' +
                '<td class="text-center"><button class="btn btn-sm" style="font-size:0.75rem; color:' + toggleColor + ';" onclick="toggleShowRealName(\'core_members\',' + m.id + ',' + (showName ? 0 : 1) + ')" title="' + (showName ? '実名非表示にする' : '実名表示にする') + '"><i class="fas ' + toggleIcon + '"></i></button></td>' +
                '<td><button class="btn btn-outline-primary btn-sm me-1" style="font-size:0.7rem;" onclick=\'openEditCoreMemberModal(' + JSON.stringify(m).replace(/'/g, "&#39;") + ')\'><i class="fas fa-edit"></i></button>' +
                '<button class="btn btn-outline-danger btn-sm" style="font-size:0.7rem;" onclick="handleDeleteCoreMember(' + m.id + ',\'' + escapeHtml(m.name || m.email) + '\')"><i class="fas fa-trash"></i></button></td>' +
                '</tr>';
        }).join('') + '</tbody></table>';
    area.innerHTML = html;
}

function renderGeneralUsers(users, onlineMap) {
    var area = document.getElementById('general-users-list');
    if (!area) return;
    if (!users || users.length === 0) {
        area.innerHTML = '<div class="text-muted text-center p-4">一般ユーザーがいません</div>';
        return;
    }
    area.innerHTML = '<table class="table table-hover mb-0" style="font-size:0.85rem;">' +
        '<thead style="background:#f8f9fa;"><tr><th style="width:50px;"></th><th>ニックネーム</th><th>本名</th><th>部署</th><th>投稿数</th><th>AI利用</th><th>チャット</th><th>登録日</th><th>実名</th><th style="width:160px;">操作</th></tr></thead>' +
        '<tbody>' + users.map(function(u) {
            var avatarHtml = _renderMemberAvatar(u.avatar, '😀', 32);
            var isOnline = onlineMap && onlineMap[u.id];
            var onlineDot = '<div style="position:absolute;bottom:0;right:0;width:10px;height:10px;border-radius:50%;border:2px solid white;background:' + (isOnline ? '#4caf50' : '#ccc') + ';"></div>';
            var dateStr = u.created_at ? new Date(u.created_at + 'Z').toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '';
            var showName = u.show_real_name === 1;
            var displayRealName = u.real_name ? escapeHtml(u.real_name) : (showName ? '' : '<span style="color:#999;">●●●●</span>');
            var toggleIcon = showName ? 'fa-eye' : 'fa-eye-slash';
            var toggleColor = showName ? '#4caf50' : '#ccc';
            return '<tr>' +
                '<td class="text-center"><div style="position:relative;width:32px;height:32px;display:inline-block;"><div style="width:32px;height:32px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:1.3rem;">' + avatarHtml + '</div>' + onlineDot + '</div></td>' +
                '<td class="fw-bold">' + escapeHtml(u.nickname) + '</td>' +
                '<td>' + displayRealName + '</td>' +
                '<td>' + escapeHtml(u.department || '') + '</td>' +
                '<td class="text-center"><span class="badge bg-primary rounded-pill">' + (u.post_count || 0) + '</span></td>' +
                '<td class="text-center" style="font-size:0.72rem;"><span class="badge bg-warning text-dark rounded-pill" title="今日/週/累計">' + (u.ai_calls_today || 0) + '/' + (u.ai_calls_week || 0) + '/' + (u.ai_calls || 0) + '</span></td>' +
                '<td class="text-center" style="font-size:0.72rem;"><span class="badge bg-info rounded-pill">' + (u.chat_count || 0) + '</span></td>' +
                '<td class="text-muted small">' + dateStr + '</td>' +
                '<td class="text-center"><button class="btn btn-sm" style="font-size:0.75rem; color:' + toggleColor + ';" onclick="toggleShowRealName(\'users\',\'' + u.id + '\',' + (showName ? 0 : 1) + ')" title="' + (showName ? '実名非表示にする' : '実名表示にする') + '"><i class="fas ' + toggleIcon + '"></i></button></td>' +
                '<td><button class="btn btn-outline-success btn-sm me-1" style="font-size:0.7rem;" onclick="sendPersonalMessage(\'' + u.id + '\',\'' + escapeHtml(u.nickname) + '\')" title="お知らせ"><i class="fas fa-envelope"></i></button>' +
                '<button class="btn btn-outline-info btn-sm me-1" style="font-size:0.7rem;" onclick="sendBuddyMessage(\'' + u.id + '\',\'' + escapeHtml(u.nickname) + '\')" title="バディーチャット"><i class="fas fa-comment-dots"></i></button>' +
                '<button class="btn btn-outline-primary btn-sm me-1" style="font-size:0.7rem;" onclick=\'openEditUserModal(' + JSON.stringify(u).replace(/'/g, "&#39;") + ')\'><i class="fas fa-edit"></i></button>' +
                '<button class="btn btn-outline-danger btn-sm" style="font-size:0.7rem;" onclick="handleDeleteUser(\'' + u.id + '\',\'' + escapeHtml(u.nickname) + '\')"><i class="fas fa-trash"></i></button></td>' +
                '</tr>';
        }).join('') + '</tbody></table>';
}

function showMemberModal(title, fields, onSave) {
    var existing = document.getElementById('member-mgmt-modal');
    if (existing) existing.remove();
    var html = '<div id="member-mgmt-modal" class="modal-overlay" style="display:flex; z-index:2100;">' +
        '<div class="modal-box" style="width:90%; max-width:500px; background:white; padding:25px; border-radius:12px;">' +
        '<div class="fw-bold mb-3 fs-5 border-bottom pb-2">' + title + '</div>';
    fields.forEach(function(f) {
        if (f.type === 'select') {
            html += '<div class="mb-2"><label class="small fw-bold text-muted">' + f.label + '</label><select id="mm-' + f.key + '" class="form-select form-select-sm">' +
                f.options.map(function(o) { return '<option value="' + o.value + '"' + (o.value === f.value ? ' selected' : '') + '>' + o.label + '</option>'; }).join('') + '</select></div>';
        } else if (f.type === 'checkbox') {
            html += '<div class="mb-2 form-check"><input type="checkbox" class="form-check-input" id="mm-' + f.key + '"' + (f.value ? ' checked' : '') + '><label class="form-check-label small fw-bold text-muted">' + f.label + '</label></div>';
        } else {
            var readonlyAttr = f.readonly ? ' readonly tabindex="-1" style="background:#f0f0f0; color:#999; cursor:not-allowed;"' : '';
            html += '<div class="mb-2"><label class="small fw-bold text-muted">' + f.label + '</label><input type="' + (f.type || 'text') + '" id="mm-' + f.key + '" class="form-control form-control-sm"' + readonlyAttr + ' value="' + escapeHtml(f.value || '') + '" placeholder="' + (f.placeholder || '') + '"></div>';
        }
    });
    html += '<div class="d-flex gap-2 mt-3"><button class="btn btn-primary flex-grow-1 fw-bold" id="mm-save-btn">保存</button>' +
        '<button class="btn btn-secondary" style="width:100px;" onclick="document.getElementById(\'member-mgmt-modal\').remove()">キャンセル</button></div></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('mm-save-btn').onclick = onSave;
}

function openAddCoreMemberModal() {
    showMemberModal('<i class="fas fa-shield-alt text-primary me-2"></i>コアメンバー追加', [
        { key: 'name', label: '氏名', placeholder: '例：山田太郎' },
        { key: 'email', label: 'メールアドレス', type: 'email', placeholder: 'example@company.co.jp' },
        { key: 'dept', label: '部署', placeholder: '例：総務部' },
        { key: 'phone', label: '電話番号', placeholder: '例：090-1234-5678' },
        { key: 'avatar', label: 'アバター絵文字', placeholder: '🛡️', value: '🛡️' },
        { key: 'password', label: 'パスワード', type: 'password', placeholder: '初期パスワード' },
        { key: 'role', label: '役割', type: 'select', value: 'member', options: [{ value: 'member', label: 'メンバー' }, { value: 'exec', label: '役員(Exec)' }, { value: 'observer', label: 'オブザーバー' }] },
        { key: 'is_university', label: '大学関係者', type: 'checkbox', value: false },
        { key: 'show_real_name', label: '実名表示を許可（大学/NPO/取締役/管理部）', type: 'checkbox', value: false }
    ], function() {
        var data = {
            name: document.getElementById('mm-name').value.trim(),
            email: document.getElementById('mm-email').value.trim(),
            dept: document.getElementById('mm-dept').value.trim(),
            phone: document.getElementById('mm-phone').value.trim(),
            avatar: document.getElementById('mm-avatar').value.trim() || '🛡️',
            password: document.getElementById('mm-password').value,
            role: document.getElementById('mm-role').value,
            is_exec: document.getElementById('mm-role').value === 'exec',
            is_university: document.getElementById('mm-is_university').checked,
            show_real_name: document.getElementById('mm-show_real_name').checked
        };
        if (!data.name || !data.email) { alert('氏名とメールアドレスは必須です'); return; }
        addCoreMember(data).then(function(res) {
            alert(res.msg);
            if (res.success) { document.getElementById('member-mgmt-modal').remove(); loadMemberManagement(); }
        });
    });
}

function openEditCoreMemberModal(m) {
    var nameVisible = !!m.name;
    showMemberModal('<i class="fas fa-edit text-primary me-2"></i>コアメンバー編集', [
        { key: 'name', label: '氏名' + (nameVisible ? '' : '（非公開）'), value: nameVisible ? m.name : '●●●●', readonly: !nameVisible },
        { key: 'email', label: 'メールアドレス', type: 'email', value: m.email },
        { key: 'dept', label: '部署', value: m.dept },
        { key: 'phone', label: '電話番号', value: nameVisible ? (m.phone || '') : '●●●●', readonly: !nameVisible },
        { key: 'avatar', label: 'アバター絵文字', value: m.avatar || '🛡️' },
        { key: 'password', label: 'パスワード（変更時のみ）', type: 'password', placeholder: '未入力なら変更なし' },
        { key: 'role', label: '役割', type: 'select', value: m.is_exec ? 'exec' : (m.role || 'member'), options: [{ value: 'member', label: 'メンバー' }, { value: 'exec', label: '役員(Exec)' }, { value: 'observer', label: 'オブザーバー' }] },
        { key: 'is_university', label: '大学関係者', type: 'checkbox', value: m.is_university === 1 },
        { key: 'show_real_name', label: '実名表示を許可（大学/NPO/取締役/管理部）', type: 'checkbox', value: m.show_real_name === 1 }
    ], function() {
        var data = {
            id: m.id,
            name: nameVisible ? document.getElementById('mm-name').value.trim() : m.name,
            email: document.getElementById('mm-email').value.trim(),
            dept: document.getElementById('mm-dept').value.trim(),
            phone: nameVisible ? document.getElementById('mm-phone').value.trim() : (m.phone || ''),
            avatar: document.getElementById('mm-avatar').value.trim() || '🛡️',
            password: document.getElementById('mm-password').value || undefined,
            role: document.getElementById('mm-role').value,
            is_exec: document.getElementById('mm-role').value === 'exec',
            is_university: document.getElementById('mm-is_university').checked,
            show_real_name: document.getElementById('mm-show_real_name').checked
        };
        updateCoreMember(data).then(function(res) {
            alert(res.msg);
            if (res.success) { document.getElementById('member-mgmt-modal').remove(); loadMemberManagement(); }
        });
    });
}

function handleApproveMemberFromTab(id) {
    if (!confirm('このメンバーを承認しますか？')) return;
    approveMember(id).then(function(res) {
        if (res && res.success) { alert(res.msg); loadMemberManagement(); }
        else alert('エラー: ' + (res ? res.msg : '不明'));
    });
}

function handleRejectMemberFromTab(id) {
    if (!confirm('この申請を却下しますか？（データは削除されます）')) return;
    rejectMember(id).then(function(res) {
        if (res && res.success) { alert(res.msg); loadMemberManagement(); }
        else alert('エラー: ' + (res ? res.msg : '不明'));
    });
}

function handleDeleteCoreMember(id, name) {
    if (!confirm(name + 'さんを削除しますか？')) return;
    deleteCoreMember(id).then(function(res) {
        alert(res.msg);
        if (res.success) loadMemberManagement();
    });
}

function openAddUserModal() {
    showMemberModal('<i class="fas fa-user-plus text-success me-2"></i>一般ユーザー追加', [
        { key: 'nickname', label: 'ニックネーム', placeholder: '例：健康太郎' },
        { key: 'password', label: 'パスワード', type: 'password', placeholder: '4文字以上' },
        { key: 'avatar', label: 'アバター絵文字', placeholder: '😀', value: '😀' },
        { key: 'real_name', label: '本名', placeholder: '任意' },
        { key: 'department', label: '部署', type: 'select', value: 'その他', options: [{ value: 'その他', label: 'その他' }, { value: '管理者', label: '管理者' }, { value: '事務', label: '事務' }, { value: '倉庫作業', label: '倉庫作業' }, { value: '営業', label: '営業' }, { value: '配送', label: '配送' }] },
        { key: 'birth_date', label: '生年月日', type: 'date' }
    ], function() {
        var data = {
            nickname: document.getElementById('mm-nickname').value.trim(),
            password: document.getElementById('mm-password').value,
            avatar: document.getElementById('mm-avatar').value.trim() || '😀',
            real_name: document.getElementById('mm-real_name').value.trim(),
            department: document.getElementById('mm-department').value,
            birth_date: document.getElementById('mm-birth_date').value
        };
        if (!data.nickname || !data.password) { alert('ニックネームとパスワードは必須です'); return; }
        addGeneralUser(data).then(function(res) {
            alert(res.msg);
            if (res.success) { document.getElementById('member-mgmt-modal').remove(); loadMemberManagement(); }
        });
    });
}

function openEditUserModal(u) {
    var nameVisible = u.show_real_name === 1;
    showMemberModal('<i class="fas fa-user-edit text-success me-2"></i>一般ユーザー編集', [
        { key: 'nickname', label: 'ニックネーム', value: u.nickname },
        { key: 'password', label: 'パスワード（変更時のみ）', type: 'password', placeholder: '未入力なら変更なし' },
        { key: 'avatar', label: 'アバター絵文字', value: u.avatar || '😀' },
        { key: 'real_name', label: '本名' + (nameVisible ? '' : '（非公開）'), value: nameVisible ? (u.real_name || '') : (u.real_name ? '●●●●' : ''), readonly: !nameVisible && !!u.real_name },
        { key: 'department', label: '部署', type: 'select', value: u.department || 'その他', options: [{ value: '管理者', label: '管理者' }, { value: '事務スタッフ', label: '事務スタッフ' }, { value: '配送スタッフ', label: '配送スタッフ' }, { value: '製造スタッフ', label: '製造スタッフ' }, { value: '倉庫スタッフ', label: '倉庫スタッフ' }, { value: 'その他', label: 'その他' }] },
        { key: 'birth_date', label: '生年月日', type: 'date', value: nameVisible ? (u.birth_date || '') : '', readonly: !nameVisible && !!u.birth_date }
    ], function() {
        var data = {
            id: u.id,
            nickname: document.getElementById('mm-nickname').value.trim(),
            password: document.getElementById('mm-password').value || undefined,
            avatar: document.getElementById('mm-avatar').value.trim() || '😀',
            real_name: nameVisible ? document.getElementById('mm-real_name').value.trim() : (u.real_name || ''),
            department: document.getElementById('mm-department').value,
            birth_date: nameVisible ? document.getElementById('mm-birth_date').value : (u.birth_date || '')
        };
        updateGeneralUser(data).then(function(res) {
            alert(res.msg);
            if (res.success) { document.getElementById('member-mgmt-modal').remove(); loadMemberManagement(); }
        });
    });
}

function handleDeleteUser(id, name) {
    if (!confirm(name + 'さんを削除しますか？この操作は取り消せません。')) return;
    deleteGeneralUser(id).then(function(res) {
        alert(res.msg);
        if (res.success) loadMemberManagement();
    });
}

function switchTab(t) {
    currentActiveTab = t;
    document.querySelectorAll('.tab-view').forEach(function(e) { e.classList.remove('active'); });
    var target = document.getElementById('tab-'+t); if(target) target.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(function(e) { e.classList.remove('active'); });

    var navMap = { evaluation:'nav-eval', current:'nav-curr', candidates:'nav-cand', resolved:'nav-res', personal:'nav-personal', bmi22:'nav-bmi22', aimeeting:'nav-aimeeting', exec:'nav-exec', food:'nav-food', buddytopic:'nav-buddytopic', members:'nav-members', backup:'nav-backup', v2dash:'nav-v2dash', v2challenge:'nav-v2challenge', avatarchallenge:'nav-avatarchallenge', v2kpi:'nav-v2kpi', v2ambassador:'nav-v2ambassador' };
    var navEl = document.getElementById(navMap[t] || 'nav-eval');
    if(navEl) navEl.classList.add('active');

    if(t==='evaluation') { renderInbox(currentInboxFilter); setTimeout(function(){ if(typeof renderInboxCustomAvatars==='function') renderInboxCustomAvatars(); if(typeof applyChatUnreadBadges==='function') applyChatUnreadBadges(); }, 500); }
    if(t==='current') loadCurrentAnalysis();
    if(t==='candidates') loadCandidates();
    if(t==='resolved') loadResolved();
    if(t==='personal') loadPersonalNotices();
    if(t==='aimeeting') loadPlansForMeeting();
    if(t==='bmi22') loadHealthPlan26();
    if(t==='exec') loadExecPending();
    if(t==='food') loadFoodUsers();
    if(t==='members') loadMemberManagement();
    if(t==='backup') loadBackupTab();
    // v2
    if(t==='v2dash' && typeof renderV2Dashboard === 'function') renderV2Dashboard();
    if(t==='v2challenge' && typeof renderV2Challenges === 'function') renderV2Challenges();
    if(t==='v2kpi' && typeof renderV2KpiSelector === 'function') renderV2KpiSelector();
    if(t==='v2ambassador' && typeof renderV2Ambassador === 'function') renderV2Ambassador();
    if(t==='avatarchallenge' && typeof loadAvatarChallengeAdmin === 'function') loadAvatarChallengeAdmin();
    if(t==='buddytopic' && typeof renderBuddyTopicAdmin === 'function') renderBuddyTopicAdmin();
}

function loadResolved() {
    var area = document.getElementById('resolved-list-area');
    if(!area) return;
    area.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm"></div></div>';
    getResolvedData().then(function(data) {
        if(!data || data.length === 0) { area.innerHTML = '<div class="text-muted text-center p-5">データなし</div>'; return; }
        area.innerHTML = data.map(function(r) {
            return '<div class="p-3 border-bottom"><div class="d-flex justify-content-between"><strong>' + escapeHtml(String(r[2]).substring(0,30)) + '</strong><span class="small text-muted">' + r[14] + '</span></div><div class="small text-secondary mt-1">' + escapeHtml(String(r[4])) + '</div></div>';
        }).join('');
    }).catch(function(err) { area.innerHTML = '<div class="text-danger text-center p-5">通信エラー: ' + escapeHtml(err.message) + '</div>'; });
}

// =============================================
// バックアップ管理タブ
// =============================================
function loadBackupTab() {
    var body = document.getElementById('backup-tab-body');
    if (!body) return;
    body.innerHTML = '<div class="text-center py-5 text-muted"><div class="spinner-border spinner-border-sm"></div> バックアップ状態を確認中...</div>';

    getBackupStatus().then(function(res) {
        if (!res || !res.success) {
            body.innerHTML = '<div class="text-danger text-center p-4">取得失敗: ' + escapeHtml((res && res.msg) || '不明なエラー') + '</div>';
            return;
        }
        renderBackupTab(res);
    }).catch(function(err) {
        body.innerHTML = '<div class="text-danger text-center p-4">通信エラー: ' + escapeHtml(err.message) + '</div>';
    });
}

function renderBackupTab(data) {
    var body = document.getElementById('backup-tab-body');
    if (!body) return;
    var hasLatest = data.latest !== null;
    var statusColor = hasLatest ? '#4caf50' : '#e74c3c';
    var statusText = hasLatest ? 'OK' : 'No Data';
    var lastDate = hasLatest ? new Date(data.latest.date).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '-';
    var sizeText = hasLatest ? data.latest.sizeKB.toLocaleString() + ' KB' : '-';

    // ステータスカード
    var html = '<div class="card shadow-sm mb-4" style="border:none; border-radius:14px; overflow:hidden;">' +
        '<div style="background:linear-gradient(135deg,#667eea,#667eeacc); padding:20px; display:flex; align-items:center; gap:20px;">' +
            '<div style="width:60px; height:60px; border-radius:50%; background:rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center;"><i class="fas fa-heart-pulse" style="color:white; font-size:1.6rem;"></i></div>' +
            '<div><div style="font-weight:800; font-size:1.1rem; color:white;">CoWell DB</div><div style="font-size:0.75rem; color:rgba(255,255,255,0.7);">スケジュール: ' + escapeHtml(data.schedule) + '</div></div>' +
            '<div style="margin-left:auto;"><span style="display:inline-block; padding:5px 18px; border-radius:12px; font-size:0.85rem; font-weight:700; color:white; background:' + statusColor + ';">' + statusText + '</span></div>' +
        '</div>' +
        '<div class="card-body">' +
            '<div class="row g-3 text-center">' +
                '<div class="col-4"><div class="text-muted small">最終バックアップ</div><div class="fw-bold">' + lastDate + '</div></div>' +
                '<div class="col-4"><div class="text-muted small">サイズ</div><div class="fw-bold">' + sizeText + '</div></div>' +
                '<div class="col-4"><div class="text-muted small">ファイル名</div><div class="fw-bold" style="font-size:0.8rem;">' + escapeHtml(hasLatest ? data.latest.name : '-') + '</div></div>' +
            '</div>' +
        '</div>' +
    '</div>';

    // ローカルファイル一覧
    html += '<div class="row g-4">' +
        '<div class="col-md-6"><div class="card shadow-sm" style="border:none; border-radius:14px;">' +
            '<div class="card-header fw-bold" style="background:#f8f9fa;"><i class="fas fa-hdd me-2" style="color:#667eea;"></i>ローカル (' + data.localFiles.length + '件)</div>' +
            '<div class="card-body p-0" style="max-height:300px; overflow-y:auto;">';
    if (data.localFiles.length > 0) {
        data.localFiles.forEach(function(f) {
            html += '<div style="font-size:0.8rem; padding:8px 16px; border-bottom:1px solid #f0f0f0; display:flex; justify-content:space-between;">' +
                '<span><i class="fas fa-file-alt me-1" style="color:#ccc;"></i>' + escapeHtml(f.name) + '</span>' +
                '<span style="color:#999;">' + f.sizeKB.toLocaleString() + ' KB</span></div>';
        });
    } else {
        html += '<div class="text-muted text-center p-3">ファイルなし</div>';
    }
    html += '</div></div></div>';

    // Boxファイル一覧
    html += '<div class="col-md-6"><div class="card shadow-sm" style="border:none; border-radius:14px;">' +
        '<div class="card-header fw-bold" style="background:#f8f9fa;"><i class="fas fa-cloud me-2" style="color:#3498db;"></i>Box (' + data.boxFiles.length + '件)</div>' +
        '<div class="card-body p-0" style="max-height:300px; overflow-y:auto;">';
    if (data.boxFiles.length > 0) {
        data.boxFiles.forEach(function(f) {
            html += '<div style="font-size:0.8rem; padding:8px 16px; border-bottom:1px solid #f0f0f0; display:flex; justify-content:space-between;">' +
                '<span><i class="fas fa-file-alt me-1" style="color:#ccc;"></i>' + escapeHtml(f.name) + '</span>' +
                '<span style="color:#999;">' + f.sizeKB.toLocaleString() + ' KB</span></div>';
        });
    } else {
        html += '<div class="text-muted text-center p-3">ファイルなし</div>';
    }
    html += '</div></div></div></div>';

    // 操作ボタン
    html += '<div class="d-flex gap-3 mt-4">' +
        '<button class="btn btn-primary fw-bold" onclick="doManualBackup()" style="border-radius:10px; padding:10px 24px;"><i class="fas fa-play me-2"></i>今すぐバックアップ</button>' +
        '<button class="btn btn-outline-secondary fw-bold" onclick="loadBackupTab()" style="border-radius:10px; padding:10px 24px;"><i class="fas fa-sync me-2"></i>再読み込み</button>' +
    '</div>';

    body.innerHTML = html;
}

function doManualBackup() {
    if (!confirm('Healthのバックアップを実行しますか？')) return;
    showLoading('バックアップ実行中...');
    runBackup().then(function(res) {
        hideLoading();
        if (res && res.success) {
            alert('バックアップ完了: ' + res.file + ' (' + res.sizeKB + 'KB)');
            loadBackupTab();
        } else {
            alert('エラー: ' + (res ? (res.error || res.msg) : '不明'));
        }
    }).catch(function(err) { hideLoading(); alert('通信エラー: ' + err.message); });
}

// ★ 通知関連（モーダルを動的生成 - include依存を排除）
function ensureBroadcastModal() {
    var el = document.getElementById('broadcast-modal');
    if(el) return el;
    // モーダルが存在しない場合、動的に作成
    var div = document.createElement('div');
    div.id = 'broadcast-modal';
    div.className = 'modal-overlay';
    div.style.cssText = 'display:none; z-index:2050;';
    div.innerHTML = '<div class="modal-box" style="width:90%; max-width:500px; background:white; padding:25px; border-radius:12px;">'
        + '<div class="text-warning mb-3 fw-bold border-bottom pb-2 fs-5"><i class="fas fa-bullhorn"></i> 全員へお知らせ配信</div>'
        + '<div class="mb-3"><label class="small fw-bold text-muted mb-2">通知内容</label>'
        + '<textarea id="broadcast-body" class="form-control" rows="5" placeholder="入力してください"></textarea></div>'
        + '<div class="d-flex gap-2 mt-4">'
        + '<button class="btn btn-warning flex-grow-1 fw-bold" onclick="sendBroadcastNotice()">配信</button>'
        + '<button class="btn btn-secondary" style="width:100px;" onclick="closeBroadcastModal()">キャンセル</button>'
        + '</div></div>';
    document.body.appendChild(div);
    return div;
}
function openBroadcastModal() {
    var el = ensureBroadcastModal();
    el.style.display = 'flex';
}
function closeBroadcastModal() {
    var el = document.getElementById('broadcast-modal');
    if(el) el.style.display = 'none';
    refreshActiveTab();
}
function sendBroadcastNotice() {
    var bodyEl = document.getElementById('broadcast-body');
    if(!bodyEl) { alert("通知フォームが見つかりません"); return; }
    var body = bodyEl.value.trim();
    if(!body) { alert("内容を入力してください"); return; }
    var viaBuddy = document.getElementById('broadcast-via-buddy');
    if(viaBuddy && viaBuddy.checked) {
        body = '【BUDDY】' + body;
    }
    showLoading("送信中...");
    saveAdminNotice({ content: body, isBroadcast: true }).then(function(res) {
        hideLoading();
        if (res && res.success) {
            alert(res.msg || '送信完了');
            closeBroadcastModal();
            bodyEl.value = "";
            if(viaBuddy) viaBuddy.checked = false;
        } else {
            alert('送信エラー: ' + (res ? res.msg : '不明'));
        }
    }).catch(function(err) { hideLoading(); alert('通信エラー: ' + (err.message || '不明')); });
}

// =============================================
// オンラインユーザーヒート表示
// =============================================
var _onlineHeatExpanded = false;

function loadOnlineHeat() {
    var ts = Date.now();
    Promise.all([
        api('/admin/members-status?_t=' + ts, undefined, getAdminToken()).catch(function() { return []; }),
        fetch('/api/auth/online-users?_t=' + ts, { headers: { 'Authorization': 'Bearer ' + getAdminToken() } }).then(function(r) { return r.json(); }).catch(function() { return { online: [] }; })
    ]).then(function(results) {
        var coreMembers = Array.isArray(results[0]) ? results[0] : [];
        var userData = results[1] || {};
        var onlineUsers = (userData.success && Array.isArray(userData.online)) ? userData.online : [];
        renderOnlineHeat(coreMembers, onlineUsers);
    });
}

function renderOnlineHeat(coreMembers, onlineUsers) {
    var panel = document.getElementById('online-heat-panel');
    if (!panel) return;

    // オンラインのコアメンバー
    var onlineCore = coreMembers.filter(function(m) { return m.status !== 'pending' && m.online; });
    var totalOnline = onlineCore.length + onlineUsers.length;
    var totalAll = coreMembers.filter(function(m) { return m.status !== 'pending'; }).length + '名+ユーザー';

    // ヒートレベル計算
    var level, color, icon, label, badgeBg;
    if (totalOnline === 0) { level = 0; color = '#94a3b8'; icon = '❄️'; label = 'オフライン'; badgeBg = '#f1f5f9'; }
    else if (totalOnline <= 3) { level = 1; color = '#3b82f6'; icon = '🟢'; label = '静か'; badgeBg = '#eff6ff'; }
    else if (totalOnline <= 8) { level = 2; color = '#f59e0b'; icon = '🔥'; label = 'アクティブ'; badgeBg = '#fffbeb'; }
    else if (totalOnline <= 15) { level = 3; color = '#ef4444'; icon = '🔥🔥'; label = '盛り上がり中'; badgeBg = '#fef2f2'; }
    else { level = 4; color = '#dc2626'; icon = '🔥🔥🔥'; label = '大盛況！'; badgeBg = '#fef2f2'; }

    var barWidth = totalOnline === 0 ? 5 : Math.min(100, Math.max(10, totalOnline * 5));
    var barColor = totalOnline === 0 ? '#e2e8f0' : totalOnline <= 3 ? '#93c5fd' : totalOnline <= 8 ? '#fbbf24' : totalOnline <= 15 ? '#f87171' : '#ef4444';

    // 部署別集計（コアメンバー＋一般ユーザー統合）
    var deptMap = {};
    onlineCore.forEach(function(m) { var d = m.dept || '推進メンバー'; if (!deptMap[d]) deptMap[d] = 0; deptMap[d]++; });
    onlineUsers.forEach(function(u) { var d = u.department || '未設定'; if (!deptMap[d]) deptMap[d] = 0; deptMap[d]++; });
    var deptEntries = Object.entries(deptMap).sort(function(a, b) { return b[1] - a[1]; });

    // 全オンラインメンバーリスト統合
    var allOnline = [];
    onlineCore.forEach(function(m) { allOnline.push({ name: m.show_real_name ? m.name : (m.dept || '推進メンバー'), avatar: m.avatar || '🛡️', type: 'core', dept: m.dept || '' }); });
    onlineUsers.forEach(function(u) { allOnline.push({ name: u.nickname, avatar: u.avatar || '😀', type: 'user', dept: u.department || '' }); });

    var glowClass = level >= 3 ? ' dash-card-glow' : '';
    var html = '<div class="dash-card dash-card-clickable' + glowClass + '" style="height:100%;" onclick="toggleOnlineHeatDetail()">';

    // ヒートレベルバッジ
    html += '<div style="display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border-radius:10px; background:' + badgeBg + '; margin-bottom:12px;">';
    html += '<span style="font-size:1rem;' + (level >= 2 ? ' animation:heatPulse 1.5s ease-in-out infinite;' : '') + '">' + icon + '</span>';
    html += '<span style="font-size:0.72rem; font-weight:700; color:' + color + ';">' + label + '</span>';
    html += '</div>';

    // メイン数値
    html += '<div style="display:flex; align-items:baseline; gap:6px; margin-bottom:4px;">';
    html += '<div class="dash-stat-value" style="color:' + color + ';">' + totalOnline + '</div>';
    html += '<div class="dash-stat-label">人がオンライン</div>';
    html += '</div>';

    // 内訳テキスト
    if (totalOnline > 0) {
        var breakdown = [];
        if (onlineCore.length > 0) breakdown.push('推進' + onlineCore.length);
        if (onlineUsers.length > 0) breakdown.push('ユーザー' + onlineUsers.length);
        html += '<div style="font-size:0.65rem; color:#999; margin-bottom:8px;">' + breakdown.join(' / ') + '</div>';
    } else {
        html += '<div style="height:8px;"></div>';
    }

    // ヒートバー
    html += '<div style="background:#e2e8f0; border-radius:3px; height:6px; overflow:hidden; margin-bottom:10px;">';
    html += '<div class="heat-bar" style="width:' + barWidth + '%; background:' + barColor + ';"></div>';
    html += '</div>';

    // アバター列
    if (allOnline.length > 0) {
        html += '<div style="display:flex; align-items:center;">';
        var showCount = Math.min(allOnline.length, 8);
        for (var i = 0; i < showCount; i++) {
            var p = allOnline[i];
            var av = _renderMemberAvatar(p.avatar, p.type === 'core' ? '🛡️' : '😀', 28);
            var isEmoji = !p.avatar || !p.avatar.startsWith('custom:');
            var borderCol = p.type === 'core' ? '#667eea' : '#20c997';
            html += '<div class="heat-avatar" style="width:28px; height:28px; margin-left:' + (i === 0 ? '0' : '-6px') + '; background:' + (isEmoji ? '#f0f0f0' : 'transparent') + '; border:2px solid ' + borderCol + '; font-size:0.8rem;" title="' + escapeHtml(p.name) + '">' + av + '</div>';
        }
        if (allOnline.length > showCount) {
            html += '<div style="margin-left:-4px; width:28px; height:28px; border-radius:50%; background:rgba(0,0,0,0.06); display:flex; align-items:center; justify-content:center; font-size:0.55rem; font-weight:800; color:#666;">+' + (allOnline.length - showCount) + '</div>';
        }
        html += '<i class="fas fa-chevron-' + (_onlineHeatExpanded ? 'up' : 'down') + '" style="margin-left:auto; font-size:0.65rem; color:#bbb;"></i>';
        html += '</div>';
    }

    // 展開時の詳細
    if (_onlineHeatExpanded) {
        html += '<div style="margin-top:14px; border-top:1px solid #eee; padding-top:14px;">';
        if (deptEntries.length > 0) {
            html += '<div style="font-size:0.72rem; font-weight:700; color:#555; margin-bottom:8px;"><i class="fas fa-building me-1"></i>部署別</div>';
            html += '<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">';
            deptEntries.forEach(function(de) {
                html += '<span style="background:#f8f9fa; border:1px solid #eee; border-radius:10px; padding:3px 10px; font-size:0.7rem; font-weight:700; color:' + color + ';">' + escapeHtml(de[0]) + ' <strong>' + de[1] + '</strong></span>';
            });
            html += '</div>';
        }
        html += '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:6px;">';
        allOnline.forEach(function(p) {
            var av = _renderMemberAvatar(p.avatar, p.type === 'core' ? '🛡️' : '😀', 24);
            var isEmoji = !p.avatar || !p.avatar.startsWith('custom:');
            var tagColor = p.type === 'core' ? '#667eea' : '#20c997';
            var tagLabel = p.type === 'core' ? '推進' : '';
            html += '<div style="display:flex; align-items:center; gap:6px; padding:5px 8px; background:#f8f9fa; border-radius:10px;">';
            html += '<div style="position:relative; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.7rem; flex-shrink:0;' + (isEmoji ? ' background:#eee;' : '') + '">' + av + '<div style="position:absolute;bottom:-1px;right:-1px;width:8px;height:8px;border-radius:50%;background:#4caf50;border:1.5px solid white;"></div></div>';
            html += '<div style="font-size:0.7rem; font-weight:600; color:#333; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + escapeHtml(p.name) + (tagLabel ? ' <span style="font-size:0.5rem;color:' + tagColor + ';font-weight:800;">' + tagLabel + '</span>' : '') + '</div>';
            html += '</div>';
        });
        html += '</div></div>';
    }

    html += '</div>';
    panel.innerHTML = html;
}

function toggleOnlineHeatDetail() {
    _onlineHeatExpanded = !_onlineHeatExpanded;
    loadOnlineHeat();
}

// CoWellコインランキング読み込み
function loadMariganRanking() {
    var area = document.getElementById('marigan-ranking-area');
    if (!area) return;
    area.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-warning"></div></div>';
    fetch('/admin/marigan-ranking', {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('co_heart_admin_token') }
    }).then(function(r) { return r.json(); }).then(function(data) {
        if (!data.success || !data.ranking || data.ranking.length === 0) {
            area.innerHTML = '<div class="text-muted text-center p-3" style="font-size:0.8rem;">まだCoWellコインを獲得したユーザーはいません</div>';
            return;
        }
        var medals = ['🥇','🥈','🥉'];
        var badgeIcons = { bronze:'🥉', silver:'🥈', gold:'🥇', platinum:'👑' };
        var html = '<div style="padding:10px;">';
        data.ranking.forEach(function(u, i) {
            var medal = i < 3 ? '<span style="font-size:1rem;">' + medals[i] + '</span>' : '<span style="font-size:0.7rem; font-weight:800; color:#999; width:20px; text-align:center; display:inline-block;">' + (i+1) + '</span>';
            var bIcon = badgeIcons[u.marigan_badge] || '';
            var rewardTag = u.reward_tier && u.reward_tier.reward ? ' <span style="font-size:0.55rem; background:#fef3c7; color:#92400e; padding:1px 5px; border-radius:4px;">🎁' + u.reward_tier.reward + '</span>' : '';
            html += '<div style="display:flex; align-items:center; gap:8px; padding:6px 8px; border-radius:10px; margin-bottom:3px; background:' + (i < 3 ? 'linear-gradient(135deg,#fffde7,#fff9c4)' : '#f8f9fa') + ';">';
            html += medal;
            html += '<div style="width:28px;height:28px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:0.9rem;background:#f0f0f0;flex-shrink:0;">' + (typeof _renderMemberAvatar === 'function' ? _renderMemberAvatar(u.avatar, '😀', 28) : (u.avatar || '😀')) + '</div>';
            html += '<div style="flex:1; min-width:0; font-size:0.78rem; font-weight:700; color:#333; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + escapeHtml(u.nickname) + ' ' + bIcon + rewardTag + '</div>';
            html += '<div style="font-size:0.9rem; font-weight:900; color:#f57f17;">' + (u.marigan_total || 0) + '<span style="font-size:0.6rem; color:#999;">pt</span></div>';
            html += '</div>';
        });
        html += '</div>';
        area.innerHTML = html;
    }).catch(function() {
        area.innerHTML = '<div class="text-muted text-center p-3" style="font-size:0.8rem;">読み込みエラー</div>';
    });
}

// 実名表示フラグ切替
function toggleShowRealName(table, id, value) {
    fetch('/admin/toggle-show-real-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('co_heart_admin_token') },
        body: JSON.stringify({ table: table, id: id, value: value })
    }).then(function(r) { return r.json(); }).then(function(res) {
        if (res.success) loadMemberManagement();
    });
}

// AI利用サマリー（メンバー管理タブ上部）
function toggleAiSummary() {
    var body = document.getElementById('ai-summary-body');
    if (!body) return;
    if (body.style.display !== 'none') { body.style.display = 'none'; return; }
    body.style.display = 'block';
    body.innerHTML = '<div class="text-center p-3"><div class="spinner-border text-warning" role="status"></div></div>';

    // Gemini Flash料金: 入力$0.075/100万トークン, 出力$0.30/100万トークン, 1$=150円
    function estCost(tin, tout) {
        var usd = (tin||0)/1e6*0.075 + (tout||0)/1e6*0.30;
        return { usd: usd.toFixed(4), jpy: Math.round(usd*150) };
    }
    function fmtTokens(n) { return n>1e6?(n/1e6).toFixed(1)+'M':n>1000?(n/1000).toFixed(0)+'K':n; }

    api('/admin/ai-usage?_t='+Date.now(), undefined, getAdminToken()).then(function(res) {
        if (!res || !res.success) { body.innerHTML = '<div class="text-muted text-center p-3">データ取得失敗</div>'; return; }
        var html = '';

        // ===== 期間別カード（今日/週/月/累計） =====
        var periods = [
            { label:'今日', icon:'fa-calendar-day', color:'#e65100', bg:'linear-gradient(135deg,#fff3e0,#ffe0b2)', data: res.todaySum },
            { label:'今週', icon:'fa-calendar-week', color:'#1565c0', bg:'linear-gradient(135deg,#e3f2fd,#bbdefb)', data: res.weekSum },
            { label:'今月', icon:'fa-calendar-alt', color:'#2e7d32', bg:'linear-gradient(135deg,#e8f5e9,#c8e6c9)', data: res.monthSum },
            { label:'累計', icon:'fa-database', color:'#7b1fa2', bg:'linear-gradient(135deg,#f3e5f5,#e1bee7)', data: res.allSum }
        ];
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">';
        periods.forEach(function(p) {
            var d = p.data || {};
            var cost = estCost(d.tin, d.tout);
            var tokens = (d.tin||0)+(d.tout||0);
            html += '<div style="background:'+p.bg+';border-radius:12px;padding:12px;text-align:center;">';
            html += '<div style="font-size:0.62rem;color:'+p.color+';font-weight:700;"><i class="fas '+p.icon+' me-1"></i>'+p.label+'</div>';
            html += '<div style="font-size:1.4rem;font-weight:900;color:#1e293b;">'+( d.calls||0)+'<span style="font-size:0.6rem;color:#999;"> 回</span></div>';
            html += '<div style="font-size:0.58rem;color:#888;">トークン: '+fmtTokens(tokens)+'</div>';
            html += '<div style="font-size:0.72rem;font-weight:800;color:'+p.color+';margin-top:2px;">¥'+cost.jpy.toLocaleString()+' <span style="font-size:0.52rem;color:#999;">($'+cost.usd+')</span></div>';
            html += '</div>';
        });
        html += '</div>';

        // ===== モデル別 =====
        if (res.byModel && res.byModel.length > 0) {
            html += '<div style="font-size:0.72rem;font-weight:700;color:#555;margin-bottom:4px;"><i class="fas fa-microchip me-1"></i>モデル別</div>';
            html += '<table style="width:100%;font-size:0.7rem;border-collapse:collapse;margin-bottom:12px;">';
            html += '<tr style="background:#f5f5f5;"><th style="padding:4px 6px;text-align:left;">モデル</th><th style="padding:4px 6px;">回数</th><th style="padding:4px 6px;">トークン</th><th style="padding:4px 6px;">コスト</th></tr>';
            res.byModel.forEach(function(m) {
                var c = estCost(m.tin, m.tout);
                html += '<tr style="border-bottom:1px solid #eee;"><td style="padding:4px 6px;font-weight:700;">'+(m.model||'?')+'</td><td style="padding:4px 6px;text-align:center;">'+m.calls+'</td><td style="padding:4px 6px;text-align:center;">'+fmtTokens((m.tin||0)+(m.tout||0))+'</td><td style="padding:4px 6px;text-align:center;color:#dc2626;font-weight:700;">¥'+c.jpy.toLocaleString()+'</td></tr>';
            });
            html += '</table>';
        }

        // ===== ユーザー別TOP10 =====
        if (res.topUsers && res.topUsers.length > 0) {
            html += '<div style="font-size:0.72rem;font-weight:700;color:#555;margin-bottom:4px;"><i class="fas fa-users me-1"></i>ユーザー別TOP10</div>';
            html += '<table style="width:100%;font-size:0.7rem;border-collapse:collapse;margin-bottom:12px;">';
            html += '<tr style="background:#f5f5f5;"><th style="padding:4px 6px;">#</th><th style="padding:4px 6px;text-align:left;">ユーザー</th><th style="padding:4px 6px;">回数</th><th style="padding:4px 6px;">コスト</th></tr>';
            res.topUsers.forEach(function(u, i) {
                var c = estCost(u.tin, u.tout);
                html += '<tr style="border-bottom:1px solid #eee;"><td style="padding:4px 6px;text-align:center;">'+(i+1)+'</td><td style="padding:4px 6px;font-weight:700;">'+(u.nickname||u.user_id.substring(0,8))+'</td><td style="padding:4px 6px;text-align:center;">'+u.calls+'</td><td style="padding:4px 6px;text-align:center;color:#dc2626;font-weight:700;">¥'+c.jpy.toLocaleString()+'</td></tr>';
            });
            html += '</table>';
        }

        // ===== 日別推移 =====
        if (res.daily && res.daily.length > 0) {
            var dayMap = {};
            res.daily.forEach(function(d) {
                if (!dayMap[d.date]) dayMap[d.date] = { calls:0, tin:0, tout:0 };
                dayMap[d.date].calls += d.count; dayMap[d.date].tin += (d.tin||0); dayMap[d.date].tout += (d.tout||0);
            });
            var days = Object.keys(dayMap).sort();
            var maxC = Math.max.apply(null, days.map(function(d){ return dayMap[d].calls; })) || 1;
            html += '<div style="font-size:0.72rem;font-weight:700;color:#555;margin-bottom:4px;"><i class="fas fa-chart-bar me-1"></i>日別推移（30日）</div>';
            html += '<div style="display:flex;align-items:flex-end;gap:2px;height:60px;overflow-x:auto;">';
            days.forEach(function(d) {
                var dd = dayMap[d]; var h = Math.max(2, Math.round(dd.calls/maxC*50));
                var c = estCost(dd.tin, dd.tout);
                html += '<div style="display:flex;flex-direction:column;align-items:center;min-width:14px;" title="'+d+': '+dd.calls+'回 ¥'+c.jpy+'"><div style="font-size:0.4rem;color:#999;">'+dd.calls+'</div><div style="width:10px;height:'+h+'px;background:linear-gradient(180deg,#f59e0b,#d97706);border-radius:2px 2px 0 0;"></div><div style="font-size:0.35rem;color:#bbb;">'+d.substring(5)+'</div></div>';
            });
            html += '</div>';
        }

        // ===== 課金シミュレーション =====
        var allD = res.allSum || {};
        var monthD = res.monthSum || {};
        var monthCost = estCost(monthD.tin, monthD.tout);
        var monthCalls = monthD.calls || 0;
        var daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate();
        var daysPassed = new Date().getDate();
        var projectedCalls = daysPassed > 0 ? Math.round(monthCalls / daysPassed * daysInMonth) : 0;
        var projectedTokensIn = daysPassed > 0 ? Math.round((monthD.tin||0) / daysPassed * daysInMonth) : 0;
        var projectedTokensOut = daysPassed > 0 ? Math.round((monthD.tout||0) / daysPassed * daysInMonth) : 0;
        var projectedCost = estCost(projectedTokensIn, projectedTokensOut);
        var yearlyCost = { jpy: projectedCost.jpy * 12, usd: (parseFloat(projectedCost.usd)*12).toFixed(2) };

        html += '<div style="margin-top:14px;padding:14px;background:linear-gradient(135deg,#fef2f2,#fce4ec);border-radius:12px;border:1.5px solid #f48fb1;">';
        html += '<div style="font-size:0.78rem;font-weight:800;color:#c2185b;margin-bottom:10px;"><i class="fas fa-calculator me-1"></i>課金シミュレーション</div>';
        html += '<table style="width:100%;font-size:0.72rem;border-collapse:collapse;">';
        html += '<tr style="border-bottom:1px solid #f8bbd0;"><td style="padding:5px 0;color:#666;">今月実績（'+daysPassed+'日経過）</td><td style="padding:5px 0;text-align:right;font-weight:700;">'+monthCalls+'回</td><td style="padding:5px 0;text-align:right;font-weight:800;color:#c2185b;">¥'+monthCost.jpy.toLocaleString()+'</td></tr>';
        html += '<tr style="border-bottom:1px solid #f8bbd0;"><td style="padding:5px 0;color:#666;">今月予測（'+daysInMonth+'日換算）</td><td style="padding:5px 0;text-align:right;font-weight:700;">≈'+projectedCalls+'回</td><td style="padding:5px 0;text-align:right;font-weight:800;color:#e91e63;">¥'+projectedCost.jpy.toLocaleString()+'</td></tr>';
        html += '<tr><td style="padding:5px 0;color:#666;">年間予測</td><td style="padding:5px 0;text-align:right;font-weight:700;">≈'+(projectedCalls*12).toLocaleString()+'回</td><td style="padding:5px 0;text-align:right;font-weight:900;color:#b71c1c;font-size:0.82rem;">¥'+yearlyCost.jpy.toLocaleString()+'</td></tr>';
        html += '</table>';
        html += '<div style="font-size:0.55rem;color:#999;margin-top:8px;">※ Gemini Flash料金（入力$0.075/M, 出力$0.30/Mトークン）× 150円/$で算出。実際の請求額と異なる場合があります。</div>';
        html += '</div>';

        body.innerHTML = html;
    });
}

function toggleAdminHelp() {
    var panel = document.getElementById('admin-help-panel');
    var backdrop = document.getElementById('admin-help-backdrop');
    if (!panel) return;
    var isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'block';
    if (backdrop) backdrop.style.display = isOpen ? 'none' : 'block';
}
