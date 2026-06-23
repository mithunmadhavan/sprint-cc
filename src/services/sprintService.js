const Sprint = require("../models/Sprint");

const DAY_MS = 24 * 60 * 60 * 1000;

function toPiNumber(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    const err = new Error("PI must be a positive integer");
    err.statusCode = 400;
    throw err;
  }
  return n;
}

function addDays(baseDate, days) {
  return new Date(baseDate.getTime() + days * DAY_MS);
}

async function listSprints(filters = {}) {
  const query = {};

  // Filter by sprint name
  if (filters.sprint) {
    query.sprint = { $regex: filters.sprint, $options: "i" };
  }

  // Filter by PI
  if (filters.pi) {
    query.pi = toPiNumber(filters.pi);
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
    pi: toPiNumber(data.pi),
    start: new Date(data.start),
    end: new Date(data.end),
  });
  return sprint.save();
}

async function updateSprint(id, data) {
  const sprint = await Sprint.findById(id);
  if (!sprint) return null;
  sprint.sprint = data.sprint || sprint.sprint;
  if (data.pi !== undefined && data.pi !== null && data.pi !== "") {
    sprint.pi = toPiNumber(data.pi);
  }
  if (data.start) sprint.start = new Date(data.start);
  if (data.end) sprint.end = new Date(data.end);
  sprint.updatedAt = new Date();
  return sprint.save();
}

async function deleteSprint(id) {
  return Sprint.findByIdAndDelete(id);
}

async function computeNextPiBatch() {
  const now = new Date();

  const futurePiRows = await Sprint.aggregate([
    { $match: { start: { $gt: now } } },
    { $group: { _id: "$pi" } },
  ]);

  if (futurePiRows.length >= 2) {
    const err = new Error("Cannot create PI: already have two future PIs not started");
    err.statusCode = 400;
    throw err;
  }

  const latestPi = await Sprint.findOne().sort({ pi: -1 }).lean();
  if (!latestPi) {
    const err = new Error("Cannot create PI: no existing PI found to derive schedule");
    err.statusCode = 400;
    throw err;
  }

  const nextPi = latestPi.pi + 1;
  const lastPiIp = await Sprint.findOne({ pi: latestPi.pi, sprint: `${latestPi.pi}.IP` }).lean();
  if (!lastPiIp) {
    const err = new Error(`Cannot create PI: missing ${latestPi.pi}.IP sprint in latest PI`);
    err.statusCode = 400;
    throw err;
  }

  const startDate = addDays(new Date(lastPiIp.end), 1);
  const sprintSuffixes = ["1", "2", "3", "4", "5", "IP"];
  const sprints = sprintSuffixes.map((suffix, index) => {
    const start = addDays(startDate, index * 14);
    const end = addDays(start, 13);
    return {
      sprint: `${nextPi}.${suffix}`,
      pi: nextPi,
      start,
      end,
    };
  });

  return { pi: nextPi, sprints };
}

async function previewNextPiBatch() {
  return computeNextPiBatch();
}

async function createNextPiBatch() {
  const plan = await computeNextPiBatch();
  return Sprint.insertMany(plan.sprints, { ordered: true });
}

module.exports = {
  listSprints,
  getSprint,
  createSprint,
  updateSprint,
  deleteSprint,
  previewNextPiBatch,
  createNextPiBatch,
};

