/*  admin-inbox.js – Inbox UI for Admin panel (converted from Admin JS Inbox.html)  */

/* ── Inject scoped CSS ── */
(function(){var s=document.createElement('style'); s.textContent=`
  #report-list-area { background:transparent; display:flex; flex-direction:column; gap:15px; padding-bottom:80px; width:100%; margin:0 auto; }
  .inbox-filter-bar { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:15px; }
  .inbox-filter-btn { border-radius:50px; font-weight:700; padding:5px 14px; border-width:2px; border-style:solid; font-size:0.8rem; cursor:pointer; transition:all 0.2s; display:inline-flex; align-items:center; gap:6px; background:white; }
  .inbox-filter-btn.active { color:white; transform:scale(1.05); box-shadow:0 3px 6px rgba(0,0,0,0.15); }
  .inbox-filter-badge { font-size:0.7rem; padding:2px 6px; border-radius:10px; }
  .post-card { background:white; border-radius:12px; margin-bottom:0; box-shadow:0 2px 8px rgba(0,0,0,0.03); overflow:hidden; border:1px solid #f0f0f0; cursor:pointer; transition:box-shadow 0.2s; }
  .post-card:active { background-color:#fafafa; }
  .post-card.hidden { display:none; }
  .post-header-bar { padding:8px 15px; display:flex; justify-content:space-between; align-items:center; color:white; font-size:0.85rem; font-weight:bold; }
  .header-consult { background:linear-gradient(90deg,#ff9a9e 0%,#fecfef 100%); text-shadow:0 1px 1px rgba(0,0,0,0.1); }
  .header-food    { background:linear-gradient(90deg,#84fab0 0%,#8fd3f4 100%); text-shadow:0 1px 1px rgba(0,0,0,0.1); }
  .header-target  { background:linear-gradient(90deg,#f6d365 0%,#fda085 100%); text-shadow:0 1px 1px rgba(0,0,0,0.1); }
  .post-content { padding:15px; }
  .post-content-inner { display:flex; align-items:flex-start; gap:12px; }
  .post-thumb { width:60px; height:60px; object-fit:cover; border-radius:8px; border:1px solid #eee; flex-shrink:0; background:#f9f9f9; }
  .post-text-area { flex:1; min-width:0; }
  .user-info { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
  .avatar { width:40px; height:40px; background:#f1f3f5; border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:1.4rem; border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.1); flex-shrink:0; }
  .nick { font-weight:bold; font-size:0.95rem; color:#333; }
  .post-body { font-size:0.95rem; line-height:1.6; color:#444; white-space:pre-wrap; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
  .post-details { display:none; }
  .post-card.expanded .post-body { -webkit-line-clamp:unset; display:block; }
  .post-card.expanded .post-details { display:block; animation:fadeInPost 0.3s; }
  @keyframes fadeInPost { from{opacity:0;} to{opacity:1;} }
  .post-img { width:50%; border-radius:8px; margin-top:10px; border:1px solid #eee; display:block; background:#f9f9f9; }
  .ai-reply { background:#f0f8ff; border-left:4px solid #3498db; padding:12px; border-radius:0 8px 8px 0; font-size:0.9rem; color:#2c3e50; margin-top:12px; line-height:1.5; }
  .action-bar { padding:10px 15px; border-top:1px solid #f5f5f5; display:flex; justify-content:flex-end; align-items:center; gap:10px; }
  .btn-like { background:white; border:1px solid #ff6b6b; color:#ff6b6b; border-radius:20px; padding:4px 12px; font-size:0.8rem; display:flex; align-items:center; gap:5px; cursor:pointer; transition:all 0.2s; }
  .btn-like:hover { background:#fff0f0; }
  .btn-like.liked { background:#ff6b6b; color:white; }
  .like-badge { display:inline-flex; align-items:center; gap:3px; background:#fff0f0; color:#ff6b6b; border-radius:10px; padding:2px 8px; font-size:0.75rem; font-weight:bold; margin-left:8px; }
  .btn-admin { font-size:0.75rem; padding:4px 12px; border-radius:20px; font-weight:bold; display:inline-flex; align-items:center; justify-content:center; }
`; document.head.appendChild(s);})();

