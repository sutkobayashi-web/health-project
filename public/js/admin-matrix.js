// ====================================================
//  Matrix: 重点検討マトリクス & 詳細モーダル制御
// ====================================================
var MX_COLS = { DATE:14, ROW_ID:0, CONTENT:2, ANALYSIS:3, USER_NAME:4, AVATAR:5, REPLY:6, PID:7, CAT:8, STATUS:9, UID:10, IMG:11, NURSE:12, NUTRI:13, LIKE_COUNT:6, DEMOTE_COUNT:18 };
window.mxCurrentPrioPid = null;
var MX_AVATAR_MAP = { "メディカル":"🩺","医":"🩺","ヘルス":"💉","看護":"💉","食事":"🥗","管理":"📝","課長":"📝","事務":"📝","専務":"👨‍⚖️","経営":"👨‍⚖️","佐藤":"💁‍♀️","山本":"👨‍💼","高橋":"👩‍💼","中村":"👨‍💻","伊藤":"👦","林":"👩‍🍳" };
var allPointsData = [];

function getMatrixAvatar(name, role, currentAvatar) {
    var targetStr = (String(currentAvatar) + String(name) + String(role));
    if(targetStr.includes("管理") || targetStr.includes("課長")) return "📝";
    if(targetStr.includes("メディカル") || targetStr.includes("医")) return "🩺";
    if(targetStr.includes("ヘルス")) return "💉";
    if(targetStr.includes("食事")) return "🥗";
    if(currentAvatar && currentAvatar.length <= 4 && !currentAvatar.match(/[亜-熙ぁ-んァ-ヶ]/)) return currentAvatar;
    for(var key in MX_AVATAR_MAP) { if(targetStr.includes(key)) return MX_AVATAR_MAP[key]; }
    return "🤖";
}

window.loadCurrentAnalysis = function() {
    if(window.allPostData && window.allPostData.length > 0) { fetchMatrixPoints(); }
    else {
        showLoading("データ取得中...");
        getReportData().then(function(data) {
            window.allPostData = data || [];
            fetchMatrixPoints();
        });
    }
};

function fetchMatrixPoints() {
    hideLoading(); var points = []; if(!window.allPostData) return;
    window.allPostData.forEach(function(r) {
        var analysisText = String(r[MX_COLS.ANALYSIS]||""); var isTarget = false; var scoreData = {};
        if(analysisText.includes("///SCORE///")) { try { scoreData = JSON.parse(analysisText.split("///SCORE///")[1]); if(scoreData.is_target) isTarget = true; } catch(e){} }
        if(isTarget) {
            var safeX = Math.max(0.2, Math.min(4.8, Number(scoreData.needs)||1));
            var safeY = Math.max(0.5, Math.min(14.5, (Number(scoreData.legal)||1) + (Number(scoreData.risk)||1) + (Number(scoreData.safety)||1)));
            var likesStr = String(r[MX_COLS.LIKE_COUNT]||""); var likes = likesStr ? likesStr.split(',').filter(function(x){return x;}).length : 0;
            points.push({ x:safeX, y:safeY, title:String(r[MX_COLS.CONTENT]).substring(0,15), id:String(r[MX_COLS.PID]), likeCount:likes });
        }
    });
    allPointsData = points;
    // 同一座標のドットにオフセットを追加して視覚的に区別
    var coordMap = {};
    points.forEach(function(p) {
        var key = p.x.toFixed(1) + ',' + p.y.toFixed(1);
        if(!coordMap[key]) coordMap[key] = [];
        coordMap[key].push(p);
    });
    for(var key in coordMap) {
        var group = coordMap[key];
        if(group.length > 1) {
            var angleStep = (2 * Math.PI) / group.length;
            var radius = 0.12;
            for(var i = 0; i < group.length; i++) {
                group[i].x += radius * Math.cos(angleStep * i);
                group[i].y += radius * 3 * Math.sin(angleStep * i);
            }
        }
    }
    renderCurrentView(points);
}

