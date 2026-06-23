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

function normalizeSprintName(value) {
  return String(value || "").trim();
}

function sprintDurationDays(start, end) {
  const days = Math.round((new Date(end) - new Date(start)) / DAY_MS) + 1;
  return Math.max(1, days);
}

function sprintOrderInPi(sprintName) {
  const name = normalizeSprintName(sprintName);
  const suffix = name.split(".").pop();
  if (!suffix) return Number.MAX_SAFE_INTEGER;
  if (/^ip$/i.test(suffix)) return 6;
  const numeric = Number(suffix);
  return Number.isInteger(numeric) ? numeric : Number.MAX_SAFE_INTEGER;
}

function toUtcDateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function isTodayOrPast(value) {
  return toUtcDateKey(value) <= toUtcDateKey(new Date());
}

async function getPiStartSprint(pi) {
  const first = await Sprint.findOne({ pi, sprint: `${pi}.1` }).lean();
  if (first) return first;
  return Sprint.findOne({ pi }).sort({ start: 1 }).lean();
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
    sprint: normalizeSprintName(data.sprint),
    pi: toPiNumber(data.pi),
    start: new Date(data.start),
    end: new Date(data.end),
  });
  return sprint.save();
}

async function updateSprint(id, data) {
  const sprint = await Sprint.findById(id);
  if (!sprint) return null;

  const piStartSprint = await getPiStartSprint(sprint.pi);
  if (piStartSprint && isTodayOrPast(piStartSprint.start)) {
    const err = new Error(
      `Cannot edit sprint ${sprint.sprint}: PI ${sprint.pi} has already started`
    );
    err.statusCode = 400;
    throw err;
  }

  const hasStart = data.start !== undefined && data.start !== null && data.start !== "";
  const hasEnd = data.end !== undefined && data.end !== null && data.end !== "";

  const originalDuration = sprintDurationDays(sprint.start, sprint.end);
  const currentPi = sprint.pi;
  const currentOrder = sprintOrderInPi(sprint.sprint);
  if (data.sprint !== undefined && data.sprint !== null && data.sprint !== "") {
    sprint.sprint = normalizeSprintName(data.sprint);
  }
  if (data.pi !== undefined && data.pi !== null && data.pi !== "") {
    sprint.pi = toPiNumber(data.pi);
  }
  if (hasStart) sprint.start = new Date(data.start);
  if (hasEnd) sprint.end = new Date(data.end);

  // If only start is changed, keep sprint duration stable and recompute end.
  if (hasStart && !hasEnd) {
    sprint.end = addDays(new Date(sprint.start), originalDuration - 1);
  }

  sprint.updatedAt = new Date();
  await sprint.save();

  // Reflow subsequent sprints whenever schedule dates are edited.
  if (hasStart || hasEnd) {
    const candidates = await Sprint.find({
      $or: [{ pi: { $gt: currentPi } }, { pi: currentPi }],
    });

    const trailing = candidates
      .filter((item) => {
        if (String(item._id) === String(sprint._id)) return false;
        if (item.pi > currentPi) return true;
        return sprintOrderInPi(item.sprint) > currentOrder;
      })
      .sort((a, b) => {
        if (a.pi !== b.pi) return a.pi - b.pi;
        const orderA = sprintOrderInPi(a.sprint);
        const orderB = sprintOrderInPi(b.sprint);
        if (orderA !== orderB) return orderA - orderB;
        return new Date(a.start) - new Date(b.start);
      });

    let nextStart = addDays(new Date(sprint.end), 1);
    for (const item of trailing) {
      const duration = sprintDurationDays(item.start, item.end);
      item.start = new Date(nextStart);
      item.end = addDays(new Date(nextStart), duration - 1);
      item.updatedAt = new Date();
      // eslint-disable-next-line no-await-in-loop
      await item.save();
      nextStart = addDays(new Date(item.end), 1);
    }
  }

  return sprint;
}

