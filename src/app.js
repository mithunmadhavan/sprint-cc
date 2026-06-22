const express = require("express");
const cors = require("cors");
const fs = require("node:fs");
const path = require("node:path");

const apiRoutes = require("./routes/apiRoutes");
const correlationId = require("./middleware/correlationId");
const requestLogger = require("./middleware/requestLogger");

const app = express();
const backendRoot = path.join(__dirname, "..");
const publicDir = path.join(backendRoot, "public");
const rootIndexPath = path.join(backendRoot, "..", "index.html");
const publicIndexPath = path.join(publicDir, "index.html");

app.set("trust proxy", true);

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDir));

app.get("/", (_req, res) => {
  if (fs.existsSync(publicIndexPath)) {
    return res.sendFile(publicIndexPath);
  }

  if (fs.existsSync(rootIndexPath)) {
    return res.sendFile(rootIndexPath);
  }

  return res.status(404).send("index.html not found");
});

app.use("/api", correlationId, requestLogger, apiRoutes);

module.exports = app;

