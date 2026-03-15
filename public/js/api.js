// =============================================
// API通信ユーティリティ
// google.script.run → fetch API 置換
// =============================================
const API_BASE = '/api';

function getToken() { return localStorage.getItem('co_heart_token') || ''; }
function setToken(t) { localStorage.setItem('co_heart_token', t); }
function getAdminToken() { return localStorage.getItem('co_heart_admin_token') || ''; }
function setAdminToken(t) { localStorage.setItem('co_heart_admin_token', t); }

async function api(path, data, token) {
  const opts = { headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  if (data !== undefined) {
    opts.method = 'POST';
    opts.body = JSON.stringify(data);
  }
  try {
    const res = await fetch(API_BASE + path, opts);
    if (!res.ok) {
      console.error('API error:', path, res.status, res.statusText);
      return { success: false, msg: 'HTTP ' + res.status };
    }
    return res.json();
  } catch (e) {
    console.error('API fetch error:', path, e);
    return { success: false, msg: '通信エラー: ' + e.message };
  }
}

// ===== Auth =====
function registerUser(n, p, a, i, r, d, b) {
  return api('/auth/register', { nickname: n, password: p, avatar: a, inviterId: i, realName: r, department: d, birthDate: b });
}
function loginUser(n, p) {
  return api('/auth/login', { nickname: n, password: p });
}
function registerAdmin(data) {
  return api('/auth/admin-register', data);
}
function approveMember(memberId) {
  return api('/admin/approve-member', { memberId }, getAdminToken());
}
function rejectMember(memberId) {
  return api('/admin/reject-member', { memberId }, getAdminToken());
}
function getUniversityMembers() {
  return api('/auth/university-members', undefined, getAdminToken());
}
function loginCoreMember(email, pass) {
  return api('/auth/admin-login', { email, password: pass });
}
function resetPassword(nickname, department, birthDate, newPassword) {
  return api('/auth/reset-password', { nickname, department, birthDate, newPassword });
}
function runBackup() {
  return api('/admin/backup', {}, getAdminToken());
}
function updateBoxToken(token) {
  return api('/admin/box-token', { token }, getAdminToken());
}
function resetAdminPassword(email, name, newPassword) {
  return api('/auth/admin-reset-password', { email, name, newPassword });
}
function getLatestUserStats(uid) {
  return api('/auth/stats/' + uid);
}

// ===== Posts =====
function getPublicPosts(page, viewerUid) {
  return api('/posts/public?page=' + page + '&uid=' + (viewerUid || ''));
}
function processForm(data) {
  return api('/posts/submit', data);
}
function handleFoodPost(data) {
  return api('/posts/food', data);
}
function toggleLike(postRow, viewerUid) {
  return api('/posts/like', { postRow, viewerUid });
}
function deletePost(postID, userUid) {
  return api('/posts/delete', { postID, userUid });
}
function editPost(postID, userUid, newContent) {
  return api('/posts/edit', { postID, userUid, newContent });
}

// ===== Admin =====
function getReportData() {
  return api('/admin/inbox', undefined, getAdminToken());
}
function getResolvedData() {
  return api('/admin/resolved', undefined, getAdminToken());
}
function getDiscussionLog(voiceId) {
  return api('/admin/discussion/' + voiceId, undefined, getAdminToken());
}
function postAdminComment(voiceId, memberName, comment, role, avatar) {
  return api('/admin/discussion/post', { voiceId, memberName, comment, role, avatar }, getAdminToken());
}
function deleteDiscussionLog(voiceId, row, memberName) {
  return api('/admin/discussion/delete', { voiceId, row, memberName }, getAdminToken());
}
function toggleTargetStatus(pid, currentStatus) {
  return api('/admin/toggle-target', { pid, currentStatus }, getAdminToken());
}
function updatePostStatus(pid, status) {
  return api('/admin/update-status', { pid, status }, getAdminToken());
}
function saveMemberEvaluation(data) {
  return api('/admin/evaluation/save', data, getAdminToken());
}
function getPostEvaluations(postId) {
  return api('/admin/evaluation/' + postId, undefined, getAdminToken());
}
function simulatePlanningMeeting(pid, planData) {
  return api('/admin/simulate-meeting', { pid, planData }, getAdminToken());
}
function generateAIReplyToHuman(pid, planTitle, humanComment) {
  return api('/admin/ai-reply', { pid, planTitle, humanComment }, getAdminToken());
}
function evaluateVoiceByAI(content, discussionLog, humanScores) {
  return api('/admin/ai-evaluate', { content, discussionLog, humanScores }, getAdminToken());
}
function askAIAdvisor(content, question) {
  return api('/admin/ai-advisor', { content, question }, getAdminToken());
}
function getCoreMemberCount() {
  return api('/admin/core-member-count', undefined, getAdminToken());
}
function votePriorityPost(pid, uid, type) {
  return api('/admin/vote', { pid, uid, type }, getAdminToken());
}
function getCurrentMatrixData() {
  return api('/admin/matrix', undefined, getAdminToken());
}

// ===== Plans =====
function getActionPlanCandidates() {
  return api('/plans/candidates', undefined, getAdminToken());
}
function getArchivedActionPlans() {
  return api('/plans/archived', undefined, getAdminToken());
}
function createThemeProposal(data) {
  return api('/plans/create-theme', data, getAdminToken());
}
function updateActionPlanDraft(planId, newDraft, newTitle) {
  return api('/plans/update-draft', { planId, newDraft, newTitle }, getAdminToken());
}
function archiveActionPlan(planId) {
  return api('/plans/archive', { planId }, getAdminToken());
}
function remandActionPlan(planId) {
  return api('/plans/remand', { planId }, getAdminToken());
}
function revertPlanToCandidate(planId) {
  return api('/plans/revert-to-candidate', { planId }, getAdminToken());
}
function submitToExec(planId) {
  return api('/plans/submit-to-exec', { planId }, getAdminToken());
}
function getExecPendingPlans() {
  return api('/plans/exec-pending', undefined, getAdminToken());
}
function execDecision(planId, decision, comment, approverName) {
  return api('/plans/exec-decision', { planId, decision, comment, approverName }, getAdminToken());
}
function setExecutionPlan(planId, owner, deadline, kpiTarget) {
  return api('/plans/set-execution', { planId, owner, deadline, kpiTarget }, getAdminToken());
}
function updateKPI(planId, kpiCurrent, note) {
  return api('/plans/update-kpi', { planId, kpiCurrent, note }, getAdminToken());
}
function savePlanComment(planId, name, comment) {
  return api('/plans/comment', { planId, name, comment }, getAdminToken());
}
function saveAIMeetingLog(planId, logStr) {
  return api('/plans/save-ai-log', { planId, logStr }, getAdminToken());
}
function brainstormThemeActionPlans(data) {
  return api('/plans/brainstorm', data, getAdminToken());
}
function getFoodUsers() {
  return api('/admin/food-users', undefined, getAdminToken());
}
function generateFoodReport(userId) {
  return api('/admin/food-report', { userId, sendNow: false }, getAdminToken());
}
function sendFoodReportNow(userId, memberComment) {
  return api('/admin/food-report', { userId, sendNow: true, memberComment: memberComment || '' }, getAdminToken());
}
function postInboxComment(postId, memberName, comment) {
  return api('/admin/inbox-comment', { postId, memberName, comment }, getAdminToken());
}
function editInboxComment(id, newComment) {
  return api('/admin/inbox-comment-edit', { id, newComment }, getAdminToken());
}
function deleteInboxComment(id) {
  return api('/admin/inbox-comment-delete', { id }, getAdminToken());
}
function getInboxComments(postId) {
  return api('/admin/inbox-comments/' + postId, undefined, getAdminToken());
}

// ===== メンバー管理 =====
function getAllCoreMembers() {
  return api('/admin/members-all', undefined, getAdminToken());
}
function getAllGeneralUsers() {
  return api('/admin/users-all', undefined, getAdminToken());
}
function addCoreMember(data) {
  return api('/admin/member-add', data, getAdminToken());
}
function updateCoreMember(data) {
  return api('/admin/member-update', data, getAdminToken());
}
function deleteCoreMember(id) {
  return api('/admin/member-delete', { id }, getAdminToken());
}
function addGeneralUser(data) {
  return api('/admin/user-add', data, getAdminToken());
}
function updateGeneralUser(data) {
  return api('/admin/user-update', data, getAdminToken());
}
function deleteGeneralUser(id) {
  return api('/admin/user-delete', { id }, getAdminToken());
}
function deleteEvaluation(id) {
  return api('/admin/evaluation/delete', { id }, getAdminToken());
}
function getSimilarPosts(postId, content) {
  return api('/admin/similar-posts', { postId, content }, getAdminToken());
}
function sendHearing(planId, targetScope) {
  return api('/plans/send-hearing', { planId, targetScope }, getAdminToken());
}
function refineActionPlanByAI(planId, currentDraft, feedbackData, currentTitle) {
  return api('/plans/refine', { planId, currentDraft, feedbackData, currentTitle }, getAdminToken());
}

// ===== Notices =====
function saveAdminNotice(data) {
  return api('/notices/save', data, getAdminToken());
}
function getAllNotices(uid) {
  return api('/notices/all/' + uid);
}
function getUnreadPersonalNotice(uid) {
  return api('/notices/unread/' + uid);
}
function getLatestNotice(uid) {
  return api('/notices/latest/' + uid);
}
function markNoticeAsRead(noticeId, replyText) {
  return api('/notices/mark-read', { noticeId, replyText });
}
function markAdminNoticeAsRead(noticeId) {
  return api('/notices/admin-read', { noticeId }, getAdminToken());
}
function getPersonalNoticesAdmin() {
  return api('/notices/admin-list', undefined, getAdminToken());
}

// ===== Chat =====
function chatWithNurse(userMessage, history, userName) {
  return api('/chat/message', { userMessage, history, userName });
}
function getNurseGreeting(userName) {
  return api('/chat/greeting', { userName });
}
function chatWithNurseImage(userMessage, imageBase64, mimeType, history, userName) {
  return api('/chat/image-message', { userMessage, imageBase64, mimeType, history, userName });
}
