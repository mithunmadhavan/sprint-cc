const CONFIG = {
  MOCK_MODE: true,
  MSAL_CLIENT_ID: "YOUR_APP_CLIENT_ID",
  MSAL_TENANT_ID: "YOUR_TENANT_ID",
  REDIRECT_URI: "https://eystaticwebsite.z1.web.core.windows.net/sprintcapacity.html",
  DOMAIN_HINT: "etihad.ae",
  ADMIN_GROUP_ID: "YOUR_ADMIN_GROUP_OBJECT_ID",
  API_BASE_URL: "",
};

const API_BASE = (window.location.protocol === "file:" ? "http://localhost:3000" : (CONFIG.API_BASE_URL || "")).replace(/\/$/, "");

let TEAMS = [];

let SPRINT_CALENDAR = [];

let ROLE_CONFIG = [];
const SPRINT_LEN = 10;

const DEFAULT_ROSTER = [
];

let CURRENT_USER = null;
let AUTH_TOKEN = "";
let rosterRows = JSON.parse(JSON.stringify(DEFAULT_ROSTER));
let objectiveValues = [""];
let productHealthValue = 0;
let previousSprintImport = null;
const TODAY = new Date().toISOString().slice(0, 10);
const CONNECTIVITY_MS = {
  online: 300000,
  offline: 60000
};
let connTimer = null;

// System online/offline status (default: true to allow initial attempts)
let IS_SYSTEM_ONLINE = true;

function todayISO() { return new Date().toISOString().slice(0, 10); }
function getRoleOptions() {
  return ROLE_CONFIG.map((role) => role.name);
}

function findRoleConfig(roleName) {
  return ROLE_CONFIG.find((role) => role.name === roleName) || null;
}

function isCapacityRole(roleName) {
  const role = findRoleConfig(roleName);
  return role ? role.isCapacity !== false : true;
}

function getDefaultRoleName() {
  const preferred = ROLE_CONFIG.find((role) => role.roleType === "team")
    || ROLE_CONFIG.find((role) => role.isCapacity !== false)
    || ROLE_CONFIG[0];
  return preferred?.name || "";
}

function getTeamNameByKey(teamKey) {
  return TEAMS.find((team) => team.key === teamKey)?.name || teamKey;
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function toDateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function getSelectedSprintInfo() {
  const sprintNo = document.getElementById("sprintSel").value;
  return SPRINT_CALENDAR.find((s) => s.sprint === sprintNo) || null;
}

function normalizeObjectives(values = []) {
  return values.map((value) => String(value || "").trim()).filter(Boolean);
}

function clampPercentage(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed));
}

function setProductHealth(value = 0) {
  productHealthValue = clampPercentage(value);
  const input = document.getElementById("productHealthInput");
  if (input) {
    input.value = String(productHealthValue);
  }
}

function getSortedSprintCalendar() {
  return [...SPRINT_CALENDAR].sort((a, b) => {
    const startDiff = a.start.localeCompare(b.start);
    if (startDiff !== 0) return startDiff;
    const endDiff = a.end.localeCompare(b.end);
    if (endDiff !== 0) return endDiff;
    return a.sprint.localeCompare(b.sprint, undefined, { numeric: true, sensitivity: "base" });
  });
}

function getPreviousSprintInfo(currentSprintNo) {
  const sorted = getSortedSprintCalendar();
  const index = sorted.findIndex((item) => item.sprint === currentSprintNo);
  return index > 0 ? sorted[index - 1] : null;
}

function getSubmissionFieldState(sprintInfo) {
  const userCanEdit = canEditSubmission();
  if (!userCanEdit) {
    return {
      objectivesEditable: false,
      sprintGoalEditable: false,
      goalsAchievedEditable: false,
      sprintGoalDisplayMode: "card",
      goalsAchievedDisplayMode: "card",
      rosterEditable: false,
      userCanEdit,
    };
  }

  if (!sprintInfo?.start || !sprintInfo?.end) {
    return {
      objectivesEditable: false,
      sprintGoalEditable: false,
      goalsAchievedEditable: false,
      sprintGoalDisplayMode: "card",
      goalsAchievedDisplayMode: "card",
      rosterEditable: false,
      userCanEdit,
    };
  }

  const start = toDateKey(sprintInfo.start);
  const end = toDateKey(sprintInfo.end);
  const sprintStartGraceEnd = toDateKey(new Date(new Date(sprintInfo.start).getTime() + 7 * 24 * 60 * 60 * 1000));
  const goalsAchievedWindowEnd = toDateKey(new Date(new Date(sprintInfo.end).getTime() + 7 * 24 * 60 * 60 * 1000));
  const sprintGoalEditable = TODAY <= sprintStartGraceEnd;
  const goalsAchievedEditable = TODAY >= end && TODAY <= goalsAchievedWindowEnd;
  return {
    objectivesEditable: TODAY <= sprintStartGraceEnd,
    sprintGoalEditable,
    goalsAchievedEditable,
    sprintGoalDisplayMode: sprintGoalEditable ? "input" : "card",
    goalsAchievedDisplayMode: goalsAchievedEditable ? "input" : "card",
    rosterEditable: TODAY <= sprintStartGraceEnd,
    userCanEdit,
  };
}

function setFieldHelp(id, text, editable) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = `field-help ${editable ? "editable" : "locked"}`;
}

function renderObjectives() {
  const list = document.getElementById("objectivesList");
  const card = document.getElementById("objectivesCard");
  const { objectivesEditable } = getSubmissionFieldState(getSelectedSprintInfo());
  const values = objectiveValues.length ? objectiveValues : [""];

  if (!objectivesEditable) {
    list.classList.add("hidden");
    card.classList.remove("hidden");
    const normalized = normalizeObjectives(values);
    card.innerHTML = normalized.length
      ? `<ul>${normalized.map((value) => `<li>${esc(value)}</li>`).join("")}</ul>`
      : '<span class="value-card-na">No objectives</span>';
    return;
  }

  list.classList.remove("hidden");
  card.classList.add("hidden");

  list.innerHTML = values.map((value, index) => `
    <div class="objective-row">
      <input
        type="text"
        class="objective-input"
        data-objective-index="${index}"
        value="${esc(value)}"
        placeholder="Objective ${index + 1}"
        ${!objectivesEditable ? "disabled" : ""}
      >
      <button
        type="button"
        class="objective-remove"
        data-remove-objective="${index}"
        ${!objectivesEditable || values.length === 1 ? "disabled" : ""}
      >Remove</button>
    </div>
  `).join("");

  list.querySelectorAll("[data-objective-index]").forEach((input) => {
    input.addEventListener("input", (event) => {
      objectiveValues[Number(event.target.dataset.objectiveIndex)] = event.target.value;
    });
  });

  list.querySelectorAll("[data-remove-objective]").forEach((button) => {
    button.addEventListener("click", () => {
      objectiveValues.splice(Number(button.dataset.removeObjective), 1);
      if (objectiveValues.length === 0) {
        objectiveValues = [""];
      }
      renderObjectives();
    });
  });
}

