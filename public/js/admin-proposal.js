// ====================================================
//  Proposal: 企画書・テーマ作成・役員上申・全社展開
// ====================================================
var currentProposalId = null;
var loadedComments = [];

function loadCandidates() {
    showLoading("データ取得中...");
    getActionPlanCandidates().then(function(plans) {
        hideLoading(); currentPlanList = plans || [];
        var list = document.getElementById('candidates-list-area');
        if(!plans || !plans.length) { if(list) list.innerHTML = "<div class='col-12 text-muted text-center'>企画書候補はありません</div>"; return; }
        if(list) {
            list.innerHTML = plans.map(function(p) {
                var color = getCategoryColor(p.x, p.y);
                var isReview = (p.status === 'member_review');
                var statusBadge = isReview ? '<span class="badge bg-info"><i class="fas fa-users me-1"></i>メンバー検討中</span>' : '<span class="badge bg-secondary">候補</span>';
                var actionBtns = '';
                if(isReview) {
                    actionBtns =
                        '<div id="endorse-area-'+p.id+'" class="mb-2"></div>' +
                        '<div class="d-flex gap-2">' +
                            '<button type="button" class="btn btn-sm btn-outline-danger w-33" onclick="event.stopPropagation(); remandPlan(\''+p.id+'\')"><i class="fas fa-undo"></i> 差戻</button>' +
                            '<button type="button" class="btn btn-sm btn-success w-67 fw-bold" id="exec-btn-'+p.id+'" onclick="event.stopPropagation(); submitToExecDirectly(\''+p.id+'\')" disabled><i class="fas fa-gavel me-1"></i>全員賛同で上申可</button>' +
                        '</div>';
                } else {
                    actionBtns =
                        '<div class="d-flex gap-2">' +
                            '<button type="button" class="btn btn-sm btn-outline-danger w-33" onclick="event.stopPropagation(); remandPlan(\''+p.id+'\')"><i class="fas fa-undo"></i> 差戻</button>' +
                            '<button type="button" class="btn btn-sm btn-outline-info w-34 fw-bold" onclick="event.stopPropagation(); submitToReview(\''+p.id+'\')"><i class="fas fa-users me-1"></i>メンバー検討</button>' +
                            '<button type="button" class="btn btn-sm btn-outline-success w-33" onclick="event.stopPropagation(); archivePlan(\''+p.id+'\')"><i class="fas fa-check"></i> 完了</button>' +
                        '</div>';
                }
                return '<div class="col-lg-4 col-md-6"><div class="plan-card h-100 d-flex flex-column" style="border-left:5px solid '+color+'; cursor:default;">' +
                    '<div class="fw-bold text-truncate fs-5 mb-1">'+escapeHtml(p.title)+'</div>' +
                    '<div class="d-flex justify-content-between text-muted small mb-2"><span>'+statusBadge+'</span><span class="text-primary fw-bold">Pt:'+p.score+'</span></div>' +
                    '<div class="mt-1 mb-3 p-2 bg-light rounded text-secondary flex-grow-1" style="font-size:0.8rem; height:60px; overflow:hidden;"><i class="fas fa-robot me-1"></i> '+escapeHtml(String(p.draft||"")).substring(0,60)+'...</div>' +
                    '<div class="mt-auto">' +
                        '<button type="button" class="btn btn-outline-primary w-100 fw-bold mb-2 shadow-sm" onclick="event.stopPropagation(); openProposalById(\''+p.id+'\')"><i class="fas fa-comments me-1"></i> コメント・編集</button>' +
                        actionBtns +
                    '</div></div></div>';
            }).join('');
            // メンバー検討中の企画書の賛同状況を読み込む
            plans.forEach(function(p) {
                if(p.status === 'member_review') loadEndorsementStatus(p.id);
            });
        }
    });
}

