const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : "";
let sprints = [];
let currentEditId = null;
let CURRENT_USER = null;
let lastPiPreview = null;
let pendingPiDelete = null;
let addSprintOptions = [];

// Auth check
function checkAuth() {
  const user = JSON.parse(sessionStorage.getItem("sc_user") || "null");
  if (!user || user.role !== "admin") {
    alert("Admin access required");
    window.location.href = "/";
    return false;
  }
  CURRENT_USER = user;
  return true;
}

// Date formatting
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function calcDays(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  return Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
}

function getSprintStatus(start, end) {
  const today = toUtcDateKey(new Date());
  const startKey = toUtcDateKey(start);
  const endKey = toUtcDateKey(end);
  if (today < startKey) return "Upcoming";
  if (today > endKey) return "Closed";
  return "Active";
}

function toUtcDateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function isTodayOrPast(value) {
  return toUtcDateKey(value) <= toUtcDateKey(new Date());
}

function isIpSprintName(name) {
  return /^\d+\.IP(?:\s*\(\d+\))?$/i.test(String(name || "").trim());
}

function getSelectedAddSprintOption() {
  const select = document.getElementById("addSprintPiSelect");
  const selectedPi = Number(select.value);
  return addSprintOptions.find((option) => Number(option.pi) === selectedPi) || null;
}

function syncAddSprintUi() {
  const addBtn = document.getElementById("addNewSprintBtn");
  const selected = getSelectedAddSprintOption();

  if (!addSprintOptions.length) {
    addBtn.disabled = true;
    addBtn.textContent = "Add Sprint";
    return;
  }

  addBtn.disabled = false;
  addBtn.textContent = selected ? `Add Sprint in PI ${selected.pi}` : "Add Sprint";
}

async function loadAddSprintOptions() {
  const select = document.getElementById("addSprintPiSelect");
  const previousValue = select.value;

  try {
    const resp = await fetch(`${API_BASE}/api/sprints/add-sprint-options`);
    const json = await resp.json();
    if (!resp.ok) {
      throw new Error(json.error || "Failed to load add-sprint options");
    }

    addSprintOptions = json.options || [];
    if (!addSprintOptions.length) {
      select.innerHTML = '<option value="">No eligible PI</option>';
      select.disabled = true;
      syncAddSprintUi();
      return;
    }

    select.disabled = false;
    select.innerHTML = addSprintOptions.map((option) =>
      `<option value="${option.pi}">PI ${option.pi} -> ${option.nextSprintName}</option>`
    ).join("");

    const stillExists = addSprintOptions.some((option) => String(option.pi) === String(previousValue));
    if (stillExists) {
      select.value = previousValue;
    }
    syncAddSprintUi();
  } catch (_e) {
    addSprintOptions = [];
    select.disabled = true;
    select.innerHTML = '<option value="">Options unavailable</option>';
    syncAddSprintUi();
  }
}

