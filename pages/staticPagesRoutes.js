const express = require("express");
const fs = require("node:fs");
const path = require("node:path");

const router = express.Router();

// Resolve to pages directory correctly for both development and production
// __dirname for this file is the pages directory
const pagesRoot = __dirname;

// Fallback: verify pages root exists, if not try alternative path
if (!fs.existsSync(path.join(pagesRoot, "index.html"))) {
  console.warn(`Warning: pages directory not found at ${pagesRoot}`);
}

// Configuration for static pages and their associated scripts
const PAGE_CONFIG = [
  {
    path: "/",
    htmlFile: "index.html",
    jsFile: "index.js",
  },
  {
    path: "/admin",
    htmlFile: "admin/index.html",
    jsFile: "admin/index.js",
  },
  {
    path: "/admin/sprint-calendar",
    htmlFile: "admin/sprint-calendar.html",
    jsFile: "admin/sprint-calendar.js",
  },
  {
    path: "/admin/sprint-roles",
    htmlFile: "admin/sprint-roles.html",
    jsFile: "admin/sprint-roles.js",
  },
  {
    path: "/admin/sprint-teams",
    htmlFile: "admin/sprint-teams.html",
    jsFile: "admin/sprint-teams.js",
  },
];

// Auto-generate routes from config
for (const page of PAGE_CONFIG) {
  // HTML route
  router.get(page.path, (_req, res) => {
    const htmlPath = path.join(pagesRoot, page.htmlFile);
    const absolutePath = path.resolve(htmlPath);
    console.debug(`HTML route ${page.path} -> ${absolutePath}`);

    if (!fs.existsSync(absolutePath)) {
      console.warn(`HTML file not found: ${absolutePath}`);
      return res.status(404).send(`Page not found: ${page.path}`);
    }
    return res.sendFile(absolutePath);
  });

  // Normalized JS script route: {basePath}/script.js
  const scriptRoutePath = page.path === "/" ? "/script.js" : `${page.path}/script.js`;
  router.get(scriptRoutePath, (_req, res) => {
    const jsPath = path.join(pagesRoot, page.jsFile);
    const absolutePath = path.resolve(jsPath);
    console.debug(`JS route ${scriptRoutePath} -> ${absolutePath}`);

    if (!fs.existsSync(absolutePath)) {
      console.warn(`JS file not found: ${absolutePath}`);
      return res.status(404).send(`Script not found for ${page.path}`);
    }

    // Set correct content type for JavaScript
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    return res.sendFile(absolutePath);
  });
}

// Don't use catch-all - let other routes (like /api) be handled by parent app
// Only specific page routes should be handled here

module.exports = router;