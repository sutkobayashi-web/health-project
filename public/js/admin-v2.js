/*  admin-v2.js – 凝集型健康アクションプラン管理画面  */

// ============================================================
// 全社健診データ分析
// ============================================================
function runCheckupAnalysis() {
  var btn = document.getElementById('btn-checkup-analysis');
  var area = document.getElementById('checkup-analysis-result');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>分析中...';
  area.innerHTML = '';

  fetch('/api/checkup/company-analysis', {
    headers: { 'Authorization': 'Bearer ' + getAdminToken() }
  }).then(function(r) { return r.json(); }).then(function(data) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-play me-1"></i>分析実行';
    if (!data.success) { area.innerHTML = '<div class="alert alert-danger">' + (data.msg || 'エラー') + '</div>'; return; }

    var s = data.summary;
    var a = data.analysis;
    var riskBadges = (a && a.topRisks || []).map(function(r) { return '<span class="badge bg-danger me-1" style="font-size:0.65rem;">' + escapeHtml(r) + '</span>'; }).join('');

    // サマリー行（常時表示）
    var html = '<div style="border-top:1px solid #eee; padding-top:12px; margin-top:8px;">';
    html += '<div onclick="toggleCheckupDetail()" style="cursor:pointer; display:flex; align-items:center; justify-content:space-between; padding:8px 0;">';
    html += '<div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">';
    html += '<span style="font-size:0.8rem; font-weight:700; color:#e53935;"><i class="fas fa-chart-bar me-1"></i>' + escapeHtml(data.year) + '年度</span>';
    html += '<span style="font-size:0.75rem; color:#666;">' + s.total + '名 / 平均' + s.averageAge + '歳</span>';
    html += '<span style="font-size:0.75rem; color:#666;">BMI25↑: <strong>' + s.bmiOver25Pct + '%</strong></span>';
    html += riskBadges;
    html += '</div>';
    html += '<i id="checkup-chevron" class="fas fa-chevron-down" style="font-size:0.7rem; color:#bbb; transition:transform 0.2s;"></i>';
    html += '</div>';
    html += '<div style="font-size:0.68rem; color:#999; margin-top:-4px; margin-bottom:4px;"><i class="fas fa-info-circle me-1"></i>推進メンバーへの参考資料です。クリックで詳細を表示</div>';

    // 詳細（折りたたみ）
    html += '<div id="checkup-detail" style="display:none; margin-top:10px;">';

    // 集計
    html += '<div class="p-2 mb-3" style="background:#fff3e0;border-radius:10px;border-left:3px solid #ff9800;">';
    html += '<div class="fw-bold small text-warning mb-1"><i class="fas fa-chart-bar me-1"></i>集計結果</div>';
    html += '<div class="row g-2 small">';
    html += '<div class="col-4">BMI25↑: <strong>' + s.bmiOver25Pct + '%</strong></div>';
    Object.keys(s.rates).forEach(function(k) {
      html += '<div class="col-4">' + k + ': <strong>' + s.rates[k] + '%</strong></div>';
    });
    html += '</div></div>';

    if (a) {
      // 全体所見
      html += '<div class="mb-2 small"><strong>所見:</strong> ' + escapeHtml(a.summary || '') + '</div>';
      html += '<div class="mb-3 small"><strong>重点リスク:</strong> ' + riskBadges + '</div>';

      // 3パターン
      (a.plans || []).forEach(function(p, i) {
        var colors = ['#e53935', '#1e88e5', '#43a047'];
        html += '<div class="p-3 mb-2" style="background:#f8f9fa;border-radius:10px;border-left:4px solid ' + colors[i] + ';">';
        html += '<div class="fw-bold" style="color:' + colors[i] + ';">提案' + String.fromCharCode(65 + i) + ': ' + escapeHtml(p.title) + ' <span class="badge bg-' + (p.priority === '高' ? 'danger' : p.priority === '中' ? 'warning' : 'secondary') + '">' + p.priority + '</span></div>';
        html += '<div class="small text-muted mb-1">対象: ' + escapeHtml(p.targetRisk || '') + ' / 期間: ' + escapeHtml(p.duration || '') + '</div>';
        html += '<div class="small mb-1">' + escapeHtml(p.description || '') + '</div>';
        html += '<div class="small mb-1" style="color:#1565c0;"><i class="fas fa-book me-1"></i>' + escapeHtml(p.evidence || '') + '</div>';
        html += '<div class="small text-muted">KPI: ' + escapeHtml(p.kpi || '') + '</div>';
        if (p.eastDesign) {
          html += '<div class="mt-1 small" style="display:grid;grid-template-columns:1fr 1fr;gap:2px;color:#555;">';
          if (p.eastDesign.easy) html += '<div><strong>Easy:</strong> ' + escapeHtml(p.eastDesign.easy) + '</div>';
          if (p.eastDesign.attractive) html += '<div><strong>Attractive:</strong> ' + escapeHtml(p.eastDesign.attractive) + '</div>';
          if (p.eastDesign.social) html += '<div><strong>Social:</strong> ' + escapeHtml(p.eastDesign.social) + '</div>';
          if (p.eastDesign.timely) html += '<div><strong>Timely:</strong> ' + escapeHtml(p.eastDesign.timely) + '</div>';
          html += '</div>';
        }
        html += '</div>';
      });

      // 保健師への申し送り
      if (a.advisorNote) {
        html += '<div class="p-2 mt-2" style="background:#e8f5e9;border-radius:10px;border-left:3px solid #43a047;">';
        html += '<div class="fw-bold small text-success"><i class="fas fa-user-md me-1"></i>保健師・産業医への申し送り</div>';
        html += '<div class="small">' + escapeHtml(a.advisorNote) + '</div>';
        html += '</div>';
      }
    }

    html += '</div></div>';
    area.innerHTML = html;
  }).catch(function(e) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-play me-1"></i>分析実行';
    area.innerHTML = '<div class="alert alert-danger">通信エラー: ' + e.message + '</div>';
  });
}

function toggleCheckupDetail() {
  var detail = document.getElementById('checkup-detail');
  var chevron = document.getElementById('checkup-chevron');
  if (!detail) return;
  var open = detail.style.display !== 'none';
  detail.style.display = open ? 'none' : 'block';
  if (chevron) chevron.style.transform = open ? '' : 'rotate(180deg)';
}