// Load sprints from API
async function loadSprints() {
  const tbody = document.getElementById("sprintsBody");
  tbody.innerHTML = '<tr><td colspan="7" class="center loading">Loading...</td></tr>';

  try {
    const params = new URLSearchParams({
      sprint: document.getElementById("filterSprint").value,
      pi: document.getElementById("filterPI").value,
      startDate: document.getElementById("filterStartDate").value,
      endDate: document.getElementById("filterEndDate").value,
    });

    const resp = await fetch(`${API_BASE}/api/sprints?${params}`);
    if (!resp.ok) throw new Error("Failed to load sprints");

    const data = await resp.json();
    sprints = data.sprints || [];

    const piHasIpMap = sprints.reduce((acc, sprintItem) => {
      acc[sprintItem.pi] = acc[sprintItem.pi] || isIpSprintName(sprintItem.sprint);
      return acc;
    }, {});

    if (sprints.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="center table-empty">No sprints found</td></tr>';
      return;
    }

    tbody.innerHTML = sprints.map(s => {
      const isFirstOfPi = /^\d+\.1$/.test(s.sprint);
      const isIp = isIpSprintName(s.sprint);
      const notStarted = new Date(s.start) > new Date();
      const piInIp = Boolean(piHasIpMap[s.pi]);
      const status = getSprintStatus(s.start, s.end);
      const statusClass = status === "Active" ? "active" : status === "Upcoming" ? "upcoming" : "closed";
      const deletePiBtn = (isFirstOfPi && notStarted)
        ? `<button class="btn btn-small btn-danger btn-delete-pi" onclick="openDeletePiModal(${s.pi})" title="Delete all sprints for PI ${s.pi}">Delete PI</button>`
        : "";
      const deleteSprintBtn = (notStarted && !isIp && !piInIp)
        ? `<button class="btn btn-small btn-danger" onclick="deleteSprintEntry('${s._id}', '${s.sprint}')" title="Delete sprint ${s.sprint}">Delete Sprint</button>`
        : "";
      return `
      <tr>
        <td><strong>${s.sprint}</strong></td>
        <td>PI ${s.pi}</td>
        <td>${fmtDate(s.start)}</td>
        <td>${fmtDate(s.end)}</td>
        <td>${calcDays(s.start, s.end)} days</td>
        <td><span class="status-pill ${statusClass}">${status}</span></td>
        <td class="actions-cell">
          <button class="btn btn-small btn-secondary" onclick="editSprint('${s._id}')">Edit</button>
          ${deleteSprintBtn}
          ${deletePiBtn}
        </td>
      </tr>`;
    }).join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-error">${e.message}</td></tr>`;
  }
}

async function deleteSprintEntry(id, sprintName) {
  if (!confirm(`Delete sprint ${sprintName}? Related submissions for this sprint will also be deleted.`)) {
    return;
  }

  try {
    const resp = await fetch(`${API_BASE}/api/sprints/${id}`, { method: "DELETE" });
    const json = await resp.json();
    if (!resp.ok) {
      throw new Error(json.error || "Failed to delete sprint");
    }
    showStatus(`✓ ${json.message}`, "ok");
    await Promise.all([loadSprints(), loadAddSprintOptions()]);
  } catch (e) {
    showStatus(`✕ ${e.message}`, "err");
  }
}

// Edit sprint
function editSprint(id) {
  const sprint = sprints.find(s => s._id === id);
  if (!sprint) return;

  const piSprints = sprints.filter((s) => Number(s.pi) === Number(sprint.pi));
  const piStart = piSprints.find((s) => `${s.pi}.1` === s.sprint)
    || piSprints.sort((a, b) => new Date(a.start) - new Date(b.start))[0];
  if (piStart && isTodayOrPast(piStart.start)) {
    showStatus(`✕ Cannot edit sprint ${sprint.sprint}: PI ${sprint.pi} has already started`, "err");
    return;
  }

  currentEditId = id;
  document.getElementById("modalStatusMsg").className = "status-msg";
  document.getElementById("modalStatusMsg").textContent = "";
  document.getElementById("editWarningBanner").classList.add("show");
  document.getElementById("saveReflowHint").classList.add("show");
  document.getElementById("modalTitle").textContent = `Edit Sprint: ${sprint.sprint}`;
  document.getElementById("formSprint").value = sprint.sprint;
  document.getElementById("formPI").value = sprint.pi;
  document.getElementById("formStart").value = sprint.start.slice(0, 10);
  document.getElementById("formEnd").value = sprint.end.slice(0, 10);
  document.getElementById("sprintModal").classList.add("show");
}

