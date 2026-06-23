const express = require("express");
const submissionController = require("../controllers/submissionController");
const sprintController = require("../controllers/sprintController");

const router = express.Router();

router.get("/health", submissionController.getHealth);

// Diagnostic: shows which required env vars are present (never exposes values)
router.get("/env-check", (_req, res) => {
  const required = ["MONGO_URI", "PORT"];
  const result = {};
  for (const key of required) {
    result[key] = process.env[key] ? "set" : "MISSING";
  }
  const allOk = Object.values(result).every((v) => v === "set");
  res.status(allOk ? 200 : 500).json({
    ok: allOk,
    runtime: process.env.VERCEL ? "vercel" : "local",
    env: process.env.NODE_ENV || "development",
    vars: result
  });
});

router.get("/submissions", submissionController.listSubmissions);
router.get("/submissions/:teamKey/:sprintNo", submissionController.getSubmission);
router.post("/submissions/upsert", submissionController.upsertSubmission);

// Sprint calendar management
router.get("/sprints", sprintController.listSprints);
router.get("/sprints/next-pi-preview", sprintController.previewNextPi);
router.post("/sprints/create-next-pi", sprintController.createNextPi);
router.post("/sprints", sprintController.createSprint);
router.get("/sprints/:id", sprintController.getSprint);
router.put("/sprints/:id", sprintController.updateSprint);
router.delete("/sprints/:id", sprintController.deleteSprint);

module.exports = router;