// ============================================================
// ダッシュボード
// ============================================================
function renderV2Dashboard() {
  getCurrentCycle('').then(function(res) {
    var statusArea = document.getElementById('v2-cycle-status');
    var actionsArea = document.getElementById('v2-cycle-actions');
    var themesArea = document.getElementById('v2-themes-area');

    if (!res || !res.success) {
      statusArea.innerHTML = '<div class="alert alert-warning">データ取得エラー</div>';
      return;
    }

    var cycle = res.cycle;
    var themes = res.themes || [];

    // サイクルがない場合
    if (!cycle) {
      statusArea.innerHTML = '<div class="dash-card text-center py-4" style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;"><div style="font-size:2rem; margin-bottom:10px;">📊</div><div class="fw-bold mb-2">まだサイクルがありません</div><div class="text-muted small">AIテーマ凝集を実行して、最初のサイクルを開始しましょう</div></div>';
      actionsArea.innerHTML = '<button class="btn btn-primary fw-bold" onclick="doGenerateThemes()"><i class="fas fa-magic me-2"></i>AIテーマ凝集を実行</button>';
      themesArea.innerHTML = '';
      return;
    }

    // サイクル状態表示
    var statusColor = cycle.status === 'voting' ? '#667eea' : cycle.status === 'finalized' ? '#43a047' : '#f39c12';
    var statusMap = {
      'collecting': { label:'候補準備中', color:'#f39c12' },
      'candidate': { label:'① 推進メンバー精査中', color:'#f39c12' },
      'advisor_review': { label:'② 保健師助言待ち', color:'#9c27b0' },
      'exec_approval': { label:'③ 役員承認待ち', color:'#e53935' },
      'voting': { label:'④ 全社投票中', color:'#667eea' },
      'finalized': { label:'⑤ テーマ確定', color:'#43a047' }
    };
    var st = statusMap[cycle.status] || { label:cycle.status, color:'#999' };
    var endInfo = cycle.voting_end ? ' (〜' + new Date(cycle.voting_end).toLocaleDateString('ja-JP') + ')' : '';

    // ステータス進捗バー
    var steps = ['candidate','advisor_review','exec_approval','voting','finalized'];
    var stepLabels = ['精査','助言','承認','投票','確定'];
    var currentIdx = steps.indexOf(cycle.status);
    var progressHtml = '<div style="display:flex; gap:2px; margin-top:8px;">';
    steps.forEach(function(s, i) {
      var active = i <= currentIdx;
      progressHtml += '<div style="flex:1; text-align:center;">' +
        '<div style="height:4px; border-radius:2px; background:' + (active ? st.color : '#e0e0e0') + ';"></div>' +
        '<div style="font-size:0.55rem; color:' + (active ? st.color : '#bbb') + '; margin-top:2px; font-weight:' + (i === currentIdx ? '700' : '400') + ';">' + stepLabels[i] + '</div>' +
      '</div>';
    });
    progressHtml += '</div>';

    statusArea.innerHTML =
      '<div class="dash-card dash-card-accent" style="--dash-accent:' + st.color + '; height:100%;">' +
        '<div class="d-flex justify-content-between align-items-center">' +
          '<div><div class="fw-bold">' + escapeHtml(cycle.title || '第' + cycle.cycle_number + '回') + '</div>' +
          '<div class="small text-muted">サイクル #' + cycle.cycle_number + '</div></div>' +
          '<span class="badge" style="background:' + st.color + '; font-size:0.75rem; padding:5px 12px;">' + st.label + endInfo + '</span>' +
        '</div>' +
        progressHtml +
        (cycle.status === 'voting' ? '<div class="mt-2 small"><i class="fas fa-users text-primary me-1"></i>投票済み: <strong>' + (res.totalVoters || 0) + '</strong> / ' + (res.totalUsers || 0) + '名</div>' : '') +
        (cycle.advisor_comment ? '<div class="mt-2 small" style="background:#f3e5f5; padding:6px 10px; border-radius:8px;"><i class="fas fa-user-md text-purple me-1"></i><strong>保健師助言:</strong> ' + escapeHtml(cycle.advisor_comment) + '</div>' : '') +
        (cycle.exec_comment ? '<div class="mt-2 small" style="background:#ffebee; padding:6px 10px; border-radius:8px;"><i class="fas fa-gavel text-danger me-1"></i><strong>役員コメント:</strong> ' + escapeHtml(cycle.exec_comment) + '</div>' : '') +
      '</div>';

    // アクションボタン（ステータスごと）
    var btns = '';
    if (cycle.status === 'candidate') {
      btns += '<button class="btn btn-primary fw-bold" onclick="doRequestAdvisorReview(' + cycle.cycle_number + ')"><i class="fas fa-user-md me-1"></i>保健師に助言を依頼</button>';
      btns += '<button class="btn btn-outline-warning fw-bold" onclick="doGenerateThemes()"><i class="fas fa-redo me-1"></i>テーマを再生成</button>';
    } else if (cycle.status === 'advisor_review') {
      btns += '<button class="btn btn-success fw-bold" onclick="doSubmitAdvisorAdvice(' + cycle.cycle_number + ')"><i class="fas fa-check me-1"></i>助言を確認・役員承認へ</button>';
      btns += '<button class="btn btn-outline-secondary fw-bold" onclick="doBackToCandidate(' + cycle.cycle_number + ')"><i class="fas fa-undo me-1"></i>精査に戻す</button>';
    } else if (cycle.status === 'exec_approval') {
      if (currentAdminProfile && currentAdminProfile.isExec) {
        btns += '<button class="btn btn-danger fw-bold" onclick="doExecApprove(' + cycle.cycle_number + ')"><i class="fas fa-gavel me-1"></i>役員承認</button>';
        btns += '<button class="btn btn-outline-warning fw-bold" onclick="doExecReject(' + cycle.cycle_number + ')"><i class="fas fa-times me-1"></i>差戻し</button>';
      } else {
        btns += '<div class="alert alert-warning py-2 mb-0" style="font-size:0.8rem;"><i class="fas fa-lock me-1"></i>役員権限（Exec）のアカウントでログインすると承認できます</div>';
      }
    } else if (cycle.status === 'voting') {
      btns += '<button class="btn btn-success fw-bold" onclick="doFinalizeVoting(' + cycle.cycle_number + ')"><i class="fas fa-check me-1"></i>投票を締め切り・テーマ確定</button>';
    } else if (cycle.status === 'finalized') {
      var selectedTheme = themes.find(function(t) { return t.status === 'selected'; });
      if (selectedTheme) {
        btns += '<button class="btn btn-danger fw-bold" onclick="doGenerateChallenge(\'' + selectedTheme.theme_id + '\')"><i class="fas fa-fire me-1"></i>チャレンジを自動生成</button>';
      }
      btns += '<button class="btn btn-outline-primary fw-bold" onclick="doGenerateThemes()"><i class="fas fa-plus me-1"></i>次のサイクルを開始</button>';
    }
    btns += '<button class="btn btn-outline-danger fw-bold" onclick="doDeleteCycle(' + cycle.cycle_number + ')"><i class="fas fa-trash me-1"></i>サイクル削除</button>';
    actionsArea.innerHTML = btns;

    // テーマ一覧
    if (themes.length === 0) {
      themesArea.innerHTML = '';
      return;
    }
    var html = '<h6 class="fw-bold text-muted mb-3"><i class="fas fa-tags me-1"></i>テーマ候補</h6><div class="row g-3">';
    themes.forEach(function(t) {
      var selected = t.status === 'selected';
      var keywords = []; try { keywords = JSON.parse(t.keywords || '[]'); } catch(e) {}
      var voices = []; try { voices = JSON.parse(t.representative_voices || '[]'); } catch(e) {}
      var deptDist = {}; try { deptDist = JSON.parse(t.dept_distribution || '{}'); } catch(e) {}
      var deptText = Object.keys(deptDist).map(function(k) { return k + ':' + deptDist[k] + '件'; }).join(' / ');

      var isExcludedCard = t.status === 'excluded';
      html += '<div class="col-md-6"><div class="dash-card' + (selected ? ' dash-card-accent' : '') + '" style="' + (selected ? '--dash-accent:#43a047;' : '') + (isExcludedCard ? 'opacity:0.4;' : '') + '">';
      // ヘッダー
      html += '<div class="d-flex justify-content-between align-items-start mb-2">';
      html += '<div class="d-flex align-items-center gap-2"><span style="font-size:1.5rem;">' + (t.icon || '💡') + '</span><div><div class="fw-bold">' + escapeHtml(t.name) + '</div><div class="small text-muted">' + t.post_count + '件の声' + (deptText ? '（' + deptText + '）' : '') + '</div></div></div>';
      html += '<div class="text-end"><div style="font-size:1.3rem; font-weight:900; color:#667eea;">' + t.vote_count + '</div><div style="font-size:0.65rem; color:#999;">票</div></div>';
      html += '</div>';
      // 根拠・説明
      if (t.description) html += '<div style="font-size:0.8rem; color:#555; line-height:1.5; margin-bottom:8px; padding:8px; background:#f8f9fa; border-radius:10px; border-left:3px solid #667eea;">' + escapeHtml(t.description) + '</div>';
      // キーワード
      if (keywords.length > 0) {
        html += '<div class="mb-2">';
        keywords.forEach(function(k) { html += '<span class="badge bg-light text-dark me-1" style="font-size:0.7rem;">#' + escapeHtml(k) + '</span>'; });
        html += '</div>';
      }
      // 代表的な声
      if (voices.length > 0) {
        html += '<div style="font-size:0.73rem; color:#888; margin-bottom:8px;">';
        voices.slice(0, 3).forEach(function(v) { html += '<div>💬 ' + escapeHtml(v) + '</div>'; });
        html += '</div>';
      }
      // 深刻度
      if (t.severity_avg) {
        var sevColor = t.severity_avg >= 4 ? '#e53935' : t.severity_avg >= 3 ? '#f9a825' : '#999';
        html += '<div style="font-size:0.7rem; margin-bottom:8px;"><span style="color:' + sevColor + '; font-weight:700;">重要度: ' + t.severity_avg + '/5</span></div>';
      }
      // 選出バッジ
      if (selected) html += '<div class="mb-2"><span class="badge bg-success"><i class="fas fa-check me-1"></i>選出テーマ</span></div>';
      // 採用/不採用トグル＋操作ボタン
      if (cycle.status === 'candidate' || cycle.status === 'voting') {
        var isExcluded = t.status === 'excluded';
        html += '<div class="d-flex gap-2 mt-2 align-items-center">';
        html += '<button class="btn btn-sm fw-bold" style="font-size:0.72rem;background:' + (isExcluded ? '#f5f5f5' : 'linear-gradient(135deg,#43a047,#66bb6a)') + ';color:' + (isExcluded ? '#999' : 'white') + ';border:none;" onclick="toggleThemeExclude(\'' + t.theme_id + '\',' + !isExcluded + ')"><i class="fas fa-' + (isExcluded ? 'times-circle' : 'check-circle') + ' me-1"></i>' + (isExcluded ? '不採用' : '採用') + '</button>';
        html += '<button class="btn btn-sm btn-outline-primary" style="font-size:0.68rem;" onclick="doEditTheme(\'' + t.theme_id + '\',\'' + escapeHtml(t.name).replace(/'/g,"\\'") + '\',\'' + escapeHtml(t.description || '').replace(/'/g,"\\'").replace(/\n/g,' ') + '\',\'' + (t.icon||'💡') + '\')"><i class="fas fa-edit me-1"></i>編集</button>';
        html += '<button class="btn btn-sm btn-outline-danger" style="font-size:0.68rem;" onclick="doDeleteTheme(\'' + t.theme_id + '\',\'' + escapeHtml(t.name).replace(/'/g,"\\'") + '\')"><i class="fas fa-trash me-1"></i>削除</button>';
        html += '</div>';
      }
      // プラン案セクション
      if (cycle.status === 'candidate' || cycle.status === 'advisor_review') {
        var plans = []; try { plans = JSON.parse(t.action_plans || '[]'); } catch(e) {}
        if (plans.length > 0) {
          html += '<div class="mt-2 p-2" style="background:#fff8e1;border-radius:10px;border:1px solid #f0c000;">';
          html += '<div style="font-size:0.68rem;font-weight:700;color:#f57c00;margin-bottom:6px;"><i class="fas fa-clipboard-list me-1"></i>AIプラン案（共感で評価してください）</div>';
          plans.forEach(function(p, pi) {
            var colors = ['#e53935','#1e88e5','#43a047'];
            html += '<div style="padding:6px 8px;margin-bottom:6px;background:white;border-radius:10px;border-left:3px solid ' + colors[pi % 3] + ';">';
            html += '<div style="font-size:0.75rem;font-weight:700;color:' + colors[pi % 3] + ';">案' + String.fromCharCode(65 + pi) + ': ' + escapeHtml(p.title) + '</div>';
            html += '<div style="font-size:0.7rem;color:#555;">' + escapeHtml(p.description || '') + '</div>';
            if (p.kpi) html += '<div style="font-size:0.65rem;color:#888;">KPI: ' + escapeHtml(p.kpi) + ' / ' + escapeHtml(p.duration || '') + '</div>';
            html += '<div id="plan-emp-' + t.theme_id + '-' + pi + '" style="margin-top:4px;"></div>';
            html += '</div>';
          });
          // 自由提案入力
          html += '<div style="margin-top:6px;padding-top:6px;border-top:1px solid #eee;">';
          html += '<div style="font-size:0.65rem;color:#999;margin-bottom:4px;">案D以降: メンバーからの自由提案</div>';
          html += '<div id="custom-plans-' + t.theme_id + '"></div>';
          html += '<div class="d-flex gap-1 mt-1 flex-wrap">';
          html += '<input type="text" id="custom-plan-title-' + t.theme_id + '" class="form-control form-control-sm" placeholder="プラン名" style="font-size:0.72rem;flex:2;min-width:80px;">';
          html += '<input type="text" id="custom-plan-desc-' + t.theme_id + '" class="form-control form-control-sm" placeholder="概要" style="font-size:0.72rem;flex:3;min-width:100px;">';
          html += '<input type="text" id="custom-plan-kpi-' + t.theme_id + '" class="form-control form-control-sm" placeholder="KPI" style="font-size:0.72rem;flex:1;min-width:60px;">';
          html += '<button class="btn btn-sm btn-warning" style="font-size:0.65rem;white-space:nowrap;" onclick="postCustomPlan(\'' + t.theme_id + '\')"><i class="fas fa-plus"></i></button>';
          html += '</div></div>';
          html += '</div>';
        }
      }
      // テーマ議論チャット
      if (cycle.status === 'candidate' || cycle.status === 'advisor_review') {
        html += '<div class="mt-2 p-2" style="background:#f8f9ff;border-radius:10px;border:1px solid #e0e0e0;">';
        html += '<div style="font-size:0.68rem;font-weight:700;color:#667eea;margin-bottom:6px;"><i class="fas fa-comments me-1"></i>メンバー議論</div>';
        html += '<div id="theme-disc-' + t.theme_id + '" style="max-height:150px;overflow-y:auto;margin-bottom:6px;font-size:0.75rem;"></div>';
        html += '<div class="d-flex gap-1">';
        html += '<input type="text" id="theme-disc-input-' + t.theme_id + '" class="form-control form-control-sm" placeholder="意見を入力..." style="font-size:0.75rem;">';
        html += '<button class="btn btn-sm btn-primary" style="font-size:0.68rem;white-space:nowrap;" onclick="postThemeDiscussion(\'' + t.theme_id + '\')"><i class="fas fa-paper-plane"></i></button>';
        html += '</div></div>';
      }
      html += '</div></div>';
    });
    html += '</div>';
    themesArea.innerHTML = html;
    // 各テーマのプラン共感・自由提案・議論を読み込み
    themes.forEach(function(t) {
      var plans = []; try { plans = JSON.parse(t.action_plans || '[]'); } catch(e) {}
      plans.forEach(function(p, pi) { loadPlanEmpathy(t.theme_id, pi); });
      loadCustomPlans(t.theme_id);
      loadThemeDiscussions(t.theme_id);
    });
  });
}

var THEME_EMPATHY_TYPES = [
  { key:'agree', icon:'👍', label:'賛成', color:'#43a047' },
  { key:'urgent', icon:'🔥', label:'最優先', color:'#e53935' },
  { key:'effective', icon:'💡', label:'効果的', color:'#ff9800' },
  { key:'engaging', icon:'👥', label:'巻き込める', color:'#1e88e5' },
  { key:'discuss', icon:'🤔', label:'要議論', color:'#9c27b0' },
  { key:'difficult', icon:'⚠️', label:'難しい', color:'#f57c00' },
  { key:'postpone', icon:'❌', label:'見送り', color:'#999' }
];

function loadThemeEmpathy(themeId) {
  var el = document.getElementById('theme-emp-' + themeId);
  if (!el) return;
  var memberId = currentAdminProfile ? currentAdminProfile.email : '';
  fetch('/api/themes/theme-empathy/' + themeId + '?memberId=' + encodeURIComponent(memberId), {
    headers: { 'Authorization': 'Bearer ' + getAdminToken() }
  }).then(function(r) { return r.json(); }).then(function(data) {
    if (!data.success) return;
    var countsMap = {};
    (data.counts || []).forEach(function(c) { countsMap[c.empathy_type] = c.count; });
    var myEmp = data.myEmpathy || [];

    var html = '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
    THEME_EMPATHY_TYPES.forEach(function(t) {
      var count = countsMap[t.key] || 0;
      var active = myEmp.indexOf(t.key) !== -1;
      html += '<button onclick="toggleThemeEmpathy(\'' + themeId + '\',\'' + t.key + '\')" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:16px;font-size:0.78rem;font-weight:700;cursor:pointer;border:2px solid ' + (active ? t.color : '#ddd') + ';background:' + (active ? t.color + '18' : 'white') + ';color:' + (active ? t.color : '#999') + ';">';
      html += t.icon + ' ' + t.label;
      if (count > 0) html += '<span style="background:' + (active ? t.color : '#eee') + ';color:' + (active ? 'white' : '#666') + ';border-radius:8px;padding:1px 7px;font-size:0.7rem;margin-left:3px;">' + count + '</span>';
      html += '</button>';
    });
    html += '</div>';
    el.innerHTML = html;
  }).catch(function() {});
}

function toggleThemeEmpathy(themeId, empathyType) {
  var memberId = currentAdminProfile ? currentAdminProfile.email : '';
  if (!memberId) { alert('ログインが必要です'); return; }
  fetch('/api/themes/theme-empathy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getAdminToken() },
    body: JSON.stringify({ themeId: themeId, memberId: memberId, empathyType: empathyType })
  }).then(function(r) { return r.json(); }).then(function() {
    loadThemeEmpathy(themeId);
  }).catch(function() {});
}

// テーマ採用/不採用トグル
function toggleThemeExclude(themeId, exclude) {
  var newStatus = exclude ? 'excluded' : 'candidate';
  api('/themes/update-theme-status', { themeId: themeId, status: newStatus }, getAdminToken()).then(function(res) {
    if (res && res.success) renderV2Dashboard();
    else alert(res.msg || 'エラー');
  });
}

// プラン案共感
function loadPlanEmpathy(themeId, planIndex) {
  var el = document.getElementById('plan-emp-' + themeId + '-' + planIndex);
  if (!el) return;
  var memberId = currentAdminProfile ? currentAdminProfile.email : '';
  fetch('/api/themes/plan-empathy/' + themeId + '?memberId=' + encodeURIComponent(memberId), {
    headers: { 'Authorization': 'Bearer ' + getAdminToken() }
  }).then(function(r) { return r.json(); }).then(function(data) {
    if (!data.success) return;
    var countsMap = {};
    (data.counts || []).filter(function(c) { return c.plan_index === planIndex; }).forEach(function(c) { countsMap[c.empathy_type] = c.count; });
    var myEmp = (data.myEmpathy || []).filter(function(e) { return e.plan_index === planIndex; }).map(function(e) { return e.empathy_type; });
    var html = '<div style="display:flex;flex-wrap:wrap;gap:3px;">';
    THEME_EMPATHY_TYPES.forEach(function(t) {
      var count = countsMap[t.key] || 0;
      var active = myEmp.indexOf(t.key) !== -1;
      html += '<button onclick="togglePlanEmpathy(\'' + themeId + '\',' + planIndex + ',\'' + t.key + '\')" style="display:inline-flex;align-items:center;gap:3px;padding:5px 10px;border-radius:14px;font-size:0.72rem;font-weight:700;cursor:pointer;border:1.5px solid ' + (active ? t.color : '#ddd') + ';background:' + (active ? t.color + '18' : 'white') + ';color:' + (active ? t.color : '#bbb') + ';">';
      html += t.icon + ' ' + t.label;
      if (count > 0) html += '<span style="background:' + (active ? t.color : '#eee') + ';color:' + (active ? 'white' : '#666') + ';border-radius:8px;padding:1px 6px;font-size:0.65rem;margin-left:2px;">' + count + '</span>';
      html += '</button>';
    });
    html += '</div>';
    el.innerHTML = html;
  });
}

function togglePlanEmpathy(themeId, planIndex, empathyType) {
  var memberId = currentAdminProfile ? currentAdminProfile.email : '';
  fetch('/api/themes/plan-empathy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getAdminToken() },
    body: JSON.stringify({ themeId: themeId, planIndex: planIndex, memberId: memberId, empathyType: empathyType })
  }).then(function() { loadPlanEmpathy(themeId, planIndex); });
}

