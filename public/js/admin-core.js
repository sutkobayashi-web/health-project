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
        // v2ダッシュボードがデフォルト表示
        if (typeof renderV2Dashboard === 'function') renderV2Dashboard();
    }).catch(function(err) { hideLoading(); alert("通信エラー: " + err.message); });
    // メンバーリスト＆ハートビート開始
    startHeartbeat();
    loadSidebarMembers();
}

// ハートビート送信（30秒ごと）- 自動更新は廃止
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
    }
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

// =============================================
// メンバー管理
// =============================================
function loadMemberManagement() {
    Promise.all([getAllCoreMembers(), getAllGeneralUsers()]).then(function(results) {
        renderCoreMembers(results[0]);
        renderGeneralUsers(results[1]);
    });
}

function renderCoreMembers(members) {
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
            html += '<div style="display:flex; align-items:center; gap:10px; padding:10px; background:white; border-radius:8px; margin-bottom:6px; border:1px solid #ffe0b2;">' +
                '<div style="width:32px;height:32px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">' + avatarHtml + '</div>' +
                '<div style="flex:1; min-width:0;">' +
                    '<div class="fw-bold" style="font-size:0.85rem;">' + escapeHtml(m.name) + (m.is_university ? ' <span class="badge bg-info" style="font-size:0.55rem;">大学</span>' : '') + '</div>' +
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
        '<thead style="background:#f8f9fa;"><tr><th style="width:50px;"></th><th>氏名</th><th>部署</th><th>メール</th><th>役割</th><th style="width:100px;">操作</th></tr></thead>' +
        '<tbody>' + approved.map(function(m) {
            var avatarHtml = _renderMemberAvatar(m.avatar, '🛡️', 32);
            var roleLabel = m.is_exec ? '<span class="badge bg-danger">Exec</span>' : (m.is_university ? '<span class="badge bg-info">大学</span>' : '<span class="badge bg-secondary">Member</span>');
            return '<tr>' +
                '<td class="text-center"><div style="width:32px;height:32px;border-radius:50%;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;font-size:1.3rem;">' + avatarHtml + '</div></td>' +
                '<td class="fw-bold">' + escapeHtml(m.name) + '</td>' +
                '<td>' + escapeHtml(m.dept || m.university_org || '') + '</td>' +
                '<td class="text-muted small">' + escapeHtml(m.email) + '</td>' +
                '<td>' + roleLabel + '</td>' +
                '<td><button class="btn btn-outline-primary btn-sm me-1" style="font-size:0.7rem;" onclick=\'openEditCoreMemberModal(' + JSON.stringify(m).replace(/'/g, "&#39;") + ')\'><i class="fas fa-edit"></i></button>' +
                '<button class="btn btn-outline-danger btn-sm" style="font-size:0.7rem;" onclick="handleDeleteCoreMember(' + m.id + ',\'' + escapeHtml(m.name) + '\')"><i class="fas fa-trash"></i></button></td>' +
                '</tr>';
        }).join('') + '</tbody></table>';
    area.innerHTML = html;
}

function renderGeneralUsers(users) {
    var area = document.getElementById('general-users-list');
    if (!area) return;
    if (!users || users.length === 0) {
        area.innerHTML = '<div class="text-muted text-center p-4">一般ユーザーがいません</div>';
        return;
    }
    area.innerHTML = '<table class="table table-hover mb-0" style="font-size:0.85rem;">' +
        '<thead style="background:#f8f9fa;"><tr><th style="width:50px;"></th><th>ニックネーム</th><th>本名</th><th>部署</th><th>投稿数</th><th>登録日</th><th style="width:100px;">操作</th></tr></thead>' +
        '<tbody>' + users.map(function(u) {
            var avatarHtml = _renderMemberAvatar(u.avatar, '😀', 32);
            var dateStr = u.created_at ? new Date(u.created_at).toLocaleDateString('ja-JP') : '';
            return '<tr>' +
                '<td class="text-center"><div style="width:32px;height:32px;border-radius:50%;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;font-size:1.3rem;">' + avatarHtml + '</div></td>' +
                '<td class="fw-bold">' + escapeHtml(u.nickname) + '</td>' +
                '<td>' + escapeHtml(u.real_name || '') + '</td>' +
                '<td>' + escapeHtml(u.department || '') + '</td>' +
                '<td class="text-center"><span class="badge bg-primary rounded-pill">' + (u.post_count || 0) + '</span></td>' +
                '<td class="text-muted small">' + dateStr + '</td>' +
                '<td><button class="btn btn-outline-primary btn-sm me-1" style="font-size:0.7rem;" onclick=\'openEditUserModal(' + JSON.stringify(u).replace(/'/g, "&#39;") + ')\'><i class="fas fa-edit"></i></button>' +
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
            html += '<div class="mb-2"><label class="small fw-bold text-muted">' + f.label + '</label><input type="' + (f.type || 'text') + '" id="mm-' + f.key + '" class="form-control form-control-sm" value="' + escapeHtml(f.value || '') + '" placeholder="' + (f.placeholder || '') + '"></div>';
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
        { key: 'is_university', label: '大学関係者', type: 'checkbox', value: false }
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
            is_university: document.getElementById('mm-is_university').checked
        };
        if (!data.name || !data.email) { alert('氏名とメールアドレスは必須です'); return; }
        addCoreMember(data).then(function(res) {
            alert(res.msg);
            if (res.success) { document.getElementById('member-mgmt-modal').remove(); loadMemberManagement(); }
        });
    });
}