function renderCurrentView(points) {
    var ctxEl = document.getElementById('currentChart'); if(!ctxEl) return;
    if(window.currentChartInstance) window.currentChartInstance.destroy();
    var bgPlugin = {
        id:'customBackground',
        beforeDraw:function(chart) {
            var ctx=chart.ctx,a=chart.chartArea,x=chart.scales.x,y=chart.scales.y,midX=x.getPixelForValue(2.5),midY=y.getPixelForValue(7.5);
            ctx.save();
            ctx.fillStyle='rgba(255,99,132,0.1)'; ctx.fillRect(midX,a.top,a.right-midX,midY-a.top);
            ctx.fillStyle='rgba(54,162,235,0.1)'; ctx.fillRect(midX,midY,a.right-midX,a.bottom-midY);
            ctx.fillStyle='rgba(255,206,86,0.1)'; ctx.fillRect(a.left,a.top,midX-a.left,midY-a.top);
            ctx.fillStyle='rgba(75,192,192,0.1)'; ctx.fillRect(a.left,midY,midX-a.left,a.bottom-midY);
            ctx.beginPath(); ctx.lineWidth=1; ctx.strokeStyle='#999'; ctx.setLineDash([5,5]);
            ctx.moveTo(midX,a.top); ctx.lineTo(midX,a.bottom); ctx.moveTo(a.left,midY); ctx.lineTo(a.right,midY); ctx.stroke(); ctx.restore();
        },
        afterDraw:function(chart) {
            var ctx=chart.ctx,a=chart.chartArea; ctx.save(); ctx.font='bold 12px sans-serif';
            ctx.textAlign='right'; ctx.textBaseline='top'; ctx.fillStyle='#ff6384'; ctx.fillText('最優先 (A)',a.right-10,a.top+10);
            ctx.textAlign='right'; ctx.textBaseline='bottom'; ctx.fillStyle='#36a2eb'; ctx.fillText('意識喚起 (B)',a.right-10,a.bottom-10);
            ctx.textAlign='left'; ctx.textBaseline='top'; ctx.fillStyle='#ff9f40'; ctx.fillText('潜在層 (C)',a.left+10,a.top+10);
            ctx.textAlign='left'; ctx.textBaseline='bottom'; ctx.fillStyle='#4bc0c0'; ctx.fillText('現状維持 (D)',a.left+10,a.bottom-10);
            ctx.restore();
        }
    };
    window.currentChartInstance = new Chart(ctxEl.getContext('2d'), {
        type:'scatter', data:{ datasets:[{ label:'案件', data:points, backgroundColor:'rgba(13,110,253,0.9)', borderColor:'#fff', borderWidth:1, pointRadius:7, pointHoverRadius:9 }] },
        plugins:[bgPlugin],
        options:{ responsive:true, maintainAspectRatio:false, layout:{padding:20},
            scales:{ x:{min:0,max:5,title:{display:true,text:'ニーズ',font:{weight:'bold'}}}, y:{min:0,max:15,title:{display:true,text:'リスク',font:{weight:'bold'}}} },
            onClick:function(e,activeEls) {
                if(activeEls.length === 0) return;
                var chart = window.currentChartInstance;
                var clickX = chart.scales.x.getValueForPixel(e.x);
                var clickY = chart.scales.y.getValueForPixel(e.y);
                var nearby = [];
                points.forEach(function(p) {
                    var dx = Math.abs(p.x - clickX);
                    var dy = Math.abs(p.y - clickY) / 3;
                    if(Math.sqrt(dx*dx + dy*dy) < 0.5) nearby.push(p);
                });
                if(nearby.length === 0) return;
                if(nearby.length === 1) { openPriorityModal(nearby[0].id); return; }
                showOverlapSelector(nearby, e.native);
            },
            plugins:{ legend:{display:false}, datalabels:{display:true,align:'top',offset:4,formatter:function(v){ return v.title+(v.likeCount>0?"(+"+v.likeCount+")":""); },font:{size:10,weight:'bold'},color:'#333',backgroundColor:'rgba(255,255,255,0.8)',borderRadius:4,padding:2}, tooltip:{callbacks:{label:function(c){return c.raw.title;}}} }
        }
    });
}