// メンバー自由提案
function loadCustomPlans(themeId) {
  var el = document.getElementById('custom-plans-' + themeId);
  if (!el) return;
  var memberId = currentAdminProfile ? currentAdminProfile.email : '';
  fetch('/api/themes/custom-plans/' + themeId + '?memberId=' + encodeURIComponent(memberId), {
    headers: { 'Authorization': 'Bearer ' + getAdminToken() }
  }).then(function(r) { return r.json(); }).then(function(data) {
    if (!data.success || !data.plans.length) { el.innerHTML = ''; return; }
    var html = '';
    data.plans.forEach(function(p, idx) {
      var letter = String.fromCharCode(68 + idx); // D, E, F...
      html += '<div style="padding:5px 8px;margin-bottom:4px;background:white;border-radius:6px;border-left:3px solid #9c27b0;">';
      html += '<div style="font-size:0.7rem;font-weight:700;color:#9c27b0;">案' + letter + ': ' + escapeHtml(p.title) + ' <span style="font-size:0.6rem;color:#bbb;">(' + escapeHtml(p.member_name) + ')</span></div>';
      if (p.description) html += '<div style="font-size:0.65rem;color:#555;">' + escapeHtml(p.description) + '</div>';
      if (p.kpi) html += '<div style="font-size:0.62rem;color:#888;">KPI: ' + escapeHtml(p.kpi) + '</div>';
      // 共感ボタン
      var countsMap = {};
      (p.empathy || []).forEach(function(e) { countsMap[e.empathy_type] = e.count; });
      var myEmp = p.myEmpathy || [];
      html += '<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:3px;">';
      THEME_EMPATHY_TYPES.forEach(function(t) {
        var count = countsMap[t.key] || 0;
        var active = myEmp.indexOf(t.key) !== -1;
        html += '<button onclick="toggleCustomPlanEmpathy(' + p.id + ',\'' + themeId + '\',\'' + t.key + '\')" style="display:inline-flex;align-items:center;gap:3px;padding:5px 10px;border-radius:14px;font-size:0.72rem;font-weight:700;cursor:pointer;border:1.5px solid ' + (active ? t.color : '#ddd') + ';background:' + (active ? t.color + '18' : 'white') + ';color:' + (active ? t.color : '#bbb') + ';">';
        html += t.icon + ' ' + t.label;
        if (count > 0) html += '<span style="background:' + (active ? t.color : '#eee') + ';color:' + (active ? 'white' : '#666') + ';border-radius:8px;padding:1px 6px;font-size:0.65rem;margin-left:2px;">' + count + '</span>';
        html += '</button>';
      });
      html += '</div></div>';
    });
    el.innerHTML = html;
  });
}

