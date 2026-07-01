// Initialize page when DOM is ready
function initializePageEvents() {
  const user = JSON.parse(sessionStorage.getItem("sc_user") || "null");
  const role = String(user?.role || user?.serverRole || "").toLowerCase();
  const token = sessionStorage.getItem("sc_token") || "";
  if (!user || role !== "admin" || !token) {
    // Do NOT clear the session – just redirect without destroying a valid
    // editor/viewer session that belongs to the main app.
    window.location.href = "/";
    return;
  }

  document.getElementById("signOutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("sc_user");
    sessionStorage.removeItem("sc_token");
    window.location.href = "/";
  });
}

// Wait for DOM to be fully loaded before attaching event listeners
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePageEvents);
} else {
  // DOM is already loaded
  initializePageEvents();
}
