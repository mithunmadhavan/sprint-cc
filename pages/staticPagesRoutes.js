const express = require("express");
const fs = require("node:fs");
const path = require("node:path");

const router = express.Router();
const pagesRoot = __dirname;

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

// Helper to send file if it exists
function sendIfExists(res, filePath, notFoundMessage) {
  if (!fs.existsSync(filePath)) {
    return res.status(404).send(notFoundMessage);
  }
  return res.sendFile(filePath);
}

// Auto-generate routes from config
for (const page of PAGE_CONFIG) {
  // HTML route
  router.get(page.path, (_req, res) => {
    const htmlPath = path.join(pagesRoot, page.htmlFile);
    sendIfExists(res, htmlPath, `Page not found: ${page.path}`);
  });

  // Normalized JS script route: {basePath}/script.js
  const scriptRoutePath = page.path === "/" ? "/script.js" : `${page.path}/script.js`;
  router.get(scriptRoutePath, (_req, res) => {
    const jsPath = path.join(pagesRoot, page.jsFile);
    sendIfExists(res, jsPath, `Script not found for ${page.path}`);
  });
}

module.exports = router;