function postCustomPlan(themeId) {
  var titleInput = document.getElementById('custom-plan-title-' + themeId);
  var descInput = document.getElementById('custom-plan-desc-' + themeId);
  if (!titleInput || !titleInput.value.trim()) { alert('プラン名を入力してください'); return; }
  var memberName = currentAdminProfile ? currentAdminProfile.name : '不明';
  var kpiInput = document.getElementById('custom-plan-kpi-' + themeId);
  fetch('/api/themes/custom-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getAdminToken() },
    body: JSON.stringify({ themeId: themeId, memberName: memberName, title: titleInput.value.trim(), description: (descInput ? descInput.value.trim() : ''), kpi: (kpiInput ? kpiInput.value.trim() : '') })
  }).then(function(r) { return r.json(); }).then(function(data) {
    if (data.success) { titleInput.value = ''; if (descInput) descInput.value = ''; if (kpiInput) kpiInput.value = ''; loadCustomPlans(themeId); }
  });
}

function toggleCustomPlanEmpathy(customPlanId, themeId, empathyType) {
  var memberId = currentAdminProfile ? currentAdminProfile.email : '';
  fetch('/api/themes/custom-plan-empathy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getAdminToken() },
    body: JSON.stringify({ customPlanId: customPlanId, memberId: memberId, empathyType: empathyType })
  }).then(function() { loadCustomPlans(themeId); });
}

function loadThemeDiscussions(themeId) {
  var el = document.getElementById('theme-disc-' + themeId);
  if (!el) return;
  fetch('/api/themes/theme-discussions/' + themeId, {
    headers: { 'Authorization': 'Bearer ' + getAdminToken() }
  }).then(function(r) { return r.json(); }).then(function(data) {
    if (!data.success || !data.discussions.length) {
      el.innerHTML = '<div style="color:#bbb;font-size:0.7rem;text-align:center;">まだ議論がありません</div>';
      return;
    }
    el.innerHTML = data.discussions.map(function(d) {
      var time = d.created_at ? d.created_at.substring(5, 16).replace('T', ' ') : '';
      return '<div style="margin-bottom:4px;"><strong style="color:#667eea;">' + escapeHtml(d.member_name) + '</strong> <span style="color:#bbb;font-size:0.65rem;">' + time + '</span><br>' + escapeHtml(d.message) + '</div>';
    }).join('');
    el.scrollTop = el.scrollHeight;
  }).catch(function() {});
}

function postThemeDiscussion(themeId) {
  var input = document.getElementById('theme-disc-input-' + themeId);
  if (!input || !input.value.trim()) return;
  var memberName = currentAdminProfile ? currentAdminProfile.name : '不明';
  fetch('/api/themes/theme-discussion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getAdminToken() },
    body: JSON.stringify({ themeId: themeId, memberName: memberName, message: input.value.trim() })
  }).then(function(r) { return r.json(); }).then(function(data) {
    if (data.success) {
      input.value = '';
      loadThemeDiscussions(themeId);
    }
  }).catch(function() {});
}

function doDirectDecide(cycleNum) {
  getCurrentCycle('').then(function(res) {
    if (!res.success || !res.themes || res.themes.length === 0) { alert('テーマがありません'); return; }
    var themes = res.themes;
    var msg = 'テーマを1つ選んで直接決定します。番号を入力してください:\n\n';
    themes.forEach(function(t, i) { msg += (i+1) + '. ' + (t.icon||'') + ' ' + t.name + '（' + t.post_count + '件, 共感' + t.vote_count + '）\n'; });
    var choice = prompt(msg);
    if (!choice) return;
    var idx = parseInt(choice) - 1;
    if (isNaN(idx) || idx < 0 || idx >= themes.length) { alert('無効な番号です'); return; }
    var selected = themes[idx];
    if (!confirm('「' + selected.name + '」に決定しますか？')) return;
    // 直接finalize（投票をスキップ）
    api('/themes/direct-decide', { cycleNumber: cycleNum, themeId: selected.theme_id }, getAdminToken()).then(function(r) {
      if (r.success) { alert('「' + selected.name + '」に決定しました'); renderV2Dashboard(); }
      else alert('エラー: ' + r.msg);
    });
  });
}