/* ── Constants ── */
var INBOX_COLS = { ROW_ID:1, CONTENT:2, ANALYSIS:3, USER_NAME:4, AVATAR:5, LIKE_COUNT:6, PID:7, CAT:8, STATUS:9, UID:10, IMG:11, DATE:14 };
var currentInboxCatFilter = 'all';
var INBOX_AVATAR_MAP = { "産業医":"🩺","医":"🩺","保健師":"💉","看護":"💉","栄養士":"🥗","管理":"📝","課長":"📝","事務":"📝","専務":"👨‍⚖️","経営":"👨‍⚖️","佐藤":"💁‍♀️","山本":"👨‍💼","高橋":"👩‍💼","中村":"👨‍💻","伊藤":"👦","林":"👩‍🍳" };

/* ── Helper: avatar resolution ── */
function getInboxAvatar(name, role, currentAvatar) {
    if(currentAvatar && currentAvatar.length <= 4 && !currentAvatar.match(/[亜-熙ぁ-んァ-ヶ]/)) return currentAvatar;
    var targetStr = (String(currentAvatar) + String(name) + String(role));
    for(var key in INBOX_AVATAR_MAP) { if(targetStr.includes(key)) return INBOX_AVATAR_MAP[key]; }
    return "🤖";
}

/* ── Helper: image URL normalisation ── */
function getPostImageUrl(url) {
    if(!url) return null;
    var str = String(url).trim();
    if(!str.startsWith('http')) return null;
    if(str.includes('drive.google.com/thumbnail')) return str;
    var idMatch = str.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
    if(!idMatch) idMatch = str.match(/id=([a-zA-Z0-9_-]{25,})/);
    if(idMatch) return "https://drive.google.com/thumbnail?id=" + idMatch[1] + "&sz=w800";
    return str;
}

/* ── Entry point ── */
function renderInbox() { loadReportData(); }

/* ── Load data from API ── */
function loadReportData() {
    var area = document.getElementById('report-list-area');
    if(area) area.innerHTML = '<div class="text-center py-5 text-muted"><div class="spinner-border spinner-border-sm text-secondary"></div><div class="mt-2 small">読み込み中...</div></div>';
    getReportData().then(function(data) {
        window.allPostData = data || [];
        renderReportList(window.allPostData);
        if(typeof fetchMatrixPoints === 'function') fetchMatrixPoints();
    }).catch(function(err) {
        if(area) area.innerHTML = '<div class="alert alert-danger m-3 small">データ取得エラー: ' + err.message + '</div>';
    });
}

/* ── Toggle card expand / collapse ── */
// togglePost廃止 — カードは常にコンパクト表示、ボタンは常に見える

/* ── Category filter switching ── */
window.switchInboxCat = function(cat) {
    currentInboxCatFilter = cat;
    var btns = document.querySelectorAll('.inbox-filter-btn');
    btns.forEach(function(b) {
        var colorClass = b.getAttribute('data-color');
        b.classList.remove('active'); b.style.backgroundColor = 'white'; b.style.color = colorClass;
        if(b.getAttribute('data-cat') === cat) { b.classList.add('active'); b.style.backgroundColor = colorClass; b.style.color = 'white'; }
    });
    var cards = document.querySelectorAll('.post-card[data-cat]');
    cards.forEach(function(card) {
        if(cat === 'all' || card.getAttribute('data-cat') === cat) card.classList.remove('hidden'); else card.classList.add('hidden');
    });
    var visible = document.querySelectorAll('.post-card[data-cat]:not(.hidden)').length;
    var countEl = document.getElementById('report-count'); if(countEl) countEl.innerText = visible + " 件";
};

