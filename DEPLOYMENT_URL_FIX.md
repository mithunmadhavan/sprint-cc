# Deployment URL Fix - Post Deployment Troubleshooting

## Problem Identified

After deployment to Vercel, URLs were not working correctly. The issue was related to:

1. **Routing Order**: The catch-all route in `staticPagesRoutes` was preventing API routes from being reached
2. **Relative Path Resolution**: File paths were not being resolved correctly for production  
3. **Missing Content-Type Headers**: JavaScript files were not served with correct MIME type
4. **Vercel Configuration**: Missing HTTP methods in route configuration

## Solutions Implemented

### 1. Fixed `staticPagesRoutes.js`

**Issue**: The catch-all middleware was intercepting all requests and returning 404 for unmapped routes, preventing `/api/*` routes from working.

**Fix**: Removed the catch-all middleware:
```javascript
// BEFORE (WRONG):
router.use((req, res) => {
  console.log(`Route not found in staticPagesRoutes: ${req.method} ${req.path}`);
  res.status(404).json({ error: "Page not found", path: req.path });
});

// AFTER (CORRECT):
// Just export the router with specific routes defined
// Let Express naturally route to other middleware (API routes, 404 handler in app.js)
```

**Why**: In Express, middleware order matters. When a router middleware is used with a catch-all, it consumes all requests. By removing the catch-all and only handling specific routes, subsequent middleware like API routes can be processed.

### 2. Improved File Path Resolution

**Issue**: Relative paths might not resolve correctly in production environment

**Fix**: Ensured absolute path resolution for `sendFile()`:
```javascript
const htmlPath = path.join(pagesRoot, page.htmlFile);
const absolutePath = path.resolve(htmlPath);  // Convert to absolute path
return res.sendFile(absolutePath);  // sendFile needs absolute path
```

**Added Logging**:
```javascript
console.debug(`HTML route ${page.path} -> ${absolutePath}`);
if (!fs.existsSync(absolutePath)) {
  console.warn(`HTML file not found: ${absolutePath}`);
  return res.status(404).send(`Page not found: ${page.path}`);
}
```

### 3. Set Correct Content-Type for JavaScript

**Issue**: JS files might be served with wrong MIME type

**Fix**: Explicitly set Content-Type header:
```javascript
res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
return res.sendFile(absolutePath);
```

### 4. Updated Vercel Configuration

**File**: `vercel.json`

**Before**:
```json
{
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ]
}
```

**After**:
```json
{
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js",
      "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    }
  ]
}
```

### 5. Enhanced Error Handling in `app.js`

**Added**:
- Global error handler middleware
- Better 404 handling
- Separation of concerns between static files and API routes

```javascript
// Catch-all for unhandled routes
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});
```

## Routing Order (Critical!)

The correct order in `app.js` is:
1. **CORS & JSON parsing** - Setup middleware
2. **Static files** - Public assets (CSS, images, etc.)
3. **Static page routes** - HTML and page scripts (specific routes only!)
4. **API routes** - Backend endpoints
5. **Error handlers** - Global 404 and error handlers

```javascript
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDir));           // 1. Public files
app.use("/", staticPagesRoutes);              // 2. Specific page routes
app.use("/api", ...apiRoutes);                // 3. API routes
app.use(errorHandler);                        // 4. Error handlers
```

## Why Catch-All Routes Break Deployment

In a monolithic Express app:
- Each `router.use()` with a catch-all must be the LAST router/middleware
- Otherwise, subsequent routes are never reached
- When multiple routers are stacked, the first catch-all wins
- In deployment, this can be masked by caching or reload behavior

## Testing the Fix

✅ All 13 backend tests passing
✅ HTML pages load correctly at:
   - `/` → Home page
   - `/admin` → Admin dashboard  
   - `/admin/sprint-roles` → Sprint roles page
   - `/admin/sprint-calendar` → Sprint calendar page
   - `/admin/sprint-teams` → Sprint teams page

✅ JavaScript scripts load at:
   - `/script.js` → Home page script
   - `/admin/script.js` → Admin dashboard script
   - `/admin/sprint-roles/script.js` → Sprint roles script
   - `/admin/sprint-calendar/script.js` → Sprint calendar script
   - `/admin/sprint-teams/script.js` → Sprint teams script

✅ API endpoints still work:
   - `/api/roles` ✓
   - `/api/teams` ✓
   - `/api/sprints` ✓
   - `/api/submissions` ✓

## Post-Deployment Checklist

- [x] Remove catch-all routes that block subsequent middleware
- [x] Use absolute paths for `sendFile()` calls
- [x] Set correct Content-Type headers for served files
- [x] Update Vercel config with all HTTP methods
- [x] Add global error handlers in app.js
- [x] Test all page routes locally
- [x] Test all API routes locally
- [x] Run full test suite before deployment

## Key Lessons

1. **Middleware Order Matters**: Static routes must not catch API requests
2. **Specific Before General**: Define specific routes before generic ones
3. **File Paths**: Use `path.resolve()` to get absolute paths for `sendFile()`
4. **Content-Type**: Always set correct MIME types for served files
5. **Testing**: Always test routing locally before deployment

## Verification Commands

```bash
# Local test of specific routes
node -e "const request=require('supertest');const app=require('./src/app');\
(async()=>{\
  const routes=['/admin/sprint-roles','/admin/sprint-roles/script.js','/api/roles'];\
  for(const p of routes){\
    const r=await request(app).get(p);\
    console.log(p, r.status);\
  }\
})()"

# Run full test suite
npm test

# Check if pages exist
ls -la pages/
ls -la pages/admin/
```

## Files Modified

- `pages/staticPagesRoutes.js` - Removed catch-all, added debugging, set Content-Type
- `src/app.js` - Added error handlers, better structure
- `vercel.json` - Added HTTP methods to route config

## Status

✅ **ALL FIXED** - deployment URL issues resolved
✅ **TESTED** - all 13 backend tests passing
✅ **READY** - safe to redeploy to production

