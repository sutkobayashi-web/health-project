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
                var statusBadge = (p.status === 'member_review') ? '<span class="badge bg-info">メンバー検討中</span>' : '<span class="badge bg-secondary">候補</span>';
                return '<div class="col-lg-4 col-md-6"><div class="plan-card h-100 d-flex flex-column" style="border-left:5px solid '+color+'; cursor:default;">' +
                    '<div class="fw-bold text-truncate fs-5 mb-1">'+escapeHtml(p.title)+'</div>' +
                    '<div class="d-flex justify-content-between text-muted small mb-2"><span>'+statusBadge+'</span><span class="text-primary fw-bold">Pt:'+p.score+'</span></div>' +
                    '<div class="mt-1 mb-3 p-2 bg-light rounded text-secondary flex-grow-1" style="font-size:0.8rem; height:60px; overflow:hidden;"><i class="fas fa-robot me-1"></i> '+escapeHtml(String(p.draft||"")).substring(0,60)+'...</div>' +
                    '<div class="mt-auto">' +
                        '<button type="button" class="btn btn-outline-primary w-100 fw-bold mb-2 shadow-sm" onclick="event.stopPropagation(); openProposalById(\''+p.id+'\')"><i class="fas fa-comments me-1"></i> コメント・編集</button>' +
                        '<div class="d-flex gap-2">' +
                            '<button type="button" class="btn btn-sm btn-outline-danger w-33" onclick="event.stopPropagation(); remandPlan(\''+p.id+'\')">↩️差戻</button>' +
                            '<button type="button" class="btn btn-sm btn-outline-info w-34" onclick="event.stopPropagation(); submitToExecDirectly(\''+p.id+'\')"><i class="fas fa-gavel"></i> 上申</button>' +
                            '<button type="button" class="btn btn-sm btn-outline-success w-33" onclick="event.stopPropagation(); archivePlan(\''+p.id+'\')">✅完了</button>' +
                        '</div>' +
                    '</div></div></div>';
            }).join('');
        }
    });
}

function openProposalById(planId) {
    var plan = currentPlanList.find(function(p){ return p.id === planId; });
    if(!plan) return alert("データが見つかりません");
    currentProposalId = planId;
    document.getElementById('prop-category').innerText = plan.category || "未分類";
    document.getElementById('proposal-title-input').value = plan.title;
    loadedComments = [];
    try { if(plan.comments) loadedComments = JSON.parse(plan.comments); } catch(e){}
    renderMarkdownBlocks(plan.draft || "（ドラフトなし）", plan.scores);
    document.getElementById('proposal-modal').style.display = 'flex';
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
function closeProposalModal() { document.getElementById('proposal-modal').style.display = 'none'; }
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
                actionBtns = '<button type="button" class="btn btn-sm btn-outline-primary w-100 fw-bold" onclick="event.stopPropagation(); promptKPIUpdate(\''+p.id+'\')"><i class="fas fa-chart-line me-1"></i> KPI更新</button>';
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

// テーマ機能
function openThemePlanModal() { document.getElementById('theme-plan-modal').style.display = 'flex'; renderThemeSelectionList(); setTimeout(function(){ initThemePreviewChart(); }, 300); }
function closeThemePlanModal() { document.getElementById('theme-plan-modal').style.display = 'none'; }
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
function startThemeBrainstorm() {
    var theme = document.getElementById('theme-title-input').value;
    var bg = document.getElementById('theme-bg-input').value;
    if(!theme||!bg) return alert("入力してください");
    var resArea = document.getElementById('theme-brainstorm-result');
    resArea.innerHTML = "AI思考中..."; resArea.classList.remove('d-none');
    brainstormThemeActionPlans({ theme:theme, background:bg }).then(function(res) {
        if(res.success) resArea.innerHTML = res.idea; else resArea.innerHTML = "エラー";
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