// Open delete-PI modal with a fresh PI snapshot from API.
async function openDeletePiModal(piNumber) {
  const modal = document.getElementById("deletePiModal");
  const title = document.getElementById("deletePiTitle");
  const body = document.getElementById("deletePiBody");
  const status = document.getElementById("deletePiStatusMsg");
  const confirmBtn = document.getElementById("confirmDeletePiBtn");

  pendingPiDelete = Number(piNumber);
  title.textContent = `Delete PI ${pendingPiDelete}`;
  status.className = "status-msg";
  status.textContent = "";
  confirmBtn.disabled = true;
  body.innerHTML = '<tr><td colspan="4" class="center loading">Loading PI details...</td></tr>';
  modal.classList.add("show");

  try {
    const resp = await fetch(`${API_BASE}/api/sprints?pi=${encodeURIComponent(pendingPiDelete)}`);
    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error || "Failed to load PI details");

    const piSprints = (json.sprints || []).sort((a, b) => new Date(a.start) - new Date(b.start));
    if (piSprints.length === 0) {
      throw new Error(`PI ${pendingPiDelete} has no sprint records`);
    }

    body.innerHTML = piSprints.map((s) => `
      <tr>
        <td><strong>${s.sprint}</strong></td>
        <td>${fmtDate(s.start)}</td>
        <td>${fmtDate(s.end)}</td>
        <td>${getSprintStatus(s.start, s.end)}</td>
      </tr>
    `).join("");

    confirmBtn.disabled = false;
  } catch (e) {
    body.innerHTML = `<tr><td colspan="4" class="table-error">${e.message}</td></tr>`;
  }
}

// Delete all sprints for a PI after explicit modal confirmation.
async function deletePi(piNumber) {
  if (!piNumber) return;

  try {
    const resp = await fetch(`${API_BASE}/api/sprints/pi/${piNumber}`, { method: "DELETE" });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error || "Failed to delete PI");

    document.getElementById("deletePiModal").classList.remove("show");
    pendingPiDelete = null;
    showStatus(`✓ ${json.message}`, "ok");
    await Promise.all([loadSprints(), loadAddSprintOptions()]);
  } catch (e) {
    const status = document.getElementById("deletePiStatusMsg");
    status.textContent = `✕ ${e.message}`;
    status.className = "status-msg show err";
  }
}

