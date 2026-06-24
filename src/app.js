const express = require("express");
const cors = require("cors");
const path = require("node:path");

const apiRoutes = require("./routes/apiRoutes");
const correlationId = require("./middleware/correlationId");
const requestLogger = require("./middleware/requestLogger");
const staticPagesRoutes = require("../pages/staticPagesRoutes");

const app = express();
const projectRoot = path.join(__dirname, "..");
const publicDir = path.join(projectRoot, "public");

app.set("trust proxy", true);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Serve static assets (CSS, images, etc.) from public dir
app.use(express.static(publicDir));

// Mount static page routes
app.use("/", staticPagesRoutes);

// Mount API routes
app.use("/api", correlationId, requestLogger, apiRoutes);

// Catch-all for unhandled routes (send 404 status, not redirect to home)
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

module.exports = app;

