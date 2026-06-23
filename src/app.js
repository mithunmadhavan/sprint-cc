const express = require("express");
const cors = require("cors");
const fs = require("node:fs");
const path = require("node:path");

const apiRoutes = require("./routes/apiRoutes");
const correlationId = require("./middleware/correlationId");
const requestLogger = require("./middleware/requestLogger");

const app = express();
const projectRoot = path.join(__dirname, "..");
const publicDir = path.join(projectRoot, "public");
const rootIndexPath = path.join(projectRoot, "index.html");
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

app.get("/getEnv", (req, res) => {
  // Get .env values
  const environment = process.env;

  return res.status(200).send(environment);
})

app.get("/admin/sprint-calendar", (req, res) => {
  const adminPagePath = path.join(projectRoot, "admin", "sprint-calendar.html");
  if (!fs.existsSync(adminPagePath)) {
    return res.status(404).send("Sprint calendar admin page not found");
  }
  return res.sendFile(adminPagePath);
});

app.use("/api", correlationId, requestLogger, apiRoutes);

module.exports = app;