function doEditTheme(themeId, name, description, icon) {
  var newName = prompt('テーマ名:', name);
  if (newName === null) return;
  var newDesc = prompt('説明（重要な理由）:', description);
  if (newDesc === null) return;
  var newIcon = prompt('アイコン（絵文字1つ）:', icon);
  if (newIcon === null) return;
  updateTheme(themeId, newName, newDesc, newIcon).then(function(res) {
    if (res.success) renderV2Dashboard();
    else alert('エラー: ' + res.msg);
  });
}

function doDeleteTheme(themeId, name) {
  if (!confirm('テーマ「' + name + '」を削除しますか？')) return;
  api('/themes/delete-theme', { themeId: themeId }, getAdminToken()).then(function(res) {
    if (res.success) renderV2Dashboard();
    else alert('エラー: ' + res.msg);
  });
}

function doGenerateThemes() {
  if (!confirm('AIテーマ凝集を実行しますか？直近3ヶ月の投稿を分析します。\n\n※未評価の投稿は自動で7軸評価してから凝集します')) return;
  showLoading('未評価の投稿を7軸評価中...');
  api('/admin/auto-evaluate-all', {}, getAdminToken()).then(function(evalRes) {
    if (!evalRes.success) { hideLoading(); alert('7軸評価エラー: ' + (evalRes.msg || '不明')); return; }
    if (evalRes.status === 'complete') {
      // 全て評価済み — そのまま凝集へ
      hideLoading();
      showEvalReport(evalRes, function() {
        showLoading('AIがテーマを分析中...');
        generateThemes().then(function(res) {
          hideLoading();
          if (res.success) {
            alert('サイクル #' + res.cycleNumber + ' のテーマ候補を' + res.themes.length + '件生成しました');
            renderV2Dashboard();
          } else { alert('エラー: ' + (res.msg || '不明')); }
        });
      });
    } else {
      // バックグラウンド処理開始 — ポーリングで進捗確認
      pollEvalProgress(function(finalRes) {
        hideLoading();
        showEvalReport(finalRes, function() {
          showLoading('AIがテーマを分析中...');
          generateThemes().then(function(res) {
            hideLoading();
            if (res.success) {
              alert('サイクル #' + res.cycleNumber + ' のテーマ候補を' + res.themes.length + '件生成しました');
              renderV2Dashboard();
            } else { alert('エラー: ' + (res.msg || '不明')); }
          });
        });
      });
    }
  });
}

function pollEvalProgress(callback) {
  var pollTimer = setInterval(function() {
    api('/admin/auto-evaluate-status', undefined, getAdminToken()).then(function(res) {
      if (!res.success) return;
      var pct = res.total > 0 ? Math.round((res.evaluated + res.failed) / res.total * 100) : 0;
      var loadingText = document.getElementById('loading-text');
      if (loadingText) loadingText.textContent = '7軸評価中... ' + (res.evaluated + res.failed) + '/' + res.total + '件 (' + pct + '%) 成功:' + res.evaluated + ' 失敗:' + res.failed;
      if (res.status === 'complete' || res.status === 'idle') {
        clearInterval(pollTimer);
        callback(res);
      }
    });
  }, 5000);
}

function showEvalReport(evalRes, onProceed) {
  // モーダル生成
  var existing = document.getElementById('eval-report-modal');
  if (existing) existing.remove();

  var axisLabels = { legal:'法的', risk:'危険度', freq:'頻度', urgency:'緊急', safety:'安全', value_score:'価値', needs:'ニーズ' };

  var html = '<div id="eval-report-modal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(2px);">';
  html += '<div style="background:white;border-radius:16px;width:90%;max-width:800px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.25);">';
  // ヘッダー
  html += '<div style="padding:16px 20px;border-bottom:2px solid #667eea;display:flex;justify-content:space-between;align-items:center;">';
  html += '<div><div style="font-weight:800;font-size:1rem;color:#2c3e50;"><i class="fas fa-chart-bar" style="color:#667eea;margin-right:6px;"></i>7軸評価レポート</div>';
  html += '<div style="font-size:0.75rem;color:#999;">全' + (evalRes.allEvaluations || []).length + '件 ';
  if (evalRes.evaluated > 0) html += '（今回新規' + evalRes.evaluated + '件評価）';
  html += '</div></div>';
  html += '<button onclick="document.getElementById(\'eval-report-modal\').remove()" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:#999;">✕</button>';
  html += '</div>';
  // 本体（スクロール）
  html += '<div style="flex:1;overflow-y:auto;padding:16px 20px;">';

  var allEvals = evalRes.allEvaluations || [];
  if (allEvals.length === 0) {
    html += '<div style="text-align:center;color:#ccc;padding:40px;">評価データがありません</div>';
  } else {
    allEvals.forEach(function(ev, i) {
      var isNew = (evalRes.newResults || []).some(function(nr) { return nr.postId === ev.post_id; });
      var barColor = ev.total_score >= 25 ? '#e53935' : ev.total_score >= 18 ? '#ff9800' : '#4caf50';
      html += '<div style="margin-bottom:12px;padding:12px;border-radius:10px;background:' + (isNew ? '#fff8e1' : '#fafafa') + ';border:1px solid ' + (isNew ? '#ffe082' : '#eee') + ';">';
      // 上段：名前・スコア
      html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">';
      html += '<span style="font-weight:800;font-size:0.85rem;color:#333;">' + (i+1) + '. ' + escapeHtml(ev.nickname || '不明') + '</span>';
      if (isNew) html += '<span style="font-size:0.6rem;background:#ff9800;color:white;padding:1px 6px;border-radius:8px;font-weight:700;">NEW</span>';
      html += '<span style="margin-left:auto;font-weight:800;font-size:0.9rem;color:' + barColor + ';">' + ev.total_score + '/35</span>';
      html += '</div>';
      // 投稿内容
      html += '<div style="font-size:0.78rem;color:#666;margin-bottom:6px;line-height:1.4;">' + escapeHtml(ev.content_short || '') + '</div>';
      // 7軸バー
      html += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">';
      ['legal','risk','freq','urgency','safety','value_score','needs'].forEach(function(key) {
        var val = ev[key] || 1;
        var bgColor = val >= 4 ? '#e53935' : val >= 3 ? '#ff9800' : '#4caf50';
        html += '<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:8px;font-size:0.68rem;font-weight:700;background:' + bgColor + '22;color:' + bgColor + ';border:1px solid ' + bgColor + '44;">' + axisLabels[key] + ' ' + val + '</span>';
      });
      html += '</div>';
      // 根拠
      if (ev.reasoning) {
        html += '<div style="font-size:0.72rem;color:#555;line-height:1.5;background:white;padding:6px 10px;border-radius:8px;border-left:3px solid #667eea;"><i class="fas fa-lightbulb" style="color:#667eea;margin-right:4px;"></i>' + escapeHtml(ev.reasoning) + '</div>';
      }
      // ガイドライン
      if (ev.guideline_refs) {
        html += '<div style="font-size:0.65rem;color:#888;margin-top:4px;"><i class="fas fa-book" style="margin-right:3px;"></i>' + escapeHtml(ev.guideline_refs) + '</div>';
      }
      html += '</div>';
    });
  }
  html += '</div>';
  // フッター
  html += '<div style="padding:12px 20px;border-top:1px solid #eee;display:flex;justify-content:flex-end;gap:10px;">';
  html += '<button onclick="document.getElementById(\'eval-report-modal\').remove()" style="padding:8px 20px;border:1px solid #ddd;border-radius:10px;background:white;font-size:0.85rem;font-weight:700;cursor:pointer;color:#666;">キャンセル</button>';
  html += '<button id="eval-proceed-btn" style="padding:8px 24px;border:none;border-radius:10px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;font-size:0.85rem;font-weight:800;cursor:pointer;box-shadow:0 3px 10px rgba(102,126,234,0.3);"><i class="fas fa-magic" style="margin-right:6px;"></i>この評価で凝集を実行</button>';
  html += '</div></div></div>';

  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('eval-proceed-btn').onclick = function() {
    document.getElementById('eval-report-modal').remove();
    onProceed();
  };
}

function doDeleteCycle(cycleNum) {
  if (!confirm('サイクル #' + cycleNum + ' を削除しますか？テーマ・投票・チャレンジも全て削除されます。')) return;
  api('/themes/delete-cycle', { cycleNumber: cycleNum }, getAdminToken()).then(function(res) {
    if (res.success) { alert('削除しました'); renderV2Dashboard(); }
    else alert('エラー: ' + res.msg);
  });
}