function openProposalById(planId) {
    // 常に最新データをAPIから取得してモーダルを開く
    showLoading("読み込み中...");
    getActionPlanCandidates().then(function(plans) {
        hideLoading();
        currentPlanList = plans || [];
        var plan = currentPlanList.find(function(p){ return p.id === planId; });
        if(!plan) return alert("データが見つかりません");
        currentProposalId = planId;
        document.getElementById('prop-category').innerText = plan.category || "未分類";
        document.getElementById('proposal-title-input').value = plan.title;
        loadedComments = [];
        try { if(plan.comments) loadedComments = JSON.parse(plan.comments); } catch(e){}
        renderMarkdownBlocks(plan.draft || "（ドラフトなし）", plan.scores);
        // メンバー検討中なら再編集系ボタンを表示
        var isReview = (plan.status === 'member_review');
        var refineBtn = document.getElementById('btn-ai-refine');
        var resubmitBtn = document.getElementById('btn-resubmit-vote');
        var execModalBtn = document.getElementById('btn-exec-from-modal');
        if(refineBtn) refineBtn.classList.toggle('d-none', !isReview);
        if(resubmitBtn) resubmitBtn.classList.toggle('d-none', !isReview);
        if(execModalBtn) execModalBtn.classList.toggle('d-none', isReview);
        document.getElementById('proposal-modal').style.display = 'flex';
    });
}

