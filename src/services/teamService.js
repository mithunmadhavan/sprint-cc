const Team = require("../models/Team");

const DEFAULT_TEAMS = [
  { name: "McLaren", key: "MC", isActive: true },
  { name: "Cadillac", key: "CAD", isActive: true },
  { name: "BMW", key: "BMW", isActive: true },
  { name: "Aston Martin", key: "AS", isActive: true },
  { name: "Haas", key: "HAAS", isActive: true },
  { name: "Mercedes", key: "DMA", isActive: true },
  { name: "Kick Sauber", key: "SAUB", isActive: true },
  { name: "Williams", key: "WIL", isActive: true },
  { name: "Audi", key: "AUDI", isActive: true },
  { name: "Ferrari", key: "FER", isActive: true },
  { name: "Renault", key: "REN", isActive: true },
];

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

function normalizeKey(value, { required = true } = {}) {
  const key = String(value || "").trim().toUpperCase();
  if (required && !key) {
    const err = new Error("Team key is required");
    err.statusCode = 400;
    throw err;
  }
  if (key && !/^[A-Z0-9]+$/.test(key)) {
    const err = new Error("Team key must contain only letters and numbers");
    err.statusCode = 400;
    throw err;
  }
  return key;
}

function normalizeTeamInput(data = {}, { requireName = true, requireKey = true } = {}) {
  const name = String(data.name || "").trim();
  const key = normalizeKey(data.key, { required: requireKey });
  const isActive = data.isActive !== undefined ? Boolean(data.isActive) : true;

  if (requireName && !name) {
    const err = new Error("Team name is required");
    err.statusCode = 400;
    throw err;
  }

  return { name, key, isActive };
}

async function ensureDefaultTeams() {
  const count = await Team.countDocuments();
  if (count > 0) return;
  await Team.insertMany(DEFAULT_TEAMS, { ordered: true });
}

async function listTeams(filters = {}) {
  await ensureDefaultTeams();

  const query = {};
  if (filters.name) {
    query.name = { $regex: String(filters.name).trim(), $options: "i" };
  }
  if (filters.key) {
    query.key = { $regex: String(filters.key).trim().toUpperCase(), $options: "i" };
  }

  const status = normalizeStatus(filters.status);
  if (status === "active") query.isActive = true;
  if (status === "inactive") query.isActive = false;

  const teams = await Team.find(query).lean();
  return teams.sort((a, b) => a.name.localeCompare(b.name));
}

async function getTeam(id) {
  await ensureDefaultTeams();
  return Team.findById(id);
}

async function createTeam(data) {
  await ensureDefaultTeams();
  const normalized = normalizeTeamInput(data, { requireName: true, requireKey: true });
  const team = new Team(normalized);
  return team.save();
}

async function updateTeam(id, data) {
  await ensureDefaultTeams();
  const team = await Team.findById(id);
  if (!team) return null;

  const normalized = normalizeTeamInput(
    {
      name: data.name ?? team.name,
      key: data.key ?? team.key,
      isActive: data.isActive !== undefined ? data.isActive : team.isActive,
    },
    { requireName: true, requireKey: true }
  );

  team.name = normalized.name;
  team.key = normalized.key;
  team.isActive = normalized.isActive;
  return team.save();
}

async function deleteTeam(id) {
  await ensureDefaultTeams();
  return Team.findByIdAndDelete(id);
}

module.exports = {
  DEFAULT_TEAMS,
  ensureDefaultTeams,
  listTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
};