// 保健師に助言を依頼
function doRequestAdvisorReview(cycleNum) {
  if (!confirm('テーマ候補を保健師に助言依頼しますか？')) return;
  api('/themes/change-status', { cycleNumber: cycleNum, status: 'advisor_review' }, getAdminToken()).then(function(res) {
    if (res.success) { alert('保健師助言待ちに移行しました。アンバサダー画面またはこの画面から助言を入力してください。'); renderV2Dashboard(); }
    else alert('エラー: ' + res.msg);
  });
}

// 助言確認→役員承認へ
function doSubmitAdvisorAdvice(cycleNum) {
  var advice = prompt('保健師からの助言内容を入力（または確認済みならそのままOK）:');
  if (advice === null) return;
  api('/themes/submit-advisor-advice', { cycleNumber: cycleNum, advisorComment: advice }, getAdminToken()).then(function(res) {
    if (res.success) { alert('役員承認待ちに移行しました'); renderV2Dashboard(); }
    else alert('エラー: ' + res.msg);
  });
}

// 精査に戻す
function doBackToCandidate(cycleNum) {
  if (!confirm('精査段階に戻しますか？')) return;
  api('/themes/change-status', { cycleNumber: cycleNum, status: 'candidate' }, getAdminToken()).then(function(res) {
    if (res.success) renderV2Dashboard();
    else alert('エラー: ' + res.msg);
  });
}

// 役員承認
function doExecApprove(cycleNum) {
  if (!currentAdminProfile || !currentAdminProfile.isExec) { alert('役員権限がありません'); return; }
  var comment = prompt('役員コメント（任意）:');
  if (comment === null) return;
  var approverName = currentAdminProfile.name || 'Unknown';
  var fullComment = '【承認: ' + approverName + '】' + (comment || '承認');
  api('/themes/exec-approve', { cycleNumber: cycleNum, execComment: fullComment, decision: 'approved', approverEmail: currentAdminProfile.email }, getAdminToken()).then(function(res) {
    if (res.success) { alert('役員承認完了（承認者: ' + approverName + '）。全社投票が開始されました。'); renderV2Dashboard(); }
    else alert('エラー: ' + res.msg);
  });
}

// 役員差戻し
function doExecReject(cycleNum) {
  if (!currentAdminProfile || !currentAdminProfile.isExec) { alert('役員権限がありません'); return; }
  var reason = prompt('差戻し理由:');
  if (!reason) return;
  var approverName = currentAdminProfile.name || 'Unknown';
  var fullReason = '【差戻し: ' + approverName + '】' + reason;
  api('/themes/exec-approve', { cycleNumber: cycleNum, execComment: fullReason, decision: 'rejected', approverEmail: currentAdminProfile.email }, getAdminToken()).then(function(res) {
    if (res.success) { alert('差戻しました（' + approverName + '）。テーマを再精査してください。'); renderV2Dashboard(); }
    else alert('エラー: ' + res.msg);
  });
}

function doStartVoting(cycleNum) {
  if (!confirm('投票を開始しますか？（7日間）')) return;
  startVoting(cycleNum, 7).then(function(res) {
    if (res.success) { alert('投票を開始しました'); renderV2Dashboard(); }
    else alert('エラー: ' + res.msg);
  });
}

function doFinalizeVoting(cycleNum) {
  if (!confirm('投票を締め切り、1位テーマを確定しますか？')) return;
  finalizeVoting(cycleNum).then(function(res) {
    if (res.success) { alert('テーマ「' + res.winner.name + '」が確定しました'); renderV2Dashboard(); }
    else alert('エラー: ' + res.msg);
  });
}

function doGenerateChallenge(themeId) {
  if (!confirm('選出テーマからチャレンジ（アクションプラン）をAI自動生成しますか？')) return;
  showLoading('AIがチャレンジを設計中...');
  generateChallenge(themeId).then(function(res) {
    hideLoading();
    if (res.success) {
      alert('チャレンジ「' + res.plan.title + '」を生成しました');
      switchTab('v2challenge');
      renderV2Challenges();
    } else {
      alert('エラー: ' + (res.msg || '不明'));
    }
  });
}

// ============================================================
// チャレンジ管理
// ============================================================
function renderV2Challenges() {
  getChallenges().then(function(res) {
    var area = document.getElementById('v2-challenges-list');
    if (!res || !res.success || !res.challenges.length) {
      area.innerHTML = '<div class="text-center py-5 text-muted"><div style="font-size:2rem; margin-bottom:10px;">🔥</div><div>チャレンジはまだありません<br><small>ダッシュボードからテーマを選出してチャレンジを生成してください</small></div></div>';
      return;
    }
    var html = '';
    res.challenges.forEach(function(c) {
      var statusBadge = c.status === 'draft' ? '<span class="badge bg-secondary">下書き</span>' :
                        c.status === 'recruiting' ? '<span class="badge bg-info">エントリー受付中</span>' :
                        c.status === 'active' ? '<span class="badge bg-success">実施中</span>' :
                        c.status === 'completed' ? '<span class="badge bg-dark">完了</span>' :
                        '<span class="badge bg-light text-dark">' + c.status + '</span>';
      var kpis = c.kpi_definitions || [];
      html += '<div class="plan-card mb-3">';
      html += '<div class="d-flex justify-content-between align-items-start mb-2">';
      html += '<div><div class="fw-bold fs-5">' + (c.icon || '💪') + ' ' + escapeHtml(c.title) + '</div>';
      html += '<div class="text-muted small">' + (c.period_start || '未定') + ' 〜 ' + (c.period_end || '未定') + ' / ' + c.duration_days + '日間</div></div>';
      html += statusBadge;
      html += '</div>';
      html += '<div class="small mb-2">' + escapeHtml(c.description || '') + '</div>';
      // エビデンス根拠
      var aiDraft = null; try { aiDraft = JSON.parse(c.ai_draft || '{}'); } catch(e) {}
      if (aiDraft && aiDraft.evidence_based) {
        html += '<div class="p-2 mb-2" style="background:#fff8e1; border-radius:8px; border-left:3px solid #f9a825;">';
        html += '<div style="font-size:0.68rem; font-weight:700; color:#f57f17;"><i class="fas fa-book me-1"></i>エビデンス根拠</div>';
        html += '<div style="font-size:0.78rem; color:#555;">' + escapeHtml(aiDraft.evidence_based) + '</div>';
        html += '</div>';
      }
      if (aiDraft && aiDraft.east_design) {
        var east = aiDraft.east_design;
        html += '<div class="p-2 mb-2" style="background:#e8f5e9; border-radius:8px; border-left:3px solid #43a047;">';
        html += '<div style="font-size:0.68rem; font-weight:700; color:#2e7d32;"><i class="fas fa-lightbulb me-1"></i>EAST設計</div>';
        html += '<div style="font-size:0.72rem; color:#555; display:grid; grid-template-columns:1fr 1fr; gap:4px;">';
        if (east.easy) html += '<div><strong>Easy:</strong> ' + escapeHtml(east.easy) + '</div>';
        if (east.attractive) html += '<div><strong>Attractive:</strong> ' + escapeHtml(east.attractive) + '</div>';
        if (east.social) html += '<div><strong>Social:</strong> ' + escapeHtml(east.social) + '</div>';
        if (east.timely) html += '<div><strong>Timely:</strong> ' + escapeHtml(east.timely) + '</div>';
        html += '</div></div>';
      }
      // KPI定義
      if (kpis.length > 0) {
        html += '<div class="mb-2"><span class="small fw-bold text-muted">記録項目:</span>';
        kpis.forEach(function(k) { html += ' <span class="badge bg-light text-dark" style="font-size:0.7rem;">' + escapeHtml(k.question || '') + '</span>'; });
        html += '</div>';
      }
      html += '<div class="small text-muted mb-2"><i class="fas fa-users me-1"></i>参加者: ' + (c.participantCount || 0) + '名</div>';
      // バディー反応集計表示エリア
      html += '<div id="challenge-reaction-' + c.challenge_id + '" class="mb-2"></div>';
      // アクション
      html += '<div class="d-flex gap-2 mt-2">';
      if (c.status === 'draft') {
        html += '<button class="btn btn-outline-primary btn-sm fw-bold" onclick="doStartRecruiting(\'' + c.challenge_id + '\')"><i class="fas fa-bullhorn me-1"></i>エントリー受付開始</button>';
        html += '<button class="btn btn-outline-secondary btn-sm" onclick="editChallenge(\'' + c.challenge_id + '\')"><i class="fas fa-edit me-1"></i>編集</button>';
      } else if (c.status === 'recruiting') {
        html += '<button class="btn btn-success btn-sm fw-bold" onclick="doStartChallengeExec(\'' + c.challenge_id + '\')"><i class="fas fa-play me-1"></i>チャレンジ開始</button>';
      } else if (c.status === 'active') {
        html += '<button class="btn btn-outline-info btn-sm fw-bold" onclick="viewChallengeDashboard(\'' + c.challenge_id + '\')"><i class="fas fa-chart-line me-1"></i>KPIダッシュボード</button>';
        html += '<button class="btn btn-outline-warning btn-sm" onclick="doGenerateReport(\'' + c.challenge_id + '\',\'midterm\')"><i class="fas fa-file-alt me-1"></i>中間レポート</button>';
      } else if (c.status === 'completed') {
        html += '<button class="btn btn-outline-dark btn-sm" onclick="doGenerateReport(\'' + c.challenge_id + '\',\'final\')"><i class="fas fa-file-pdf me-1"></i>最終レポート</button>';
      }
      html += '</div>';
      html += '</div>';
    });
    area.innerHTML = html;
    // 各チャレンジの反応集計を取得
    res.challenges.forEach(function(c) {
      loadChallengeReactions(c.challenge_id);
    });
  });
}

