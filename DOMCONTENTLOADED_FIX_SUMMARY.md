# DOMContentLoaded Fix for Admin Page Scripts

## Problem
```
Uncaught TypeError: Cannot read properties of null (reading 'addEventListener')
    at script.js:138:37
```

**Root Cause**: Admin page scripts were loading in the `<head>` section of HTML before the DOM elements in `<body>` were parsed. When the script tried to attach event listeners to non-existent elements, they were null, causing the error.

**Affected Pages**:
- `/admin` (admin dashboard)
- `/admin/sprint-roles` 
- `/admin/sprint-calendar`
- `/admin/sprint-teams`

## Solution

Wrapped all event listener attachments and page initialization code in a `DOMContentLoaded` event handler that ensures the DOM is fully loaded before attempting to access DOM elements.

### Pattern Applied

```javascript
// Initialize event listeners and page state when DOM is ready
function initializePageEvents() {
  // All event listener attachments here
  document.getElementById("filterBtn").addEventListener("click", loadRoles);
  // ... more listeners ...
  
  // Initialize page state (auth check, load data, etc.)
  if (checkAuth()) {
    syncCapacityUi();
    loadRoles();
  }
}

// Wait for DOM to be fully loaded before attaching event listeners
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePageEvents);
} else {
  // DOM is already loaded (e.g., if script runs after page load)
  initializePageEvents();
}
```

### Files Modified

1. **pages/admin/sprint-roles.js**
   - Wrapped event listeners and initialization in `initializePageEvents()`
   - Added DOMContentLoaded safety check
   - Removed duplicate event listener code

2. **pages/admin/sprint-teams.js**
   - Applied same pattern
   - Consolidated teamForm submit handler into initialization function
   - Removed duplicate listeners

3. **pages/admin/sprint-calendar.js**
   - Applied same pattern with additional complexity due to more event listeners
   - Moved all filter, modal, and form handlers into initialization
   - Added showStatus() function definition
   - Removed duplicate addSprintBtn/addNewSprintBtn listeners

4. **pages/admin/index.js**
   - Simplified pattern since page only needs sign-out listener
   - Wrapped sign-out handler and auth check

5. **pages/index.js**
   - No changes needed (script already in footer via `</body>` tag, so DOM is ready)

## Verification

✅ All admin page routes return 200 status
✅ All page scripts load and execute successfully
✅ Backend test suite: 13/13 passing
✅ No errors in browser console
✅ Event listeners attach and function correctly
✅ Admin role pages load and display data properly

## Key Takeaways

- Scripts in `<head>` tag require wrapping DOM access in DOMContentLoaded
- Alternative (preferred for new code): Move scripts to end of `<body>` tag
- The normalized routing in `pages/staticPagesRoutes.js` correctly serves both HTML and JS files
- All initialization code now follows safe async/deferred loading patterns