// 重なったドットの選択ポップアップ
window.showOverlapSelector = function(items, mouseEvent) {
    var old = document.getElementById('overlap-popup');
    if(old) old.remove();

    var popup = document.createElement('div');
    popup.id = 'overlap-popup';
    popup.style.cssText = 'position:fixed; z-index:5000; background:white; border-radius:12px; box-shadow:0 8px 30px rgba(0,0,0,0.2); padding:10px 0; min-width:250px; max-width:350px; max-height:300px; overflow-y:auto; border:1px solid #ddd;';

    var px = mouseEvent.clientX;
    var py = mouseEvent.clientY;
    if(px + 360 > window.innerWidth) px = window.innerWidth - 370;
    if(py + 310 > window.innerHeight) py = window.innerHeight - 320;
    popup.style.left = px + 'px';
    popup.style.top = py + 'px';

    var html = '<div style="padding:6px 15px; font-weight:bold; font-size:0.8rem; color:#888; border-bottom:1px solid #eee;">📌 ' + items.length + '件の案件が重なっています</div>';
    items.forEach(function(p) {
        html += '<div onclick="document.getElementById(\'overlap-popup\').remove(); openPriorityModal(\'' + p.id + '\')" '
            + 'style="padding:10px 15px; cursor:pointer; border-bottom:1px solid #f5f5f5; transition:background 0.15s; font-size:0.9rem;" '
            + 'onmouseover="this.style.background=\'#f0f7ff\'" onmouseout="this.style.background=\'white\'">'
            + '<div style="font-weight:bold; color:#333;">' + escapeHtml(p.title) + '</div>'
            + '<div style="font-size:0.75rem; color:#888; margin-top:2px;">ニーズ: ' + p.x.toFixed(1) + ' | リスク: ' + p.y.toFixed(1)
            + (p.likeCount > 0 ? ' | <span style="color:#ff6b6b;">❤ ' + p.likeCount + '</span>' : '')
            + '</div></div>';
    });
    popup.innerHTML = html;
    document.body.appendChild(popup);

    setTimeout(function() {
        document.addEventListener('click', function closePopup(ev) {
            if(!popup.contains(ev.target)) { popup.remove(); document.removeEventListener('click', closePopup); }
        });
    }, 100);
};

window.openPriorityModal = function(pid) {
    window.mxCurrentPrioPid = pid;
    var r = null;
    if(window.allPostData) { r = window.allPostData.find(function(x){ return String(x[MX_COLS.PID]) === String(pid); }); }
    if(!r) { alert("データ参照エラー: " + pid); return; }
    var content = String(r[MX_COLS.CONTENT]||""); var analysis = String(r[MX_COLS.ANALYSIS]||"");
    if(content.includes("///SCORE///")) content = content.split("///SCORE///")[0];
    if(analysis.includes("///SCORE///")) analysis = analysis.split("///SCORE///")[0];
    var avatar = getMatrixAvatar(r[MX_COLS.USER_NAME], "", r[MX_COLS.AVATAR]);
    document.getElementById('prio-title').innerText = content;
    document.getElementById('prio-subtitle').innerText = avatar + ' ' + r[MX_COLS.USER_NAME] + ' | ' + r[MX_COLS.DATE];
    document.getElementById('prio-avatar').innerText = avatar;
    document.getElementById('prio-user').innerText = r[MX_COLS.USER_NAME];
    document.getElementById('prio-date').innerText = r[MX_COLS.DATE];
    document.getElementById('prio-content').innerText = content;
    var likeStr = String(r[MX_COLS.LIKE_COUNT]||""); var likeNum = likeStr ? likeStr.split(',').filter(function(x){return x;}).length : 0;
    var voteCountEl = document.getElementById('prio-vote-count');
    if(voteCountEl) voteCountEl.innerText = likeNum;
    document.getElementById('prio-analysis').innerText = analysis;

    // 画像表示
    var imgArea = document.getElementById('prio-image-area');
    var imgEl = document.getElementById('prio-image');
    var imgUrl = r[MX_COLS.IMG] || '';
    if (imgUrl && String(imgUrl).startsWith('http')) {
        imgEl.src = imgUrl;
        imgArea.style.display = 'block';
    } else {
        imgArea.style.display = 'none';
    }

    // Reset eval sliders for fresh load
    var sliderArea = document.getElementById('prio-eval-sliders');
    if(sliderArea) sliderArea.innerHTML = '';

    // 類似の声を自動検索
    var similarArea = document.getElementById('similar-posts-area');
    if(similarArea) similarArea.innerHTML = '<div style="color:#aaa; font-size:0.8rem;">検索中...</div>';
    findSimilarPosts();
    // AIチャットは初期非表示、ボタンで開く
    var chatWrapper = document.getElementById('chat-wrapper');
    if(chatWrapper) chatWrapper.style.display = 'none';
    var startBtn = document.getElementById('btn-open-chat');
    if(startBtn) startBtn.style.display = 'inline-block';
    var tl = document.getElementById('deep-dive-timeline');
    tl.innerHTML = '';
    // 過去ログチェック
    getDiscussionLog(pid).then(function(logs) {
        // チャット既読マーク
        if(typeof markChatAsRead === 'function') markChatAsRead(pid);
        if(logs && logs.length > 0) {
            logs.forEach(function(h) { var isMe=(h.role!=='AI_Council' && h.member==="Admin"); var safeAvatar=getMatrixAvatar(h.member,h.role,h.avatar); addChatBubble(tl,h.member,h.comment,safeAvatar,(h.role==='AI_Council'?'ai':'human'),isMe,h.row); });
            // 過去ログがある場合はチャット欄を自動表示
            if(chatWrapper) chatWrapper.style.display = 'flex';
            if(startBtn) startBtn.style.display = 'none';
            setTimeout(function(){ tl.scrollTop=tl.scrollHeight; }, 100);
        }
    });

    // Inboxの場合は7軸評価タブを非表示
    var status = String(r[MX_COLS.STATUS]||"").toLowerCase();
    var evalTab = document.querySelector('.prio-tab[onclick*="eval"]');
    if(evalTab) evalTab.style.display = (status === 'open') ? 'none' : '';

    // Always start on content tab
    switchPrioTab('content');

    document.getElementById('priority-modal').style.display = 'flex';

    // フッターに賛同進捗を表示
    updatePrioVoteProgress();
};

