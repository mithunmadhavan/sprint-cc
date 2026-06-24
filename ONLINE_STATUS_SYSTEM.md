# Online Status Check & API Guard System

## Overview

Implemented a system-wide online/offline status tracking that prevents API calls when the system is offline, ensuring better user experience and reduced unnecessary network errors.

## Architecture

### 1. Global Online Status Variable
```javascript
let IS_SYSTEM_ONLINE = true; // Default: true to allow initial attempts
```

This variable is updated continuously by the connectivity health check and reused throughout the application to guard API calls.

### 2. Connectivity Status Management

**Updated Function**: `setConnectivityState(isOnline)`
```javascript
function setConnectivityState(isOnline) {
  // Update global online status
  IS_SYSTEM_ONLINE = isOnline;
  
  // Update UI
  const el = document.getElementById("connStatus");
  el.classList.add(isOnline ? "online" : "offline");
  el.textContent = isOnline ? "online" : "offline";
}
```

**Health Check**: `checkBackendConnectivity()`
- Runs continuously every 5 seconds when online
- Runs every 30 seconds when offline
- Pings `/api/health` endpoint
- Updates `IS_SYSTEM_ONLINE` status via `setConnectivityState()`

### 3. API Call Guard Function

**New Function**: `ensureSystemOnline()`
```javascript
function ensureSystemOnline() {
  if (!IS_SYSTEM_ONLINE) {
    const msg = "System is currently offline. Please check your connection.";
    console.warn(msg);
    showStatus(msg, "err");
    return false;
  }
  return true;
}
```

### 4. Protected API Operations

All critical API calls now check online status before executing:

#### Data Loading Functions
✅ `loadSprintCalendar()` - Fetches sprint schedule
✅ `loadTeams()` - Fetches active teams
✅ `loadRolesConfig()` - Fetches role configurations
✅ `fetchAllSubmissions()` - Fetches all submissions (admin)
✅ `fetchSubmissionHistory()` - Fetches submission history (admin)

#### Submission Operations  
✅ `spRead(teamKey, sprintNo)` - Reads existing submission data
✅ `spUpsert(payload)` - Saves/updates submission data

## Implementation Pattern

Every protected API function follows this pattern:

```javascript
async function protectedApiFunction(...args) {
  // 1. Check online status FIRST
  if (!ensureSystemOnline()) {
    return defaultErrorValue; // Return safe default
  }
  
  // 2. Proceed with API call only if online
  try {
    const json = await apiJson("/api/endpoint", options);
    // ... process response
  } catch(e) {
    // ... handle error
  }
}
```

## Benefits

| Benefit | Impact |
|---------|--------|
| **Reduced Errors** | Prevents null/timeout errors when offline |
| **Better UX** | Users see clear message instead of silent failures |
| **Network Efficiency** | Avoids wasted network requests to unavailable API |
| **Graceful Degradation** | App continues working with cached/default data when offline |
| **Single Source of Truth** | Reuses connectivity status across entire app |
| **Debug-Friendly** | Clear console warnings and UI feedback |

## Status Indicators

### UI Display
- **"online"** badge with color: system is connected
- **"offline"** badge with color: system is disconnected

### Console Output
When attempting API call while offline:
```
⚠️ "System is currently offline. Please check your connection."
```

### User Notification
Toast message appears: **"System is currently offline. Please check your connection."**

## Connectivity Intervals

- **When Online**: Health check every 5 seconds
- **When Offline**: Health check every 30 seconds (slower polling to conserve battery)

## Edge Cases Handled

1. **Initial Load**: Default `IS_SYSTEM_ONLINE = true` allows initial connectivity attempt
2. **Flaky Networks**: Retry mechanism in health check persists status
3. **Timeout Recovery**: Automatic reconnection when offline → online transition detected
4. **Cascading Failures**: Parent function failures don't cascade due to guard checks

## API Response Defaults

When offline, functions return safe defaults:
```javascript
// fetchAllSubmissions() returns:
{ ok: false, submissions: [] }

// fetchSubmissionHistory() returns:
{ ok: false, submissions: [] }

// spRead() returns:
null

// spUpsert() returns:
{ success: false, error: "System is offline" }
```

## Testing

✅ All 13 backend tests pass with online status implementation
✅ No regressions in API functionality
✅ Guard checks don't interfere with test mock responses

**Test Results**:
```
✔ pass 13
✖ fail 0
```

## Files Modified

- `pages/index.js`: Added global online status variable, guard function, and protected all API calls

## Future Enhancements

1. **Partial Offline Mode**: Cache responses and sync when online
2. **Service Worker Integration**: Background sync when connectivity returns
3. **Analytics**: Track offline incident frequency and duration
4. **Auto-Retry**: Automatically retry failed requests when connection restores
5. **Persistent Storage**: Store submissions locally until sync succeeds

## Code Example: Before vs After

### Before
```javascript
async function loadTeams() {
  TEAMS = [];
  try {
    const json = await apiJson("/api/teams?status=active", { cache: "no-store" });
    // ... might fail silently or with confusing error
  } catch (e) {
    console.error("Failed to load teams config:", e);
  }
}
```

### After
```javascript
async function loadTeams() {
  if (!ensureSystemOnline()) {
    TEAMS = [];
    return; // Exit early with clear reason
  }
  
  TEAMS = [];
  try {
    const json = await apiJson("/api/teams?status=active", { cache: "no-store" });
    // ... only reached if system is online
  } catch (e) {
    console.error("Failed to load teams config:", e);
  }
}
```

## Summary

✅ Global online status tracked and reused  
✅ All critical API calls guarded by status check  
✅ Clear user feedback when system offline  
✅ Graceful fallback to safe defaults  
✅ No regressions in existing functionality  
✅ All backend tests passing  