function renderMarkdownBlocks(markdownText, scores) {
    var container = document.getElementById('proposal-blocks-area'); container.innerHTML = "";
    var sections = markdownText.split(/^## /gm); var colorIndex = 0;
    sections.forEach(function(secContent, index) {
        if(!secContent.trim()) return;
        var title = "導入・概要"; var body = secContent;
        if(index > 0 || markdownText.startsWith("## ")) { var lines = secContent.split('\n'); title = lines[0].trim(); body = lines.slice(1).join('\n').trim(); }
        var colorClass = 'section-color-' + (colorIndex % 6); colorIndex++;
        var inputId = 'input-sec-' + index;
        var chartHtml = ""; var chartId = "";
        if((title.includes("意義") || title.includes("価値") || index === 2) && scores) {
            chartId = "embeddedRadarChart";
            chartHtml = '<div class="d-flex flex-column align-items-center justify-content-center h-100"><div style="width:100%; height:200px; position:relative;"><canvas id="'+chartId+'"></canvas></div><div class="text-muted small mt-1">評価スコア分析</div></div>';
        }
        var sectionComments = loadedComments.filter(function(c){ return c.text.startsWith('【'+title+'】'); });
        var commentsHtml = "";
        if(sectionComments.length > 0) {
            commentsHtml = '<div class="mt-3 ps-3 border-start border-3 border-primary">';
            sectionComments.forEach(function(c){ var pureText = c.text.replace('【'+title+'】','').trim(); commentsHtml += '<div class="existing-comment"><b>'+escapeHtml(c.name)+'</b>: '+escapeHtml(pureText)+'</div>'; });
            commentsHtml += '</div>';
        }
        var div = document.createElement('div'); div.className = 'prop-section-block ' + colorClass;
        var contentHtml;
        if(chartHtml) {
            contentHtml = '<div class="row align-items-start"><div class="col-md-7"><div class="text-secondary" style="font-size:0.95rem; white-space:pre-wrap; line-height:1.7;">'+escapeHtml(body)+'</div></div><div class="col-md-5">'+chartHtml+'</div></div>';
        } else {
            contentHtml = '<div class="text-secondary" style="font-size:0.95rem; white-space:pre-wrap; line-height:1.7;">'+escapeHtml(body)+'</div>';
        }
        div.innerHTML = '<div class="section-title-bar"><i class="fas fa-heading me-2"></i>'+escapeHtml(title)+'</div><div class="section-body">'+contentHtml+commentsHtml+'<div class="inline-comment-box mt-3"><div class="input-group input-group-sm"><input type="text" id="'+inputId+'" class="form-control" placeholder="このセクションへのコメント..."><button class="btn btn-outline-primary" onclick="postSectionComment(\''+inputId+'\',\''+escapeHtml(title).replace(/'/g,"\\'")+'\')"><i class="fas fa-paper-plane"></i></button></div></div></div>';
        container.appendChild(div);
        if(chartId && scores) {
            setTimeout(function() {
                var canvas = document.getElementById(chartId); if(!canvas) return;
                new Chart(canvas.getContext('2d'), { type:'radar', data:{ labels:['法令','リスク','頻度','緊急','安全','価値','ニーズ'], datasets:[{ label:'スコア', data:[scores.legal||1,scores.risk||1,scores.freq||1,scores.urgency||1,scores.safety||1,scores.value||1,scores.needs||1], backgroundColor:'rgba(54,162,235,0.2)', borderColor:'rgba(54,162,235,1)', pointBackgroundColor:'rgba(54,162,235,1)', borderWidth:2 }] }, options:{ responsive:true, maintainAspectRatio:false, scales:{ r:{min:0,max:5,ticks:{display:false}} }, plugins:{legend:{display:false}} } });
            }, 100);
        }
    });
}

function postSectionComment(inputId, title) {
    var el = document.getElementById(inputId); var text = el.value.trim(); if(!text) return;
    var myName = (currentAdminProfile && currentAdminProfile.name) || "Admin";
    var finalText = '【'+title+'】 '+text;
    var commentDiv = document.createElement('div'); commentDiv.className = "existing-comment animation-fadein";
    commentDiv.innerHTML = '<b>'+escapeHtml(myName)+'</b>: '+escapeHtml(text);
    el.closest('.inline-comment-box').insertAdjacentElement('beforebegin', commentDiv); el.value = "";
    savePlanComment(currentProposalId, myName, finalText).then(function(res) {
        if(res.success) { var plan = currentPlanList.find(function(p){ return p.id===currentProposalId; }); if(plan) plan.comments = JSON.stringify(res.comments); loadedComments = res.comments; }
    });
}

function saveDraft(planId) {
    var newTitle = document.getElementById('proposal-title-input').value;
    var plan = currentPlanList.find(function(p){ return p.id===planId; });
    showLoading("保存中...");
    updateActionPlanDraft(planId, plan ? plan.draft : "", newTitle).then(function(res) {
        hideLoading(); alert(res.msg); if(res.success) { if(plan) plan.title=newTitle; loadCandidates(); }
    }).catch(function(err) {
        hideLoading(); alert("保存エラー");
    });
}

function generatePdf(planId) {
    alert('PDF生成機能は準備中です');
}

function archivePlan(id) {
    if(!confirm("承認・完了しますか？")) return;
    showLoading("処理中...");
    archiveActionPlan(id).then(function(res) { hideLoading(); alert(res.msg); loadCandidates(); closeProposalModal(); });
}
function closeProposalModal() { document.getElementById('proposal-modal').style.display = 'none'; if(typeof refreshActiveTab==='function') refreshActiveTab(); }
function remandPlan(id) {
    if(!confirm("評価フェーズに戻しますか？")) return;
    showLoading("処理中...");
    remandActionPlan(id).then(function(res) { hideLoading(); alert(res.msg); loadCandidates(); closeProposalModal(); });
}

// ★新機能: 役員上申
function submitToExecDirectly(planId) {
    if(!confirm("この企画を役員決裁へ上申しますか？")) return;
    showLoading("上申中...");
    submitToExec(planId).then(function(res) { hideLoading(); alert(res.msg); if(res.success) loadCandidates(); });
}
function submitToExecFromProposal() {
    if(!currentProposalId) return;
    submitToExecDirectly(currentProposalId);
    closeProposalModal();
}

// ★役員決裁タブ
function loadExecPending() {
    var area = document.getElementById('exec-pending-area');
    var isExec = currentAdminProfile && currentAdminProfile.isExec;
    var roleInfo = document.getElementById('exec-role-info');
    var roleText = document.getElementById('exec-role-text');
    if(isExec) { roleInfo.style.display = 'block'; roleText.innerText = '役員権限でログインしています。承認・却下が可能です。'; }
    else { roleInfo.style.display = 'block'; roleText.innerText = '閲覧モード: 決裁は役員権限が必要です。'; }
    getExecPendingPlans().then(function(plans) {
        if(!plans || plans.length === 0) { area.innerHTML = '<div class="col-12 text-center p-5 text-muted"><i class="fas fa-check-circle fs-1 text-success mb-3"></i><br>決裁待ちの案件はありません</div>'; return; }
        area.innerHTML = plans.map(function(p) {
            return '<div class="col-md-6 col-lg-4"><div class="card h-100 shadow-sm border-0" style="border-top:4px solid #dc3545 !important;">' +
                '<div class="card-body d-flex flex-column"><div class="d-flex justify-content-between mb-2"><span class="badge bg-danger">決裁待ち</span><span class="small text-muted">'+p.date+'</span></div>' +
                '<h6 class="fw-bold text-dark mb-2">'+escapeHtml(p.title)+'</h6>' +
                '<p class="small text-muted mb-3 flex-grow-1" style="display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">'+escapeHtml(String(p.draft||""))+'</p>' +
                '<div class="mt-auto pt-2 border-top">' +
                    '<button class="btn btn-sm btn-outline-dark w-100 mb-2 fw-bold" onclick="openExecDetail(\''+p.id+'\')"><i class="fas fa-search me-1"></i> 詳細確認</button>' +
                    (isExec ? '<div class="d-flex gap-2"><button class="btn btn-sm btn-success w-50 fw-bold" onclick="execDecide(\''+p.id+'\',\'approved\')"><i class="fas fa-check"></i> 承認</button><button class="btn btn-sm btn-outline-danger w-50" onclick="execDecide(\''+p.id+'\',\'rejected\')"><i class="fas fa-times"></i> 却下</button></div>' : '') +
                '</div></div></div></div>';
        }).join('');
    });
}

function openExecDetail(planId) {
    getExecPendingPlans().then(function(plans) {
        var plan = plans.find(function(p){ return p.id === planId; });
        if(!plan) { alert("プランが見つかりません"); return; }
        document.getElementById('exec-detail-title').innerText = plan.title;
        var body = document.getElementById('exec-detail-body');
        body.innerHTML = '<div class="mb-3"><span class="badge bg-secondary">'+plan.category+'</span> <span class="small text-muted">スコア: '+plan.score+'</span></div>' +
            '<div class="p-3 bg-light rounded border mb-3" style="white-space:pre-wrap; font-size:0.9rem; max-height:40vh; overflow-y:auto;">'+escapeHtml(plan.draft)+'</div>';
        var isExec = currentAdminProfile && currentAdminProfile.isExec;
        var decisionArea = document.getElementById('exec-decision-area');
        if(isExec) {
            decisionArea.innerHTML = '<div class="mb-2"><textarea id="exec-comment" class="form-control form-control-sm" rows="2" placeholder="決裁コメント (任意)"></textarea></div>' +
                '<div class="d-flex gap-2"><button class="btn btn-success flex-grow-1 fw-bold" onclick="execDecide(\''+planId+'\',\'approved\')"><i class="fas fa-check me-1"></i> 承認</button><button class="btn btn-warning flex-grow-1 fw-bold" onclick="execDecide(\''+planId+'\',\'conditional\')"><i class="fas fa-redo me-1"></i> 条件付差戻</button><button class="btn btn-danger flex-grow-1 fw-bold" onclick="execDecide(\''+planId+'\',\'rejected\')"><i class="fas fa-times me-1"></i> 却下</button></div>';
        } else { decisionArea.innerHTML = '<div class="text-muted text-center small">役員権限が必要です</div>'; }
        document.getElementById('exec-detail-modal').style.display = 'flex';
    });
}

function execDecide(planId, decision) {
    var label = decision==='approved' ? '承認' : decision==='rejected' ? '却下' : '条件付差戻';
    if(!confirm(label + 'しますか？')) return;
    var comment = ""; var el = document.getElementById('exec-comment'); if(el) comment = el.value.trim();
    var approverName = (currentAdminProfile && currentAdminProfile.name) || "役員";
    showLoading("処理中...");
    execDecision(planId, decision, comment, approverName).then(function(res) {
        hideLoading(); alert(res.msg);
        document.getElementById('exec-detail-modal').style.display = 'none';
        loadExecPending();
        if(decision === 'approved') { setTimeout(function(){ switchTab('bmi22'); }, 500); }
    });
}

// ★全社展開タブ
function loadHealthPlan26() {
    showLoading("データ取得中...");
    getArchivedActionPlans().then(function(plans) {
        hideLoading();
        var listArea = document.getElementById('healthplan26-list-area');
        if(!plans || plans.length === 0) { listArea.innerHTML = "<div class='col-12 text-muted text-center p-5'>承認済み・実行中のプランはありません</div>"; return; }
        listArea.innerHTML = plans.map(function(p) {
            var statusBadge = '';
            if(p.status === 'approved') statusBadge = '<span class="badge bg-success">承認済</span>';
            else if(p.status === 'in_execution') statusBadge = '<span class="badge bg-primary">実行中</span>';
            else if(p.status === 'measuring') statusBadge = '<span class="badge bg-info">効果測定</span>';
            else if(p.status === 'completed') statusBadge = '<span class="badge bg-dark">完了</span>';
            else statusBadge = '<span class="badge bg-secondary">'+p.status+'</span>';
            var kpiHtml = '';
            if(p.kpiTarget) kpiHtml += '<div class="small text-muted mt-1"><i class="fas fa-bullseye text-danger"></i> KPI: '+escapeHtml(p.kpiTarget)+'</div>';
            if(p.kpiCurrent) kpiHtml += '<div class="small text-success"><i class="fas fa-chart-line"></i> 現在値: '+escapeHtml(p.kpiCurrent)+'</div>';
            if(p.owner) kpiHtml += '<div class="small text-muted"><i class="fas fa-user"></i> '+escapeHtml(p.owner)+'</div>';
            if(p.deadline) kpiHtml += '<div class="small text-muted"><i class="fas fa-calendar"></i> 期限: '+escapeHtml(p.deadline)+'</div>';
            var actionBtns = '';
            if(p.status === 'approved' || p.status === 'done') {
                actionBtns = '<button type="button" class="btn btn-sm btn-success w-100 fw-bold" onclick="event.stopPropagation(); openExecutionPlanModal(\''+p.id+'\')"><i class="fas fa-rocket me-1"></i> 実行計画設定</button>';
            } else if(p.status === 'in_execution') {
                actionBtns = '<button type="button" class="btn btn-sm btn-outline-primary w-100 fw-bold" onclick="event.stopPropagation(); promptKPIUpdate(\''+p.id+'\')"><i class="fas fa-chart-line me-1"></i> KPI更新</button>' +
                    '<div class="d-flex gap-1 mt-2">' +
                      '<button class="btn btn-sm btn-outline-warning flex-grow-1" onclick="event.stopPropagation(); sendHearingNotification(\''+p.id+'\',\'related\')"><i class="fas fa-clipboard-check me-1"></i> 関連者にヒアリング</button>' +
                      '<button class="btn btn-sm btn-outline-info flex-grow-1" onclick="event.stopPropagation(); sendHearingNotification(\''+p.id+'\',\'all\')"><i class="fas fa-bullhorn me-1"></i> 全社ヒアリング</button>' +
                    '</div>';
            }
            return '<div class="col-md-6 col-lg-4"><div class="card h-100 shadow-sm border-0" style="border-top:5px solid #27ae60 !important;">' +
                '<div class="card-body d-flex flex-column"><div class="d-flex justify-content-between mb-2">'+statusBadge+'<span class="small fw-bold text-secondary">Pt: '+p.score+'</span></div>' +
                '<h6 class="fw-bold text-dark mb-2">'+escapeHtml(p.title)+'</h6>' + kpiHtml +
                '<p class="small text-muted mb-3 flex-grow-1 mt-2" style="display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">'+escapeHtml(String(p.draft||""))+'</p>' +
                '<div class="mt-auto pt-2 border-top d-flex gap-2">' +
                    '<button type="button" class="btn btn-sm btn-outline-warning w-25" onclick="event.stopPropagation(); revertToCandidate(\''+p.id+'\')"><i class="fas fa-undo"></i></button>' +
                    '<div class="flex-grow-1">'+actionBtns+'</div>' +
                '</div></div></div></div>';
        }).join('');
    });
}

function revertToCandidate(id) {
    if(!confirm("企画書リストへ差し戻しますか？")) return;
    showLoading("処理中...");
    revertPlanToCandidate(id).then(function(res) { hideLoading(); alert(res.msg); if(res.success) loadHealthPlan26(); });
}

function openExecutionPlanModal(planId) {
    document.getElementById('exec-plan-id').value = planId;
    document.getElementById('exec-owner').value = '';
    document.getElementById('exec-deadline').value = '';
    document.getElementById('exec-kpi-target').value = '';
    document.getElementById('execution-plan-modal').style.display = 'flex';
}
function submitExecutionPlan() {
    var planId = document.getElementById('exec-plan-id').value;
    var owner = document.getElementById('exec-owner').value.trim();
    var deadline = document.getElementById('exec-deadline').value;
    var kpiTarget = document.getElementById('exec-kpi-target').value.trim();
    if(!owner || !deadline) { alert("責任者と期限を入力してください"); return; }
    showLoading("設定中...");
    setExecutionPlan(planId, owner, deadline, kpiTarget).then(function(res) {
        hideLoading(); alert(res.msg);
        document.getElementById('execution-plan-modal').style.display = 'none';
        loadHealthPlan26();
    });
}
function promptKPIUpdate(planId) {
    var kpiVal = prompt("現在のKPI実績値を入力してください:");
    if(!kpiVal) return;
    var note = prompt("備考（任意）:", "");
    showLoading("更新中...");
    updateKPI(planId, kpiVal, note).then(function(res) { hideLoading(); alert(res.msg); loadHealthPlan26(); });
}

// ★効果ヒアリング
function sendHearingNotification(planId, scope) {
    if(!confirm("効果ヒアリングを送信しますか？")) return;
    showLoading("送信中...");
    sendHearing(planId, scope).then(function(res) {
        hideLoading();
        alert(res.msg);
    }).catch(function(err) {
        hideLoading();
        alert("送信エラーが発生しました");
    });
}

// テーマ機能
function openThemePlanModal() { document.getElementById('theme-plan-modal').style.display = 'flex'; renderThemeSelectionList(); setTimeout(function(){ initThemePreviewChart(); }, 300); }
function closeThemePlanModal() { document.getElementById('theme-plan-modal').style.display = 'none'; if(typeof refreshActiveTab==='function') refreshActiveTab(); }
function renderThemeSelectionList() {
    var container = document.getElementById('theme-selection-list'); selectedThemePostIds = [];
    if(!allPointsData || allPointsData.length === 0) { container.innerHTML = '<div class="text-center p-3 text-muted">読み込み中...</div>'; return; }
    var html = ''; allPointsData.forEach(function(p) { html += '<div class="post-select-card" id="theme-item-'+p.id+'" onclick="toggleThemePostSelection(\''+p.id+'\')"><div class="post-select-check"><i class="far fa-circle"></i></div><div class="flex-grow-1"><div class="small fw-bold text-dark mb-1">'+p.title+'</div></div></div>'; });
    container.innerHTML = html;
}
function toggleThemePostSelection(id) {
    var item = document.getElementById('theme-item-'+id); var icon = item.querySelector('.post-select-check i');
    if(selectedThemePostIds.includes(id)) { selectedThemePostIds = selectedThemePostIds.filter(function(pid){return pid!==id;}); item.classList.remove('selected'); icon.classList.remove('fa-check-circle','text-primary'); icon.classList.add('fa-circle'); }
    else { selectedThemePostIds.push(id); item.classList.add('selected'); icon.classList.remove('fa-circle'); icon.classList.add('fa-check-circle','text-primary'); }
}
function initThemePreviewChart() {
    var ctx = document.getElementById('themeScoreRadar'); if(!ctx) return;
    if(themeRadarChart) themeRadarChart.destroy();
    themeRadarChart = new Chart(ctx.getContext('2d'), { type:'radar', data:{ labels:['法令','リスク','頻度','緊急','安全','価値','ニーズ'], datasets:[{ label:'スコア', data:[3,3,3,3,3,3,3], backgroundColor:'rgba(54,162,235,0.2)', borderColor:'rgba(54,162,235,1)', pointBackgroundColor:'rgba(54,162,235,1)', borderWidth:2 }] }, options:{ responsive:true, maintainAspectRatio:false, scales:{ r:{min:0,max:5,ticks:{display:false}} }, plugins:{legend:{display:false}} } });
}
function updThemeRadar() { if(!themeRadarChart) return; var d=[]; for(var i=1; i<=7; i++) d.push(document.getElementById('ts'+i).value); themeRadarChart.data.datasets[0].data = d; themeRadarChart.update(); }
function formatAiIdea(text) {
    if(!text) return '';
    var safe = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    // 見出し（### → h6, ## → h5）
    safe = safe.replace(/^###\s*(.+)$/gm, '<h6 style="margin:12px 0 4px; color:#e74c3c; font-weight:700;">$1</h6>');
    safe = safe.replace(/^##\s*(.+)$/gm, '<h5 style="margin:16px 0 6px; color:#c0392b; font-weight:700; border-bottom:1px solid #eee; padding-bottom:4px;">$1</h5>');
    // 太字 **text**
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // リスト項目（- や * や数字.）
    safe = safe.replace(/^[\-\*]\s+(.+)$/gm, '<div style="padding:2px 0 2px 16px; position:relative;"><span style="position:absolute; left:4px; color:#e74c3c;">•</span>$1</div>');
    safe = safe.replace(/^(\d+)\.\s+(.+)$/gm, '<div style="padding:2px 0 2px 20px; position:relative;"><span style="position:absolute; left:2px; color:#e74c3c; font-weight:700;">$1.</span>$2</div>');
    // 連続改行をセクション区切りに
    safe = safe.replace(/\n{2,}/g, '<div style="margin:10px 0;"></div>');
    // 残りの改行
    safe = safe.replace(/\n/g, '<br>');
    return '<div style="line-height:1.7; font-size:0.85rem;">' + safe + '</div>';
}
function startThemeBrainstorm() {
    var theme = document.getElementById('theme-title-input').value;
    var bg = document.getElementById('theme-bg-input').value;
    if(!theme||!bg) return alert("入力してください");
    var resArea = document.getElementById('theme-brainstorm-result');
    resArea.innerHTML = "AI思考中..."; resArea.classList.remove('d-none');
    brainstormThemeActionPlans({ theme:theme, background:bg }).then(function(res) {
        if(res.success) resArea.innerHTML = formatAiIdea(res.idea); else resArea.innerHTML = "エラー";
    });
}
function generateThemeProposal() {
    var title = document.getElementById('theme-plan-title').value;
    if(!title) return alert("タイトルを入力してください");
    if(!confirm("作成しますか？")) return;
    showLoading("作成中...");
    var s = { legal:document.getElementById('ts1').value, risk:document.getElementById('ts2').value, freq:document.getElementById('ts3').value, urgency:document.getElementById('ts4').value, safety:document.getElementById('ts5').value, value:document.getElementById('ts6').value, needs:document.getElementById('ts7').value };
    createThemeProposal({ planTitle:title, theme:document.getElementById('theme-title-input').value, background:document.getElementById('theme-bg-input').value, scores:s, postIds:selectedThemePostIds }).then(function(res) {
        hideLoading();
        if(res.success) { alert(res.msg); closeThemePlanModal(); loadData(); switchTab('candidates'); }
    });
}

// ====== メンバー合議機能 ======
function submitToReview(planId) {
    if(!confirm('この企画書をメンバー検討に回しますか？\n全推進メンバーに賛同を求めます。')) return;
    showLoading("処理中...");
    submitToMemberReview(planId).then(function(res) {
        hideLoading(); alert(res.msg); if(res.success) loadCandidates();
    });
}

function loadEndorsementStatus(planId) {
    var area = document.getElementById('endorse-area-' + planId);
    if(!area) return;
    getPlanEndorsements(planId).then(function(res) {
        if(!res || !res.endorsements) return;
        var list = res.endorsements;
        var total = list.length;
        var agreed = list.filter(function(e){ return e.vote === 'agree'; }).length;
        var opposed = list.filter(function(e){ return e.vote === 'oppose'; }).length;
        var pending = list.filter(function(e){ return e.vote === 'pending'; }).length;
        var myEmail = (currentAdminProfile && currentAdminProfile.email) || '';
        var myVote = list.find(function(e){ return e.member_email === myEmail; });
        var html = '<div class="p-2 rounded mb-2" style="background:#f0f7ff; border:1px solid #bee3f8;">';
        html += '<div class="d-flex align-items-center justify-content-between mb-2">';
        html += '<span class="small fw-bold" style="color:#2b6cb0;"><i class="fas fa-vote-yea me-1"></i>合議状況</span>';
        html += '<span class="badge ' + (agreed === total ? 'bg-success' : 'bg-warning text-dark') + '">' + agreed + '/' + total + ' 賛同</span>';
        html += '</div>';
        // 各メンバーの投票状況
        html += '<div class="d-flex flex-wrap gap-1 mb-2">';
        list.forEach(function(e) {
            var icon = ''; var bg = ''; var border = '';
            if(e.vote === 'agree') { icon = '<i class="fas fa-check-circle text-success"></i>'; bg = '#e6ffed'; border = '1px solid #c6f6d5'; }
            else if(e.vote === 'oppose') { icon = '<i class="fas fa-times-circle text-danger"></i>'; bg = '#ffe6e6'; border = '1px solid #fed7d7'; }
            else { icon = '<i class="fas fa-hourglass-half text-warning"></i>'; bg = '#fff8e1'; border = '1px solid #fefcbf'; }
            var av = e.avatar || '';
            html += '<span class="d-inline-flex align-items-center gap-1 px-2 py-1 rounded-pill" style="background:' + bg + '; border:' + border + '; font-size:0.78rem;">';
            if(av) html += '<span style="font-size:1.1rem;">' + av + '</span>';
            html += icon + ' ' + escapeHtml(e.member_name);
            if(e.vote === 'oppose' && e.comment) html += ' <span class="text-muted" style="font-size:0.7rem;">(' + escapeHtml(e.comment) + ')</span>';
            html += '</span>';
        });
        html += '</div>';
        // 自分の投票ボタン
        if(myVote && myVote.vote === 'pending') {
            html += '<div class="d-flex gap-1">';
            html += '<button class="btn btn-sm btn-success flex-grow-1" onclick="event.stopPropagation(); castEndorsement(\'' + planId + '\',\'agree\')"><i class="fas fa-thumbs-up me-1"></i>賛同</button>';
            html += '<button class="btn btn-sm btn-outline-secondary flex-grow-1" onclick="event.stopPropagation(); castEndorsementWithComment(\'' + planId + '\',\'oppose\')"><i class="fas fa-thumbs-down me-1"></i>反対</button>';
            html += '</div>';
        } else if(myVote) {
            var label = myVote.vote === 'agree' ? '賛同済み' : '反対済み';
            html += '<div class="text-center small text-muted"><i class="fas fa-check me-1"></i>' + label + '</div>';
        }
        html += '</div>';
        area.innerHTML = html;
        // 全員賛同なら上申ボタンを有効化
        var execBtn = document.getElementById('exec-btn-' + planId);
        if(execBtn) {
            if(agreed === total && total > 0) {
                execBtn.disabled = false;
                execBtn.className = 'btn btn-sm btn-info w-67 fw-bold';
                execBtn.innerHTML = '<i class="fas fa-gavel me-1"></i>役員上申';
            }
        }
    });
}

function castEndorsement(planId, vote) {
    var myEmail = (currentAdminProfile && currentAdminProfile.email) || '';
    var myName = (currentAdminProfile && currentAdminProfile.name) || 'Admin';
    endorsePlan(planId, myEmail, myName, vote, '').then(function(res) {
        if(res.success) loadCandidates();
    });
}

function castEndorsementWithComment(planId, vote) {
    var reason = prompt('反対理由を入力してください:');
    if(reason === null) return;
    var myEmail = (currentAdminProfile && currentAdminProfile.email) || '';
    var myName = (currentAdminProfile && currentAdminProfile.name) || 'Admin';
    endorsePlan(planId, myEmail, myName, vote, reason).then(function(res) {
        if(res.success) loadCandidates();
    });
}

// メンバーコメントを反映してAIリファイン
function aiRefineWithComments() {
    var plan = currentPlanList.find(function(p){ return p.id === currentProposalId; });
    if(!plan) return;
    // セクション別コメントを集約
    var feedbackData = {};
    var comments = [];
    try { comments = JSON.parse(plan.comments || '[]'); } catch(e) {}
    if(comments.length === 0) return alert('まだメンバーからのコメントがありません。\nコメントを集めてからリファインしてください。');
    comments.forEach(function(c) {
        var match = c.text.match(/^【(.+?)】\s*(.+)$/);
        if(match) {
            var sec = match[1]; var txt = match[2];
            if(!feedbackData[sec]) feedbackData[sec] = [];
            feedbackData[sec].push(c.name + ': ' + txt);
        }
    });
    if(!confirm('メンバーの' + comments.length + '件のコメントを反映してAIが企画書を書き直します。\n実行しますか？')) return;
    var title = document.getElementById('proposal-title-input').value;
    showLoading("AIリファイン中...");
    refineActionPlanByAI(currentProposalId, plan.draft, feedbackData, title).then(function(res) {
        hideLoading();
        if(res.success) {
            alert('リファイン完了！内容を確認してください。');
            // リファイン結果でモーダルを即時更新
            if(res.newTitle) document.getElementById('proposal-title-input').value = res.newTitle;
            if(res.newDraft) {
                // ローカルキャッシュも更新
                var p = currentPlanList.find(function(x){ return x.id === currentProposalId; });
                if(p) { p.draft = res.newDraft; p.title = res.newTitle || p.title; }
                loadedComments = [];
                try { if(p && p.comments) loadedComments = JSON.parse(p.comments); } catch(e){}
                renderMarkdownBlocks(res.newDraft, p ? p.scores : null);
            }
            // カード一覧も更新
            loadCandidates();
        } else { alert('リファインエラー: ' + (res.msg || '')); }
    });
}

// 再編集後に投票リセット → 再投票
function resubmitForVote() {
    if(!confirm('企画書の編集が完了しましたか？\n投票をリセットして全メンバーに再投票を依頼します。')) return;
    showLoading("処理中...");
    resetPlanEndorsements(currentProposalId).then(function(res) {
        hideLoading(); alert(res.msg);
        if(res.success) { closeProposalModal(); loadCandidates(); }
    });
}