window.findSimilarPosts = function() {
    var pid = window.mxCurrentPrioPid;
    if(!pid) return;
    var r = null;
    if(window.allPostData) {
        r = window.allPostData.find(function(x){ return String(x[MX_COLS.PID]) === String(pid); });
    }
    if(!r) return;
    var content = String(r[MX_COLS.CONTENT]||"");
    if(content.includes("///SCORE///")) content = content.split("///SCORE///")[0];

    var area = document.getElementById('similar-posts-area');
    if(!area) return;
    area.innerHTML = '<div class="text-center text-muted small py-2"><i class="fas fa-spinner fa-spin me-1"></i> 類似投稿を検索中...</div>';

    getSimilarPosts(pid, content).then(function(res) {
        if(!res || !res.posts || res.posts.length === 0) {
            area.innerHTML = '<div class="text-muted small py-2">類似の投稿は見つかりませんでした</div>';
            return;
        }
        var posts = res.posts;
        var html = '<div class="small fw-bold text-primary mb-2">同じ悩みが他に' + posts.length + '件あります</div>';
        html += '<div class="list-group list-group-flush">';
        posts.forEach(function(p) {
            var preview = String(p.content||"").substring(0, 60);
            if(String(p.content||"").length > 60) preview += "...";
            html += '<div class="list-group-item px-0 py-2 border-0" style="font-size:0.85rem;">'
                + '<div class="d-flex justify-content-between align-items-center">'
                + '<span class="fw-bold">' + escapeHtml(String(p.nickname||"")) + '</span>'
                + '<span class="text-muted" style="font-size:0.75rem;">' + escapeHtml(String(p.date||"")) + '</span>'
                + '</div>'
                + '<div class="text-muted mt-1">' + escapeHtml(preview) + '</div>'
                + '</div>';
        });
        html += '</div>';
        area.innerHTML = html;
    }).catch(function() {
        area.innerHTML = '<div class="text-muted small py-2">類似の投稿は見つかりませんでした</div>';
    });
};

// タブ切り替え
window.switchPrioTab = function(tab) {
    document.querySelectorAll('.prio-tab').forEach(function(t){ t.classList.remove('active'); });
    document.querySelectorAll('.prio-panel').forEach(function(p){ p.classList.remove('active'); p.style.display='none'; });
    // Activate clicked tab
    var tabs = document.querySelectorAll('.prio-tab');
    var tabNames = ['content','eval','discuss'];
    var idx = tabNames.indexOf(tab);
    if(idx >= 0 && tabs[idx]) tabs[idx].classList.add('active');
    var panel = document.getElementById('prio-panel-' + tab);
    if(panel) { panel.classList.add('active'); panel.style.display = (tab === 'discuss') ? 'flex' : 'block'; }
    // Load data for specific tabs
    if(tab === 'eval') loadPrioEvalTab();
    if(tab === 'discuss') { /* chat already loaded on modal open */ }
};