function setSubmissionMeta(record = null) {
  document.getElementById("sprintGoalInput").value = record?.SprintGoal ?? "";
  document.getElementById("goalsAchievedInput").value = record?.GoalsAchieved ?? "";
  setProductHealth(record?.ProductHealth ?? 0);
  objectiveValues = Array.isArray(record?.Objectives) && record.Objectives.length
    ? [...record.Objectives]
    : record?.Objective
      ? [record.Objective]
      : [""];
  renderObjectives();
}

function updateGoalsAchievedColor() {
  const sprintGoalInput = document.getElementById("sprintGoalInput");
  const goalsAchievedInput = document.getElementById("goalsAchievedInput");
  const goalsAchievedCard = document.getElementById("goalsAchievedCard");
  const sprintInfo = getSelectedSprintInfo();

  if (!goalsAchievedCard.classList.contains("hidden")) {
    const goalsAchievedValue = goalsAchievedInput.value !== "" ? goalsAchievedInput.value : "N/A";
    const gaValue = sprintInfo && TODAY < toDateKey(sprintInfo.end) ? "—" : goalsAchievedValue;

    goalsAchievedCard.classList.remove("no-value", "goals-below", "goals-met");
    if (gaValue === "—" || gaValue === "N/A" || goalsAchievedValue === "N/A" || goalsAchievedValue === "") {
      goalsAchievedCard.classList.add("no-value");
    } else {
      const goalsNum = Number(goalsAchievedValue);
      const sprintGoalNum = Number(sprintGoalInput.value || 0);
      if (sprintGoalNum > 0 && goalsNum < sprintGoalNum) {
        goalsAchievedCard.classList.add("goals-below");
      } else if (sprintGoalNum > 0 && goalsNum >= sprintGoalNum) {
        goalsAchievedCard.classList.add("goals-met");
      }
    }
  }
}

function syncSubmissionFieldState() {
  const sprintInfo = getSelectedSprintInfo();
  const {
    objectivesEditable,
    sprintGoalEditable,
    goalsAchievedEditable,
    sprintGoalDisplayMode,
    goalsAchievedDisplayMode,
    rosterEditable,
    userCanEdit,
  } = getSubmissionFieldState(sprintInfo);
  const addObjectiveBtn = document.getElementById("addObjectiveBtn");
  const sprintGoalInput = document.getElementById("sprintGoalInput");
  const goalsAchievedInput = document.getElementById("goalsAchievedInput");
  const sprintGoalCard = document.getElementById("sprintGoalCard");
  const goalsAchievedCard = document.getElementById("goalsAchievedCard");
  const submissionNotes = document.getElementById("submissionNotes");
  const productHealthInput = document.getElementById("productHealthInput");
  const productHealthHelp = document.getElementById("productHealthHelp");
  const importPrevSprintBtn = document.getElementById("importPrevSprintBtn");
  const addRowBtn = document.getElementById("addRowBtn");
  const sprintGoalValue = sprintGoalInput.value !== "" ? sprintGoalInput.value : "N/A";
  const goalsAchievedValue = goalsAchievedInput.value !== "" ? goalsAchievedInput.value : "N/A";

  // Sprint Goal: Card by default, input when editable
  if (sprintGoalDisplayMode === "card") {
    sprintGoalInput.classList.add("hidden");
    sprintGoalCard.classList.remove("hidden");
    sprintGoalCard.innerHTML = `<div>${sprintGoalValue === "N/A" ? "—" : sprintGoalValue}</div>`;
  } else {
    sprintGoalInput.classList.remove("hidden");
    sprintGoalCard.classList.add("hidden");
  }

  // Goals Achieved: Card by default, input when editable
  if (goalsAchievedDisplayMode === "card") {
    goalsAchievedInput.classList.add("hidden");
    goalsAchievedCard.classList.remove("hidden");
    const gaValue = sprintInfo && TODAY < toDateKey(sprintInfo.end) ? "—" : goalsAchievedValue;
    goalsAchievedCard.innerHTML = `<div>${gaValue === "N/A" ? "—" : gaValue}</div>`;
  } else {
    goalsAchievedInput.classList.remove("hidden");
    goalsAchievedCard.classList.add("hidden");
  }

  sprintGoalInput.disabled = !sprintGoalEditable;
  goalsAchievedInput.disabled = !goalsAchievedEditable;
  addObjectiveBtn.disabled = !objectivesEditable;
  addRowBtn.disabled = !rosterEditable || !userCanEdit;
  addRowBtn.title = !userCanEdit
    ? "Viewer role is read-only"
    : (rosterEditable ? "" : "Team roster is locked one week after sprint start");
  submissionNotes.disabled = !userCanEdit;
  productHealthInput.disabled = !rosterEditable || !userCanEdit;
  importPrevSprintBtn.disabled = !rosterEditable || !userCanEdit || !previousSprintImport?.record;
  importPrevSprintBtn.title = !userCanEdit
    ? "Viewer role is read-only"
    : (!rosterEditable
      ? "Import is only available through one week after sprint start"
      : (previousSprintImport?.record
        ? `Import roster from Sprint ${previousSprintImport.sprint}`
        : "No previous sprint roster is available for this team"));
  productHealthHelp.textContent = sprintInfo
    ? (rosterEditable
      ? `Editable through ${fmtDate(new Date(new Date(sprintInfo.start).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))}. Product health reduces sprint capacity by the entered percentage.`
      : `Locked after ${fmtDate(new Date(new Date(sprintInfo.start).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))}. Product health reduces sprint capacity by the entered percentage.`)
    : "Select a sprint to manage product health.";
  productHealthHelp.className = `field-help ${rosterEditable ? "editable" : "locked"}`;

  setFieldHelp(
    "sprintGoalHelp",
    sprintInfo
      ? (sprintGoalEditable
        ? `Editable through ${fmtDate(new Date(new Date(sprintInfo.start).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))}.`
        : `Locked after ${fmtDate(new Date(new Date(sprintInfo.start).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))}.`)
      : "Select a sprint to manage sprint goal.",
    sprintGoalEditable
  );
  setFieldHelp(
    "goalsAchievedHelp",
    sprintInfo
      ? (goalsAchievedEditable
        ? `Editable from ${fmtDate(sprintInfo.end)} through one week after.`
        : (TODAY < toDateKey(sprintInfo.end)
          ? `N/A until ${fmtDate(sprintInfo.end)}.`
          : `Locked after ${fmtDate(new Date(new Date(sprintInfo.end).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))}.`))
      : "Select a sprint to manage goals achieved.",
    goalsAchievedEditable
  );
  setFieldHelp(
    "objectivesHelp",
    sprintInfo
      ? (objectivesEditable
        ? `Objectives are editable through ${fmtDate(new Date(new Date(sprintInfo.start).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))}.`
        : `Objectives locked after ${fmtDate(new Date(new Date(sprintInfo.start).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))}.`)
      : "Select a sprint to manage objectives.",
    objectivesEditable
  );

  renderObjectives();
  updateGoalsAchievedColor();
}