// Create next PI (6 sprint records)
async function createNewSprintInExistingPi() {
  const selected = getSelectedAddSprintOption();
  if (!selected) {
    showStatus("✕ No eligible PI available for adding a new sprint", "err");
    return;
  }

  if (!confirm(`Add sprint ${selected.nextSprintName} in PI ${selected.pi}? Following sprint dates will be reflowed.`)) {
    return;
  }

  try {
    const resp = await fetch(`${API_BASE}/api/sprints/create-new-sprint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pi: selected.pi }),
    });
    const json = await resp.json();
    if (!resp.ok) {
      throw new Error(json.error || "Failed to add sprint");
    }

    showStatus(`✓ ${json.message}`, "ok");
    await Promise.all([loadSprints(), loadAddSprintOptions()]);
  } catch (e) {
    showStatus(`✕ ${e.message}`, "err");
  }
}

async function openNextPiPreview() {
  const previewModal = document.getElementById("piPreviewModal");
  const previewBody = document.getElementById("piPreviewBody");
  const previewStatus = document.getElementById("piPreviewStatusMsg");
  const confirmBtn = document.getElementById("confirmPiCreateBtn");

  lastPiPreview = null;
  previewStatus.className = "status-msg";
  previewStatus.textContent = "";
  confirmBtn.disabled = true;
  previewBody.innerHTML = '<tr><td colspan="5" class="center loading">Loading preview...</td></tr>';
  previewModal.classList.add("show");

  try {
    const resp = await fetch(`${API_BASE}/api/sprints/next-pi-preview`);
    const json = await resp.json();
    if (!resp.ok) {
      throw new Error(json.error || "Failed to generate preview");
    }

    lastPiPreview = json;
    document.getElementById("piPreviewTitle").textContent = `Create New PI ${json.pi}`;
    previewBody.innerHTML = json.sprints.map((s) => `
      <tr>
        <td><strong>${s.sprint}</strong></td>
        <td>PI ${s.pi}</td>
        <td>${fmtDate(s.start)}</td>
        <td>${fmtDate(s.end)}</td>
        <td>${calcDays(s.start, s.end)} days</td>
      </tr>
    `).join("");
    confirmBtn.disabled = false;
  } catch (e) {
    previewBody.innerHTML = `<tr><td colspan="5" class="table-error">${e.message}</td></tr>`;
  }
}

async function createNextPi() {
  try {
    const resp = await fetch(`${API_BASE}/api/sprints/create-next-pi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const json = await resp.json();
    if (!resp.ok) {
      throw new Error(json.error || "Failed to create next PI");
    }

    document.getElementById("piPreviewModal").classList.remove("show");
    showStatus(`✓ Created PI ${json.pi} with ${json.count} sprints`, "ok");
    await Promise.all([loadSprints(), loadAddSprintOptions()]);
  } catch (e) {
    const previewStatus = document.getElementById("piPreviewStatusMsg");
    previewStatus.textContent = `✕ ${e.message}`;
    previewStatus.className = "status-msg show err";
  }
}

// Display status message
function showStatus(msg, type) {
  const el = document.getElementById("statusMsg");
  el.textContent = msg;
  el.className = `status-msg show ${type}`;
  setTimeout(() => el.classList.remove("show"), 3000);
}

// Initialize event listeners and page state when DOM is ready
function initializePageEvents() {
  // Create new PI (6 sprint records)
  document.getElementById("addSprintBtn").addEventListener("click", () => {
    openNextPiPreview();
  });

  document.getElementById("addNewSprintBtn").addEventListener("click", () => {
    createNewSprintInExistingPi();
  });

  document.getElementById("cancelPiPreviewBtn").addEventListener("click", () => {
    document.getElementById("piPreviewModal").classList.remove("show");
  });

  document.getElementById("confirmPiCreateBtn").addEventListener("click", () => {
    if (!lastPiPreview) {
      return;
    }
    createNextPi();
  });

  document.getElementById("cancelDeletePiBtn").addEventListener("click", () => {
    pendingPiDelete = null;
    document.getElementById("deletePiModal").classList.remove("show");
  });

  document.getElementById("confirmDeletePiBtn").addEventListener("click", () => {
    deletePi(pendingPiDelete);
  });

  // Cancel modal
  document.getElementById("cancelBtn").addEventListener("click", () => {
    document.getElementById("editWarningBanner").classList.remove("show");
    document.getElementById("saveReflowHint").classList.remove("show");
    document.getElementById("sprintModal").classList.remove("show");
  });

  // Save sprint (add/edit)
  document.getElementById("sprintForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      sprint: document.getElementById("formSprint").value,
      pi: Number(document.getElementById("formPI").value),
      start: document.getElementById("formStart").value,
      end: document.getElementById("formEnd").value,
    };

    try {
      if (!currentEditId) {
        throw new Error("Only sprint editing is allowed here. Use 'Create New PI'.");
      }

      const url = `${API_BASE}/api/sprints/${currentEditId}`;
      const method = "PUT";

      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Save failed");
      }

      document.getElementById("sprintModal").classList.remove("show");
      document.getElementById("editWarningBanner").classList.remove("show");
      document.getElementById("saveReflowHint").classList.remove("show");
      showStatus("✓ Sprint updated", "ok");
      await Promise.all([loadSprints(), loadAddSprintOptions()]);
    } catch (e) {
      document.getElementById("modalStatusMsg").textContent = `✕ ${e.message}`;
      document.getElementById("modalStatusMsg").className = "status-msg show err";
    }
  });

  // Filter
  document.getElementById("filterBtn").addEventListener("click", loadSprints);
  document.getElementById("clearFilterBtn").addEventListener("click", () => {
    document.getElementById("filterSprint").value = "";
    document.getElementById("filterPI").value = "";
    document.getElementById("filterStartDate").value = "";
    document.getElementById("filterEndDate").value = "";
    loadSprints();
  });
  document.getElementById("addSprintPiSelect").addEventListener("change", syncAddSprintUi);

  // Sign out
  document.getElementById("signOutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("sc_user");
    window.location.href = "/";
  });

  // Boot up the page
  if (checkAuth()) {
    loadSprints();
    loadAddSprintOptions();
  }
}

// Wait for DOM to be fully loaded before attaching event listeners
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePageEvents);
} else {
  // DOM is already loaded
  initializePageEvents();