function loadPrioEvalTab() {
    var pid = window.mxCurrentPrioPid;
    if(!pid) return;
    // Build sliders
    var sliderArea = document.getElementById('prio-eval-sliders');
    if(sliderArea && !sliderArea.hasChildNodes()) {
        var axes = [
            {key:'legal', label:'法令', desc:'法的義務への該当度'},
            {key:'risk', label:'リスク', desc:'放置時の健康リスク'},
            {key:'freq', label:'頻度', desc:'組織内での普遍性'},
            {key:'urgency', label:'緊急', desc:'即座の対応必要度'},
            {key:'safety', label:'安全', desc:'身体・精神への影響'},
            {key:'value', label:'価値', desc:'施策の投資対効果'},
            {key:'needs', label:'ニーズ', desc:'行動変容への寄与'}
        ];
        sliderArea.innerHTML = axes.map(function(a) {
            return '<div style="display:flex; align-items:center; gap:8px; margin-bottom:10px; padding:8px 12px; background:#f8f9fa; border-radius:8px;">' +
                '<div style="width:60px;"><div style="font-weight:700; font-size:0.85rem;">'+a.label+'</div><div style="font-size:0.6rem; color:#999;">'+a.desc+'</div></div>' +
                '<input type="range" min="1" max="5" value="3" id="prio-eval-'+a.key+'" style="flex:1;" oninput="this.nextElementSibling.innerText=this.value">' +
                '<span style="font-size:1rem; font-weight:800; width:20px; text-align:center; color:#667eea;">3</span>' +
            '</div>';
        }).join('');
    }
    // Load existing evaluations
    var listArea = document.getElementById('prio-eval-list');
    if(listArea) {
        listArea.innerHTML = '<div style="color:#aaa; font-size:0.8rem;">読み込み中...</div>';
        var myName = (currentAdminProfile && currentAdminProfile.name) || 'Admin';
        getPostEvaluations(pid).then(function(evals) {
            if(evals && evals.length > 0) {
                listArea.innerHTML = evals.map(function(ev) {
                    var total = ev.scores.legal + ev.scores.risk + ev.scores.freq + ev.scores.urgency + ev.scores.safety + ev.scores.value + ev.scores.needs;
                    var isOwn = ev.memberName === myName;
                    var deleteBtn = isOwn ? '<span style="cursor:pointer; font-size:0.65rem; opacity:0.5; margin-left:auto;" onclick="cancelEvaluation('+ev.id+')" title="取消"><i class="fas fa-trash-alt"></i> 取消</span>' : '';
                    return '<div style="padding:8px 12px; background:' + (isOwn ? '#f0f0ff' : 'white') + '; border-radius:8px; border:1px solid ' + (isOwn ? '#d0c8ff' : '#eee') + '; margin-bottom:6px;">' +
                        '<div style="display:flex; align-items:center;"><span style="font-weight:700; font-size:0.82rem;">' + (isOwn ? '⭐ ' : '') + escapeHtml(ev.memberName)+'</span><span style="font-size:0.7rem; color:#999; margin-left:8px;">'+ev.date+'</span>' + deleteBtn + '</div>' +
                        '<div style="font-size:0.72rem; color:#555; margin-top:2px;">法'+ev.scores.legal+' 危'+ev.scores.risk+' 頻'+ev.scores.freq+' 急'+ev.scores.urgency+' 安'+ev.scores.safety+' 値'+ev.scores.value+' 需'+ev.scores.needs+' <span style="font-weight:700; color:#667eea;">= '+total+'/35</span></div>' +
                        (ev.comment ? '<div style="font-size:0.75rem; color:#666; margin-top:2px; font-style:italic;">"'+escapeHtml(ev.comment)+'"</div>' : '') +
                    '</div>';
                }).join('');
            } else {
                listArea.innerHTML = '<div style="color:#aaa; font-size:0.8rem;">まだ評価がありません</div>';
            }
        });
    }
}

