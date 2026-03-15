// ====================================================
//  Matrix: 重点検討マトリクス & 詳細モーダル制御
// ====================================================
var MX_COLS = { DATE:0, ROW_ID:1, CONTENT:2, ANALYSIS:3, USER_NAME:4, AVATAR:5, REPLY:6, PID:7, AGE:10, JOB:11, IMG:12, LIKE_COUNT:13, DEMOTE_COUNT:14 };
window.mxCurrentPrioPid = null;
var MX_AVATAR_MAP = { "産業医":"🩺","医":"🩺","保健師":"💉","看護":"💉","栄養士":"🥗","管理":"📝","課長":"📝","事務":"📝","専務":"👨‍⚖️","経営":"👨‍⚖️","佐藤":"💁‍♀️","山本":"👨‍💼","高橋":"👩‍💼","中村":"👨‍💻","伊藤":"👦","林":"👩‍🍳" };
var allPointsData = [];

function getMatrixAvatar(name, role, currentAvatar) {
    var targetStr = (String(currentAvatar) + String(name) + String(role));
    if(targetStr.includes("管理") || targetStr.includes("課長")) return "📝";
    if(targetStr.includes("産業医") || targetStr.includes("医")) return "🩺";
    if(targetStr.includes("保健師")) return "💉";
    if(targetStr.includes("栄養士")) return "🥗";
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
    document.getElementById('prio-title').innerText = "案件: " + content.substring(0,15) + "...";
    document.getElementById('prio-avatar').innerText = avatar;
    document.getElementById('prio-user').innerText = r[MX_COLS.USER_NAME];
    document.getElementById('prio-date').innerText = r[MX_COLS.DATE];
    document.getElementById('prio-content').innerText = content;
    var likeStr = String(r[MX_COLS.LIKE_COUNT]||""); var likeNum = likeStr ? likeStr.split(',').filter(function(x){return x;}).length : 0;
    document.getElementById('prio-like-count').innerHTML = '<i class="fas fa-thumbs-up me-1"></i> ' + likeNum;
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

    // メンバー評価を読み込み
    var evalArea = document.getElementById('prio-evaluations');
    if (evalArea) {
        evalArea.innerHTML = '<div style="color:#aaa; font-size:0.8rem;">読み込み中...</div>';
        getPostEvaluations(pid).then(function(evals) {
            if (evals && evals.length > 0) {
                evalArea.innerHTML = evals.map(function(ev) {
                    var axes = ['法令:'+ev.scores.legal, 'リスク:'+ev.scores.risk, '頻度:'+ev.scores.freq, '緊急:'+ev.scores.urgency, '安全:'+ev.scores.safety, '価値:'+ev.scores.value, 'ニーズ:'+ev.scores.needs];
                    return '<div style="margin-bottom:8px; padding:8px; background:white; border-radius:8px; border:1px solid #e0f0e8;">' +
                        '<div style="font-weight:700; font-size:0.8rem; color:#333;">' + escapeHtml(ev.memberName) + ' <span style="font-size:0.65rem; color:#999;">' + ev.date + '</span></div>' +
                        '<div style="font-size:0.7rem; color:#666; margin-top:2px;">' + axes.join(' / ') + '</div>' +
                        (ev.comment ? '<div style="font-size:0.78rem; color:#555; margin-top:4px; font-style:italic;">"' + escapeHtml(ev.comment) + '"</div>' : '') +
                    '</div>';
                }).join('');
            } else {
                evalArea.innerHTML = '<div style="color:#aaa; font-size:0.8rem;">まだ評価がありません</div>';
            }
        });
    }

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
        if(logs && logs.length > 0) {
            logs.forEach(function(h) { var isMe=(h.role!=='AI_Council' && h.member==="Admin"); var safeAvatar=getMatrixAvatar(h.member,h.role,h.avatar); addChatBubble(tl,h.member,h.comment,safeAvatar,(h.role==='AI_Council'?'ai':'human'),isMe,h.row); });
            // 過去ログがある場合はチャット欄を自動表示
            if(chatWrapper) chatWrapper.style.display = 'flex';
            if(startBtn) startBtn.style.display = 'none';
            setTimeout(function(){ tl.scrollTop=tl.scrollHeight; }, 100);
        }
    });
    document.getElementById('priority-modal').style.display = 'flex';
    var leftPane = document.querySelector('.col-left-prio');
    if(leftPane) leftPane.scrollTop = 0;
    // 類似の声を自動検索
    findSimilarPosts();
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
    var label = (action === 'like') ? '合意' : '戻す';
    if(!confirm(label + "しますか？")) return;
    votePriorityPost(window.mxCurrentPrioPid, myName, action).then(function(res) {
        if(res && res.success) {
            alert(res.msg);
            var el = document.getElementById('prio-like-count');
            if(el) el.innerHTML = '<i class="fas fa-thumbs-up me-1"></i> ' + (res.likeCount || 0);
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
