/*  admin-v2.js – 凝集型健康アクションプラン管理画面  */

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
      statusArea.innerHTML = '<div class="plan-card text-center py-4"><div style="font-size:2rem; margin-bottom:10px;">📊</div><div class="fw-bold mb-2">まだサイクルがありません</div><div class="text-muted small">AIテーマ凝集を実行して、最初のサイクルを開始しましょう</div></div>';
      actionsArea.innerHTML = '<button class="btn btn-primary fw-bold" onclick="doGenerateThemes()"><i class="fas fa-magic me-2"></i>AIテーマ凝集を実行</button>';
      themesArea.innerHTML = '';
      return;
    }

    // サイクル状態表示
    var statusColor = cycle.status === 'voting' ? '#667eea' : cycle.status === 'finalized' ? '#43a047' : '#f39c12';
    var statusLabel = cycle.status === 'collecting' ? '候補準備中' : cycle.status === 'candidate' ? 'テーマ候補準備完了' : cycle.status === 'voting' ? '投票中' : cycle.status === 'finalized' ? '確定済み' : cycle.status;
    var endInfo = cycle.voting_end ? ' (〜' + new Date(cycle.voting_end).toLocaleDateString('ja-JP') + ')' : '';

    statusArea.innerHTML =
      '<div class="plan-card" style="border-left:4px solid ' + statusColor + ';">' +
        '<div class="d-flex justify-content-between align-items-center">' +
          '<div><div class="fw-bold">' + escapeHtml(cycle.title || '第' + cycle.cycle_number + '回') + '</div>' +
          '<div class="small text-muted">サイクル #' + cycle.cycle_number + '</div></div>' +
          '<span class="badge" style="background:' + statusColor + '; font-size:0.8rem; padding:6px 14px;">' + statusLabel + endInfo + '</span>' +
        '</div>' +
        (cycle.status === 'voting' ? '<div class="mt-2 small"><i class="fas fa-users text-primary me-1"></i>投票済み: <strong>' + (res.totalVoters || 0) + '</strong> / ' + (res.totalUsers || 0) + '名</div>' : '') +
      '</div>';

    // アクションボタン
    var btns = '';
    if (cycle.status === 'candidate') {
      btns += '<button class="btn btn-primary fw-bold" onclick="doStartVoting(' + cycle.cycle_number + ')"><i class="fas fa-play me-1"></i>投票を開始（7日間）</button>';
      btns += '<button class="btn btn-outline-warning fw-bold" onclick="doGenerateThemes()"><i class="fas fa-redo me-1"></i>テーマを再生成</button>';
    } else if (cycle.status === 'voting') {
      btns += '<button class="btn btn-success fw-bold" onclick="doFinalizeVoting(' + cycle.cycle_number + ')"><i class="fas fa-check me-1"></i>投票を締め切り・テーマ確定</button>';
    } else if (cycle.status === 'finalized') {
      var selectedTheme = themes.find(function(t) { return t.status === 'selected'; });
      if (selectedTheme) {
        btns += '<button class="btn btn-danger fw-bold" onclick="doGenerateChallenge(\'' + selectedTheme.theme_id + '\')"><i class="fas fa-fire me-1"></i>チャレンジを自動生成</button>';
      }
      btns += '<button class="btn btn-outline-primary fw-bold" onclick="doGenerateThemes()"><i class="fas fa-plus me-1"></i>次のサイクルを開始</button>';
    }
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
      html += '<div class="col-md-6"><div class="plan-card' + (selected ? ' border-success border-2' : '') + '">';
      html += '<div class="d-flex justify-content-between align-items-start mb-2">';
      html += '<div class="d-flex align-items-center gap-2"><span style="font-size:1.5rem;">' + (t.icon || '💡') + '</span><div><div class="fw-bold">' + escapeHtml(t.name) + '</div><div class="small text-muted">' + t.post_count + '件の声</div></div></div>';
      html += '<div class="text-end"><div style="font-size:1.3rem; font-weight:900; color:#667eea;">' + t.vote_count + '</div><div style="font-size:0.65rem; color:#999;">票</div></div>';
      html += '</div>';
      if (t.description) html += '<div class="small text-muted mb-2">' + escapeHtml(t.description) + '</div>';
      if (keywords.length > 0) {
        html += '<div class="mb-2">';
        keywords.forEach(function(k) { html += '<span class="badge bg-light text-dark me-1" style="font-size:0.7rem;">' + escapeHtml(k) + '</span>'; });
        html += '</div>';
      }
      if (voices.length > 0) {
        html += '<div style="font-size:0.75rem; color:#888;">';
        voices.slice(0, 2).forEach(function(v) { html += '<div>💬 ' + escapeHtml(v) + '</div>'; });
        html += '</div>';
      }
      if (selected) html += '<div class="mt-2"><span class="badge bg-success"><i class="fas fa-check me-1"></i>選出テーマ</span></div>';
      html += '</div></div>';
    });
    html += '</div>';
    themesArea.innerHTML = html;
  });
}

function doGenerateThemes() {
  if (!confirm('AIテーマ凝集を実行しますか？直近3ヶ月の投稿を分析します。')) return;
  showGlobalLoading('AIがテーマを分析中...');
  generateThemes().then(function(res) {
    hideGlobalLoading();
    if (res.success) {
      alert('サイクル #' + res.cycleNumber + ' のテーマ候補を' + res.themes.length + '件生成しました');
      renderV2Dashboard();
    } else {
      alert('エラー: ' + (res.msg || '不明'));
    }
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
  showGlobalLoading('AIがチャレンジを設計中...');
  generateChallenge(themeId).then(function(res) {
    hideGlobalLoading();
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
      // KPI定義
      if (kpis.length > 0) {
        html += '<div class="mb-2"><span class="small fw-bold text-muted">記録項目:</span>';
        kpis.forEach(function(k) { html += ' <span class="badge bg-light text-dark" style="font-size:0.7rem;">' + escapeHtml(k.question || '') + '</span>'; });
        html += '</div>';
      }
      html += '<div class="small text-muted mb-2"><i class="fas fa-users me-1"></i>参加者: ' + (c.participantCount || 0) + '名</div>';
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
  });
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
  showGlobalLoading('AIが' + label + 'を作成中...');

  getChallengeDashboard(cid).then(function(dashRes) {
    if (!dashRes.success) { hideGlobalLoading(); alert('データ取得エラー'); return; }

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
        hideGlobalLoading();
        if (aiRes && aiRes.success && aiRes.ideas) {
          showReportModal(label, aiRes.ideas);
        } else {
          alert('レポート生成に失敗しました');
        }
      }).catch(function() {
        hideGlobalLoading();
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

// ============================================================
// タブ切替にv2を統合
// ============================================================
var _origSwitchTab = window.switchTab;
window.switchTab = function(tab) {
  // v2タブの場合
  if (tab === 'v2dash') { if (typeof renderV2Dashboard === 'function') renderV2Dashboard(); }
  else if (tab === 'v2challenge') { if (typeof renderV2Challenges === 'function') renderV2Challenges(); }
  else if (tab === 'v2kpi') { if (typeof renderV2KpiSelector === 'function') renderV2KpiSelector(); }
  else if (tab === 'v2ambassador') { if (typeof renderV2Ambassador === 'function') renderV2Ambassador(); }
  // 既存のswitchTabを呼ぶ
  if (typeof _origSwitchTab === 'function') _origSwitchTab(tab);
};

// 初回ロード時にv2ダッシュボードを表示
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    if (typeof renderV2Dashboard === 'function') renderV2Dashboard();
  }, 500);
});