function showLoading(msg) {
  document.getElementById("loadingLabel").textContent = msg || "Loading…";
  document.getElementById("loadingOverlay").classList.add("show");
}
function hideLoading() { document.getElementById("loadingOverlay").classList.remove("show"); }

function showStatus(msg, type) {
  const el = document.getElementById("statusMsg");
  if (!el) return;
  el.textContent = msg;
  el.className = `status-msg ${type}`;
}

function setConfigWarning(messages = []) {
  const el = document.getElementById("configWarn");
  if (!messages.length) {
    el.style.display = "none";
    el.innerHTML = "";
    return;
  }
  el.style.display = "block";
  el.innerHTML = `<b>Configuration warning:</b><ul class="config-warn-list">${messages.map((msg) => `<li>${msg}</li>`).join("")}</ul>`;
}

function syncConfigDependentUi() {
  const hasTeams = TEAMS.length > 0;
  const hasRoles = ROLE_CONFIG.length > 0;
  const canWrite = canEditSubmission();
  const teamSel = document.getElementById("teamSel");
  const addRowBtn = document.getElementById("addRowBtn");
  const submitBtn = document.getElementById("submitBtn");

  teamSel.disabled = !hasTeams;
  addRowBtn.disabled = !hasRoles || !canWrite;
  submitBtn.disabled = !hasTeams || !hasRoles || !canWrite;

  addRowBtn.title = !canWrite
    ? "Viewer role is read-only"
    : (hasRoles ? "" : "Roles must be loaded from backend first");
  submitBtn.title = !canWrite
    ? "Viewer role cannot submit"
    : ((!hasTeams || !hasRoles) ? "Teams and roles must load from backend before submitting" : "");
}

function setConnectivityState(isOnline) {
  const el = document.getElementById("connStatus");
  if (!el) return;

  // Update global online status
  IS_SYSTEM_ONLINE = isOnline;

  el.classList.remove("online", "offline");
  el.classList.add(isOnline ? "online" : "offline");
  el.textContent = `${isOnline ? "online" : "offline"}`;
}

// Check if system is online before making API calls
function ensureSystemOnline() {
  if (!IS_SYSTEM_ONLINE) {
    const msg = "System is currently offline. Please check your connection.";
    console.warn(msg);
    showStatus(msg, "err");
    return false;
  }
  return true;
}

function scheduleConnectivityCheck(isOnline) {
  clearTimeout(connTimer);
  connTimer = setTimeout(checkBackendConnectivity, isOnline ? CONNECTIVITY_MS.online : CONNECTIVITY_MS.offline);
}

function mapServerRoleToUiRole(role) {
  const normalized = String(role || "").toLowerCase();
  if (["admin", "editor", "viewer"].includes(normalized)) return normalized;
  return "viewer";
}

function extractNameFromEmail(email) {
  return String(email || "").split("@")[0] || "user";
}

function clearClientSession() {
  AUTH_TOKEN = "";
  CURRENT_USER = null;
  sessionStorage.removeItem("sc_user");
  sessionStorage.removeItem("sc_token");
}

function applySessionFromAuthResult(authResult) {
  const user = authResult?.user || {};
  const email = String(user.email || "").trim();
  const name = String(user.name || user.username || extractNameFromEmail(email)).trim() || extractNameFromEmail(email);
  const role = mapServerRoleToUiRole(user.role);

  AUTH_TOKEN = String(authResult?.token || "");
  CURRENT_USER = {
    name,
    email,
    role,
    serverRole: user.role || "Viewer",
  };

  sessionStorage.setItem("sc_user", JSON.stringify(CURRENT_USER));
  sessionStorage.setItem("sc_token", AUTH_TOKEN);
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = AUTH_TOKEN || sessionStorage.getItem("sc_token") || "";

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
}

function currentUserRole() {
  return String(CURRENT_USER?.role || "").toLowerCase();
}

function canEditSubmission() {
  return currentUserRole() === "admin" || currentUserRole() === "editor";
}

async function checkBackendConnectivity() {
  let isOnline = false;
  try {
    const resp = await fetch(`${API_BASE}/api/health`, { cache: "no-store" });
    if (resp.ok) {
      const json = await resp.json();
      isOnline = json.ok === true;
    }
  } catch (e) {
    isOnline = false;
  }
  setConnectivityState(isOnline);
  scheduleConnectivityCheck(isOnline);
}

/* ═══════════════════════════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════════════════════════ */
function mockSignIn() {
  const email = prompt("MOCK SSO — enter your email (@etihad.ae):", "test@etihad.ae");
  if (!email) return null;
  if (!email.toLowerCase().endsWith("@" + CONFIG.DOMAIN_HINT)) {
    document.getElementById("loginError").style.display = "block"; return null;
  }
  const password = prompt("MOCK SSO — enter password:", "");
  if (!password) return null;
  return { email, password };
}

