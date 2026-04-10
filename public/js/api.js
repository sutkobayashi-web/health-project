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
      if (res.status === 401) {
        // 管理画面からのAPI呼び出しではリロードしない
        var isAdminApi = path.indexOf('/admin') !== -1 || (token && token === getAdminToken());
        if (!isAdminApi) {
          try {
            var errData = await res.json();
            if (errData.code === 'SESSION_EXPIRED') {
              alert('別の端末でログインされたため、セッションが無効になりました。再ログインしてください。');
            } else {
              alert('セッションが期限切れです。再ログインしてください。');
            }
          } catch (e) {
            alert('セッションが期限切れです。再ログインしてください。');
          }
          localStorage.removeItem('co_heart_token');
          location.reload();
          return { success: false, msg: '認証エラー' };
        }
      }
      return { success: false, msg: 'HTTP ' + res.status };
    }
    return res.json();
  } catch (e) {
    console.error('API fetch error:', path, e);
    return { success: false, msg: '通信エラー: ' + e.message };
  }
}

// ===== Auth =====
function registerUser(n, p, a, i, r, d, b, bt) {
  return api('/auth/register', { nickname: n, password: p, avatar: a, inviterId: i, realName: r, department: d, birthDate: b, buddyType: bt });
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
function getBackupStatus() {
  return api('/admin/backup-status', undefined, getAdminToken());
}
function resetAdminPassword(email, name, newPassword) {
  return api('/auth/admin-reset-password', { email, name, newPassword });
}
function updateUserAvatar(uid, avatar) {
  return api('/auth/update-avatar', { uid, avatar }, getToken());
}
function getLatestUserStats(uid) {
  return api('/auth/stats/' + uid);
}

// ===== Posts =====
function getPublicPosts(page, viewerUid, cat) {
  return api('/posts/public?page=' + page + '&uid=' + (viewerUid || '') + (cat ? '&cat=' + cat : ''));
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

function getFoodWeeklyReports() {
  return api('/admin/food-weekly-reports', undefined, getAdminToken());
}
function getFoodReportChats(reportId) {
  return api('/admin/food-report-chats/' + reportId, undefined, getAdminToken());
}
function postFoodReportChat(reportId, memberName, message) {
  return api('/admin/food-report-chat', { reportId, memberName, message }, getAdminToken());
}
function runFoodWeeklyNow() {
  return api('/admin/food-weekly-run', {}, getAdminToken());
}

function getMyUnread(uid) {
  return api('/posts/my-unread/' + uid);
}
function markPostRead(uid, postId) {
  return api('/posts/mark-read', { uid, postId });
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
function submitToMemberReview(planId) {
  return api('/plans/submit-to-review', { planId }, getAdminToken());
}
function endorsePlan(planId, memberEmail, memberName, vote, comment) {
  return api('/plans/endorse', { planId, memberEmail, memberName, vote, comment }, getAdminToken());
}
function getPlanEndorsements(planId) {
  return api('/plans/endorsements/' + planId, undefined, getAdminToken());
}
function resetPlanEndorsements(planId) {
  return api('/plans/reset-endorsements', { planId }, getAdminToken());
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

// ===== Chat (ヘルスバディー) =====
function chatWithBuddy(userMessage, history, userName, buddyType) {
  return api('/chat/message', { userMessage, history, userName, buddyType });
}
function getBuddyGreeting(userName, buddyType, department) {
  return api('/chat/greeting', { userName, buddyType, department });
}
function chatWithBuddyImage(userMessage, imageBase64, mimeType, history, userName, buddyType) {
  return api('/chat/image-message', { userMessage, imageBase64, mimeType, history, userName, buddyType });
}
function saveChatMemo(uid, memoText, sourceMessage) {
  return api('/chat/save-memo', { uid, memoText, sourceMessage });
}
function getChatMemos(uid) {
  return api('/chat/memos/' + uid, undefined, getToken());
}
function deleteChatMemo(memoId) {
  return api('/chat/delete-memo', { memoId });
}
function updateBuddyType(uid, buddyType) {
  return api('/auth/update-buddy', { uid, buddyType });
}
// 後方互換
function chatWithNurse(m, h, n) { return chatWithBuddy(m, h, n, 'gentle'); }
function getNurseGreeting(n) { return getBuddyGreeting(n, 'gentle'); }
function chatWithNurseImage(m, i, t, h, n) { return chatWithBuddyImage(m, i, t, h, n, 'gentle'); }

// ===== Empathy (共感+3問) =====
function submitEmpathy(postId, uid, userName, empathyType, answer1, answer2, answer3, freeComment, isMember) {
  return api('/posts/empathy', { postId, uid, userName, empathyType, answer1, answer2, answer3, freeComment, isMember });
}
function getEmpathySummary(postId) {
  return api('/posts/empathy/' + postId);
}
function getEmpathyDetail(postId) {
  return api('/posts/empathy-detail/' + postId, undefined, getAdminToken());
}
function getEmpathyCheck(uid) {
  return api('/posts/empathy-check/' + uid);
}
function convertEmpathyToScore(postId) {
  return api('/posts/empathy-to-score', { postId }, getAdminToken());
}

// ===== Themes & Challenges (v2) =====
function getCurrentCycle(uid) {
  return api('/themes/current-cycle?uid=' + (uid || ''));
}
function voteTheme(themeId, userId, comment) {
  return api('/themes/vote', { themeId, userId, comment });
}
function getVoteComments(themeId) {
  return api('/themes/vote-comments/' + themeId);
}
function getChallenges() {
  return api('/themes/challenges');
}
function getChallengeDetail(challengeId, uid) {
  return api('/themes/challenge/' + challengeId + '?uid=' + (uid || ''));
}
function joinChallenge(challengeId, userId, nickname, avatar) {
  return api('/themes/join', { challengeId, userId, nickname, avatar });
}
function recordKpi(challengeId, userId, answers, comment) {
  return api('/themes/record', { challengeId, userId, answers, comment });
}
function getChallengeRanking(challengeId) {
  return api('/themes/ranking/' + challengeId);
}
function getMyProgress(challengeId, userId) {
  return api('/themes/my-progress/' + challengeId + '/' + userId);
}
// 管理者用
function generateThemes() {
  return api('/themes/generate-themes', {}, getAdminToken());
}
function updateTheme(themeId, name, description, icon) {
  return api('/themes/update-theme', { themeId, name, description, icon }, getAdminToken());
}
function startVoting(cycleNumber, durationDays) {
  return api('/themes/start-voting', { cycleNumber, durationDays }, getAdminToken());
}
function finalizeVoting(cycleNumber) {
  return api('/themes/finalize-voting', { cycleNumber }, getAdminToken());
}
function generateChallenge(themeId) {
  return api('/themes/generate-challenge', { themeId }, getAdminToken());
}
function startRecruiting(challengeId) {
  return api('/themes/start-recruiting', { challengeId }, getAdminToken());
}
function startChallenge(challengeId) {
  return api('/themes/start-challenge', { challengeId }, getAdminToken());
}
function updateChallenge(challengeId, title, description, icon, kpiDefinitions, durationDays) {
  return api('/themes/update-challenge', { challengeId, title, description, icon, kpiDefinitions, durationDays }, getAdminToken());
}
function getChallengeDashboard(challengeId) {
  return api('/themes/dashboard/' + challengeId, undefined, getAdminToken());
}
function postAmbassadorAdvice(ambassadorId, challengeId, adviceType, content) {
  return api('/themes/ambassador-advice', { ambassadorId, challengeId, adviceType, content }, getAdminToken());
}

// ===== My Posts =====
function getMyPosts(uid) {
  return api('/posts/my-posts/' + uid);
}
function getPostMemberChats(postId, uid) {
  return api('/posts/member-chats/' + postId + '/' + uid);
}

// ===== Chat Notification =====
function getChatUnread(email) {
  return api('/admin/chat-unread/' + encodeURIComponent(email), undefined, getAdminToken());
}
function markChatRead(email, postId) {
  return api('/admin/chat-mark-read', { email, postId }, getAdminToken());
}

// ===== Member Comments & Chat =====
function postMemberComment(postId, memberName, comment) {
  return api('/admin/member-comment', { postId, memberName, comment }, getAdminToken());
}
function getMemberComments(postId) {
  return api('/admin/member-comments/' + postId, undefined, getAdminToken());
}
function postMemberChat(postId, memberName, message) {
  return api('/admin/member-chat', { postId, memberName, message }, getAdminToken());
}
function getMemberChats(postId) {
  return api('/admin/member-chats/' + postId, undefined, getAdminToken());
}
function runAutoEvaluate(postId) {
  return api('/admin/auto-evaluate', { postId }, getAdminToken());
}
function getAutoEvaluation(postId) {
  return api('/admin/auto-evaluation/' + postId, undefined, getAdminToken());
}

// ===== Avatar Challenge (Onboarding) =====
function getAvatarChallengeConfig() {
  return api('/avatar-challenge/config');
}
function updateAvatarChallengeConfig(status, start_date, end_date, max_votes) {
  return api('/avatar-challenge/config', { status, start_date, end_date, max_votes }, getAdminToken());
}
function getAvatarGallery(uid) {
  return api('/avatar-challenge/gallery?uid=' + (uid || ''));
}
function voteAvatar(voterId, targetUserId) {
  return api('/avatar-challenge/vote', { voterId, targetUserId });
}
function getAvatarRanking() {
  return api('/avatar-challenge/ranking');
}
