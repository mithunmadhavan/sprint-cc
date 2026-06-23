const connectDb = require("../db/connectDb");
const logger = require("../utils/logger");
const teamService = require("../services/teamService");

async function listTeams(req, res) {
  try {
    await connectDb(req.correlationId);
    const teams = await teamService.listTeams({
      name: req.query.name || "",
      key: req.query.key || "",
      status: req.query.status || "",
    });
    return res.json({ ok: true, teams });
  } catch (e) {
    if (e.statusCode === 400) {
      return res.status(400).json({ error: e.message });
    }
    logger.error("db-failure", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      action: "list-teams",
      error: e,
    });
    return res.status(500).json({ error: "Failed to list teams" });
  }
}

async function getTeam(req, res) {
  try {
    await connectDb(req.correlationId);
    const team = await teamService.getTeam(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    return res.json({ ok: true, team });
  } catch (e) {
    if (e.statusCode === 400) {
      return res.status(400).json({ error: e.message });
    }
    logger.error("db-failure", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      action: "get-team",
      error: e,
    });
    return res.status(500).json({ error: "Failed to get team" });
  }
}

async function createTeam(req, res) {
  try {
    await connectDb(req.correlationId);
    const team = await teamService.createTeam(req.body || {});
    return res.status(201).json({ ok: true, team });
  } catch (e) {
    if (e.statusCode === 400) {
      return res.status(400).json({ error: e.message });
    }
    if (e?.code === 11000) {
      return res.status(409).json({ error: "Team name or key already exists" });
    }
    logger.error("db-failure", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      action: "create-team",
      error: e,
    });
    return res.status(500).json({ error: e.message || "Failed to create team" });
  }
}

async function updateTeam(req, res) {
  try {
    await connectDb(req.correlationId);
    const team = await teamService.updateTeam(req.params.id, req.body || {});
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    return res.json({ ok: true, team });
  } catch (e) {
    if (e.statusCode === 400) {
      return res.status(400).json({ error: e.message });
    }
    if (e?.code === 11000) {
      return res.status(409).json({ error: "Team name or key already exists" });
    }
    logger.error("db-failure", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      action: "update-team",
      error: e,
    });
    return res.status(500).json({ error: e.message || "Failed to update team" });
  }
}

async function deleteTeam(req, res) {
  try {
    await connectDb(req.correlationId);
    const team = await teamService.deleteTeam(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    return res.json({ ok: true, message: "Team deleted" });
  } catch (e) {
    logger.error("db-failure", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      action: "delete-team",
      error: e,
    });
    return res.status(500).json({ error: "Failed to delete team" });
  }
}

module.exports = {
  listTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
};