function updatePrioVoteProgress(overrideLikeCount) {
    var pid = window.mxCurrentPrioPid;
    if(!pid) return;
    var progressEl = document.getElementById('prio-vote-progress');
    if(!progressEl) return;

    var r = null;
    if(window.allPostData) { r = window.allPostData.find(function(x){ return String(x[MX_COLS.PID]) === String(pid); }); }
    var likeStr = r ? String(r[MX_COLS.LIKE_COUNT]||"") : "";
    var likeCount = typeof overrideLikeCount === 'number' ? overrideLikeCount : (likeStr ? likeStr.split(',').filter(function(x){return x;}).length : 0);

    getCoreMemberCount().then(function(res) {
        var memberCount = (res && res.count) ? res.count : 1;
        var threshold = Math.ceil(memberCount / 2);
        var canPromote = likeCount >= threshold;

        if(canPromote) {
            progressEl.innerHTML = '<span style="display:inline-flex; align-items:center; gap:6px; padding:4px 14px; background:#e8f5e9; border:1px solid #81c784; border-radius:8px; color:#2e7d32;"><i class="fas fa-check-circle"></i> <strong>' + likeCount + '/' + threshold + '票</strong> 昇格条件達成！過半数の賛同を得ました</span>';
        } else {
            progressEl.innerHTML = '<span style="display:inline-flex; align-items:center; gap:6px; padding:4px 14px; background:#fff3e0; border:1px solid #ffcc80; border-radius:8px; color:#e65100;"><i class="fas fa-hand-paper"></i> <strong>' + likeCount + '/' + threshold + '票</strong> あと' + (threshold - likeCount) + '票の賛同で企画書に自動昇格</span>';
        }
    });
}

// loadPromoteTab は削除（自動昇格のため不要）
function loadPromoteTab() {
    var pid = window.mxCurrentPrioPid;
    if(!pid) return;
    var statusEl = document.getElementById('promote-status');
    var btn = document.getElementById('promote-btn');
    var noteEl = document.getElementById('promote-note');
    if(!statusEl || !btn) return;

    // 賛同数を取得
    var r = null;
    if(window.allPostData) { r = window.allPostData.find(function(x){ return String(x[MX_COLS.PID]) === String(pid); }); }
    var likeStr = r ? String(r[MX_COLS.LIKE_COUNT]||"") : "";
    var likes = likeStr ? likeStr.split(',').filter(function(x){return x;}) : [];
    var likeCount = likes.length;

    // 推進メンバー数を取得
    getCoreMemberCount().then(function(res) {
        var memberCount = (res && res.count) ? res.count : 1;
        var threshold = Math.ceil(memberCount / 2);
        var canPromote = likeCount >= threshold;

        statusEl.innerHTML =
            '<div style="display:inline-flex; align-items:center; gap:12px; padding:12px 24px; background:' + (canPromote ? '#e8f5e9' : '#fff3e0') + '; border-radius:12px; border:2px solid ' + (canPromote ? '#4caf50' : '#ff9800') + ';">' +
                '<div style="font-size:2rem;">' + (canPromote ? '✅' : '⏳') + '</div>' +
                '<div style="text-align:left;">' +
                    '<div style="font-weight:700; font-size:0.9rem; color:' + (canPromote ? '#2e7d32' : '#e65100') + ';">' + (canPromote ? '昇格条件を満たしています' : '賛同が不足しています') + '</div>' +
                    '<div style="font-size:0.82rem; color:#666;">賛同: <strong>' + likeCount + '/' + threshold + '票</strong>（推進メンバー' + memberCount + '名の過半数）</div>' +
                '</div>' +
            '</div>';

        if(canPromote) {
            btn.disabled = false;
            btn.style.opacity = '1';
            noteEl.innerText = '';
        } else {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            noteEl.innerText = 'あと' + (threshold - likeCount) + '票の賛同が必要です。下部の「賛同」ボタンから投票できます。';
        }
    });
}

window.cancelEvaluation = function(evalId) {
    if(!confirm('この評価を取り消しますか？')) return;
    deleteEvaluation(evalId).then(function(res) {
        if(res && res.success) {
            alert(res.msg);
            loadPrioEvalTab();
        } else {
            alert('エラー: ' + (res ? res.msg : '不明'));
        }
    });
};

window.submitPrioEval = function() {
    var pid = window.mxCurrentPrioPid;
    if(!pid) return;
    var myName = (currentAdminProfile && currentAdminProfile.name) || 'Admin';
    var scores = {};
    ['legal','risk','freq','urgency','safety','value','needs'].forEach(function(k) {
        var el = document.getElementById('prio-eval-' + k);
        scores[k] = el ? parseInt(el.value) : 3;
    });
    var comment = (document.getElementById('prio-eval-comment') || {}).value || '';
    saveMemberEvaluation({ postId: pid, memberName: myName, scores: scores, comment: comment.trim() }).then(function(res) {
        if(res && res.success) {
            alert(res.msg);
            loadPrioEvalTab();
            if(document.getElementById('prio-eval-comment')) document.getElementById('prio-eval-comment').value = '';
        } else {
            alert('エラー: ' + (res ? res.msg : '不明'));
        }
    });
};

