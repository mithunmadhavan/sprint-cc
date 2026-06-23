const sprintService = require("../services/sprintService");
const logger = require("../utils/logger");
const connectDb = require("../db/connectDb");

async function listSprints(req, res) {
  try {
    await connectDb(req.correlationId);
    const filters = {
      sprint: req.query.sprint || "",
      pi: req.query.pi || "",
      startDate: req.query.startDate || "",
      endDate: req.query.endDate || "",
      // Backward-compatible support for previous range params.
      startDateFrom: req.query.startDateFrom || "",
      startDateTo: req.query.startDateTo || "",
      endDateFrom: req.query.endDateFrom || "",
      endDateTo: req.query.endDateTo || "",
    };

    const sprints = await sprintService.listSprints(filters);
    return res.json({ ok: true, sprints });
  } catch (e) {
    if (e.statusCode === 400) {
      return res.status(400).json({ error: e.message });
    }
    logger.error("db-failure", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      action: "list-sprints",
      error: e,
    });
    return res.status(500).json({ error: "Failed to list sprints" });
  }
}

async function getSprint(req, res) {
  try {
    await connectDb(req.correlationId);
    const sprint = await sprintService.getSprint(req.params.id);
    if (!sprint) {
      return res.status(404).json({ error: "Sprint not found" });
    }
    return res.json({ ok: true, sprint });
  } catch (e) {
    if (e.statusCode === 400) {
      return res.status(400).json({ error: e.message });
    }
    logger.error("db-failure", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      action: "get-sprint",
      error: e,
    });
    return res.status(500).json({ error: "Failed to get sprint" });
  }
}

async function createSprint(req, res) {
  try {
    await connectDb(req.correlationId);
    const { sprint, pi, start, end } = req.body;
    if (!sprint || !pi || !start || !end) {
      return res
        .status(400)
        .json({ error: "Missing required fields: sprint, pi, start, end" });
    }

    const newSprint = await sprintService.createSprint({
      sprint,
      pi,
      start,
      end,
    });
    return res.status(201).json({ ok: true, sprint: newSprint });
  } catch (e) {
    if (e.statusCode === 400) {
      return res.status(400).json({ error: e.message });
    }
    logger.error("db-failure", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      action: "create-sprint",
      error: e,
    });
    return res
      .status(500)
      .json({ error: e.message || "Failed to create sprint" });
  }
}

async function updateSprint(req, res) {
  try {
    await connectDb(req.correlationId);
    const { sprint, pi, start, end } = req.body;
    const updated = await sprintService.updateSprint(req.params.id, {
      sprint,
      pi,
      start,
      end,
    });
    if (!updated) {
      return res.status(404).json({ error: "Sprint not found" });
    }
    return res.json({ ok: true, sprint: updated });
  } catch (e) {
    if (e.statusCode === 400) {
      return res.status(400).json({ error: e.message });
    }
    logger.error("db-failure", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      action: "update-sprint",
      error: e,
    });
    return res
      .status(500)
      .json({ error: e.message || "Failed to update sprint" });
  }
}

async function deleteSprint(req, res) {
  try {
    await connectDb(req.correlationId);
    const deleted = await sprintService.deleteSprint(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Sprint not found" });
    }
    return res.json({ ok: true, message: "Sprint deleted" });
  } catch (e) {
    logger.error("db-failure", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      action: "delete-sprint",
      error: e,
    });
    return res.status(500).json({ error: "Failed to delete sprint" });
  }
}

async function createNextPi(req, res) {
  try {
    await connectDb(req.correlationId);
    const created = await sprintService.createNextPiBatch();
    return res.status(201).json({
      ok: true,
      pi: created[0]?.pi,
      count: created.length,
      sprints: created,
    });
  } catch (e) {
    if (e.statusCode === 400) {
      return res.status(400).json({ error: e.message });
    }
    logger.error("db-failure", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      action: "create-next-pi",
      error: e,
    });
    return res.status(500).json({ error: "Failed to create next PI" });
  }
}

async function previewNextPi(req, res) {
  try {
    await connectDb(req.correlationId);
    const preview = await sprintService.previewNextPiBatch();
    return res.json({
      ok: true,
      pi: preview.pi,
      count: preview.sprints.length,
      sprints: preview.sprints,
    });
  } catch (e) {
    if (e.statusCode === 400) {
      return res.status(400).json({ error: e.message });
    }
    logger.error("db-failure", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      action: "preview-next-pi",
      error: e,
    });
    return res.status(500).json({ error: "Failed to preview next PI" });
  }
}

module.exports = {
  listSprints,
  getSprint,
  createSprint,
  updateSprint,
  deleteSprint,
  previewNextPi,
  createNextPi,
};

