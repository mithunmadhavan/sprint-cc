const authService = require("../services/authService");
const connectDb = require("../db/connectDb");
const { USER_ROLES } = require("../models/User");

function extractBearerToken(req) {
  const authHeader = String(req.headers.authorization || "").trim();
  if (!authHeader.startsWith("Bearer ")) return "";
  return authHeader.slice(7).trim();
}

function isStrictJwtModeEnabled() {
  if (process.env.AUTH_STRICT_MODE === "true") return true;
  if (process.env.AUTH_STRICT_MODE === "false") return false;
  if (process.env.NODE_ENV === "test") return false;
  return true;
}

async function authenticateRequest(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    if (isStrictJwtModeEnabled()) {
      return res.status(401).json({ error: "Missing bearer token" });
    }
    req.user = null;
    return next();
  }

  try {
    const claims = authService.verifyToken(token);
    await connectDb({ correlationId: req.correlationId });
    const user = await authService.getUserById(claims.sub);
    if (!user || !user.isActive) {
      const err = new Error(user ? "User account is disabled" : "User not found for token");
      err.statusCode = 401;
      throw err;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      assignedTeams: Array.isArray(user.assignedTeams) ? user.assignedTeams : [],
    };
    return next();
  } catch (e) {
    if (isStrictJwtModeEnabled()) {
      return res.status(e.statusCode || 401).json({ error: e.message || "Invalid token" });
    }
    req.user = null;
    return next();
  }
}

function requireRole(roles = []) {
  const allowed = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      if (!isStrictJwtModeEnabled()) return next();
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient role permissions" });
    }
    return next();
  };
}

function requireSubmissionWriteAccess(req, res, next) {
  if (!req.user) {
    if (!isStrictJwtModeEnabled()) return next();
    return res.status(401).json({ success: false, error: "Authentication required" });
  }

  if (req.user.role === USER_ROLES.ADMIN) {
    return next();
  }

  if (req.user.role === USER_ROLES.EDITOR) {
    const teamKey = String(req.body?.ProjectKey || "").trim().toUpperCase();
    if (!teamKey) {
      return res.status(400).json({ success: false, error: "ProjectKey is required" });
    }

    const assigned = Array.isArray(req.user.assignedTeams) ? req.user.assignedTeams : [];
    if (!assigned.includes(teamKey)) {
      return res.status(403).json({ success: false, error: "Editor access denied for this team" });
    }
    return next();
  }

  return res.status(403).json({ success: false, error: "Viewer role cannot submit updates" });
}

module.exports = {
  authenticateRequest,
  requireRole,
  requireSubmissionWriteAccess,
  USER_ROLES,
};




