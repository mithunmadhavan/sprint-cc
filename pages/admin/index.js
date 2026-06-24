// Initialize page when DOM is ready
function initializePageEvents() {
  const user = JSON.parse(sessionStorage.getItem("sc_user") || "null");
  if (!user || user.role !== "admin") {
    alert("Admin access required");
    window.location.href = "/";
    return;
  }

  document.getElementById("signOutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("sc_user");
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