async function deleteSprint(id) {
  const sprint = await Sprint.findById(id);
  if (!sprint) return null;

  const piStartSprint = await getPiStartSprint(sprint.pi);
  if (piStartSprint && isTodayOrPast(piStartSprint.start)) {
    const err = new Error(
      `Cannot delete sprint ${sprint.sprint}: PI ${sprint.pi} has already started`
    );
    err.statusCode = 400;
    throw err;
  }

  const err = new Error("Single sprint deletion is disabled. Delete the full PI instead.");
  err.statusCode = 400;
  throw err;
}

// A PI is considered "not started" when its *.1 sprint start date is in the future.
async function getNotStartedPiNumbers() {
  const now = new Date();
  const firstSprints = await Sprint.find({ sprint: { $regex: /^\d+\.1$/ } }).lean();
  const notStarted = firstSprints.filter((s) => new Date(s.start) > now);
  return [...new Set(notStarted.map((s) => s.pi))];
}

async function computeNextPiBatch() {
  const notStartedPis = await getNotStartedPiNumbers();

  if (notStartedPis.length >= 2) {
    const err = new Error(
      `Cannot create PI: already have two PIs that have not started (PI ${notStartedPis.sort((a, b) => a - b).join(", ")})`
    );
    err.statusCode = 400;
    throw err;
  }

  const latestCompletedPiIp = await Sprint.findOne({ sprint: { $regex: /^\s*\d+\.IP\s*$/i } })
    .sort({ pi: -1 })
    .lean();
  if (!latestCompletedPiIp) {
    const err = new Error("Cannot create PI: no existing PI found to derive schedule");
    err.statusCode = 400;
    throw err;
  }

  const latestPi = await Sprint.findOne().sort({ pi: -1 }).lean();
  if (latestPi && latestPi.pi > latestCompletedPiIp.pi) {
    const err = new Error(`Cannot create PI: missing ${latestPi.pi}.IP sprint in latest PI`);
    err.statusCode = 400;
    throw err;
  }

  const nextPi = latestCompletedPiIp.pi + 1;

  const startDate = addDays(new Date(latestCompletedPiIp.end), 1);
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

async function deletePiBatch(piNumber) {
  const pi = toPiNumber(piNumber);

  // 1. PI must exist and its *.1 sprint must not have started
  const firstSprint = await getPiStartSprint(pi);
  if (!firstSprint) {
    const err = new Error(`PI ${pi}: PI not found or missing ${pi}.1 sprint`);
    err.statusCode = 404;
    throw err;
  }

  if (isTodayOrPast(firstSprint.start)) {
    const err = new Error(`Cannot delete PI ${pi}: PI has already started`);
    err.statusCode = 400;
    throw err;
  }

  // 2. No higher PI must exist (can't delete PI 35 if PI 36 exists)
  const higherPi = await Sprint.findOne({ pi: { $gt: pi } }).lean();
  if (higherPi) {
    const err = new Error(
      `Cannot delete PI ${pi}: PI ${higherPi.pi} exists. Delete higher PIs first.`
    );
    err.statusCode = 400;
    throw err;
  }

  // 3. No submissions may reference any sprint in this PI
  const Submission = require("../models/Submission");
  const piSprintDocs = await Sprint.find({ pi }, { sprint: 1 }).lean();
  const sprintNames = piSprintDocs.map((s) => s.sprint);
  const submissionCount = await Submission.countDocuments({
    SprintNo: { $in: sprintNames },
  });
  if (submissionCount > 0) {
    const err = new Error(
      `Cannot delete PI ${pi}: ${submissionCount} submission(s) exist for this PI's sprints`
    );
    err.statusCode = 400;
    throw err;
  }

  const result = await Sprint.deleteMany({ pi });
  return { pi, deleted: result.deletedCount };
}

module.exports = {
  listSprints,
  getSprint,
  createSprint,
  updateSprint,
  deleteSprint,
  previewNextPiBatch,
  createNextPiBatch,
  deletePiBatch,
};