function loadChallengeReactions(challengeId) {
  fetch('/api/chat/challenge-reactions/' + challengeId, {
    headers: { 'Authorization': 'Bearer ' + getToken() }
  }).then(function(r) { return r.json(); }).then(function(data) {
    var el = document.getElementById('challenge-reaction-' + challengeId);
    if (!el || !data.success || data.total === 0) return;
    var labels = { want_to_try: { text:'やってみたい', color:'#20c997', icon:'🙋' }, interested: { text:'興味がある', color:'#667eea', icon:'💡' }, too_much: { text:'ちょっと面倒', color:'#ff9800', icon:'😅' }, already_in: { text:'もう参加中', color:'#e91e63', icon:'✅' } };
    var html = '<div style="padding:8px 10px;background:#f8f9ff;border-radius:10px;border-left:3px solid #667eea;">';
    html += '<div style="font-size:0.68rem;font-weight:700;color:#667eea;margin-bottom:6px;"><i class="fas fa-comment-dots me-1"></i>バディー経由の反応（' + data.total + '件）</div>';
    data.reactions.forEach(function(r) {
      var l = labels[r.reaction] || { text:r.reaction, color:'#999', icon:'❓' };
      var pct = Math.round(r.count / data.total * 100);
      html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">';
      html += '<span style="font-size:0.7rem;min-width:100px;">' + l.icon + ' ' + l.text + '</span>';
      html += '<div style="flex:1;height:16px;background:#e0e0e0;border-radius:8px;overflow:hidden;">';
      html += '<div style="height:100%;width:' + pct + '%;background:' + l.color + ';border-radius:8px;transition:width 0.3s;"></div>';
      html += '</div>';
      html += '<span style="font-size:0.68rem;font-weight:700;color:#555;min-width:40px;text-align:right;">' + r.count + '(' + pct + '%)</span>';
      html += '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
  }).catch(function() {});
}

function doStartRecruiting(cid) {
  if (!confirm('エントリー受付を開始しますか？ユーザー画面にチャレンジが表示されます。')) return;
  startRecruiting(cid).then(function(res) {
    if (res.success) { alert('エントリー受付を開始しました'); renderV2Challenges(); }
    else alert('エラー: ' + res.msg);
  });
}

function doStartChallengeExec(cid) {
  if (!confirm('チャレンジを開始しますか？本日から計測が始まります。')) return;
  startChallenge(cid).then(function(res) {
    if (res.success) { alert('チャレンジを開始しました'); renderV2Challenges(); }
    else alert('エラー: ' + res.msg);
  });
}

function editChallenge(cid) {
  getChallengeDetail(cid, '').then(function(res) {
    if (!res.success) return;
    var c = res.challenge;
    var title = prompt('チャレンジ名:', c.title);
    if (title === null) return;
    var desc = prompt('説明:', c.description);
    if (desc === null) return;
    updateChallenge(cid, title, desc, c.icon, c.kpi_definitions, c.duration_days).then(function(r) {
      if (r.success) renderV2Challenges();
    });
  });
}

// ============================================================
// KPIダッシュボード
// ============================================================
function renderV2KpiSelector() {
  getChallenges().then(function(res) {
    var area = document.getElementById('v2-kpi-selector');
    if (!res.success || !res.challenges.length) {
      area.innerHTML = '';
      document.getElementById('v2-kpi-dashboard').innerHTML = '<div class="text-center py-5 text-muted">チャレンジがまだありません</div>';
      return;
    }
    var html = '<div class="d-flex gap-2 flex-wrap">';
    res.challenges.forEach(function(c, i) {
      var active = i === 0 ? 'btn-primary' : 'btn-outline-primary';
      html += '<button class="btn ' + active + ' btn-sm fw-bold v2-kpi-btn" onclick="viewChallengeDashboard(\'' + c.challenge_id + '\', this)">' + (c.icon || '💪') + ' ' + escapeHtml(c.title) + '</button>';
    });
    html += '</div>';
    area.innerHTML = html;
    // 最初のチャレンジを表示
    if (res.challenges.length > 0) viewChallengeDashboard(res.challenges[0].challenge_id);
  });
}

function viewChallengeDashboard(cid, btn) {
  if (btn) {
    document.querySelectorAll('.v2-kpi-btn').forEach(function(b) { b.className = b.className.replace('btn-primary', 'btn-outline-primary'); });
    btn.className = btn.className.replace('btn-outline-primary', 'btn-primary');
  }
  getChallengeDashboard(cid).then(function(res) {
    var area = document.getElementById('v2-kpi-dashboard');
    if (!res.success) { area.innerHTML = '<div class="alert alert-danger">エラー: ' + res.msg + '</div>'; return; }
    var s = res.stats;
    var c = res.challenge;

    var html = '';
    // KPIカード
    html += '<div class="row g-3 mb-4">';
    html += kpiCard('参加率', s.participationRate + '%', '目標 ' + Math.round((c.target_participation_rate || 0.5) * 100) + '%', s.participationRate >= (c.target_participation_rate || 0.5) * 100 ? '#43a047' : '#f39c12', 'fas fa-users', s.participants + '/' + s.totalUsers + '名');
    html += kpiCard('継続率', s.continuationRate + '%', '今週の記録者', s.continuationRate >= 70 ? '#43a047' : s.continuationRate >= 40 ? '#f39c12' : '#e53935', 'fas fa-fire', s.weeklyActive + '/' + s.participants + '名');
    html += kpiCard('記録日数', s.dailyRecords.length + '日', c.period_start ? '開始: ' + c.period_start : '', '#667eea', 'fas fa-calendar-check', '累計記録');
    html += '</div>';

    // 日別記録数グラフ（簡易テキスト版）
    html += '<div class="plan-card mb-3"><div class="fw-bold mb-2"><i class="fas fa-chart-bar text-primary me-1"></i>日別記録数</div>';
    if (s.dailyRecords.length > 0) {
      var maxCnt = Math.max.apply(null, s.dailyRecords.map(function(d) { return d.cnt; }));
      s.dailyRecords.slice(-14).forEach(function(d) {
        var pct = Math.round(d.cnt / Math.max(maxCnt, 1) * 100);
        html += '<div class="d-flex align-items-center gap-2 mb-1">';
        html += '<span style="width:60px; font-size:0.7rem; color:#999;">' + d.record_date.substring(5) + '</span>';
        html += '<div style="flex:1; height:16px; background:#f0f0f0; border-radius:8px; overflow:hidden;">';
        html += '<div style="height:100%; width:' + pct + '%; background:linear-gradient(90deg,#667eea,#764ba2); border-radius:8px;"></div></div>';
        html += '<span style="width:30px; font-size:0.75rem; font-weight:700; text-align:right;">' + d.cnt + '</span>';
        html += '</div>';
      });
    } else {
      html += '<div class="text-center text-muted small py-3">まだ記録がありません</div>';
    }
    html += '</div>';

    // 部署別
    if (s.deptStats && s.deptStats.length > 0) {
      html += '<div class="plan-card mb-3"><div class="fw-bold mb-2"><i class="fas fa-building text-success me-1"></i>部署別参加者</div>';
      s.deptStats.forEach(function(d) {
        html += '<div class="d-flex justify-content-between align-items-center py-1 border-bottom"><span class="small">' + escapeHtml(d.department || '不明') + '</span><span class="badge bg-primary">' + d.cnt + '名</span></div>';
      });
      html += '</div>';
    }

    // レポート生成ボタン
    html += '<div class="d-flex gap-2">';
    html += '<button class="btn btn-outline-warning fw-bold" onclick="doGenerateReport(\'' + cid + '\',\'midterm\')"><i class="fas fa-file-alt me-1"></i>中間レポート生成（AI）</button>';
    html += '<button class="btn btn-outline-dark fw-bold" onclick="doGenerateReport(\'' + cid + '\',\'final\')"><i class="fas fa-file-pdf me-1"></i>最終レポート生成（AI）</button>';
    html += '</div>';

    area.innerHTML = html;
  });
}

function kpiCard(title, value, sub1, color, icon, sub2) {
  return '<div class="col-md-4"><div class="plan-card text-center" style="border-top:3px solid ' + color + ';">' +
    '<div style="font-size:0.75rem; color:#999; margin-bottom:4px;"><i class="' + icon + ' me-1"></i>' + title + '</div>' +
    '<div style="font-size:1.8rem; font-weight:900; color:' + color + ';">' + value + '</div>' +
    '<div style="font-size:0.7rem; color:#bbb;">' + (sub1 || '') + '</div>' +
    '<div style="font-size:0.7rem; color:#999;">' + (sub2 || '') + '</div>' +
    '</div></div>';
}

// ============================================================
// AIレポート生成
// ============================================================
function doGenerateReport(cid, type) {
  var label = type === 'midterm' ? '中間レポート' : '最終レポート';
  if (!confirm(label + 'をAIで生成しますか？')) return;
  showLoading('AIが' + label + 'を作成中...');

  getChallengeDashboard(cid).then(function(dashRes) {
    if (!dashRes.success) { hideLoading(); alert('データ取得エラー'); return; }

    getChallengeRanking(cid).then(function(rankRes) {
      var s = dashRes.stats;
      var c = dashRes.challenge;
      var rankings = rankRes.success ? rankRes.rankings : {};
      var comments = rankRes.success ? rankRes.recentComments : [];

      var prompt = type === 'midterm' ?
        '健康アクションプラン「' + c.title + '」の中間レポートを作成してください。' :
        '健康アクションプラン「' + c.title + '」の最終成果レポートを作成してください。役員報告用です。';

      prompt += '\n\n【プラン概要】' + c.description +
        '\n期間: ' + (c.period_start || '?') + ' 〜 ' + (c.period_end || '?') +
        '\n\n【KPI実績】' +
        '\n参加率: ' + s.participationRate + '% (' + s.participants + '/' + s.totalUsers + '名)' +
        '\n継続率: ' + s.continuationRate + '% (今週の記録者: ' + s.weeklyActive + '名)' +
        '\n記録日数: ' + s.dailyRecords.length + '日分';

      if (s.deptStats) {
        prompt += '\n\n【部署別参加者】';
        s.deptStats.forEach(function(d) { prompt += '\n' + (d.department || '不明') + ': ' + d.cnt + '名'; });
      }

      var topRankers = (rankings.total || []).slice(0, 5);
      if (topRankers.length > 0) {
        prompt += '\n\n【ランキング上位】';
        topRankers.forEach(function(u, i) { prompt += '\n' + (i+1) + '位 ' + u.nickname + ' (累計: ' + u.totalValue + ', 記録: ' + u.recordCount + '回)'; });
      }

      if (comments.length > 0) {
        prompt += '\n\n【参加者のコメント】';
        comments.slice(0, 10).forEach(function(c) { prompt += '\n- ' + c.nickname + ': ' + c.comment; });
      }

      prompt += '\n\n【出力形式】マークダウン形式で、以下のセクションを含めてください:\n1. 実施概要\n2. KPI達成状況\n3. 成果・効果分析\n4. 参加者の声\n5. 課題と改善点\n6. 次回への提言';

      // Groq APIを直接呼ぶ代わりにサーバーサイドのエンドポイントを使う
      // 簡易的にbrainstormエンドポイントを活用
      fetch(API_BASE + '/plans/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getAdminToken() },
        body: JSON.stringify({ theme: c.title, background: prompt })
      }).then(function(r) { return r.json(); }).then(function(aiRes) {
        hideLoading();
        if (aiRes && aiRes.success && aiRes.ideas) {
          showReportModal(label, aiRes.ideas);
        } else {
          alert('レポート生成に失敗しました');
        }
      }).catch(function() {
        hideLoading();
        alert('通信エラー');
      });
    });
  });
}

function showReportModal(title, content) {
  var modal = document.getElementById('proposal-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  document.getElementById('prop-category').innerText = title;
  var titleInput = document.getElementById('proposal-title-input');
  if (titleInput) titleInput.value = title;
  var blocksArea = document.getElementById('proposal-blocks-area');
  if (blocksArea) {
    blocksArea.innerHTML = '<div style="white-space:pre-wrap; font-size:0.9rem; line-height:1.8; padding:20px;">' + escapeHtml(content).replace(/\n/g, '<br>') + '</div>';
  }
  // 不要なボタンを隠す
  var execBtn = document.getElementById('btn-exec-from-modal');
  if (execBtn) execBtn.style.display = 'none';
}

// ============================================================
// 専門家連携（アンバサダー）
// ============================================================
function renderV2Ambassador() {
  var area = document.getElementById('v2-ambassador-area');
  getChallenges().then(function(res) {
    if (!res.success || !res.challenges.length) {
      area.innerHTML = '<div class="text-center py-5 text-muted">チャレンジがまだありません</div>';
      return;
    }
    var html = '';
    // アンバサダー登録フォーム
    html += '<div class="plan-card mb-4">';
    html += '<div class="fw-bold mb-2"><i class="fas fa-user-plus text-purple me-1"></i>アンバサダー助言を追加</div>';
    html += '<div class="row g-2">';
    html += '<div class="col-md-4"><select id="amb-challenge-select" class="form-select form-select-sm">';
    res.challenges.forEach(function(c) {
      html += '<option value="' + c.challenge_id + '">' + (c.icon || '') + ' ' + escapeHtml(c.title) + '</option>';
    });
    html += '</select></div>';
    html += '<div class="col-md-3"><select id="amb-advice-type" class="form-select form-select-sm"><option value="plan_review">プラン策定時</option><option value="midterm">中間チェック</option><option value="final">最終レビュー</option></select></div>';
    html += '<div class="col-md-5"><div class="input-group input-group-sm"><input type="text" id="amb-advisor-name" class="form-control" placeholder="助言者名（例: 田中保健師）"></div></div>';
    html += '</div>';
    html += '<textarea id="amb-advice-content" class="form-control form-control-sm mt-2" rows="4" placeholder="専門的な助言を入力..."></textarea>';
    html += '<button class="btn btn-sm btn-primary fw-bold mt-2" onclick="doPostAmbassadorAdvice()"><i class="fas fa-paper-plane me-1"></i>助言を登録</button>';
    html += '</div>';

    // 既存の助言一覧
    html += '<h6 class="fw-bold text-muted mb-2"><i class="fas fa-comments me-1"></i>助言履歴</h6>';
    var hasAdvice = false;
    res.challenges.forEach(function(c) {
      ['ambassador_advice_plan', 'ambassador_advice_mid', 'ambassador_advice_final'].forEach(function(key) {
        if (c[key]) {
          hasAdvice = true;
          var typeLabel = key.includes('plan') ? 'プラン策定時' : key.includes('mid') ? '中間チェック' : '最終レビュー';
          html += '<div class="plan-card mb-2" style="border-left:3px solid #9c27b0;">';
          html += '<div class="d-flex justify-content-between"><span class="small fw-bold text-purple">' + (c.icon || '') + ' ' + escapeHtml(c.title) + ' - ' + typeLabel + '</span></div>';
          html += '<div class="small mt-1" style="white-space:pre-wrap;">' + escapeHtml(c[key]) + '</div>';
          html += '</div>';
        }
      });
    });
    if (!hasAdvice) html += '<div class="text-muted small text-center py-3">まだ助言はありません</div>';

    area.innerHTML = html;
  });
}

function doPostAmbassadorAdvice() {
  var cid = (document.getElementById('amb-challenge-select') || {}).value;
  var type = (document.getElementById('amb-advice-type') || {}).value;
  var content = (document.getElementById('amb-advice-content') || {}).value;
  if (!content || !content.trim()) { alert('助言内容を入力してください'); return; }
  postAmbassadorAdvice(null, cid, type, content.trim()).then(function(res) {
    if (res.success) { alert('助言を登録しました'); renderV2Ambassador(); }
    else alert('エラー: ' + res.msg);
  });
}

// 初回ロード時にv2ダッシュボードを表示（認証完了後）
(function() {
  var checkReady = setInterval(function() {
    if (typeof currentAdminProfile !== 'undefined' && currentAdminProfile && currentAdminProfile.name) {
      clearInterval(checkReady);
      renderV2Dashboard();
    }
  }, 300);
  // 10秒でタイムアウト
  setTimeout(function() { clearInterval(checkReady); }, 10000);
})();