async function signInWithBackend(credentials) {
  const resp = await fetch(`${API_BASE}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(json.error || `Sign-in failed (${resp.status})`);
  }
  return json;
}

document.getElementById("ssoLoginBtn").addEventListener("click", async () => {
  document.getElementById("loginError").style.display = "none";
  const creds = mockSignIn();
  if (!creds) return;

  try {
    const authResult = await signInWithBackend(creds);
    applySessionFromAuthResult(authResult);
    bootApp();
  } catch (error) {
    const el = document.getElementById("loginError");
    el.textContent = error.message || "Sign-in failed. Please check your credentials.";
    el.style.display = "block";
  }
});

document.getElementById("signOutBtn").addEventListener("click", () => {
  clearClientSession();
  location.reload();
});

(async function tryResume() {
  const c = sessionStorage.getItem("sc_user");
  const t = sessionStorage.getItem("sc_token");
  if (!c || !t) return;

  try {
    AUTH_TOKEN = t;
    const resp = await apiFetch("/api/auth/me", { cache: "no-store" });

    if (resp.status === 401 || resp.status === 403) {
      // Token explicitly rejected by the server – wipe the stale session.
      clearClientSession();
      return;
    }

    if (!resp.ok) {
      // Transient server/network error (5xx, timeout, etc.)
      // Fall back to cached user data and boot the app anyway.
      try {
        const cachedUser = JSON.parse(c);
        applySessionFromAuthResult({ token: t, user: cachedUser });
        bootApp();
      } catch (e) {
        // Cached data is corrupted – wipe session and show login
        clearClientSession();
      }
      return;
    }

    const me = await resp.json();
    applySessionFromAuthResult({ token: t, user: me.user });
    bootApp();
  } catch (_e) {
    // Network error – fall back to cached session data and boot the app.
    try {
      const cachedUser = JSON.parse(c);
      applySessionFromAuthResult({ token: t, user: cachedUser });
      bootApp();
    } catch (e) {
      // Cached data is corrupted – wipe session and show login
      clearClientSession();
    }
  }
})();

/* ═══════════════════════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════════════════════ */
function bootApp() {
  const loginGate = document.getElementById("loginGate");
  const appWrap = document.getElementById("appWrap");

  // Safety check – if critical elements don't exist, don't attempt to boot
  if (!loginGate || !appWrap) {
    console.error("Critical DOM elements missing. Cannot boot app.");
    return;
  }

  loginGate.style.display = "none";
  appWrap.style.display = "block";

  const initials = CURRENT_USER.name.split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
  const avatar = document.getElementById("userAvatar");
  const displayName = document.getElementById("userDisplayName");
  const pill = document.getElementById("roleBadge");
  const roToday = document.getElementById("roToday");

  if (avatar) avatar.textContent = initials;
  if (displayName) displayName.textContent = `${CURRENT_USER.name} (${CURRENT_USER.email})`;
  if (pill) {
    pill.textContent = String(CURRENT_USER.serverRole || CURRENT_USER.role).toUpperCase();
    pill.className = "role-pill " + CURRENT_USER.role;
  }
  if (roToday) roToday.textContent = fmtDate(TODAY);

  const isAdmin = CURRENT_USER.role === "admin";
  const canWrite = canEditSubmission();

  const addRowBtn = document.getElementById("addRowBtn");
  const importBtn = document.getElementById("importPrevSprintBtn");
  const exportBtn = document.getElementById("exportBtn");
  const adminBadge = document.getElementById("adminEditBadge");
  const adminLink = document.getElementById("adminEntryLink");
  const allTeamsCard = document.getElementById("allTeamsCard");

  if (addRowBtn) addRowBtn.style.display = canWrite ? "inline-block" : "none";
  if (importBtn) importBtn.style.display = canWrite ? "inline-flex" : "none";
  if (exportBtn) exportBtn.style.display = isAdmin ? "inline-flex" : "none";
  if (adminBadge) adminBadge.style.display = isAdmin ? "inline-block" : "none";
  if (adminLink) adminLink.style.display = isAdmin ? "inline" : "none";
  if (allTeamsCard) allTeamsCard.style.display = "block";


  Promise.all([loadSprintCalendar(), loadRolesConfig(), loadTeams()]).then(() => {
    const warnings = [];
    if (TEAMS.length === 0) warnings.push("No active teams were returned by the backend.");
    if (ROLE_CONFIG.length === 0) warnings.push("No roles were returned by the backend.");
    if (SPRINT_CALENDAR.length === 0) warnings.push("No sprint calendar records were returned by the backend.");
    setConfigWarning(warnings);
    initTeamDropdown();
    initSprintAutocomplete();
    syncConfigDependentUi();
    updateReadout();
    renderRoster();
    renderAllTeams();
  });
}

/* ═══════════════════════════════════════════════════════════════════
   DROPDOWNS
═══════════════════════════════════════════════════════════════════ */
function initTeamDropdown() {
  const sel = document.getElementById("teamSel");
  sel.innerHTML = '<option value="">— Select team —</option>';
  TEAMS.forEach(t => { const o = new Option(t.name, t.key); sel.appendChild(o); });
  sel.onchange = onTeamSprintChange;
}

let sprintAcDebounceTimer = null;
let sprintAcAbortController = null;
let sprintAcActiveIndex = -1;
let sprintAcIgnoreInput = false;

function normalizeSprintRecord(s) {
  return {
    sprint: s.sprint,
    pi: s.pi,
    start: s.start.slice(0, 10),
    end: s.end.slice(0, 10),
  };
}

function mergeSprintsIntoCalendar(sprints = []) {
  sprints.forEach((s) => {
    const rec = normalizeSprintRecord(s);
    const idx = SPRINT_CALENDAR.findIndex((item) => item.sprint === rec.sprint);
    if (idx >= 0) SPRINT_CALENDAR[idx] = rec;
    else SPRINT_CALENDAR.push(rec);
  });
}

function sprintOptionSuffix(s, phase) {
  if (phase === "Current") return `Current · ${fmtDate(s.start)} – ${fmtDate(s.end)}`;
  if (phase === "Next") return `Next · opens ${fmtDate(s.start)}`;
  if (phase === "Previous") return `Previous · ended ${fmtDate(s.end)}`;
  return `${fmtDate(s.start)} – ${fmtDate(s.end)}`;
}

function sprintOptionLabel(s, phase) {
  return `${s.sprint}  (${sprintOptionSuffix(s, phase)})`;
}

function getDefaultSprintChoices() {
  const sorted = [...SPRINT_CALENDAR].sort((a, b) => a.start.localeCompare(b.start));
  const currentIndex = sorted.findIndex((s) => TODAY >= s.start && TODAY <= s.end);
  const nextIndex = currentIndex >= 0
    ? currentIndex + 1
    : sorted.findIndex((s) => s.start > TODAY);
  const previousIndex = currentIndex >= 0
    ? currentIndex - 1
    : (nextIndex > 0 ? nextIndex - 1 : (nextIndex === -1 && sorted.length ? sorted.length - 1 : -1));
  const visible = [];
  const pushVisible = (index, phase) => {
    const sprint = sorted[index];
    if (!sprint || visible.some((item) => item.sprint === sprint.sprint)) return;
    visible.push({ ...sprint, phase });
  };

  pushVisible(previousIndex, "Previous");
  pushVisible(currentIndex, "Current");
  pushVisible(nextIndex, "Next");

  if (visible.length === 0 && sorted.length) {
    visible.push({ ...sorted[sorted.length - 1], phase: "Previous" });
  }

  const defaultSprint = currentIndex >= 0 && sorted[currentIndex]
    ? sorted[currentIndex].sprint
    : (nextIndex >= 0 && sorted[nextIndex] ? sorted[nextIndex].sprint : visible[0]?.sprint || "");

  return { visible, defaultSprint, currentIndex, nextIndex };
}

function updateSprintWindowFlag() {
  const flag = document.getElementById("windowFlag");
  if (!flag) return;  // Exit safely if element doesn't exist

  const { currentIndex, nextIndex } = getDefaultSprintChoices();

  if (currentIndex === -1) {
    flag.textContent = nextIndex >= 0
      ? "NO WINDOW OPEN — SHOWING PREVIOUS + NEXT SPRINTS"
      : "NO UPCOMING WINDOW — SHOWING LAST SPRINT";
    flag.classList.add("state-warning");
    flag.classList.remove("state-open");
  } else {
    flag.textContent = "";
    flag.classList.add("state-open");
    flag.classList.remove("state-warning");
  }
}

function hideSprintAcList() {
  document.getElementById("sprintAcList").classList.add("hidden");
  sprintAcActiveIndex = -1;
}

function setSprintAcActiveIndex(index) {
  const list = document.getElementById("sprintAcList");
  const items = list.querySelectorAll(".ac-item");
  items.forEach((item, i) => item.classList.toggle("active", i === index));
  sprintAcActiveIndex = index;
  if (index >= 0 && items[index]) {
    items[index].scrollIntoView({ block: "nearest" });
  }
}

function setSprintSelection(sprintNo, displayLabel, { triggerChange = false } = {}) {
  sprintAcIgnoreInput = true;
  document.getElementById("sprintSel").value = sprintNo;
  document.getElementById("sprintSelInput").value = displayLabel;
  sprintAcIgnoreInput = false;
  hideSprintAcList();
  if (triggerChange) onTeamSprintChange();
}

function searchSprints(query) {
  clearTimeout(sprintAcDebounceTimer);
  const trimmed = query.trim();
  if (!trimmed) {
    document.getElementById("sprintSel").value = "";
    renderSprintAcList(getDefaultSprintChoices().visible);
    onTeamSprintChange();
    return;
  }

  sprintAcDebounceTimer = setTimeout(async () => {
    if (sprintAcAbortController) sprintAcAbortController.abort();
    sprintAcAbortController = new AbortController();
    try {
      const params = new URLSearchParams({ sprint: trimmed });
      const resp = await apiFetch(`/api/sprints?${params.toString()}`, {
        signal: sprintAcAbortController.signal,
        cache: "no-store",
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      mergeSprintsIntoCalendar(json.sprints || []);
      renderSprintAcList((json.sprints || []).map(normalizeSprintRecord));
    } catch (error) {
      if (error.name !== "AbortError") hideSprintAcList();
    }
  }, 250);
}

function renderSprintAcList(items = []) {
  const list = document.getElementById("sprintAcList");
  if (!items.length) {
    list.innerHTML = '<li class="ac-empty">No sprints found</li>';
    list.classList.remove("hidden");
    return;
  }

  list.innerHTML = items.map((s) => {
    const label = sprintOptionLabel(s, s.phase);
    return `<li class="ac-item" role="option" data-sprint="${esc(s.sprint)}" data-label="${esc(label)}">${esc(label)}</li>`;
  }).join("");
  list.classList.remove("hidden");
  sprintAcActiveIndex = -1;

  list.querySelectorAll(".ac-item").forEach((item) => {
    item.addEventListener("mousedown", (event) => {
      event.preventDefault();
      setSprintSelection(item.dataset.sprint, item.dataset.label, { triggerChange: true });
    });
  });
}

async function initSprintAutocomplete() {
  const input = document.getElementById("sprintSelInput");
  const hidden = document.getElementById("sprintSel");

  updateSprintWindowFlag();

  const { visible, defaultSprint } = getDefaultSprintChoices();
  if (defaultSprint) {
    const selected = visible.find((s) => s.sprint === defaultSprint) || SPRINT_CALENDAR.find((s) => s.sprint === defaultSprint);
    if (selected) {
      setSprintSelection(defaultSprint, sprintOptionLabel(selected, selected.phase));
    }
  }

  input.addEventListener("input", (event) => {
    if (sprintAcIgnoreInput || !event.isTrusted) return;

    const query = input.value;
    const selectedSprint = hidden.value;
    if (selectedSprint && !query.trim().startsWith(selectedSprint)) {
      hidden.value = "";
    }

    searchSprints(query);
  });

  input.addEventListener("focus", () => {
    renderSprintAcList(getDefaultSprintChoices().visible);
  });

  input.addEventListener("blur", () => {
    setTimeout(() => {
      hideSprintAcList();
      const sprintNo = hidden.value;
      if (sprintNo) {
        const info = SPRINT_CALENDAR.find((s) => s.sprint === sprintNo);
        if (info) {
          sprintAcIgnoreInput = true;
          input.value = sprintOptionLabel(info);
          sprintAcIgnoreInput = false;
        }
      } else if (input.value.trim()) {
        sprintAcIgnoreInput = true;
        input.value = "";
        sprintAcIgnoreInput = false;
      }
    }, 150);
  });

  input.addEventListener("keydown", (event) => {
    const list = document.getElementById("sprintAcList");
    const items = list.querySelectorAll(".ac-item");
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (list.classList.contains("hidden")) {
        if (hidden.value) {
          renderSprintAcList(getDefaultSprintChoices().visible);
        } else {
          searchSprints(input.value);
        }
        return;
      }
      setSprintAcActiveIndex(Math.min(sprintAcActiveIndex + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSprintAcActiveIndex(Math.max(sprintAcActiveIndex - 1, 0));
    } else if (event.key === "Enter") {
      if (sprintAcActiveIndex >= 0 && items[sprintAcActiveIndex]) {
        event.preventDefault();
        const item = items[sprintAcActiveIndex];
        setSprintSelection(item.dataset.sprint, item.dataset.label, { triggerChange: true });
      }
    } else if (event.key === "Escape") {
      hideSprintAcList();
    }
  });

  document.addEventListener("click", (event) => {
    if (!document.getElementById("sprintAcWrap").contains(event.target)) {
      hideSprintAcList();
    }
  });
}

function updateReadout() {
  const sprintSel = document.getElementById("sprintSel");
  if (!sprintSel) return;

  const v = sprintSel.value;
  const info = SPRINT_CALENDAR.find(s => s.sprint === v);

  const roPI = document.getElementById("roPI");
  const roStart = document.getElementById("roStart");
  const roEnd = document.getElementById("roEnd");

  if (roPI) roPI.textContent = info ? `PI ${info.pi}` : "—";
  if (roStart) roStart.textContent = info ? fmtDate(info.start) : "—";
  if (roEnd) roEnd.textContent = info ? fmtDate(info.end) : "—";

  syncSubmissionFieldState();
}

async function onTeamSprintChange() {
  updateReadout();
  const teamKey = document.getElementById("teamSel").value;
  const sprintVal = document.getElementById("sprintSel").value;
  const strip = document.getElementById("historyStrip");

  loadAllTeams();

  if (!teamKey || !sprintVal) {
    strip.style.display = "none";
    document.getElementById("submissionNotes").value = "";
    previousSprintImport = null;
    setSubmissionMeta(null);
    syncSubmissionFieldState();
    return;
  }

  const rec = await spRead(teamKey, sprintVal);

  if (rec) {
    strip.style.display = "block";
    strip.innerHTML = `⟳ Existing record found for <b>${getTeamNameByKey(teamKey)}</b> Sprint <b>${sprintVal}</b> — saved by <b>${rec.submittedBy || rec.SubmittedBy}</b> on <b>${fmtDate(rec.submittedDate || rec.SubmittedDate)}</b>. Submitting will replace this record.`;
    if (rec.Roster && Array.isArray(rec.Roster)) {
      rosterRows = JSON.parse(JSON.stringify(rec.Roster));
    }
    document.getElementById("submissionNotes").value = rec.Notes || rec.SprintNotes || "";
    setSubmissionMeta(rec);
  } else {
    strip.style.display = "block";
    strip.innerHTML = `No existing submission found for this Team + Sprint — submitting will create a new record.`;
    rosterRows = JSON.parse(JSON.stringify(DEFAULT_ROSTER));
    document.getElementById("submissionNotes").value = "";
    setSubmissionMeta(null);
  }

  const previousSprint = getPreviousSprintInfo(sprintVal);
  const previousRecord = previousSprint
    ? await fetchSubmissionRecord(teamKey, previousSprint.sprint, { showLoader: false })
    : null;
  previousSprintImport = previousSprint && previousRecord
    ? { sprint: previousSprint.sprint, record: previousRecord }
    : null;

  syncSubmissionFieldState();
  renderRoster();
}

/* ═══════════════════════════════════════════════════════════════════
   API FUNCTIONS
═══════════════════════════════════════════════════════════════════ */
async function apiJson(path, options) {
  const resp = await apiFetch(path, options);
  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`;
    try {
      const err = await resp.json();
      msg = err.error || msg;
    } catch (e) { }
    throw new Error(msg);
  }
  return resp.json();
}

