const SprintRole = require("../models/SprintRole");

const DEFAULT_ROLES = [
  { name: "Full Stack Dev", roleType: "team", isCapacity: true },
  { name: "Front End Dev", roleType: "team", isCapacity: true },
  { name: "Back End Dev", roleType: "team", isCapacity: true },
  { name: "Tester", roleType: "team", isCapacity: true },
  { name: "Architect", roleType: "non-team", isCapacity: false },
  { name: "Scrum Master", roleType: "non-team", isCapacity: false },
  { name: "Product Owner", roleType: "non-team", isCapacity: false },
];

function normalizeRoleType(value) {
  const roleType = String(value || "team").trim().toLowerCase();
  if (!["team", "non-team"].includes(roleType)) {
    const err = new Error("roleType must be 'team' or 'non-team'");
    err.statusCode = 400;
    throw err;
  }
  return roleType;
}

function normalizeRoleInput(data = {}, { requireName = true } = {}) {
  const name = String(data.name || "").trim();
  const roleType = normalizeRoleType(data.roleType);
  const isCapacity = roleType === "team" ? true : Boolean(data.isCapacity);

  if (requireName && !name) {
    const err = new Error("Role name is required");
    err.statusCode = 400;
    throw err;
  }

  return { name, roleType, isCapacity };
}

async function ensureDefaultRoles() {
  const count = await SprintRole.countDocuments();
  if (count > 0) {
    return;
  }
  await SprintRole.insertMany(DEFAULT_ROLES, { ordered: true });
}

async function listRoles(filters = {}) {
  await ensureDefaultRoles();

  const query = {};
  if (filters.name) {
    query.name = { $regex: String(filters.name).trim(), $options: "i" };
  }
  if (filters.roleType) {
    query.roleType = normalizeRoleType(filters.roleType);
  }
  if (filters.capacityFilter === "included") {
    query.isCapacity = true;
  }
  if (filters.capacityFilter === "excluded") {
    query.isCapacity = false;
  }

  const roles = await SprintRole.find(query).lean();
  return roles.sort((a, b) => {
    if (a.roleType !== b.roleType) {
      return a.roleType === "team" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

async function getRole(id) {
  await ensureDefaultRoles();
  return SprintRole.findById(id);
}

async function createRole(data) {
  await ensureDefaultRoles();
  const normalized = normalizeRoleInput(data);
  const role = new SprintRole(normalized);
  return role.save();
}

async function updateRole(id, data) {
  await ensureDefaultRoles();
  const role = await SprintRole.findById(id);
  if (!role) return null;

  const normalized = normalizeRoleInput(
    {
      name: data.name ?? role.name,
      roleType: data.roleType ?? role.roleType,
      isCapacity:
        data.isCapacity !== undefined ? data.isCapacity : role.isCapacity,
    },
    { requireName: true }
  );

  role.name = normalized.name;
  role.roleType = normalized.roleType;
  role.isCapacity = normalized.isCapacity;
  return role.save();
}

async function deleteRole(id) {
  await ensureDefaultRoles();
  return SprintRole.findByIdAndDelete(id);
}

module.exports = {
  DEFAULT_ROLES,
  ensureDefaultRoles,
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
};


