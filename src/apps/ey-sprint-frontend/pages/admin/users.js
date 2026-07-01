const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : "";
let users = [];
let teams = [];
let currentEditId = null;
let AUTH_TOKEN = "";

function clearClientSession() {
  sessionStorage.removeItem("sc_user");
  sessionStorage.removeItem("sc_token");
}

async function authFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = AUTH_TOKEN || sessionStorage.getItem("sc_token") || "";
  const requestUrl = String(path).startsWith("http") ? path : `${API_BASE}${path}`;
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const resp = await fetch(requestUrl, {
    ...options,
    headers,
  });

  if (resp.status === 401) {
    clearClientSession();
    window.location.href = "/";
    throw new Error("Session expired. Please sign in again.");
  }

  return resp;
}

function checkAuth() {
  const user = JSON.parse(sessionStorage.getItem("sc_user") || "null");
  const role = String(user?.role || user?.serverRole || "").toLowerCase();
  AUTH_TOKEN = sessionStorage.getItem("sc_token") || "";
  if (!user || role !== "admin" || !AUTH_TOKEN) {
    // Do NOT clear the session – just redirect without destroying a valid
    // editor/viewer session that belongs to the main app.
    window.location.href = "/";
    return false;
  }
  return true;
}

function showStatus(msg, type) {
  const el = document.getElementById("statusMsg");
  el.textContent = msg;
  el.className = `status-msg show ${type}`;
  setTimeout(() => el.classList.remove("show"), 3500);
}

function setModalStatus(msg, type) {
  const el = document.getElementById("modalStatusMsg");
  if (!msg) {
    el.textContent = "";
    el.className = "status-msg";
    return;
  }
  el.textContent = msg;
  el.className = `status-msg show ${type}`;
}

function teamNameFromKey(key) {
  return teams.find((team) => team.key === key)?.name || key;
}

function renderAssignedTeamNames(assignedTeams = []) {
  if (!assignedTeams.length) return "—";
  return assignedTeams.map((key) => teamNameFromKey(key)).join(", ");
}

async function loadTeams() {
  const resp = await authFetch("/api/teams", { cache: "no-store" });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.error || "Failed to load teams");
  teams = Array.isArray(json) ? json : (Array.isArray(json.teams) ? json.teams : []);
}

function renderAssignedTeamsGrid(selectedTeams = []) {
  const grid = document.getElementById("assignedTeamsGrid");
  const selected = new Set(selectedTeams);
  if (!teams.length) {
    grid.innerHTML = '<div class="muted">No teams available</div>';
    return;
  }

  grid.innerHTML = teams.map((team) => `
    <label class="team-checkbox-item">
      <input type="checkbox" value="${team.key}" ${selected.has(team.key) ? "checked" : ""}>
      <span>${team.name} <b>(${team.key})</b></span>
    </label>
  `).join("");
}

function syncAssignedTeamsUi() {
  const isEditor = document.getElementById("formRole").value === "Editor";
  const hint = document.getElementById("assignedTeamsHint");
  const inputs = document.querySelectorAll("#assignedTeamsGrid input[type=checkbox]");
  inputs.forEach((input) => {
    input.disabled = !isEditor;
    if (!isEditor) {
      input.checked = false;
    }
  });
  hint.textContent = isEditor
    ? "Editor users can submit only for the selected teams."
    : "Assigned teams apply only when the role is Editor.";
}

async function loadUsers() {
  const tbody = document.getElementById("usersBody");
  tbody.innerHTML = '<tr><td colspan="6" class="center loading">Loading...</td></tr>';

  try {
    const params = new URLSearchParams({
      search: document.getElementById("filterSearch").value,
      role: document.getElementById("filterRole").value,
      status: document.getElementById("filterStatus").value,
    });
    const resp = await authFetch(`/api/users?${params.toString()}`, { cache: "no-store" });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error || "Failed to load users");

    users = Array.isArray(json) ? json : (json.users || []);
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="center table-empty">No users found</td></tr>';
      return;
    }

    tbody.innerHTML = users.map((user) => `
      <tr>
        <td>
          <strong>${user.name || user.username || "—"}</strong>
          <div class="sub-cell mono">${user.username || "—"}</div>
        </td>
        <td>${user.email}</td>
        <td><span class="pill role-${String(user.role || "").toLowerCase()}">${user.role}</span></td>
        <td><span class="pill ${user.isActive ? "active" : "inactive"}">${user.isActive ? "Active" : "Inactive"}</span></td>
        <td>${renderAssignedTeamNames(user.assignedTeams)}</td>
        <td class="actions-cell">
          <button class="btn btn-small btn-secondary" onclick="openEditUserModal('${user.id}')">Edit</button>
        </td>
      </tr>
    `).join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-error">${e.message}</td></tr>`;
  }
}

function openEditUserModal(id) {
  const user = users.find((item) => item.id === id);
  if (!user) return;

  currentEditId = id;
  document.getElementById("modalTitle").textContent = `Edit User: ${user.email}`;
  document.getElementById("formName").value = user.name || "";
  document.getElementById("formUsername").value = user.username || "";
  document.getElementById("formEmail").value = user.email || "";
  document.getElementById("formRole").value = user.role || "Viewer";
  document.getElementById("formIsActive").checked = user.isActive !== false;
  renderAssignedTeamsGrid(user.assignedTeams || []);
  syncAssignedTeamsUi();
  setModalStatus("", "ok");
  document.getElementById("userModal").classList.add("show");
}

function closeModal() {
  document.getElementById("userModal").classList.remove("show");
}

function getSelectedAssignedTeams() {
  return [...document.querySelectorAll("#assignedTeamsGrid input[type=checkbox]:checked")].map((input) => input.value);
}

function initializePageEvents() {
  document.getElementById("filterBtn").addEventListener("click", loadUsers);
  document.getElementById("clearFilterBtn").addEventListener("click", () => {
    document.getElementById("filterSearch").value = "";
    document.getElementById("filterRole").value = "";
    document.getElementById("filterStatus").value = "";
    loadUsers();
  });
  document.getElementById("cancelBtn").addEventListener("click", closeModal);
  document.getElementById("formRole").addEventListener("change", syncAssignedTeamsUi);
  document.getElementById("signOutBtn").addEventListener("click", () => {
    clearClientSession();
    window.location.href = "/";
  });

  document.getElementById("userForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      role: document.getElementById("formRole").value,
      isActive: document.getElementById("formIsActive").checked,
      assignedTeams: getSelectedAssignedTeams(),
    };

    try {
      const resp = await authFetch(`/api/users/${currentEditId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Save failed");

      closeModal();
      showStatus("✓ User updated", "ok");
      await loadUsers();
    } catch (e) {
      setModalStatus(`✕ ${e.message}`, "err");
    }
  });

  if (checkAuth()) {
    Promise.all([loadTeams(), loadUsers()]).catch((error) => {
      showStatus(`✕ ${error.message}`, "err");
    });
  }
}

window.openEditUserModal = openEditUserModal;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePageEvents);
} else {
  initializePageEvents();
}

