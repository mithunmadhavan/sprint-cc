const connectDb = require("../db/connectDb");
const logger = require("../utils/logger");
const userService = require("../services/userService");
const { USER_ROLES } = require("../models/User");

async function listUsers(req, res) {
  try {
    await connectDb(req.correlationId);
    const users = await userService.listUsers({
      search: req.query.search || "",
      role: req.query.role || "",
      status: req.query.status || "",
    });
    return res.json({ ok: true, users });
  } catch (e) {
    if (e.statusCode === 400) {
      return res.status(400).json({ error: e.message });
    }
    logger.error("db-failure", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      action: "list-users",
      error: e,
    });
    return res.status(500).json({ error: "Failed to list users" });
  }
}

async function updateUser(req, res) {
  try {
    await connectDb(req.correlationId);
    const isSelf = String(req.user?.id || "") === String(req.params.id || "");
    const nextRole = req.body?.role;
    const nextIsActive = req.body?.isActive;

    if (isSelf && nextRole && nextRole !== USER_ROLES.ADMIN) {
      return res.status(400).json({ error: "You cannot demote your own admin account" });
    }

    if (isSelf && nextIsActive === false) {
      return res.status(400).json({ error: "You cannot deactivate your own admin account" });
    }

    const user = await userService.updateUser(req.params.id, req.body || {});
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({ ok: true, user });
  } catch (e) {
    if (e.statusCode === 400) {
      return res.status(400).json({ error: e.message });
    }
    logger.error("db-failure", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      action: "update-user",
      error: e,
    });
    return res.status(500).json({ error: e.message || "Failed to update user" });
  }
}

module.exports = {
  listUsers,
  updateUser,
};