/* ── Render the full report list ── */
function renderReportList(data) {
    var list = document.getElementById('report-list-area'); if(!list) return;
    list.innerHTML = "";
    if(!data || data.length === 0) { list.innerHTML = '<div class="text-center text-muted py-5 small">投稿データがありません</div>'; return; }
    var catCount = { all:0, consult:0, food:0, target:0 };
    var catColors = { all:'#6c757d', consult:'#d63384', food:'#20c997', target:'#fd7e14' };
    var catLabels = { all:'📋 すべて', consult:'💬 相談', food:'🍱 食事', target:'⭐ 重点' };
    data.forEach(function(r) {
        var rawContent = String(r[INBOX_COLS.CONTENT]||""); var analysisText = String(r[INBOX_COLS.ANALYSIS]||"");
        var isTarget = false;
        if(analysisText.includes("///SCORE///")) { try { var s = JSON.parse(analysisText.split("///SCORE///")[1]); if(s.is_target) isTarget = true; } catch(e){} }
        catCount.all++;
        if(isTarget) catCount.target++; else if(rawContent.includes("食事") || analysisText.includes("栄養")) catCount.food++; else catCount.consult++;
    });
    var filterBar = document.createElement('div'); filterBar.className = 'inbox-filter-bar';
    ['all','consult','food','target'].forEach(function(cat) {
        var btn = document.createElement('button');
        btn.className = 'inbox-filter-btn' + (cat===currentInboxCatFilter ? ' active' : '');
        btn.setAttribute('data-cat',cat); btn.setAttribute('data-color',catColors[cat]);
        btn.style.borderColor = catColors[cat]; btn.style.color = cat===currentInboxCatFilter ? 'white' : catColors[cat];
        btn.style.backgroundColor = cat===currentInboxCatFilter ? catColors[cat] : 'white';
        btn.innerHTML = catLabels[cat] + ' <span class="inbox-filter-badge" style="background:'+catColors[cat]+'; color:white;">'+catCount[cat]+'</span>';
        btn.onclick = function(){ window.switchInboxCat(cat); };
        filterBar.appendChild(btn);
    });
    list.appendChild(filterBar);
    var visibleCount = 0;
    data.forEach(function(r) {
        var pid = r[1]; var rawContent = String(r[INBOX_COLS.CONTENT]||""); var analysisText = String(r[INBOX_COLS.ANALYSIS]||"");
        var isTarget = false;
        if(analysisText.includes("///SCORE///")) { try { var s = JSON.parse(analysisText.split("///SCORE///")[1]); if(s.is_target) isTarget = true; } catch(e){} analysisText = analysisText.split("///SCORE///")[0]; }
        rawContent = rawContent.replace(/^【写真】/, '').split("///SCORE///")[0];
        var avatar = getInboxAvatar(r[INBOX_COLS.USER_NAME], "", r[INBOX_COLS.AVATAR]);
        var likeCount = parseInt(r[INBOX_COLS.LIKE_COUNT]) || 0;
        var likeBadge = likeCount > 0 ? '<span class="like-badge"><i class="fas fa-heart"></i> ' + likeCount + '</span>' : '';
        var dateStr = String(r[INBOX_COLS.DATE]||"");
        var headerClass, icon, catName, cardCat;
        if(isTarget) { headerClass="header-target"; icon="fas fa-star"; catName="重点検討案件"; cardCat="target"; }
        else if(rawContent.includes("食事") || analysisText.includes("栄養")) { headerClass="header-food"; icon="fas fa-utensils"; catName="食事チェック"; cardCat="food"; }
        else { headerClass="header-consult"; icon="far fa-comment-dots"; catName="相談・提案"; cardCat="consult"; }
        var imgUrl = r[INBOX_COLS.IMG]; var displayUrl = getPostImageUrl(imgUrl);
        var thumbTag = displayUrl ? '<img src="'+displayUrl+'" class="post-thumb" onclick="event.stopPropagation();" onerror="this.style.display=\'none\'">' : '';
        var imgTag = displayUrl ? '<img src="'+displayUrl+'" class="post-img" loading="lazy" onclick="event.stopPropagation(); window.open(\''+displayUrl+'\', \'_blank\');">' : '';
        var aiHtml = (analysisText && analysisText.trim().length > 0) ? '<div class="ai-reply"><i class="fas fa-robot text-primary me-1"></i> '+analysisText.replace(/\n/g,'<br>')+'</div>' : '';
        var isHidden = (currentInboxCatFilter !== 'all' && currentInboxCatFilter !== cardCat);
        if(!isHidden) visibleCount++;
        var sheetRow = parseInt(r[0]) + 1;
        var div = document.createElement('div');
        div.className = "post-card" + (isHidden ? " hidden" : "");
        div.setAttribute('data-cat', cardCat);
        div.innerHTML =
            '<div class="post-header-bar '+headerClass+'"><span><i class="'+icon+'"></i> '+catName+likeBadge+'</span><span>'+dateStr+'</span></div>' +
            '<div class="post-content">' +
                '<div class="post-content-inner">' + thumbTag +
                    '<div class="post-text-area">' +
                        '<div class="user-info"><div class="avatar">'+avatar+'</div><div class="nick">'+escapeHtml(r[INBOX_COLS.USER_NAME])+'</div></div>' +
                        '<div class="post-body" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:0.88rem;line-height:1.6;color:#444;">'+escapeHtml(rawContent)+'</div>' +
                    '</div>' +
                '</div>' +
                '<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-top:1px solid #f0f0f0; margin-top:8px;">' +
                    '<button class="btn-like'+(likeCount > 0 ? ' liked' : '')+'" id="like-btn-'+pid+'" onclick="likePost(\''+pid+'\', '+sheetRow+')"><i class="fas fa-heart"></i> <span id="like-count-'+pid+'">'+likeCount+'</span></button>' +
                    '<div style="display:flex; gap:5px;">' +
                        '<button class="btn btn-outline-secondary btn-admin" onclick="openEvalModal(\''+pid+'\')"><i class="fas fa-search me-1"></i>詳細</button>' +
                        (!isTarget ? '<button class="btn btn-outline-danger btn-admin" onclick="toggleTriage(\''+pid+'\', true)"><i class="fas fa-star me-1"></i>重点へ</button>' : '<button class="btn btn-outline-success btn-admin" onclick="toggleTriage(\''+pid+'\', false)"><i class="fas fa-undo me-1"></i>解除</button>') +
                    '</div>' +
                '</div>' +
            '</div>';
        list.appendChild(div);
    });
    var countEl = document.getElementById('report-count'); if(countEl) countEl.innerText = visibleCount + " 件";
}