// チャット欄を開く＋AI招集
window.openChatAndStartAI = function() {
    var chatWrapper = document.getElementById('chat-wrapper');
    if(chatWrapper) chatWrapper.style.display = 'flex';
    var startBtn = document.getElementById('btn-open-chat');
    if(startBtn) startBtn.style.display = 'none';
    var tl = document.getElementById('deep-dive-timeline');
    if(!tl.innerHTML || tl.innerHTML.trim() === '') {
        forceStartAISimulation();
    }
};

window.forceStartAISimulation = function() {
    var r = window.allPostData.find(function(x){ return String(x[MX_COLS.PID]) === String(window.mxCurrentPrioPid); });
    if(!r) return;
    var content = String(r[MX_COLS.CONTENT]); if(content.includes("///SCORE///")) content = content.split("///SCORE///")[0];
    var tl = document.getElementById('deep-dive-timeline');
    var loadingId = "ai-init-" + Date.now();
    tl.insertAdjacentHTML('beforeend', '<div id="'+loadingId+'" class="text-center text-muted small my-3"><i class="fas fa-spinner fa-spin me-1"></i> AIメンバー入室中...</div>');
    var pseudoPlan = { title:"【主訴】", draft:"対象者の主訴: " + content };
    simulatePlanningMeeting(window.mxCurrentPrioPid, pseudoPlan).then(function(aiRes) {
        var loader = document.getElementById(loadingId); if(loader) loader.remove();
        if(aiRes.success) {
            aiRes.discussion.forEach(function(d){ var safeAvatar=getMatrixAvatar(d.role,"",d.avatar); addChatBubble(tl,d.role,d.message,safeAvatar,'ai'); });
            tl.insertAdjacentHTML('beforeend', '<div class="text-center text-muted small my-3">- 議論に参加できます -</div>');
            tl.scrollTop = tl.scrollHeight;
        }
    });
};

function addChatBubble(container, name, text, avatar, type, isMe, rowId) {
    if(typeof isMe === 'undefined') isMe = false;
    var div = document.createElement('div'); div.className = 'council-member-row ' + type;
    var deleteBtn = "";
    if(isMe && rowId) deleteBtn = '<span style="cursor:pointer; font-size:0.7rem; opacity:0.5; margin-left:6px;" onclick="deleteMyComment('+rowId+', \''+name+'\', this)"><i class="fas fa-trash-alt"></i></span>';
    var safeText = escapeHtml(text);
    var now = new Date();
    var timeStr = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    div.innerHTML = '<div class="council-avatar">'+avatar+'</div><div class="council-content"><div class="council-role">'+escapeHtml(name)+'</div><div class="council-bubble">'+safeText+deleteBtn+'<span class="chat-time">'+timeStr+'</span></div></div>';
    container.appendChild(div);
}

window.postPrioComment = function() {
    var input = document.getElementById('prio-comment-input'); var text = input.value.trim(); if(!text) return;
    var myName = (currentAdminProfile && currentAdminProfile.name) || "Admin";
    var myAvatar = (currentAdminProfile && currentAdminProfile.avatar) || "🛡️";
    var tl = document.getElementById('deep-dive-timeline');
    addChatBubble(tl, myName, text, myAvatar, 'human', true);
    tl.scrollTop = tl.scrollHeight; input.value = "";
    postAdminComment(window.mxCurrentPrioPid, myName, text, 'Admin', myAvatar);
    var loadingId = "ai-typing-" + Date.now();
    tl.insertAdjacentHTML('beforeend', '<div id="'+loadingId+'" class="text-muted small ms-2 mt-2"><i class="fas fa-pen-nib fa-spin me-1"></i> 誰かが入力しています...</div>');
    tl.scrollTop = tl.scrollHeight;
    var currentTitle = document.getElementById('prio-title').innerText;
    generateAIReplyToHuman(window.mxCurrentPrioPid, currentTitle, text).then(function(res) {
        var loader = document.getElementById(loadingId); if(loader) loader.remove();
        if(res.success && res.replies) { res.replies.forEach(function(d){ setTimeout(function(){ var safeAvatar=getMatrixAvatar(d.role,"",d.avatar); addChatBubble(tl,d.role,d.message,safeAvatar,'ai'); tl.scrollTop=tl.scrollHeight; },500); }); }
    });
};

