const Sprint = require("../models/Sprint");

async function listSprints(filters = {}) {
  const query = {};

  // Filter by sprint name
  if (filters.sprint) {
    query.sprint = { $regex: filters.sprint, $options: "i" };
  }

  // Filter by PI
  if (filters.pi) {
    query.pi = { $regex: filters.pi, $options: "i" };
  }

  // Filter by start date range
  if (filters.startDateFrom || filters.startDateTo) {
    query.start = {};
    if (filters.startDateFrom) {
      query.start.$gte = new Date(filters.startDateFrom);
    }
    if (filters.startDateTo) {
      query.start.$lte = new Date(filters.startDateTo);
    }
  }

  // Filter by end date range
  if (filters.endDateFrom || filters.endDateTo) {
    query.end = {};
    if (filters.endDateFrom) {
      query.end.$gte = new Date(filters.endDateFrom);
    }
    if (filters.endDateTo) {
      query.end.$lte = new Date(filters.endDateTo);
    }
  }

  const sprints = await Sprint.find(query).lean();

  // Re-order: older than 3 weeks at last (by end date)
  const now = new Date();
  const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);

  // Sprints are "old" if their end date is more than 3 weeks ago
  const recent = sprints.filter((s) => new Date(s.end) >= threeWeeksAgo);
  const old = sprints.filter((s) => new Date(s.end) < threeWeeksAgo);

  // Sort each group by start date ascending
  recent.sort((a, b) => new Date(a.start) - new Date(b.start));
  old.sort((a, b) => new Date(a.start) - new Date(b.start));

  return [...recent, ...old];
}

async function getSprint(id) {
  return Sprint.findById(id);
}

async function createSprint(data) {
  const sprint = new Sprint({
    sprint: data.sprint,
    pi: data.pi,
    start: new Date(data.start),
    end: new Date(data.end),
  });
  return sprint.save();
}

async function updateSprint(id, data) {
  const sprint = await Sprint.findById(id);
  if (!sprint) return null;
  sprint.sprint = data.sprint || sprint.sprint;
  sprint.pi = data.pi || sprint.pi;
  if (data.start) sprint.start = new Date(data.start);
  if (data.end) sprint.end = new Date(data.end);
  sprint.updatedAt = new Date();
  return sprint.save();
}

async function deleteSprint(id) {
  return Sprint.findByIdAndDelete(id);
}

module.exports = {
  listSprints,
  getSprint,
  createSprint,
  updateSprint,
  deleteSprint,
};

