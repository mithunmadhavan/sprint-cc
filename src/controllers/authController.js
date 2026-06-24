const connectDb = require("../db/connectDb");
const logger = require("../utils/logger");
const authService = require("../services/authService");

function resolveBearerToken(authHeader) {
  const value = String(authHeader || "").trim();
  if (!value.startsWith("Bearer ")) return "";
  return value.slice(7).trim();
}

async function signIn(req, res) {
  try {
    await connectDb(req.correlationId);
    const result = await authService.signIn(req.body || {});
    return res.json({ ok: true, token: result.token, user: result.user });
  } catch (e) {
    if (e.statusCode) {
      return res.status(e.statusCode).json({ error: e.message });
    }
    logger.error("db-failure", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      action: "signin",
      error: e,
    });
    return res.status(500).json({ error: "Failed to sign in" });
  }
}

async function getProfile(req, res) {
  try {
    await connectDb(req.correlationId);
    const token = resolveBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: "Missing bearer token" });
    }

    const claims = authService.verifyToken(token);
    const user = await authService.getUserById(claims.sub);
    if (!user) {
      return res.status(401).json({ error: "User not found for token" });
    }

    return res.json({ ok: true, user });
  } catch (e) {
    if (e.statusCode) {
      return res.status(e.statusCode).json({ error: e.message });
    }
    logger.error("db-failure", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      action: "get-profile",
      error: e,
    });
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
}

module.exports = {
  signIn,
  getProfile,
};