/* ── Open evaluation modal ── */
function openEvalModal(pid) { if(typeof openPriorityModal === 'function') openPriorityModal(pid); else alert("詳細画面を開けません。リロードしてください。"); }

/* ── Toggle triage (target) status ── */
function toggleTriage(pid, toTarget) {
    if(!confirm(toTarget ? "重点検討案件に引き上げますか？" : "通常案件に戻しますか？")) return;
    toggleTargetStatus(pid, !toTarget).then(function(res) { if(res.success) loadReportData(); else alert("エラー: " + res.msg); });
}

/* ── Like / unlike a post ── */
function likePost(pid, rowId) {
    var adminUid = (currentAdminProfile && currentAdminProfile.email) ? currentAdminProfile.email : 'admin';
    var btn = document.getElementById('like-btn-' + pid);
    var countEl = document.getElementById('like-count-' + pid);
    if(btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
    toggleLike(rowId, adminUid).then(function(res) {
        if(btn) { btn.disabled = false; btn.style.opacity = '1'; }
        if(!res || !res.success) { alert("いいねエラー: " + (res ? res.msg : "応答なし")); return; }
        if(countEl) countEl.innerText = res.count;
        if(btn) {
            if(res.isLiked) { btn.classList.add('liked'); }
            else { btn.classList.remove('liked'); }
        }
    }).catch(function(err) {
        if(btn) { btn.disabled = false; btn.style.opacity = '1'; }
        alert("通信エラー: " + err.message);
    });
}
