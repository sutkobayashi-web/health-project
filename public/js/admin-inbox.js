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
            '<div class="post-header-bar '+headerClass+'"><span><i class="'+icon+'"></i> '+catName+'</span><span>'+dateStr+'</span></div>' +
            '<div style="display:flex; min-height:80px;">' +
                // 左: 投稿内容
                '<div style="flex:1; padding:12px 14px; border-right:1px solid #f0f0f0;">' +
                    '<div class="user-info" style="margin-bottom:6px;"><div class="avatar">'+avatar+'</div><div class="nick">'+escapeHtml(r[INBOX_COLS.USER_NAME])+'</div>'+(likeCount > 0 ? '<span style="margin-left:auto; background:linear-gradient(135deg,#667eea,#764ba2); color:white; font-size:0.65rem; font-weight:700; padding:2px 8px; border-radius:10px; display:inline-flex; align-items:center; gap:3px;"><i class="fas fa-hand-paper"></i> '+likeCount+'票</span>' : '')+'</div>' +
                    (thumbTag ? '<div style="margin-bottom:8px;">'+thumbTag+'</div>' : '') +
                    '<div style="font-size:0.88rem;line-height:1.6;color:#444;white-space:pre-wrap;">'+escapeHtml(rawContent)+'</div>' +
                '</div>' +
                // 右: 評価 + コメント + ボタン
                '<div style="width:280px; flex-shrink:0; background:#faf8ff; padding:10px 12px; display:flex; flex-direction:column; gap:6px;">' +
                    // 7軸評価結果（表示のみ）
                    '<div style="background:white; border-radius:8px; padding:8px 10px; border:1px solid #e8e0ff;">' +
                        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">' +
                            '<span style="font-size:0.68rem; font-weight:700; color:#e74c3c;"><i class="fas fa-chart-bar me-1"></i>7軸評価</span>' +
                            '<span id="eval-avg-'+pid+'" style="font-size:0.65rem; color:#999;"></span>' +
                        '</div>' +
                        '<div id="eval-display-'+pid+'" style="font-size:0.72rem; min-height:20px;"></div>' +
                    '</div>' +
                    // コメント欄
                    '<div style="flex:1; min-height:0;">' +
                        '<div style="font-size:0.68rem; font-weight:700; color:#6c5ce7; margin-bottom:2px;"><i class="fas fa-comments me-1"></i>コメント</div>' +
                        '<div id="inbox-comments-'+pid+'" style="overflow-y:auto; max-height:60px; font-size:0.78rem; color:#555;"></div>' +
                        '<div style="display:flex; gap:4px; margin-top:4px;">' +
                            '<input type="text" id="inbox-comment-input-'+pid+'" placeholder="一言..." style="flex:1; border:1px solid #ddd; border-radius:8px; padding:4px 8px; font-size:0.72rem; outline:none;">' +
                            '<button class="btn btn-sm btn-outline-primary" style="font-size:0.65rem; padding:3px 8px;" onclick="submitInboxComment(\''+pid+'\')"><i class="fas fa-paper-plane"></i></button>' +
                        '</div>' +
                    '</div>' +
                    // ボタン
                    '<div style="display:flex; gap:4px; flex-shrink:0;">' +
                        '<button class="btn btn-outline-secondary btn-admin" style="flex:1; font-size:0.68rem;" onclick="openEvalModal(\''+pid+'\')"><i class="fas fa-search me-1"></i>詳細</button>' +
                        '<button class="btn btn-outline-danger btn-admin" style="flex:1; font-size:0.68rem;" onclick="openEvalModalWithTab(\''+pid+'\',\'eval\')"><i class="fas fa-chart-bar me-1"></i>7軸評価</button>' +
                        (!isTarget ? '<button class="btn btn-outline-warning btn-admin" style="flex:1; font-size:0.68rem;" onclick="toggleTriage(\''+pid+'\', true)"><i class="fas fa-star me-1"></i>重点へ</button>' : '<button class="btn btn-outline-success btn-admin" style="flex:1; font-size:0.68rem;" onclick="toggleTriage(\''+pid+'\', false)"><i class="fas fa-undo me-1"></i>解除</button>') +
                    '</div>' +
                '</div>' +
            '</div>';
        list.appendChild(div);
        // コメント読み込み
        loadInboxComments(pid);
        // 評価データ読み込み
        loadInlineEvalDisplay(pid);
    });
    var countEl = document.getElementById('report-count'); if(countEl) countEl.innerText = visibleCount + " 件";
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