function normalizeCollectionResponse(payload, key) {
  if (Array.isArray(payload)) return payload;
  const collection = payload?.[key];
  return Array.isArray(collection) ? collection : [];
}

async function spRead(teamKey, sprintNo) {
  return fetchSubmissionRecord(teamKey, sprintNo, { showLoader: true });
}

async function fetchSubmissionRecord(teamKey, sprintNo, { showLoader = true } = {}) {
  // Only call API if system is online
  if (!ensureSystemOnline()) {
    return null;
  }

  try {
    if (showLoader) showLoading("Loading existing data from backend…");
    const json = await apiJson(`/api/submissions/${encodeURIComponent(teamKey)}/${encodeURIComponent(sprintNo)}`);
    if (showLoader) hideLoading();
    if (!json || Array.isArray(json)) return null;
    if (Object.prototype.hasOwnProperty.call(json, "found")) {
      return json.found && json.record ? json.record : null;
    }
    return json;
  } catch (e) {
    if (showLoader) hideLoading();
    return null;
  }
}

async function spUpsert(payload) {
  // Only call API if system is online
  if (!ensureSystemOnline()) {
    return { success: false, error: "System is offline" };
  }

  try {
    showLoading("Saving to backend…");
    const json = await apiJson("/api/submissions/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    hideLoading();
    return json;
  } catch (e) {
    hideLoading();
    return { success: false, error: String(e) };
  }
}

async function loadSprintCalendar() {
  // Only call API if system is online
  if (!ensureSystemOnline()) {
    SPRINT_CALENDAR = [];
    return;
  }

  try {
    const json = await apiJson("/api/sprints", { cache: "no-store" });
    const sprintRows = normalizeCollectionResponse(json, "sprints");
    SPRINT_CALENDAR = sprintRows.map((s) => ({
      sprint: s.sprint,
      pi: s.pi,
      start: String(s.start || "").slice(0, 10),
      end: String(s.end || "").slice(0, 10),
    }));
  } catch (e) {
    // Fallback to empty calendar if API fails
    console.error("Failed to load sprint calendar:", e);
    SPRINT_CALENDAR = [];
  }
}

async function loadTeams() {
  if (!ensureSystemOnline()) {
    TEAMS = [];
    return;
  }

  TEAMS = [];
  try {
    const json = await apiJson("/api/teams?status=active", { cache: "no-store" });
    const teamRows = normalizeCollectionResponse(json, "teams");
    TEAMS = teamRows.map((team) => ({
      name: team.name,
      key: team.key,
    }));
  } catch (e) {
    console.error("Failed to load teams config:", e);
  }
}

async function loadRolesConfig() {
  if (!ensureSystemOnline()) {
    ROLE_CONFIG = [];
    return;
  }

  ROLE_CONFIG = [];
  try {
    const json = await apiJson("/api/roles", { cache: "no-store" });
    const roleRows = normalizeCollectionResponse(json, "roles");
    ROLE_CONFIG = roleRows.map((role) => ({
      name: role.name,
      roleType: role.roleType,
      isCapacity: role.isCapacity !== false,
    }));
  } catch (e) {
    console.error("Failed to load roles config:", e);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   ROSTER TABLE
═══════════════════════════════════════════════════════════════════ */
function roleSlug(r) { return String(r || "unknown").toLowerCase().replace(/\s+/g, ""); }
function availDays(row) {
  const leave = (Number(row.ph) || 0) + (Number(row.al) || 0) + (Number(row.other) || 0);
  return Math.max(0, Math.round((SPRINT_LEN - leave) * 10) / 10);
}

function renderRoster() {
  const isAdmin = CURRENT_USER?.role === "admin";
  const { rosterEditable, userCanEdit } = getSubmissionFieldState(getSelectedSprintInfo());
  const isLocked = !rosterEditable || !userCanEdit;
  const body = document.getElementById("rosterBody");
  const roleOptions = getRoleOptions();
  body.innerHTML = "";

  rosterRows.forEach((row, idx) => {
    const avail = availDays(row);
    row._avail = avail;
    const tr = document.createElement("tr");
    tr.className = "role-" + roleSlug(row.role);

    const optionValues = roleOptions.includes(row.role)
      ? roleOptions
      : [...roleOptions, row.role].filter(Boolean);

    tr.innerHTML = `
      <td><input type="text" data-f="name" data-i="${idx}" value="${esc(row.name)}" class="row-name-input" ${isLocked ? "disabled" : ""}></td>
      <td><select data-f="role" data-i="${idx}" ${isLocked ? "disabled" : ""}>${optionValues.map(r => `<option value="${r}" ${r === row.role ? "selected" : ""}>${r}</option>`).join("")}</select></td>
      <td><input type="number" data-f="ph"    data-i="${idx}" value="${row.ph}"    min="0" step="0.5" ${isLocked ? "disabled" : ""}></td>
      <td><input type="number" data-f="al"    data-i="${idx}" value="${row.al}"    min="0" step="0.5" ${isLocked ? "disabled" : ""}></td>
      <td><input type="number" data-f="other" data-i="${idx}" value="${row.other}" min="0" step="0.5" ${isLocked ? "disabled" : ""}></td>
      <td class="pct"><input type="number" data-f="pct" data-i="${idx}" value="${Number(row.pct) || 0}" min="0" max="100" step="5" ${(!isAdmin || isLocked) ? "disabled" : ""}></td>
      <td class="avail">${avail}</td>
      <td><input type="text" data-f="notes" data-i="${idx}" value="${esc(row.notes)}" placeholder="—" ${(!isAdmin || isLocked) ? "disabled" : ""}></td>
      <td>${isAdmin && !isLocked ? `<button class="ic-btn" data-rm="${idx}" title="Remove">✕</button>` : ""}</td>`;
    body.appendChild(tr);
  });

  body.querySelectorAll("input,select").forEach(el => { el.addEventListener("input", onField); el.addEventListener("change", onField); });
  body.querySelectorAll("[data-rm]").forEach(btn => {
    btn.addEventListener("click", () => { rosterRows.splice(+btn.dataset.rm, 1); renderRoster(); });
  });
  computeKPIs();
}

function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;"); }

function onField(e) {
  const idx = +e.target.dataset.i, f = e.target.dataset.f;
  let v = e.target.value;
  if (["ph", "al", "other", "pct"].includes(f)) v = Number(v);
  rosterRows[idx][f] = v;
  if (["ph", "al", "other", "pct"].includes(f)) {
    const av = availDays(rosterRows[idx]);
    rosterRows[idx]._avail = av;
    e.target.closest("tr").querySelector(".avail").textContent = av;
  }
  if (f === "role") e.target.closest("tr").className = "role-" + roleSlug(v);
  computeKPIs();
}

document.getElementById("addRowBtn").addEventListener("click", () => {
  const { rosterEditable, userCanEdit } = getSubmissionFieldState(getSelectedSprintInfo());
  if (!rosterEditable || !userCanEdit) return;
  rosterRows.push({ name: "", role: getDefaultRoleName(), ph: 0, al: 0, other: 0, pct: 0, notes: "" });
  renderRoster();
});

/* ═══════════════════════════════════════════════════════════════════
   KPI CALCULATIONS
═══════════════════════════════════════════════════════════════════ */
function safeSetText(elementId, text) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = text;
}

function safeSetStyle(elementId, styleProp, value) {
  const el = document.getElementById(elementId);
  if (el) el.style[styleProp] = value;
}

function computeKPIs() {
  const capacityRows = rosterRows.filter(r => String(r?.name || "").trim() && isCapacityRole(r?.role || ""));
  const teamSize = capacityRows.length;
  const totalDays = capacityRows.reduce((s, r) => s + availDays(r), 0);
  const productHealth = clampPercentage(productHealthValue);
  const productHealthFactor = 1 - (productHealth / 100);
  const overhead = capacityRows.reduce((sum, r) => {
    const available = availDays(r);
    const pct = Math.max(0, Math.min(100, Number(r?.pct) || 0));
    return sum + (available * pct / 100);
  }, 0);
  const overheadPct = totalDays > 0 ? (overhead / totalDays) * 100 : 0;
  const baseSprintCapacity = Math.max(0, totalDays - overhead);
  const productHealthReduction = baseSprintCapacity * (productHealth / 100);
  const sprintCap = Math.max(0, baseSprintCapacity * productHealthFactor);
  let devDays = 0, tstDays = 0;
  capacityRows.forEach(r => {
    const available = availDays(r);
    const pct = Math.max(0, Math.min(100, Number(r?.pct) || 0));
    const net = Math.max(0, (available - (available * pct / 100)) * productHealthFactor);
    const rl = String(r?.role || "").toLowerCase();
    if (rl.includes("dev")) devDays += net;
    else if (rl.includes("test")) tstDays += net;
  });
  const tot = devDays + tstDays;
  const dp = tot > 0 ? Math.round(devDays / tot * 100) : 0;
  const tp = tot > 0 ? 100 - dp : 0;

  safeSetText("kpiTeamSize", teamSize);
  safeSetText("kpiTotalDays", r1(totalDays));
  safeSetText("kpiOverhead", r1(overhead));
  safeSetText("kpiOverheadFoot", `${r1(overheadPct)}% of Total Days (BAU/Meetings/Training)`);
  safeSetText("kpiProductHealthReduction", r1(productHealthReduction));
  safeSetText("kpiProductHealthFoot", `${r1(productHealth)}% product health reduction applied`);
  safeSetText("kpiSprintCap", r1(sprintCap));
  safeSetText("kpiSprintCapFoot", "Total Days − Overhead − Product Health reduction");
  safeSetText("kpiBifText", `Dev ${r1(devDays)}d · Test ${r1(tstDays)}d`);
  safeSetStyle("bifDevBar", "width", dp + "%");
  safeSetStyle("bifTestBar", "width", tp + "%");
  safeSetText("bifDevPct", dp + "%");
  safeSetText("bifTestPct", tp + "%");
  return { teamSize, totalDays, overhead, productHealth, productHealthReduction, sprintCap, devDays, tstDays, dp, tp };
}
function r1(n) { return Math.round(n * 10) / 10; }

/* ═══════════════════════════════════════════════════════════════════
   RENDER ALL TEAMS (Admin only)
═══════════════════════════════════════════════════════════════════ */
function renderAllTeams() {
  loadAllTeams();
}

async function fetchAllSubmissions() {
  if (!ensureSystemOnline()) {
    return [];
  }

  const json = await apiJson("/api/submissions");
  return normalizeCollectionResponse(json, "submissions");
}

async function fetchSubmissionHistory() {
  if (!ensureSystemOnline()) {
    return [];
  }

  const teamKey = document.getElementById("teamSel")?.value || "";
  const sprintNo = document.getElementById("sprintSel")?.value || "";
  const params = new URLSearchParams();

  if (teamKey && sprintNo) {
    params.set("teamKey", teamKey);
    params.set("sprintNo", sprintNo);
  } else {
    params.set("limit", "10");
  }

  const json = await apiJson(`/api/submissions?${params.toString()}`);
  return normalizeCollectionResponse(json, "submissions");
}

async function loadAllTeams() {
  const container = document.getElementById("allTeamsContainer");
  const note = document.getElementById("submissionHistoryNote");
  const teamKey = document.getElementById("teamSel")?.value || "";
  const sprintNo = document.getElementById("sprintSel")?.value || "";
  if (note) {
    note.textContent = teamKey && sprintNo
      ? `Showing submission history for ${getTeamNameByKey(teamKey)} / Sprint ${sprintNo}.`
      : "Showing the latest 10 submissions. Select both Team and Sprint to narrow the list.";
  }
  let submissions = [];
  try {
    submissions = await fetchSubmissionHistory();
  } catch (e) {
    container.innerHTML = '<p class="all-grid-msg error">Unable to load submissions from backend.</p>';
    return;
  }

  if (submissions.length === 0) {
    container.innerHTML = '<p class="all-grid-msg muted">No submissions found for the current selection.</p>';
    return;
  }

  container.innerHTML = submissions.map((s) => `
    <div class="submission-card">
      <h3>${s.Team || "—"}</h3>
      <div class="submission-row"><span class="submission-label">Sprint:</span><span class="submission-value">${s.SprintNo || "—"}</span></div>
      <div class="submission-row"><span class="submission-label">Product Health:</span><span class="submission-value">${r1(s.ProductHealth || 0)}%</span></div>
      <div class="submission-row"><span class="submission-label">Team Size:</span><span class="submission-value">${r1(s.TeamSize || 0)}</span></div>
      <div class="submission-row"><span class="submission-label">Overhead:</span><span class="submission-value">${r1(s.SprintOverhead || 0)}d</span></div>
      <div class="submission-row"><span class="submission-label">Capacity:</span><span class="submission-value">${r1(s.SprintCapacity || 0)}d</span></div>
    </div>
  `).join("");
}

/* ═══════════════════════════════════════════════════════════════════
   EXPORT ALL TEAMS TO EXCEL (Admin only)
═══════════════════════════════════════════════════════════════════ */
document.getElementById("exportBtn").addEventListener("click", () => {
  exportAllTeams();
});

async function exportAllTeams() {
  if (CURRENT_USER?.role !== "admin") { alert("Admin only"); return; }

  let submissions = [];
  try {
    submissions = await fetchAllSubmissions();
  } catch (e) {
    alert("Unable to load submissions from backend");
    return;
  }

  if (submissions.length === 0) {
    alert("No submissions to export");
    return;
  }

  // Summary sheet - all teams
  const summarySheet = submissions.map(s => ({
    'Team': s.Team, 'Sprint': s.SprintNo, 'PI': s.PI,
    'Product Health %': r1(s.ProductHealth || 0),
    'Product Health Reduction': r1(s.ProductHealthReduction || 0),
    'Sprint Goal': s.SprintGoal ?? '', 'Goals Achieved': s.GoalsAchieved ?? '',
    'Objectives': Array.isArray(s.Objectives) ? s.Objectives.join(' | ') : '',
    'Team Size': s.TeamSize, 'Total Days': r1(s.TotalDays),
    'Sprint Overhead': r1(s.SprintOverhead), 'Sprint Capacity': r1(s.SprintCapacity),
    'Dev Days': r1(s.DevCapacityDays), 'Test Days': r1(s.TestCapacityDays),
    'Dev %': s.DevPercent + '%', 'Test %': s.TestPercent + '%',
    'Submitted By': s.submittedBy, 'Submitted Date': s.submittedDate
  }));

  // Detailed roster sheet
  const rosterSheet = [];
  submissions.forEach(s => {
    if (s.Roster && Array.isArray(s.Roster)) {
      s.Roster.forEach(member => {
        rosterSheet.push({
          'Team': s.Team, 'Sprint': s.SprintNo,
          'Name': member.name, 'Role': member.role,
          'PH Days': member.ph, 'AL Days': member.al, 'Other Days': member.other,
          '% on Project': member.pct, 'Available Days': availDays(member).toFixed(1),
          'Notes': member.notes || ''
        });
      });
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summarySheet), "All Teams Summary");
  if (rosterSheet.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rosterSheet), "All Roster Details");

  XLSX.writeFile(wb, `SprintCapacity_AllTeams_${TODAY}.xlsx`);
}

/* ═══════════════════════════════════════════════════════════════════
   SUBMIT
═══════════════════════════════════════════════════════════════════ */
document.getElementById("submitBtn").addEventListener("click", async () => {
  if (!canEditSubmission()) {
    const statusEl = document.getElementById("statusMsg");
    statusEl.textContent = "Viewer role is read-only. Submission is allowed only for Editor/Admin.";
    statusEl.className = "status-msg err";
    return;
  }

  const teamKey = document.getElementById("teamSel").value;
  const sprintVal = document.getElementById("sprintSel").value;
  const statusEl = document.getElementById("statusMsg");
  if (!teamKey || !sprintVal) { alert("Please select both Team and Sprint before submitting."); return; }

  const teamObj = TEAMS.find(t => t.key === teamKey);
  if (!teamObj) {
    alert("Selected team is not active anymore. Please re-select team.");
    return;
  }
  const sprintInf = SPRINT_CALENDAR.find(s => s.sprint === sprintVal);
  const kpis = computeKPIs();

  const payload = {
    Team: teamObj.name, ProjectKey: teamObj.key, SprintNo: sprintVal,
    PI: sprintInf?.pi || "", SprintStart: sprintInf?.start || "", SprintEnd: sprintInf?.end || "",
    submittedDate: TODAY,
    submittedBy: `${CURRENT_USER.name} (${CURRENT_USER.email})`,
    submittedRole: CURRENT_USER.role,
    ProductHealth: kpis.productHealth,
    ProductHealthReduction: r1(kpis.productHealthReduction),
    SprintGoal: document.getElementById("sprintGoalInput").value,
    GoalsAchieved: document.getElementById("goalsAchievedInput").value,
    Objectives: normalizeObjectives(objectiveValues),
    TeamSize: kpis.teamSize,
    TotalDays: r1(kpis.totalDays),
    SprintOverhead: r1(kpis.overhead),
    SprintCapacity: r1(kpis.sprintCap),
    DevCapacityDays: r1(kpis.devDays),
    TestCapacityDays: r1(kpis.tstDays),
    DevPercent: kpis.dp,
    TestPercent: kpis.tp,
    Notes: document.getElementById("submissionNotes").value,
    Roster: rosterRows.map(r => ({ ...r, AvailableDays: availDays(r) }))
  };

  document.getElementById("submitBtn").disabled = true;
  const result = await spUpsert(payload);
  document.getElementById("submitBtn").disabled = false;

  if (result.success === false) {
    statusEl.textContent = `❌ Save failed: ${result.error || "unknown error"}. Please try again.`;
    statusEl.className = "status-msg err";
  } else {
    statusEl.textContent = result.isReplace
      ? `⟳ Record replaced — ${teamObj.name}, Sprint ${sprintVal}. Capacity: ${payload.SprintCapacity} days.`
      : `✓ Submitted — ${teamObj.name}, Sprint ${sprintVal}. Capacity: ${payload.SprintCapacity} days.`;
    statusEl.className = result.isReplace ? "status-msg replace" : "status-msg ok";
    await onTeamSprintChange();
    renderAllTeams();
  }
});

renderRoster();
document.getElementById("productHealthInput").addEventListener("input", (event) => {
  productHealthValue = clampPercentage(event.target.value);
  computeKPIs();
});
document.getElementById("productHealthInput").addEventListener("blur", (event) => {
  setProductHealth(event.target.value);
  computeKPIs();
});
document.getElementById("importPrevSprintBtn").addEventListener("click", () => {
  if (!previousSprintImport?.record || !canEditSubmission()) return;
  if (!window.confirm(`Replace the current roster with the roster from Sprint ${previousSprintImport.sprint}?`)) return;
  rosterRows = Array.isArray(previousSprintImport.record.Roster)
    ? JSON.parse(JSON.stringify(previousSprintImport.record.Roster))
    : [];
  renderRoster();
  showStatus(`Imported roster from Sprint ${previousSprintImport.sprint}.`, "ok");
});
document.getElementById("addObjectiveBtn").addEventListener("click", () => {
  const { objectivesEditable } = getSubmissionFieldState(getSelectedSprintInfo());
  if (!objectivesEditable) return;
  objectiveValues.push("");
  renderObjectives();
});

document.getElementById("sprintGoalInput").addEventListener("input", updateGoalsAchievedColor);
document.getElementById("goalsAchievedInput").addEventListener("input", updateGoalsAchievedColor);

setSubmissionMeta(null);
syncSubmissionFieldState();
checkBackendConnectivity();
