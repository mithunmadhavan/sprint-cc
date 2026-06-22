const express = require("express");
const submissionController = require("../controllers/submissionController");

const router = express.Router();

router.get("/health", submissionController.getHealth);
router.get("/submissions", submissionController.listSubmissions);
router.get("/submissions/:teamKey/:sprintNo", submissionController.getSubmission);
router.post("/submissions/upsert", submissionController.upsertSubmission);

module.exports = router;

