const connectDb = require("../db/connectDb");
const logger = require("../utils/logger");
const roleService = require("../services/roleService");

async function listRoles(req, res) {
  try {
    await connectDb(req.correlationId);
    const roles = await roleService.listRoles({
      name: req.query.name || "",
      roleType: req.query.roleType || "",
      capacityFilter: req.query.capacity || "",
    });
    return res.json({ ok: true, roles });
  } catch (e) {
    if (e.statusCode === 400) {
      return res.status(400).json({ error: e.message });
    }
    if (e?.code === 11000) {
      return res.status(409).json({ error: "Role name already exists" });
    }
    logger.error("db-failure", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      action: "list-roles",
      error: e,
    });
    return res.status(500).json({ error: "Failed to list roles" });
  }
}

async function getRole(req, res) {
  try {
    await connectDb(req.correlationId);
    const role = await roleService.getRole(req.params.id);
    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }
    return res.json({ ok: true, role });
  } catch (e) {
    if (e.statusCode === 400) {
      return res.status(400).json({ error: e.message });
    }
    if (e?.code === 11000) {
      return res.status(409).json({ error: "Role name already exists" });
    }
    logger.error("db-failure", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      action: "get-role",
      error: e,
    });
    return res.status(500).json({ error: "Failed to get role" });
  }
}

async function createRole(req, res) {
  try {
    await connectDb(req.correlationId);
    const role = await roleService.createRole(req.body || {});
    return res.status(201).json({ ok: true, role });
  } catch (e) {
    if (e.statusCode === 400) {
      return res.status(400).json({ error: e.message });
    }
    logger.error("db-failure", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      action: "create-role",
      error: e,
    });
    return res.status(500).json({ error: e.message || "Failed to create role" });
  }
}

async function updateRole(req, res) {
  try {
    await connectDb(req.correlationId);
    const role = await roleService.updateRole(req.params.id, req.body || {});
    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }
    return res.json({ ok: true, role });
  } catch (e) {
    if (e.statusCode === 400) {
      return res.status(400).json({ error: e.message });
    }
    logger.error("db-failure", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      action: "update-role",
      error: e,
    });
    return res.status(500).json({ error: e.message || "Failed to update role" });
  }
}

async function deleteRole(req, res) {
  try {
    await connectDb(req.correlationId);
    const role = await roleService.deleteRole(req.params.id);
    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }
    return res.json({ ok: true, message: "Role deleted" });
  } catch (e) {
    logger.error("db-failure", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      action: "delete-role",
      error: e,
    });
    return res.status(500).json({ error: "Failed to delete role" });
  }
}

module.exports = {
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
};


