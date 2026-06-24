const { User, USER_ROLES } = require("../models/User");
const Team = require("../models/Team");
const authService = require("./authService");
const { ensureDefaultTeams } = require("./teamService");

function toSafeUser(userDoc) {
  return {
    id: String(userDoc._id),
    username: userDoc.username,
    name: userDoc.name,
    firstName: userDoc.firstName || "",
    lastName: userDoc.lastName || "",
    email: userDoc.email,
    role: userDoc.role,
    isActive: userDoc.isActive !== false,
    assignedTeams: Array.isArray(userDoc.assignedTeams) ? userDoc.assignedTeams : [],
    okta_id: userDoc.okta_id || "",
    createdAt: userDoc.createdAt,
    updatedAt: userDoc.updatedAt,
  };
}

function normalizeRole(value) {
  const role = String(value || "").trim();
  if (!Object.values(USER_ROLES).includes(role)) {
    const err = new Error(`role must be one of: ${Object.values(USER_ROLES).join(", ")}`);
    err.statusCode = 400;
    throw err;
  }
  return role;
}

function normalizeStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  if (!status) return "";
  if (!["active", "inactive"].includes(status)) {
    const err = new Error("status must be 'active' or 'inactive'");
    err.statusCode = 400;
    throw err;
  }
  return status;
}

async function normalizeAssignedTeams(assignedTeams, role) {
  if (role !== USER_ROLES.EDITOR) {
    return [];
  }

  await ensureDefaultTeams();
  const requested = [...new Set(
    (Array.isArray(assignedTeams) ? assignedTeams : [])
      .map((team) => String(team || "").trim().toUpperCase())
      .filter(Boolean)
  )];

  if (requested.length === 0) {
    return [];
  }

  const existingTeams = await Team.find({ key: { $in: requested } }, { key: 1 }).lean();
  const existingKeys = new Set(existingTeams.map((team) => team.key));
  const invalid = requested.filter((teamKey) => !existingKeys.has(teamKey));
  if (invalid.length) {
    const err = new Error(`Unknown team key(s): ${invalid.join(", ")}`);
    err.statusCode = 400;
    throw err;
  }

  return requested;
}

async function listUsers(filters = {}) {
  await authService.ensureDefaultAdminUser();

  const query = {};
  const search = String(filters.search || "").trim();
  if (search) {
    query.$or = [
      { email: { $regex: search, $options: "i" } },
      { username: { $regex: search, $options: "i" } },
      { name: { $regex: search, $options: "i" } },
    ];
  }

  if (filters.role) {
    query.role = normalizeRole(filters.role);
  }

  const status = normalizeStatus(filters.status);
  if (status === "active") query.isActive = true;
  if (status === "inactive") query.isActive = false;

  const users = await User.find(query).sort({ email: 1 }).lean();
  return users.map(toSafeUser);
}

async function updateUser(id, data = {}) {
  await authService.ensureDefaultAdminUser();
  const user = await User.findById(id);
  if (!user) return null;

  const nextRole = data.role !== undefined ? normalizeRole(data.role) : user.role;
  const nextIsActive = data.isActive !== undefined ? Boolean(data.isActive) : user.isActive !== false;
  const nextAssignedTeams = await normalizeAssignedTeams(
    data.assignedTeams !== undefined ? data.assignedTeams : user.assignedTeams,
    nextRole
  );

  user.role = nextRole;
  user.isActive = nextIsActive;
  user.assignedTeams = nextAssignedTeams;
  await user.save();
  return toSafeUser(user);
}

module.exports = {
  listUsers,
  updateUser,
};

