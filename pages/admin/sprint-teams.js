const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : "";
let teams = [];
let currentEditId = null;

function checkAuth() {
  const user = JSON.parse(sessionStorage.getItem("sc_user") || "null");
  if (!user || user.role !== "admin") {
    alert("Admin access required");
    window.location.href = "/";
    return false;
  }
  return true;
}

function showStatus(msg, type) {
  const el = document.getElementById("statusMsg");
  el.textContent = msg;
  el.className = `status-msg show ${type}`;
  setTimeout(() => el.classList.remove("show"), 3000);
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

async function loadTeams() {
  const tbody = document.getElementById("teamsBody");
  tbody.innerHTML = '<tr><td colspan="4" class="center loading">Loading...</td></tr>';

  try {
    const params = new URLSearchParams({
      name: document.getElementById("filterName").value,
      key: document.getElementById("filterKey").value,
      status: document.getElementById("filterStatus").value,
    });

    const resp = await fetch(`${API_BASE}/api/teams?${params}`, { cache: "no-store" });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "Failed to load teams");

    teams = data.teams || [];
    if (teams.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="center table-empty">No teams found</td></tr>';
      return;
    }

    tbody.innerHTML = teams.map((team) => `
      <tr>
        <td><strong>${team.name}</strong></td>
        <td class="mono">${team.key}</td>
        <td><span class="pill ${team.isActive ? "active" : "inactive"}">${team.isActive ? "Active" : "Inactive"}</span></td>
        <td class="actions-cell">
          <button class="btn btn-small btn-secondary" onclick="editTeam('${team._id}')">Edit</button>
          <button class="btn btn-small btn-danger" onclick="deleteTeam('${team._id}')">Delete</button>
        </td>
      </tr>
    `).join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="4" class="table-error">${e.message}</td></tr>`;
  }
}

function openCreateModal() {
  currentEditId = null;
  document.getElementById("modalTitle").textContent = "Add Team";
  document.getElementById("teamForm").reset();
  document.getElementById("formIsActive").checked = true;
  setModalStatus("", "ok");
  document.getElementById("teamModal").classList.add("show");
}

function editTeam(id) {
  const team = teams.find((item) => item._id === id);
  if (!team) return;
  currentEditId = id;
  document.getElementById("modalTitle").textContent = `Edit Team: ${team.name}`;
  document.getElementById("formName").value = team.name;
  document.getElementById("formKey").value = team.key;
  document.getElementById("formIsActive").checked = team.isActive !== false;
  setModalStatus("", "ok");
  document.getElementById("teamModal").classList.add("show");
}

async function deleteTeam(id) {
  const team = teams.find((item) => item._id === id);
  if (!team) return;
  if (!window.confirm(`Delete team '${team.name}' (${team.key})?`)) return;

  try {
    const resp = await fetch(`${API_BASE}/api/teams/${id}`, { method: "DELETE" });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error || "Delete failed");
    showStatus("✓ Team deleted", "ok");
    loadTeams();
  } catch (e) {
    showStatus(`✕ ${e.message}`, "err");
  }
}

function closeModal() {
  document.getElementById("teamModal").classList.remove("show");
}

// Initialize event listeners and page state when DOM is ready
function initializePageEvents() {
  document.getElementById("filterBtn").addEventListener("click", loadTeams);
  document.getElementById("clearFilterBtn").addEventListener("click", () => {
    document.getElementById("filterName").value = "";
    document.getElementById("filterKey").value = "";
    document.getElementById("filterStatus").value = "";
    loadTeams();
  });
  document.getElementById("addTeamBtn").addEventListener("click", openCreateModal);
  document.getElementById("cancelBtn").addEventListener("click", closeModal);
  document.getElementById("signOutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("sc_user");
    window.location.href = "/";
  });

  document.getElementById("teamForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById("formName").value.trim(),
      key: document.getElementById("formKey").value.trim().toUpperCase(),
      isActive: document.getElementById("formIsActive").checked,
    };

    try {
      const url = currentEditId ? `${API_BASE}/api/teams/${currentEditId}` : `${API_BASE}/api/teams`;
      const method = currentEditId ? "PUT" : "POST";
      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Save failed");

      closeModal();
      showStatus(currentEditId ? "✓ Team updated" : "✓ Team created", "ok");
      loadTeams();
    } catch (e2) {
      setModalStatus(`✕ ${e2.message}`, "err");
    }
  });

  if (checkAuth()) {
    loadTeams();
  }
}

// Wait for DOM to be fully loaded before attaching event listeners
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePageEvents);
} else {
  // DOM is already loaded
  initializePageEvents();
}
