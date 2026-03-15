// ====================================================
//  Core: グローバル変数・初期化・タブ切替・認証
// ====================================================
window.addEventListener('submit', function(e) { e.preventDefault(); }, true);

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

function logoutAdmin() { if(!confirm("ログアウトしますか？")) return; localStorage.removeItem('co_heart_admin_email'); localStorage.removeItem('co_heart_admin_pass'); localStorage.removeItem('co_heart_admin_profile'); localStorage.removeItem('co_heart_admin_token'); window.location.href = '/'; }

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
            if(remember) {
                localStorage.setItem('co_heart_admin_email', email);
                localStorage.setItem('co_heart_admin_pass', pass);
                localStorage.setItem('co_heart_admin_profile', JSON.stringify(res.profile));
            } else {
                localStorage.removeItem('co_heart_admin_email');
                localStorage.removeItem('co_heart_admin_pass');
                localStorage.removeItem('co_heart_admin_profile');
            }
            document.getElementById('admin-auth-overlay').style.display = 'none';
            renderHeaderInfo();
            loadData();
        } else { alert("認証失敗: " + res.msg); }
    }).catch(function(err) { hideLoading(); alert("通信エラー: " + err.message); });
}

window.onload = function() {
    // 保存済み認証チェック
    const savedEmail = localStorage.getItem('co_heart_admin_email');
    const savedPass = localStorage.getItem('co_heart_admin_pass');
    const savedProfile = localStorage.getItem('co_heart_admin_profile');

    if(savedEmail && savedPass) {
        if(savedProfile) { try { currentAdminProfile = JSON.parse(savedProfile); } catch(e) {} }
        // 保存済みの場合はAPI再認証してからロード
        document.getElementById('admin-auth-overlay').style.display = 'none';
        loginCoreMember(savedEmail, savedPass).then(function(res) {
            if(res && res.success) {
                setAdminToken(res.token);
                currentAdminProfile = res.profile;
                localStorage.setItem('co_heart_admin_profile', JSON.stringify(res.profile));
                renderHeaderInfo();
                loadData();
            } else {
                // 認証失敗 → ログイン画面に戻す
                localStorage.removeItem('co_heart_admin_email');
                localStorage.removeItem('co_heart_admin_pass');
                localStorage.removeItem('co_heart_admin_profile');
                localStorage.removeItem('co_heart_admin_token');
                document.getElementById('admin-auth-overlay').style.display = 'flex';
            }
        }).catch(function() {
            renderHeaderInfo();
            loadData();
        });
    } else {
        // 未保存の場合はフォームを表示（前回入力を復元）
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
        allPostData = data;
        renderInbox(currentInboxFilter);
    }).catch(function(err) { hideLoading(); alert("通信エラー: " + err.message); });
    // メンバーリスト＆ハートビート開始
    startHeartbeat();
    loadSidebarMembers();
}

// ハートビート送信（30秒ごと）
function startHeartbeat() {
    function sendBeat() {
        if (!currentAdminProfile) return;
        api('/admin/heartbeat', {
            email: currentAdminProfile.email || '',
            name: currentAdminProfile.name || '',
            avatar: currentAdminProfile.avatar || '🛡️'
        }, getAdminToken());
    }
    sendBeat();
    setInterval(sendBeat, 30000);
    // メンバーリストも60秒ごとに更新
    setInterval(loadSidebarMembers, 60000);
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
                    '<div style="font-weight:700; font-size:0.82rem; color:#333;">' + escapeHtml(m.name) + (m.isUniversity ? ' <span style="font-size:0.55rem; background:#6c5ce7; color:white; padding:1px 5px; border-radius:6px;">大学</span>' : '') + '</div>' +
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
                '<div style="font-weight:700; font-size:0.82rem; color:#333;">' + escapeHtml(m.name) + (m.isUniversity ? ' <span style="font-size:0.55rem; background:#6c5ce7; color:white; padding:1px 5px; border-radius:6px;">大学</span>' : '') + '</div>' +
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

function switchTab(t) {
    document.querySelectorAll('.tab-view').forEach(function(e) { e.classList.remove('active'); });
    var target = document.getElementById('tab-'+t); if(target) target.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(function(e) { e.classList.remove('active'); });

    var navMap = { evaluation:'nav-eval', current:'nav-curr', candidates:'nav-cand', resolved:'nav-res', personal:'nav-personal', bmi22:'nav-bmi22', aimeeting:'nav-aimeeting', exec:'nav-exec', food:'nav-food' };
    var navEl = document.getElementById(navMap[t] || 'nav-eval');
    if(navEl) navEl.classList.add('active');

    if(t==='evaluation') renderInbox(currentInboxFilter);
    if(t==='current') loadCurrentAnalysis();
    if(t==='candidates') loadCandidates();
    if(t==='resolved') loadResolved();
    if(t==='personal') loadPersonalNotices();
    if(t==='aimeeting') loadPlansForMeeting();
    if(t==='bmi22') loadHealthPlan26();
    if(t==='exec') loadExecPending();
    if(t==='food') loadFoodUsers();
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
}
function sendBroadcastNotice() {
    var bodyEl = document.getElementById('broadcast-body');
    if(!bodyEl) { alert("通知フォームが見つかりません"); return; }
    var body = bodyEl.value.trim();
    if(!body) { alert("内容を入力してください"); return; }
    showLoading("送信中...");
    saveAdminNotice({ content: body, isBroadcast: true }).then(function(res) { hideLoading(); alert(res.msg); closeBroadcastModal(); bodyEl.value = ""; });
}
