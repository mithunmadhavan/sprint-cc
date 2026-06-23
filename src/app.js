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

app.set("trust proxy", true);

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDir));

app.get("/", (_req, res) => {
  const mainPagePath = path.join(projectRoot, "pages", "index.html");

  if (fs.existsSync(mainPagePath)) {
    return res.sendFile(mainPagePath);
  }

  return res.status(404).send("Oops!! Page not found");
});

app.get("/admin", (req, res) => {
  const adminHomePath = path.join(projectRoot, "pages/admin", "index.html");
  if (!fs.existsSync(adminHomePath)) {
    return res.status(404).send("Admin dashboard page not found");
  }
  return res.sendFile(adminHomePath);
});

app.get("/admin/sprint-calendar", (req, res) => {
  const adminPagePath = path.join(projectRoot, "pages/admin", "sprint-calendar.html");
  if (!fs.existsSync(adminPagePath)) {
    return res.status(404).send("Sprint calendar admin page not found");
  }
  return res.sendFile(adminPagePath);
});

app.get("/admin/sprint-roles", (req, res) => {
  const adminPagePath = path.join(projectRoot, "pages/admin", "sprint-roles.html");
  if (!fs.existsSync(adminPagePath)) {
    return res.status(404).send("Sprint roles admin page not found");
  }
  return res.sendFile(adminPagePath);
});

app.get("/admin/sprint-teams", (req, res) => {
  const adminPagePath = path.join(projectRoot, "pages/admin", "sprint-teams.html");
  if (!fs.existsSync(adminPagePath)) {
    return res.status(404).send("Sprint teams admin page not found");
  }
  return res.sendFile(adminPagePath);
});

app.use("/api", correlationId, requestLogger, apiRoutes);

module.exports = app;

