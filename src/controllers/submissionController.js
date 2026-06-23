const connectDb = require("../db/connectDb");
const submissionService = require("../services/submissionService");
const logger = require("../utils/logger");

function logDbFailure(action, error, req, meta = {}) {
  logger.error("db-failure", {
    correlationId: req?.correlationId,
    method: req?.method,
    path: req?.originalUrl,
    action,
    code: error?.code,
    error,
    meta
  });
}

async function getHealth(req, res) {
  try {
    await connectDb({ correlationId: req.correlationId });
    return res.json({ ok: true });
  } catch (error) {
    logDbFailure("health-check", error, req);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

async function listSubmissions(req, res) {
  try {
    await connectDb({ correlationId: req.correlationId });
    const submissions = await submissionService.listSubmissions({
      teamKey: req.query.teamKey || "",
      sprintNo: req.query.sprintNo || "",
      limit: req.query.limit || "",
    });
    return res.json(submissions);
  } catch (error) {
    logDbFailure("list-submissions", error, req);
    return res.status(500).json({ error: error.message });
  }
}

async function getSubmission(req, res) {
  try {
    await connectDb({ correlationId: req.correlationId });
    const { teamKey, sprintNo } = req.params;
    const submission = await submissionService.getSubmission(teamKey, sprintNo);

    if (!submission) {
      return res.json({ found: false });
    }

    return res.json({ found: true, record: submission });
  } catch (error) {
    logDbFailure("get-submission", error, req, {
      teamKey: req.params.teamKey,
      sprintNo: req.params.sprintNo
    });
    return res.status(500).json({ error: error.message });
  }
}

async function upsertSubmission(req, res) {
  try {
    await connectDb({ correlationId: req.correlationId });
    const payload = req.body || {};

    if (!payload.ProjectKey || !payload.SprintNo) {
      return res.status(400).json({ success: false, error: "ProjectKey and SprintNo are required" });
    }

    const result = await submissionService.upsertSubmission(payload);
    return res.json({ success: true, isReplace: result.isReplace });
  } catch (error) {
    logDbFailure("upsert-submission", error, req, {
      projectKey: req.body?.ProjectKey,
      sprintNo: req.body?.SprintNo
    });
    const statusCode = error.statusCode || (error.name === "ValidationError" ? 400 : 500);
    return res.status(statusCode).json({ success: false, error: error.message });
  }
}

module.exports = {
  getHealth,
  listSubmissions,
  getSubmission,
  upsertSubmission
};