window.deleteMyComment = function(rowId, name, btnEl) {
    if(!confirm("削除しますか？")) return;
    var bubbleRow = btnEl.closest('.council-member-row'); bubbleRow.style.opacity = '0.5';
    deleteDiscussionLog(window.mxCurrentPrioPid, rowId, name).then(function(res) {
        if(res.success) bubbleRow.remove(); else { alert("削除失敗"); bubbleRow.style.opacity='1'; }
    });
};

window.handlePriorityAction = function(action) {
    if(!window.mxCurrentPrioPid) { alert("案件が選択されていません"); return; }
    var myName = (currentAdminProfile && currentAdminProfile.name) || "Admin";
    var label = (action === 'like') ? '賛同' : '戻す';
    if(!confirm(label + "しますか？")) return;
    votePriorityPost(window.mxCurrentPrioPid, myName, action).then(function(res) {
        if(res && res.success) {
            alert(res.msg);
            var voteEl = document.getElementById('prio-vote-count');
            if(voteEl) voteEl.innerText = res.likeCount || 0;
            // 進捗バッジを更新
            updatePrioVoteProgress(res.likeCount);
            if(res.transitioned) {
                document.getElementById('priority-modal').style.display = 'none';
                loadCurrentAnalysis();
            }
        } else {
            alert("エラー: " + (res ? res.msg : "応答なし"));
        }
    }).catch(function(err) {
        alert("通信エラー: " + err.message);
    });
};

// 重点検討 → 企画書に昇格
window.promoteToProposal = function() {
    if(!window.mxCurrentPrioPid) { alert("案件が選択されていません"); return; }
    var pid = window.mxCurrentPrioPid;
    var r = null;
    if(window.allPostData) { r = window.allPostData.find(function(x){ return String(x[MX_COLS.PID]) === String(pid); }); }
    if(!r) { alert("データ参照エラー"); return; }

    var content = String(r[MX_COLS.CONTENT]||"");
    if(content.includes("///SCORE///")) content = content.split("///SCORE///")[0];
    var analysis = String(r[MX_COLS.ANALYSIS]||"");
    if(analysis.includes("///SCORE///")) analysis = analysis.split("///SCORE///")[0];

    // スコアを取得
    var scoreData = {};
    var rawAnalysis = String(r[MX_COLS.ANALYSIS]||"");
    if(rawAnalysis.includes("///SCORE///")) {
        try { scoreData = JSON.parse(rawAnalysis.split("///SCORE///")[1]); } catch(e) {}
    }
    var scores = {
        legal: Number(scoreData.legal) || 3,
        risk: Number(scoreData.risk) || 3,
        freq: Number(scoreData.freq) || 3,
        urgency: Number(scoreData.urgency) || 3,
        safety: Number(scoreData.safety) || 3,
        value: Number(scoreData.value) || 3,
        needs: Number(scoreData.needs) || 3
    };

    // 議論ログを取得して背景に含める
    var tl = document.getElementById('deep-dive-timeline');
    var discussionSummary = '';
    if(tl) {
        var bubbles = tl.querySelectorAll('.council-bubble');
        var msgs = [];
        bubbles.forEach(function(b) { msgs.push(b.textContent.trim().substring(0, 100)); });
        if(msgs.length > 0) discussionSummary = '\n\n【推進メンバーの議論】\n' + msgs.join('\n');
    }

    var planTitle = content.substring(0, 30);
    var background = '【社員の声】\n' + content + '\n\n【AI初期分析】\n' + analysis + discussionSummary;

    if(!confirm('この案件を企画書に昇格させますか？\n\n「' + planTitle + '」\n\nAIが議論内容を踏まえた企画書を自動生成します。')) return;

    showLoading("企画書を生成中...");
    createThemeProposal({
        planTitle: planTitle,
        theme: content.substring(0, 50),
        background: background,
        scores: scores,
        postIds: [pid]
    }).then(function(res) {
        hideLoading();
        if(res && res.success) {
            alert("企画書を生成しました！\n企画書タブで確認できます。");
            document.getElementById('priority-modal').style.display = 'none';
            switchTab('candidates');
        } else {
            alert("エラー: " + (res ? res.msg : "不明"));
        }
    }).catch(function(err) {
        hideLoading();
        alert("通信エラー: " + err.message);
    });
};
