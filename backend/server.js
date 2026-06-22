const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("node:fs");
const path = require("node:path");

const Submission = require("./src/models/Submission.js");

dotenv.config();

const app = express();
const publicDir = path.join(__dirname, "public");
const rootIndexPath = path.join(__dirname, "..", "index.html");
const publicIndexPath = path.join(publicDir, "index.html");

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

function cleanRoster(roster) {
  if (!Array.isArray(roster)) return [];
  return roster.map((member) => ({
    name: String(member.name || "").trim(),
    role: String(member.role || "").trim(),
    ph: Number(member.ph || 0),
    al: Number(member.al || 0),
    other: Number(member.other || 0),
    pct: Number(member.pct || 0),
    notes: String(member.notes || ""),
    AvailableDays: Number(member.AvailableDays || 0)
  }));
}

function logDbFailure(action, error, meta = {}) {
  // Keep logs structured so failures are easy to filter in CI/platform logs.
  console.error("[db-failure]", {
    action,
    message: error?.message || String(error),
    code: error?.code,
    name: error?.name,
    meta
  });
}

async function connectDb() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is missing. Set it in .env");
  }

  if (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(mongoUri);
    } catch (error) {
      logDbFailure("connect", error);
      throw error;
    }
  }
}

app.get("/api/health", async (_req, res) => {
  try {
    await connectDb();
    res.json({ ok: true });
  } catch (error) {
    logDbFailure("health-check", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/submissions", async (_req, res) => {
  try {
    await connectDb();
    const submissions = await Submission.find({}).sort({ updatedAt: -1 }).lean();
    res.json(submissions);
  } catch (error) {
    logDbFailure("list-submissions", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/submissions/:teamKey/:sprintNo", async (req, res) => {
  try {
    await connectDb();
    const { teamKey, sprintNo } = req.params;

    const submission = await Submission.findOne({
      ProjectKey: teamKey,
      SprintNo: sprintNo
    }).lean();

    if (!submission) {
      return res.json({ found: false });
    }

    return res.json({ found: true, record: submission });
  } catch (error) {
    logDbFailure("get-submission", error, { teamKey: req.params.teamKey, sprintNo: req.params.sprintNo });
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/submissions/upsert", async (req, res) => {
  try {
    await connectDb();
    const payload = req.body || {};

    if (!payload.ProjectKey || !payload.SprintNo) {
      return res.status(400).json({ success: false, error: "ProjectKey and SprintNo are required" });
    }

    payload.Roster = cleanRoster(payload.Roster);

    const existing = await Submission.findOne({
      ProjectKey: payload.ProjectKey,
      SprintNo: payload.SprintNo
    }).lean();

    await Submission.findOneAndUpdate(
      { ProjectKey: payload.ProjectKey, SprintNo: payload.SprintNo },
      payload,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true
      }
    );

    return res.json({ success: true, isReplace: Boolean(existing) });
  } catch (error) {
    logDbFailure("upsert-submission", error, {
      projectKey: req.body?.ProjectKey,
      sprintNo: req.body?.SprintNo
    });
    return res.status(500).json({ success: false, error: error.message });
  }
});

if (process.env.VERCEL !== "1") {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend running on http://localhost:${port}`);
  });
}

module.exports = app;