function openEditCoreMemberModal(m) {
    showMemberModal('<i class="fas fa-edit text-primary me-2"></i>コアメンバー編集', [
        { key: 'name', label: '氏名', value: m.name },
        { key: 'email', label: 'メールアドレス', type: 'email', value: m.email },
        { key: 'dept', label: '部署', value: m.dept },
        { key: 'phone', label: '電話番号', value: m.phone },
        { key: 'avatar', label: 'アバター絵文字', value: m.avatar || '🛡️' },
        { key: 'password', label: 'パスワード（変更時のみ）', type: 'password', placeholder: '未入力なら変更なし' },
        { key: 'role', label: '役割', type: 'select', value: m.is_exec ? 'exec' : (m.role || 'member'), options: [{ value: 'member', label: 'メンバー' }, { value: 'exec', label: '役員(Exec)' }, { value: 'observer', label: 'オブザーバー' }] },
        { key: 'is_university', label: '大学関係者', type: 'checkbox', value: m.is_university === 1 }
    ], function() {
        var data = {
            id: m.id,
            name: document.getElementById('mm-name').value.trim(),
            email: document.getElementById('mm-email').value.trim(),
            dept: document.getElementById('mm-dept').value.trim(),
            phone: document.getElementById('mm-phone').value.trim(),
            avatar: document.getElementById('mm-avatar').value.trim() || '🛡️',
            password: document.getElementById('mm-password').value || undefined,
            role: document.getElementById('mm-role').value,
            is_exec: document.getElementById('mm-role').value === 'exec',
            is_university: document.getElementById('mm-is_university').checked
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
    showMemberModal('<i class="fas fa-user-edit text-success me-2"></i>一般ユーザー編集', [
        { key: 'nickname', label: 'ニックネーム', value: u.nickname },
        { key: 'password', label: 'パスワード（変更時のみ）', type: 'password', placeholder: '未入力なら変更なし' },
        { key: 'avatar', label: 'アバター絵文字', value: u.avatar || '😀' },
        { key: 'real_name', label: '本名', value: u.real_name || '' },
        { key: 'department', label: '部署', type: 'select', value: u.department || 'その他', options: [{ value: 'その他', label: 'その他' }, { value: '管理者', label: '管理者' }, { value: '事務', label: '事務' }, { value: '倉庫作業', label: '倉庫作業' }, { value: '営業', label: '営業' }, { value: '配送', label: '配送' }] },
        { key: 'birth_date', label: '生年月日', type: 'date', value: u.birth_date || '' }
    ], function() {
        var data = {
            id: u.id,
            nickname: document.getElementById('mm-nickname').value.trim(),
            password: document.getElementById('mm-password').value || undefined,
            avatar: document.getElementById('mm-avatar').value.trim() || '😀',
            real_name: document.getElementById('mm-real_name').value.trim(),
            department: document.getElementById('mm-department').value,
            birth_date: document.getElementById('mm-birth_date').value
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

    var navMap = { evaluation:'nav-eval', current:'nav-curr', candidates:'nav-cand', resolved:'nav-res', personal:'nav-personal', bmi22:'nav-bmi22', aimeeting:'nav-aimeeting', exec:'nav-exec', food:'nav-food', members:'nav-members', backup:'nav-backup', v2dash:'nav-v2dash', v2challenge:'nav-v2challenge', v2kpi:'nav-v2kpi', v2ambassador:'nav-v2ambassador' };
    var navEl = document.getElementById(navMap[t] || 'nav-eval');
    if(navEl) navEl.classList.add('active');

    if(t==='evaluation') { renderInbox(currentInboxFilter); setTimeout(function(){ if(typeof renderInboxCustomAvatars==='function') renderInboxCustomAvatars(); }, 500); }
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
            '<div><div style="font-weight:800; font-size:1.1rem; color:white;">健康プロジェクト DB</div><div style="font-size:0.75rem; color:rgba(255,255,255,0.7);">スケジュール: ' + escapeHtml(data.schedule) + '</div></div>' +
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
    showLoading("送信中...");
    saveAdminNotice({ content: body, isBroadcast: true }).then(function(res) { hideLoading(); alert(res.msg); closeBroadcastModal(); bodyEl.value = ""; });
}
