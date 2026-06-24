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
app.use(express.static(publicDir));

app.use("/", staticPagesRoutes);

app.use("/api", correlationId, requestLogger, apiRoutes);

module.exports = app;

