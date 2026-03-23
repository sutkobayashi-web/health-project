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
  .btn-vote { background:white; border:2px solid #667eea; color:#667eea; border-radius:8px; padding:5px 14px; font-size:0.78rem; font-weight:700; display:inline-flex; align-items:center; gap:6px; cursor:pointer; transition:all 0.2s; }
  .btn-vote:hover { background:#f0f0ff; transform:translateY(-1px); box-shadow:0 2px 8px rgba(102,126,234,0.15); }
  .btn-vote:active { transform:scale(0.97); }
  .btn-vote.voted { background:linear-gradient(135deg,#667eea,#764ba2); color:white; border-color:transparent; box-shadow:0 2px 8px rgba(102,126,234,0.3); }
  .btn-vote .vote-count { background:rgba(255,255,255,0.25); padding:1px 8px; border-radius:10px; font-size:0.72rem; font-weight:800; min-width:18px; text-align:center; }
  .btn-vote:not(.voted) .vote-count { background:#f0f0ff; color:#667eea; }
  .like-badge { display:inline-flex; align-items:center; gap:3px; background:#fff0f0; color:#ff6b6b; border-radius:10px; padding:2px 8px; font-size:0.75rem; font-weight:bold; margin-left:8px; }
  @keyframes pulseGlow { 0%,100% { box-shadow:0 2px 8px rgba(67,160,71,0.3); } 50% { box-shadow:0 4px 16px rgba(67,160,71,0.5); } }
  .btn-admin { font-size:0.75rem; padding:4px 12px; border-radius:20px; font-weight:bold; display:inline-flex; align-items:center; justify-content:center; }
`; document.head.appendChild(s);})();

/* ── Constants ── */
var INBOX_COLS = { ROW_ID:1, CONTENT:2, ANALYSIS:3, USER_NAME:4, AVATAR:5, LIKE_COUNT:6, PID:7, CAT:8, STATUS:9, UID:10, IMG:11, DATE:14 };
var currentInboxCatFilter = 'all';
var INBOX_AVATAR_MAP = { "メディカル":"🩺","医":"🩺","ヘルス":"💉","看護":"💉","食事":"🥗","管理":"📝","課長":"📝","事務":"📝","専務":"👨‍⚖️","経営":"👨‍⚖️","佐藤":"💁‍♀️","山本":"👨‍💼","高橋":"👩‍💼","中村":"👨‍💻","伊藤":"👦","林":"👩‍🍳" };

/* ── Helper: avatar resolution ── */
function getInboxAvatar(name, role, currentAvatar) {
    if(currentAvatar && currentAvatar.length <= 4 && !currentAvatar.match(/[亜-熙ぁ-んァ-ヶ]/)) return currentAvatar;
    var targetStr = (String(currentAvatar) + String(name) + String(role));
    for(var key in INBOX_AVATAR_MAP) { if(targetStr.includes(key)) return INBOX_AVATAR_MAP[key]; }
    return "🤖";
}

// カスタムアバターの場合は.avatar divごと置き換えるHTML生成
function getInboxAvatarDiv(name, role, currentAvatar) {
    if(currentAvatar && String(currentAvatar).startsWith('custom:') && typeof renderCustomAvatar === 'function') {
        var dataUrl = renderCustomAvatar(currentAvatar, 80);
        if(dataUrl) {
            return '<div class="avatar" style="padding:0;overflow:hidden;"><img src="'+dataUrl+'" style="width:40px;height:40px;border-radius:50%;display:block;"></div>';
        }
    }
    return '<div class="avatar">' + getInboxAvatar(name, role, currentAvatar) + '</div>';
}

// DOM追加後にカスタムアバターをCanvas描画
function renderInboxCustomAvatars() {
    var els = document.querySelectorAll('[data-custom-avatar]');
    console.log('[Avatar Debug] Found custom avatar elements:', els.length, 'getAvatarHtml exists:', typeof getAvatarHtml);
    if(typeof getAvatarHtml !== 'function') {
        console.error('[Avatar Debug] getAvatarHtml is NOT defined! avatar-render.js failed to load?');
        return;
    }
    els.forEach(function(el) {
        if(el._rendered) return;
        el._rendered = true;
        var av = el.getAttribute('data-custom-avatar');
        var sz = parseInt(el.getAttribute('data-avatar-size')) || 36;
        try {
            var html = getAvatarHtml(av, sz);
            el.innerHTML = html;
            var img = el.querySelector('img');
            if(img) { img.style.borderRadius = '50%'; img.style.display = 'block'; }
        } catch(e) {
            console.error('[Avatar Debug] Render error:', e.message);
            el.innerHTML = '⚠️';
        }
    });
}

/* ── Helper: image URL normalisation ── */
function getPostImageUrl(url) {
    if(!url) return null;
    var str = String(url).trim();
    if(!str) return null;
    // ローカルアップロードパス
    if(str.startsWith('/uploads/')) return str;
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
        setTimeout(function(){ if(typeof renderInboxCustomAvatars==='function') renderInboxCustomAvatars(); }, 200);
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
        var dbCat = String(r[INBOX_COLS.CAT]||"");
        var isFood = dbCat.includes("食事") || dbCat.includes("栄養");
        catCount.all++;
        if(isTarget) catCount.target++; else if(isFood) catCount.food++; else catCount.consult++;
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
        var dbCat = String(r[INBOX_COLS.CAT]||"");
        var isTarget = false;
        if(analysisText.includes("///SCORE///")) { try { var s = JSON.parse(analysisText.split("///SCORE///")[1]); if(s.is_target) isTarget = true; } catch(e){} analysisText = analysisText.split("///SCORE///")[0]; }
        rawContent = rawContent.replace(/^【写真】/, '').split("///SCORE///")[0];
        var avatarDiv = getInboxAvatarDiv(r[INBOX_COLS.USER_NAME], "", r[INBOX_COLS.AVATAR]);
        var likeCount = parseInt(r[INBOX_COLS.LIKE_COUNT]) || 0;
        var likeBadge = likeCount > 0 ? '<span class="like-badge"><i class="fas fa-heart"></i> ' + likeCount + '</span>' : '';
        var dateStr = String(r[INBOX_COLS.DATE]||"");
        var headerClass, icon, catName, cardCat;
        if(isTarget) { headerClass="header-target"; icon="fas fa-star"; catName="重点検討案件"; cardCat="target";
            // 重点案件の賛同進捗バッジを後で設定するためのフラグ
        }
        else if(dbCat.includes("食事") || dbCat.includes("栄養")) { headerClass="header-food"; icon="fas fa-utensils"; catName="食事チェック"; cardCat="food"; }
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
        // コンパクトカード + 詳細パネル（タブ切替）
        var empathyBadge = '<span id="empathy-badge-'+pid+'" style="font-size:0.6rem; background:#eef; color:#667eea; padding:1px 6px; border-radius:8px; font-weight:700;"></span>';
        var commentBadge = '<span id="comment-badge-'+pid+'" style="font-size:0.6rem; background:#f0f0f0; color:#666; padding:1px 6px; border-radius:8px; font-weight:700;"></span>';
        div.innerHTML =
            // ヘッダー
            '<div class="post-header-bar '+headerClass+'"><span><i class="'+icon+'"></i> '+catName+'</span><span>'+dateStr+'</span></div>' +
            // コンパクト本体
            '<div style="padding:10px 14px;">' +
                '<div class="user-info" style="margin-bottom:6px;">'+avatarDiv+'<div class="nick">'+escapeHtml(r[INBOX_COLS.USER_NAME])+'</div>' +
                (likeCount > 0 ? '<span style="margin-left:auto; background:linear-gradient(135deg,#667eea,#764ba2); color:white; font-size:0.6rem; font-weight:700; padding:2px 7px; border-radius:10px;"><i class="fas fa-hand-paper"></i> '+likeCount+'</span>' : '') +
                ' '+empathyBadge+' '+commentBadge+'</div>' +
                '<div style="display:flex; gap:8px; align-items:flex-start;">' +
                    (thumbTag ? thumbTag : '') +
                    '<div style="flex:1; font-size:0.85rem; line-height:1.5; color:#444; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">'+escapeHtml(rawContent)+'</div>' +
                '</div>' +
                // 操作ボタン行
                '<div style="margin-top:8px; text-align:right;">' +
                    '<button id="inbox-toggle-btn-'+pid+'" class="btn btn-sm btn-outline-primary" style="font-size:0.68rem; padding:3px 12px;" onclick="event.stopPropagation(); toggleInboxDetail(\''+pid+'\')"><i class="fas fa-chevron-down" style="font-size:0.6rem;margin-right:3px;"></i>開く</button>' +
                '</div>' +
            '</div>' +
            // 詳細パネル（左右分割モーダル）
            '<div id="inbox-detail-'+pid+'" style="display:none; border-top:2px solid #667eea;">' +
                '<div style="display:flex; min-height:300px;">' +
                    // 左: 投稿内容
                    '<div style="flex:1; padding:12px; overflow-y:auto; max-height:450px; border-right:1px solid #eee;">' +
                        '<div style="font-size:0.7rem; font-weight:700; color:#667eea; margin-bottom:6px;"><i class="fas fa-file-alt me-1"></i>投稿内容</div>' +
                        '<div style="font-size:0.85rem; line-height:1.7; color:#333; white-space:pre-wrap; margin-bottom:10px;">'+escapeHtml(rawContent)+'</div>' +
                        (displayUrl ? '<img src="'+displayUrl+'" style="width:220px; height:220px; object-fit:cover; border-radius:12px; border:1px solid #eee; margin-bottom:10px; cursor:pointer;" onclick="event.stopPropagation(); window.open(\''+displayUrl+'\',\'_blank\');" onerror="this.style.display=\'none\'">' : '') +
                        (aiHtml ? '<div style="margin-top:8px;">'+aiHtml+'</div>' : '') +
                        // AI自動7軸評価
                        '<div style="margin-top:10px; padding-top:8px; border-top:1px solid #eee;">' +
                            '<div style="font-size:0.7rem; font-weight:700; color:#1565c0; margin-bottom:4px;"><i class="fas fa-robot me-1"></i>AI自動7軸評価</div>' +
                            '<div id="auto-eval-'+pid+'" style="font-size:0.78rem;"></div>' +
                            '<button class="btn btn-sm btn-outline-primary fw-bold mt-1" style="font-size:0.68rem;" onclick="doAutoEvaluate(\''+pid+'\')"><i class="fas fa-magic me-1"></i>AI評価を実行</button>' +
                        '</div>' +
                    '</div>' +
                    // 右: 共感+チャット
                    '<div style="flex:1; padding:12px; overflow-y:auto; max-height:450px; display:flex; flex-direction:column; background:linear-gradient(180deg, #f5f0ff 0%, #f0f4ff 100%);">' +
                        // 共感サマリー
                        '<div style="margin-bottom:8px;">' +
                            '<div style="font-size:0.7rem; font-weight:700; color:#667eea; margin-bottom:4px;"><i class="fas fa-heart me-1"></i>共感 <span id="empathy-count-'+pid+'" style="color:#999;"></span></div>' +
                            '<div id="empathy-summary-'+pid+'"></div>' +
                        '</div>' +
                        // 全回答一覧
                        '<div style="margin-bottom:8px;">' +
                            '<div style="font-size:0.7rem; font-weight:700; color:#333; margin-bottom:4px;"><i class="fas fa-list me-1"></i>回答一覧</div>' +
                            '<div id="empathy-members-'+pid+'" style="max-height:120px; overflow-y:auto;"></div>' +
                        '</div>' +
                        // 推進メンバー議論チャット
                        '<div style="flex:1; display:flex; flex-direction:column; border-top:1px solid #eee; padding-top:8px;">' +
                            '<div style="font-size:0.7rem; font-weight:700; color:#d32f2f; margin-bottom:4px;"><i class="fas fa-comments me-1"></i>推進メンバー議論</div>' +
                            '<div id="empathy-member-chats-'+pid+'" style="flex:1; overflow-y:auto; font-size:0.78rem; background:#fafafa; border-radius:8px; padding:6px; min-height:60px; max-height:120px; word-break:break-word;"></div>' +
                            '<div style="display:flex; gap:4px; margin-top:4px;">' +
                                '<textarea id="empathy-chat-input-'+pid+'" placeholder="議論...（Ctrl+Enterで送信）" rows="2" style="flex:1; border:1px solid #ddd; border-radius:8px; padding:5px 8px; font-size:0.75rem; outline:none; resize:none; line-height:1.4;" onkeydown="if(event.key===\'Enter\'&&(event.ctrlKey||event.metaKey)){event.preventDefault();doPostEmpathyChat(\''+pid+'\');}"></textarea>' +
                                '<button class="btn btn-sm btn-danger" style="font-size:0.68rem; padding:3px 8px;" onclick="doPostEmpathyChat(\''+pid+'\')"><i class="fas fa-paper-plane"></i></button>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        list.appendChild(div);
        // コメント読み込み
        loadInboxComments(pid);
        // 共感データ読み込み
        loadEmpathyDisplay(pid);
    });
    var countEl = document.getElementById('report-count'); if(countEl) countEl.innerText = visibleCount + " 件";
    // 重点案件の賛同進捗バッジを更新
    updateVoteProgressBadges();
    // カスタムアバターをCanvas描画
    setTimeout(renderInboxCustomAvatars, 100);
}

function updateVoteProgressBadges() {
    getCoreMemberCount().then(function(res) {
        var memberCount = (res && res.count) ? res.count : 1;
        var threshold = Math.ceil(memberCount / 2);
        document.querySelectorAll('.vote-threshold').forEach(function(el) { el.innerText = threshold; });
        document.querySelectorAll('[id^="vote-progress-"]').forEach(function(el) {
            var text = el.innerText;
            var match = text.match(/(\d+)票/);
            var votes = match ? parseInt(match[1]) : 0;
            var pct = Math.min(100, Math.round(votes / threshold * 100));
            if (votes >= threshold) {
                el.style.cssText = 'margin-left:auto; padding:6px 14px; border-radius:12px; display:inline-flex; align-items:center; gap:6px; background:linear-gradient(135deg,#43a047,#66bb6a); color:white; font-size:0.7rem; font-weight:700; box-shadow:0 2px 8px rgba(67,160,71,0.3); animation:pulseGlow 2s ease-in-out infinite;';
                el.innerHTML = '<i class="fas fa-trophy"></i> ' + votes + '/' + threshold + '票 昇格可能！';
            } else {
                var barColor = pct >= 60 ? '#ff9800' : '#667eea';
                el.style.cssText = 'margin-left:auto; padding:0; border-radius:12px; display:inline-flex; flex-direction:column; align-items:stretch; min-width:140px; background:white; border:2px solid #e0e0e0; overflow:hidden; font-size:0.65rem;';
                el.innerHTML =
                    '<div style="display:flex; justify-content:space-between; align-items:center; padding:3px 8px;">' +
                        '<span style="font-weight:700; color:#555;"><i class="fas fa-hand-paper" style="color:'+barColor+';"></i> 賛同</span>' +
                        '<span style="font-weight:800; color:'+barColor+';">' + votes + ' / ' + threshold + '</span>' +
                    '</div>' +
                    '<div style="height:6px; background:#f0f0f0;">' +
                        '<div style="height:100%; width:'+pct+'%; background:linear-gradient(90deg,'+barColor+','+barColor+'aa); border-radius:0 3px 3px 0; transition:width 0.5s;"></div>' +
                    '</div>' +
                    '<div style="padding:2px 8px; text-align:center; color:#999; font-size:0.6rem;">あと<strong style="color:'+barColor+';">' + (threshold - votes) + '</strong>票で企画書へ</div>';
            }
        });
    });
}

/* ── 7軸評価 ── */
var EVAL_THRESHOLD = 21; // 合計21点以上で自動格上げ（35点満点の60%）

function openInlineEval(pid) {
    var form = document.getElementById('eval-form-' + pid);
    if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function loadInlineEvalDisplay(pid) {
    var area = document.getElementById('eval-display-' + pid);
    var avgArea = document.getElementById('eval-avg-' + pid);
    if (!area) return;
    getPostEvaluations(pid).then(function(evals) {
        if (!evals || evals.length === 0) {
            area.innerHTML = '<span style="color:#ccc;">未評価</span>';
            if (avgArea) avgArea.innerText = '';
            return;
        }
        // 平均スコア計算
        var totals = { legal:0, risk:0, freq:0, urgency:0, safety:0, value:0, needs:0 };
        evals.forEach(function(ev) {
            ['legal','risk','freq','urgency','safety','value','needs'].forEach(function(k) { totals[k] += Number(ev.scores[k]) || 0; });
        });
        var n = evals.length;
        var avgTotal = 0;
        var labels = { legal:'法', risk:'危', freq:'頻', urgency:'急', safety:'安', value:'値', needs:'需' };
        var html = '';
        ['legal','risk','freq','urgency','safety','value','needs'].forEach(function(k) {
            var avg = Math.round(totals[k] / n * 10) / 10;
            avgTotal += avg;
            var color = avg >= 4 ? '#e74c3c' : avg >= 3 ? '#f39c12' : '#999';
            html += '<span style="display:inline-block; margin:1px 2px; padding:1px 5px; border-radius:4px; font-size:0.62rem; font-weight:700; background:#f8f8f8; border:1px solid #eee;">' + labels[k] + '<span style="color:'+color+'; margin-left:2px;">'+avg+'</span></span>';
        });
        area.innerHTML = html;
        if (avgArea) {
            avgArea.innerHTML = '<span style="font-weight:700; color:' + (avgTotal >= EVAL_THRESHOLD ? '#e74c3c' : '#999') + ';">合計 ' + Math.round(avgTotal*10)/10 + '/35</span> (' + n + '人)';
        }
        // 閾値超えの場合、重点格上げボタンを強調
        if (avgTotal >= EVAL_THRESHOLD) {
            var triageBtn = area.closest('.post-card');
            if (triageBtn) {
                var btn = triageBtn.querySelector('.btn-outline-danger');
                if (btn) { btn.className = 'btn btn-danger btn-admin fw-bold'; btn.style.flex = '1'; btn.innerHTML = '<i class="fas fa-star me-1"></i>重点へ！'; }
            }
        }
    });
}

function submitInlineEval(pid) {
    var myName = (currentAdminProfile && currentAdminProfile.name) || 'Admin';
    var scores = {};
    ['legal','risk','freq','urgency','safety','value','needs'].forEach(function(k) {
        var el = document.getElementById('eval-' + k + '-' + pid);
        scores[k] = el ? parseInt(el.value) : 3;
    });
    var commentEl = document.getElementById('eval-comment-' + pid);
    var comment = commentEl ? commentEl.value.trim() : '';

    saveMemberEvaluation({ postId: pid, memberName: myName, scores: scores, comment: comment }).then(function(res) {
        if (res && res.success) {
            // フォームを閉じて表示を更新
            var form = document.getElementById('eval-form-' + pid);
            if (form) form.style.display = 'none';
            loadInlineEvalDisplay(pid);
            alert('評価を送信しました！');
        } else {
            alert('エラー: ' + (res ? res.msg : '不明'));
        }
    });
}

/* ── Inbox comments ── */
function renderInboxCommentList(comments, pid) {
    var myName = (currentAdminProfile && currentAdminProfile.name) || 'Admin';
    return comments.map(function(c) {
        var isOwn = c.name === myName;
        var btns = isOwn ? '<span style="margin-left:auto; display:flex; gap:2px;">' +
            '<span class="inbox-comment-edit" data-cid="'+c.id+'" data-pid="'+pid+'" style="cursor:pointer; font-size:0.65rem; opacity:0.5;" title="修正">✏️</span>' +
            '<span class="inbox-comment-del" data-cid="'+c.id+'" data-pid="'+pid+'" style="cursor:pointer; font-size:0.65rem; opacity:0.5;" title="削除">🗑️</span></span>' : '';
        return '<div style="padding:4px 0; border-bottom:1px solid #f0ecff;">' +
            '<div style="display:flex; align-items:center;">' +
                '<span style="font-weight:700; color:#6c5ce7; font-size:0.72rem;">' + escapeHtml(c.name) + '</span>' +
                '<span style="color:#bbb; font-size:0.6rem; margin-left:4px;">' + c.date + '</span>' +
                btns +
            '</div>' +
            '<div style="color:#444;">' + escapeHtml(c.comment) + '</div></div>';
    }).join('');
}

function loadInboxComments(pid) {
    var area = document.getElementById('inbox-comments-' + pid);
    if (!area) return;
    getInboxComments(pid).then(function(comments) {
        if (comments && comments.length > 0) {
            area.innerHTML = renderInboxCommentList(comments, pid);
        } else {
            area.innerHTML = '<div style="color:#ccc; font-size:0.75rem;">まだコメントはありません</div>';
        }
        // コンパクトカードのバッジ更新
        var badge = document.getElementById('comment-badge-' + pid);
        if (badge && comments && comments.length > 0) badge.innerText = '💬' + comments.length;
    });
}

function submitInboxComment(pid) {
    var input = document.getElementById('inbox-comment-input-' + pid);
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;
    var myName = (currentAdminProfile && currentAdminProfile.name) || 'Admin';
    input.value = '';
    postInboxComment(pid, myName, text).then(function(res) {
        if (res && res.success && res.comments) {
            var area = document.getElementById('inbox-comments-' + pid);
            if (area) area.innerHTML = renderInboxCommentList(res.comments, pid);
        }
    });
}

// コメント修正・削除のイベントデリゲーション
document.addEventListener('click', function(e) {
    var editEl = e.target.closest('.inbox-comment-edit');
    if (editEl) {
        e.stopPropagation();
        var cid = parseInt(editEl.getAttribute('data-cid'));
        var pid = editEl.getAttribute('data-pid');
        var currentText = editEl.closest('div').nextElementSibling ? editEl.closest('div').nextElementSibling.textContent : '';
        var newText = prompt('コメントを修正:', currentText);
        if (newText !== null && newText.trim()) {
            editInboxComment(cid, newText).then(function(res) { if (res.success) loadInboxComments(pid); });
        }
        return;
    }
    var delEl = e.target.closest('.inbox-comment-del');
    if (delEl) {
        e.stopPropagation();
        if (!confirm('このコメントを削除しますか？')) return;
        var cid2 = parseInt(delEl.getAttribute('data-cid'));
        var pid2 = delEl.getAttribute('data-pid');
        deleteInboxComment(cid2).then(function(res) { if (res.success) loadInboxComments(pid2); });
        return;
    }
});

/* ── Open evaluation modal ── */
// 詳細パネルのトグル
function toggleInboxDetail(pid) {
    var panel = document.getElementById('inbox-detail-' + pid);
    var btn = document.getElementById('inbox-toggle-btn-' + pid);
    if (!panel) return;
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        if (btn) btn.innerHTML = '<i class="fas fa-chevron-up" style="font-size:0.6rem;margin-right:3px;"></i>閉じる';
        // 全データ読み込み
        loadEmpathyDisplay(pid);
        loadEmpathyTabFull(pid);
        loadAttentionTab(pid);
    } else {
        panel.style.display = 'none';
        if (btn) btn.innerHTML = '<i class="fas fa-chevron-down" style="font-size:0.6rem;margin-right:3px;"></i>開く';
    }
}

// 詳細パネル内のタブ切替
function switchInboxDetailTab(pid, tab) {
    ['content','empathy','comments','actions'].forEach(function(t) {
        var panel = document.getElementById('inbox-tab-' + t + '-' + pid);
        if (panel) panel.style.display = (t === tab) ? 'block' : 'none';
    });
    // タブボタンのスタイル更新
    var detailEl = document.getElementById('inbox-detail-' + pid);
    if (detailEl) {
        detailEl.querySelectorAll('.inbox-tab').forEach(function(btn) {
            if (btn.getAttribute('data-tab') === tab) {
                btn.style.color = '#667eea'; btn.style.borderBottomColor = '#667eea';
            } else {
                btn.style.color = '#999'; btn.style.borderBottomColor = 'transparent';
            }
        });
    }
    // 注目タブの場合はデータ読み込み
    if (tab === 'actions') loadAttentionTab(pid);
    if (tab === 'empathy') loadEmpathyTabFull(pid);
}

// 推進メンバーコメント投稿
function doPostMemberComment(pid) {
    var input = document.getElementById('member-comment-input-' + pid);
    if (!input || !input.value.trim()) return;
    var name = (currentAdminProfile && currentAdminProfile.name) || 'Admin';
    postMemberComment(pid, name, input.value.trim()).then(function(res) {
        if (res.success) { input.value = ''; renderMemberComments(pid, res.comments); }
        else alert(res.msg || 'エラー');
    });
}

// メンバーコメント表示
function renderMemberComments(pid, comments) {
    var area = document.getElementById('member-comments-' + pid);
    if (!area) return;
    if (!comments || comments.length === 0) { area.innerHTML = '<div style="color:#ccc;">まだコメントはありません</div>'; return; }
    area.innerHTML = comments.map(function(c) {
        var date = c.created_at ? new Date(c.created_at).toLocaleString('ja-JP', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '';
        return '<div style="padding:4px 0; border-bottom:1px solid #f0f0f0;"><span style="font-weight:700; color:#e65100;">' + escapeHtml(c.member_name) + '</span> <span style="color:#bbb; font-size:0.65rem;">' + date + '</span><div style="color:#444;">' + escapeHtml(c.comment) + '</div></div>';
    }).join('');
}

// メンバーチャット送信
function doPostMemberChat(pid) {
    var input = document.getElementById('member-chat-input-' + pid);
    if (!input || !input.value.trim()) return;
    var name = (currentAdminProfile && currentAdminProfile.name) || 'Admin';
    postMemberChat(pid, name, input.value.trim()).then(function(res) {
        if (res.success) { input.value = ''; renderMemberChats(pid, res.chats); }
        else alert(res.msg || 'エラー');
    });
}

// メンバーチャット表示
function renderMemberChats(pid, chats) {
    var area = document.getElementById('member-chats-' + pid);
    if (!area) return;
    if (!chats || chats.length === 0) { area.innerHTML = '<div style="color:#ccc;">まだ議論はありません</div>'; return; }
    area.innerHTML = chats.map(function(c) {
        var date = c.created_at ? new Date(c.created_at).toLocaleString('ja-JP', { hour:'2-digit', minute:'2-digit' }) : '';
        return '<div style="padding:3px 0;"><span style="font-weight:700; color:#d32f2f; font-size:0.75rem;">' + escapeHtml(c.member_name) + '</span> <span style="color:#ccc; font-size:0.6rem;">' + date + '</span><div style="color:#333; font-size:0.8rem; white-space:pre-wrap; word-break:break-word;">' + escapeHtml(c.message) + '</div></div>';
    }).join('');
    area.scrollTop = area.scrollHeight;
}

// AI自動7軸評価実行
function doAutoEvaluate(pid) {
    if (!confirm('共感データ・メンバーコメント・議論内容からAI7軸評価を実行しますか？')) return;
    var area = document.getElementById('auto-eval-' + pid);
    if (area) area.innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm"></div> AI評価中...</div>';
    runAutoEvaluate(pid).then(function(res) {
        if (res.success) { renderAutoEvaluation(pid, res); }
        else { if (area) area.innerHTML = '<div class="text-danger">エラー: ' + (res.msg || '') + '</div>'; }
    });
}

// AI評価結果表示
function renderAutoEvaluation(pid, data) {
    var area = document.getElementById('auto-eval-' + pid);
    if (!area) return;
    if (!data || !data.scores) { area.innerHTML = '<div style="color:#ccc;">未評価</div>'; return; }
    var s = data.scores;
    var labels = { legal:'法令', risk:'リスク', freq:'頻度', urgency:'緊急', safety:'安全', value:'価値', needs:'ニーズ' };
    var html = '<div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:6px;">';
    ['legal','risk','freq','urgency','safety','value','needs'].forEach(function(k) {
        var v = s[k] || 1;
        var color = v >= 4 ? '#e53935' : v >= 3 ? '#f9a825' : '#999';
        html += '<span style="background:#f5f5f5; border:1px solid #eee; border-radius:6px; padding:2px 8px; font-size:0.7rem; font-weight:700;"><span style="color:#888;">' + labels[k] + '</span> <span style="color:' + color + ';">' + v + '</span></span>';
    });
    html += '</div>';
    var total = (s.legal||1)+(s.risk||1)+(s.freq||1)+(s.urgency||1)+(s.safety||1)+(s.value||1)+(s.needs||1);
    html += '<div style="font-size:0.72rem; font-weight:700; color:' + (total >= 21 ? '#e53935' : '#666') + '; margin-bottom:4px;">合計: ' + total + '/35' + (total >= 21 ? ' ⚠️重点候補' : '') + '</div>';
    if (data.reasoning) html += '<div style="font-size:0.72rem; color:#555; margin-bottom:4px;">💡 ' + escapeHtml(data.reasoning) + '</div>';
    if (data.guideline_refs) html += '<div style="font-size:0.68rem; color:#1565c0;">📚 ' + escapeHtml(data.guideline_refs) + '</div>';
    area.innerHTML = html;
}

// 注目タブを開いた時にデータを読み込む
// 共感タブのフル読み込み（共感データ+チャット）
function loadEmpathyTabFull(pid) {
    loadEmpathyDisplay(pid);
    // 推進メンバーチャットも読み込み
    getMemberChats(pid).then(function(res) {
        var area = document.getElementById('empathy-member-chats-' + pid);
        if (!area) return;
        if (res.success && res.chats && res.chats.length > 0) {
            renderEmpathyChats(pid, res.chats);
        } else {
            area.innerHTML = '<div style="color:#ccc; font-size:0.75rem;">まだ議論はありません</div>';
        }
    });
}

function renderEmpathyChats(pid, chats) {
    var area = document.getElementById('empathy-member-chats-' + pid);
    if (!area) return;
    area.innerHTML = chats.map(function(c) {
        var date = c.created_at ? new Date(c.created_at).toLocaleString('ja-JP', { hour:'2-digit', minute:'2-digit' }) : '';
        return '<div style="padding:3px 0;"><span style="font-weight:700; color:#d32f2f; font-size:0.75rem;">' + escapeHtml(c.member_name) + '</span> <span style="color:#ccc; font-size:0.6rem;">' + date + '</span><div style="color:#333; font-size:0.8rem; white-space:pre-wrap; word-break:break-word;">' + escapeHtml(c.message) + '</div></div>';
    }).join('');
    area.scrollTop = area.scrollHeight;
}

function doPostEmpathyChat(pid) {
    var input = document.getElementById('empathy-chat-input-' + pid);
    if (!input || !input.value.trim()) return;
    var name = (currentAdminProfile && currentAdminProfile.name) || 'Admin';
    postMemberChat(pid, name, input.value.trim()).then(function(res) {
        if (res.success) { input.value = ''; renderEmpathyChats(pid, res.chats); }
        else alert(res.msg || 'エラー');
    });
}

function loadAttentionTab(pid) {
    getMemberComments(pid).then(function(res) { if (res.success) renderMemberComments(pid, res.comments); });
    getMemberChats(pid).then(function(res) { if (res.success) renderMemberChats(pid, res.chats); });
    getAutoEvaluation(pid).then(function(res) {
        if (res.success && res.evaluation) {
            renderAutoEvaluation(pid, { scores: res.evaluation, reasoning: res.evaluation.reasoning, guideline_refs: res.evaluation.guideline_refs });
        } else {
            var area = document.getElementById('auto-eval-' + pid);
            if (area) area.innerHTML = '<div style="color:#ccc;">まだ評価されていません</div>';
        }
    });
}

function openEvalModal(pid) { if(typeof openPriorityModal === 'function') openPriorityModal(pid); else alert("詳細画面を開けません。リロードしてください。"); }
function openEvalModalWithTab(pid, tab) {
    if(typeof openPriorityModal === 'function') {
        openPriorityModal(pid);
        setTimeout(function(){ if(typeof switchPrioTab === 'function') switchPrioTab(tab); }, 100);
    } else { alert("詳細画面を開けません。リロードしてください。"); }
}

/* ── Toggle triage (target) status ── */
function toggleTriage(pid, toTarget) {
    if(!confirm(toTarget ? "重点検討案件に引き上げますか？" : "通常案件に戻しますか？")) return;
    toggleTargetStatus(pid, !toTarget).then(function(res) { if(res.success) loadReportData(); else alert("エラー: " + res.msg); });
}

/* ── Empathy display ── */
function loadEmpathyDisplay(pid) {
  var summaryArea = document.getElementById('empathy-summary-' + pid);
  var countArea = document.getElementById('empathy-count-' + pid);
  var membersArea = document.getElementById('empathy-members-' + pid);
  if (!summaryArea) return;

  getEmpathyDetail(pid).then(function(res) {
    if (!res || !res.success || !res.summary) {
      summaryArea.innerHTML = '<span style="color:#ccc;">回答なし</span>';
      if (membersArea) membersArea.innerHTML = '<span style="color:#ccc;">未回答</span>';
      return;
    }
    var s = res.summary;
    // コンパクトカードのバッジ更新
    var badge = document.getElementById('empathy-badge-' + pid);
    if (badge && s.totalCount > 0) badge.innerText = '❤️' + s.totalCount;

    // Type count badges（英語キー＋日本語ラベル両対応）
    var typeMap = {
      'wakaru': { emoji:'🙋', label:'わかる、自分も' },
      'yabai': { emoji:'😰', label:'これヤバくない？' },
      'kaisha': { emoji:'💡', label:'会社が動けば変わる' },
      'ouen': { emoji:'💪', label:'応援してる！' },
      'issho': { emoji:'🤝', label:'一緒に取り組みたい' },
      'senmon': { emoji:'🏥', label:'専門家に相談すべき' },
      'kininaru': { emoji:'👀', label:'気になっていた' },
      'oishii': { emoji:'🍽️', label:'美味しそう！' },
      'sankou': { emoji:'💪', label:'参考になる！' },
      'onaji': { emoji:'😅', label:'自分もこんな感じ…' },
      'healthy': { emoji:'🌿', label:'健康的！見習いたい' },
      'kaizen': { emoji:'🍺', label:'一緒に改善したい' },
      'motto': { emoji:'📸', label:'もっと見たい' }
    };
    var html = '';
    // タイプ別バッジ
    html += '<div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px;">';
    Object.keys(s.typeCounts).forEach(function(type) {
      var info = typeMap[type] || { emoji:'❓', label:type };
      var count = s.typeCounts[type];
      html += '<span style="display:inline-flex; align-items:center; gap:3px; padding:4px 10px; border-radius:12px; font-size:0.72rem; font-weight:700; background:#f0f0ff; border:1px solid #e0e0ff;">' + info.emoji + ' ' + info.label + ' <span style="background:#667eea; color:white; border-radius:8px; padding:0 6px; font-size:0.65rem;">' + count + '</span></span>';
    });
    html += '</div>';
    // 質問マップ（サマリー用）
    var summaryQMap = {
      wakaru: ['どのくらい困ってる？','いつ頃から？','自分で対策してる？'],
      yabai: ['どのくらい深刻？','急いで対応すべき？','放っておくと誰か困る？'],
      kaisha: ['会社が対策したら参加する？','周りにも同じ悩み？','効果ありそう？'],
      ouen: ['応援の気持ちは？','自分にもできること？','声掛けしてみたい？'],
      issho: ['一緒にやりたい度？','どんな形で？','いつから始める？'],
      senmon: ['どのくらい深刻？','専門家の種類は？','会社のサポートは？'],
      kininaru: ['どのくらい気になる？','周りにもいる？','情報ほしい？'],
      oishii: ['自分の食事と比べて？','続けるのは？','情報もっと欲しい？'],
      sankou: ['真似してみたい？','食事で困ってる？','会社サポートあったら？'],
      onaji: ['食事の偏り気になる？','改善が難しい理由？','きっかけがあれば？'],
      healthy: ['自分も取り入れたい？','続けられそう？','参考にしたい？'],
      kaizen: ['一緒に改善したい度？','どんな工夫？','続けるコツは？'],
      motto: ['どのくらい見たい？','参考になった？','自分も投稿したい？']
    };
    // 回答集計（各タイプの3問の回答分布）
    if (s.answerAggregation) {
      Object.keys(s.answerAggregation).forEach(function(type) {
        var info = typeMap[type] || { emoji:'❓', label:type };
        var qs = summaryQMap[type];
        var agg = s.answerAggregation[type];
        html += '<div style="margin-bottom:8px; padding:8px; background:#fafbff; border-radius:8px; border:1px solid #eef0f5;">';
        html += '<div style="font-size:0.7rem; font-weight:700; color:#667eea; margin-bottom:4px;">' + info.emoji + ' ' + info.label + ' の回答傾向</div>';
        ['q1','q2','q3'].forEach(function(qKey, qi) {
          var answers = agg[qKey];
          if (!answers) return;
          var total = 0;
          Object.values(answers).forEach(function(v) { total += v; });
          var qLabel = qs && qs[qi] ? qs[qi] : '質問' + (qi+1);
          html += '<div style="font-size:0.68rem; color:#666; margin-bottom:3px;"><span style="color:#667eea; font-weight:600;">' + qLabel + '</span> → ';
          Object.keys(answers).forEach(function(ans, ai) {
            var cnt = answers[ans];
            var pct = total > 0 ? Math.round(cnt / total * 100) : 0;
            if (ai > 0) html += ' / ';
            html += '<span style="font-weight:700;">' + escapeHtml(ans) + '</span> <span style="color:#667eea;">' + cnt + '票(' + pct + '%)</span>';
          });
          html += '</div>';
        });
        html += '</div>';
      });
    }
    summaryArea.innerHTML = html || '<span style="color:#ccc;">共感なし</span>';
    if (countArea) countArea.innerHTML = '<span style="font-weight:700;">' + s.totalCount + '名が共感</span>';

    // 質問マップ（旧3問回答データ表示用）
    var questionMap = {
      wakaru: ['どのくらい困ってる？','いつ頃から？','自分で対策してる？'],
      yabai: ['どのくらい深刻？','急いで対応すべき？','放っておくと誰か困る？'],
      kaisha: ['会社が対策したら参加する？','周りにも同じ悩み？','効果ありそう？'],
      oishii: ['自分の食事と比べて？','続けるのは？','情報もっと欲しい？'],
      sankou: ['真似してみたい？','食事で困ってる？','会社サポートあったら？'],
      onaji: ['食事の偏り気になる？','改善が難しい理由？','きっかけがあれば？']
    };

    // 全回答一覧（メンバー以外も含む）
    if (membersArea) {
      var allResponses = (res.responses || s.memberResponses || []);
      if (allResponses.length > 0) {
        var mHtml = '';
        allResponses.forEach(function(m) {
          var info = typeMap[m.empathy_type] || { emoji:'❓', label:m.empathy_type };
          var qs = questionMap[m.empathy_type];
          var hasAnswers = m.answer1 && m.answer1 !== '-';
          mHtml += '<div style="padding:6px 0; border-bottom:1px solid #f5f5f5;">' +
            '<div style="display:flex; align-items:center; gap:6px;">' +
              '<span style="font-weight:700; color:#333; font-size:0.78rem;">' + escapeHtml(m.user_name || '匿名') + '</span>' +
              '<span style="background:#f0f0ff; border:1px solid #e0e0ff; border-radius:10px; padding:1px 8px; font-size:0.7rem; font-weight:700;">' + info.emoji + ' ' + info.label + '</span>' +
              (m.is_member ? '<span style="font-size:0.55rem; background:#667eea; color:white; padding:1px 5px; border-radius:6px;">推進</span>' : '') +
            '</div>';
          if (hasAnswers && qs) {
            mHtml += '<div style="font-size:0.7rem; color:#666; margin-top:3px; padding-left:4px;">';
            mHtml += '<div>Q1. ' + qs[0] + ' → <strong>' + escapeHtml(m.answer1) + '</strong></div>';
            mHtml += '<div>Q2. ' + qs[1] + ' → <strong>' + escapeHtml(m.answer2) + '</strong></div>';
            mHtml += '<div>Q3. ' + qs[2] + ' → <strong>' + escapeHtml(m.answer3) + '</strong></div>';
            mHtml += '</div>';
          }
          if (m.free_comment) mHtml += '<div style="font-size:0.72rem; color:#555; margin-top:3px; background:#f8f8ff; padding:4px 8px; border-radius:6px;">💬 ' + escapeHtml(m.free_comment) + '</div>';
          mHtml += '</div>';
        });
        membersArea.innerHTML = mHtml;
      } else {
        membersArea.innerHTML = '<span style="color:#ccc;">まだ回答はありません</span>';
      }
    }
  });
}

/* ── Convert empathy to 7-axis scores ── */
function convertEmpathyScore(pid) {
  if (!confirm('共感回答からAI7軸スコアを算出しますか？')) return;
  convertEmpathyToScore(pid).then(function(res) {
    if (res && res.success) {
      alert('スコア算出完了: 合計 ' + Object.values(res.scores).reduce(function(a,b){return a+b;}, 0) + '/35');
      loadInlineEvalDisplay(pid);
    } else {
      alert('エラー: ' + (res ? res.msg : '不明'));
    }
  });
}

/* ── Like / unlike a post ── */
function likePost(pid, rowId) {
    var adminUid = (currentAdminProfile && currentAdminProfile.email) ? currentAdminProfile.email : 'admin';
    var btn = document.getElementById('like-btn-' + pid);
    var countEl = document.getElementById('like-count-' + pid);
    // 即時UI更新（楽観的）
    var wasVoted = btn && btn.classList.contains('voted');
    if(btn) {
        btn.disabled = true;
        if(wasVoted) { btn.classList.remove('voted'); }
        else { btn.classList.add('voted'); }
    }
    if(countEl) {
        var currentCount = parseInt(countEl.innerText) || 0;
        countEl.innerText = wasVoted ? Math.max(0, currentCount - 1) : currentCount + 1;
    }
    // API呼び出し → サーバー値で補正
    toggleLike(rowId, adminUid).then(function(res) {
        if(btn) { btn.disabled = false; }
        if(!res || !res.success) { alert("投票エラー: " + (res ? res.msg : "応答なし")); return; }
        if(countEl) countEl.innerText = res.count;
        if(btn) {
            if(res.isLiked) { btn.classList.add('voted'); }
            else { btn.classList.remove('voted'); }
        }
    }).catch(function(err) {
        if(btn) { btn.disabled = false; }
        alert("通信エラー: " + err.message);
    });
}
