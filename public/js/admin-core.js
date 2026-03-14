// ====================================================
//  Core: グローバル変数・初期化・タブ切替・認証
// ====================================================
window.addEventListener('submit', function(e) { e.preventDefault(); }, true);
window.addEventListener('click', function(e) {
    let t = e.target.closest('a, button');
    if(t && (t.tagName==='BUTTON' && t.type==='submit' || t.tagName==='A' && (!t.href || t.getAttribute('href')==='#' || t.getAttribute('href')===''))) { e.preventDefault(); }
}, true);

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

function logoutAdmin() { if(!confirm("ログアウトしますか？")) return; localStorage.removeItem('co_heart_admin_email'); localStorage.removeItem('co_heart_admin_pass'); localStorage.removeItem('co_heart_admin_profile'); localStorage.removeItem('co_heart_admin_token'); window.location.reload(); }

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
        // 保存済みの場合は自動ログイン
        document.getElementById('admin-auth-overlay').style.display = 'none';
        renderHeaderInfo();
        loadData();
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
}

function switchTab(t) {
    document.querySelectorAll('.tab-view').forEach(function(e) { e.classList.remove('active'); });
    var target = document.getElementById('tab-'+t); if(target) target.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(function(e) { e.classList.remove('active'); });

    var navMap = { evaluation:'nav-eval', current:'nav-curr', candidates:'nav-cand', resolved:'nav-res', personal:'nav-personal', bmi22:'nav-bmi22', aimeeting:'nav-aimeeting', exec:'nav-exec' };
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
