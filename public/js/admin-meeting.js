// ====================================================
//  AIMeeting: AI企画会議シミュレーター
// ====================================================

window.sendToAIMeeting = function(planId) {
    switchTab('aimeeting');
    setTimeout(function(){
        if(currentPlanList && currentPlanList.length > 0) {
            selectPlanForMeeting(planId);
        } else {
            getActionPlanCandidates().then(function(plans) {
                currentPlanList = plans || [];
                renderMeetingPlanList(currentPlanList);
                selectPlanForMeeting(planId);
            });
        }
    }, 500);
};

function loadPlansForMeeting() {
    var list = document.getElementById('meeting-plan-list');
    if(!currentPlanList || currentPlanList.length === 0) {
        list.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm text-secondary"></div> 読込中...</div>';
        getActionPlanCandidates().then(function(plans) {
            currentPlanList = plans || [];
            renderMeetingPlanList(currentPlanList);
        });
    } else {
        renderMeetingPlanList(currentPlanList);
    }
}

function renderMeetingPlanList(plans) {
    var list = document.getElementById('meeting-plan-list');
    if(!plans || plans.length === 0) { list.innerHTML = "企画書がありません"; return; }
    list.innerHTML = plans.map(function(p) {
        return '<div class="p-2 border rounded mb-2 bg-light shadow-sm" style="cursor:pointer;" onclick="selectPlanForMeeting(\''+p.id+'\')">'
             + '<div class="fw-bold" style="font-size:0.85rem;">'+escapeHtml(p.title)+'</div>'
             + '<div class="small text-muted">'+escapeHtml(p.category)+'</div>'
             + '</div>';
    }).join('');
}

function selectPlanForMeeting(planId) {
    selectedMeetingPlan = currentPlanList.find(function(p){ return String(p.id) === String(planId); });
    if(!selectedMeetingPlan) { console.error("Plan not found:", planId); return; }
    document.getElementById('meeting-title').innerText = "テーマ: " + selectedMeetingPlan.title;
    document.getElementById('meeting-chat-timeline').innerHTML = '<div class="alert alert-info small m-3">右下のボタンを押して開始</div>';
    var btn = document.getElementById('btn-start-meeting');
    btn.style.display = 'inline-block';
    btn.onclick = startAIMeeting;
}

function startAIMeeting() {
    if(!selectedMeetingPlan) { alert("企画が選択されていません"); return; }
    document.getElementById('btn-start-meeting').style.display = 'none';
    var tl = document.getElementById('meeting-chat-timeline');
    tl.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-primary"></div><div class="mt-3 text-secondary">AI会議中...</div></div>';
    simulatePlanningMeeting(selectedMeetingPlan.id, selectedMeetingPlan).then(function(res) {
        if(!res.success) {
            tl.innerHTML = '<div class="alert alert-danger m-3">'+escapeHtml(res.msg)+'</div>';
            document.getElementById('btn-start-meeting').style.display = 'inline-block';
            return;
        }
        var html = '<div class="d-flex flex-column gap-3 p-3">';
        res.discussion.forEach(function(msg) {
            var align = "flex-start"; var bg = "#fff";
            if(msg.role.includes("社員")) { align = "flex-end"; bg = "#fff3cd"; }
            html += '<div style="display:flex; flex-direction:column; align-items:'+align+'; width:100%; margin-bottom:8px;">'
                 + '<div style="max-width:90%;">'
                 + '<div style="font-size:0.9rem; font-weight:bold; margin-bottom:4px; color:#555;">'+escapeHtml(msg.avatar)+' '+escapeHtml(msg.role)+'</div>'
                 + '<div style="background:'+bg+'; padding:14px 16px; border-radius:12px; box-shadow:0 1px 4px rgba(0,0,0,0.08); font-size:0.95rem; line-height:1.7; color:#333;">'+escapeHtml(msg.message)+'</div>'
                 + '</div></div>';
        });
        html += '</div>';
        html += '<div class="mt-4 p-3 border-top bg-white sticky-bottom text-center">'
             + '<div class="text-success fw-bold mb-2"><i class="fas fa-check-circle"></i> 会議終了</div>'
             + '<div class="d-flex justify-content-center gap-3">'
             + '<button class="btn btn-outline-secondary" onclick="startAIMeeting()"><i class="fas fa-redo"></i> もう一度</button>'
             + '<button class="btn btn-primary fw-bold px-4" onclick="backToProposalFromMeeting()"><i class="fas fa-file-alt"></i> 企画書編集に戻る</button>'
             + '</div></div>';
        tl.innerHTML = html;
        var logStr = JSON.stringify(res.discussion);
        if(selectedMeetingPlan) selectedMeetingPlan.aiLog = logStr;
        saveAIMeetingLog(selectedMeetingPlan.id, logStr);
    });
}

function backToProposalFromMeeting() {
    if(!selectedMeetingPlan) return;
    openProposalById(selectedMeetingPlan.id);
}
