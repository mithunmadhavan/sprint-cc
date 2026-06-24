const Sprint = require("../models/Sprint");
const Submission = require("../models/Submission");

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SPRINT_DURATION_DAYS = 14;

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
  const ipMatch = name.match(/^(\d+)\.IP(?:\s*\((\d+)\))?$/i);
  if (ipMatch) {
    const variant = ipMatch[2] ? Number(ipMatch[2]) : 1;
    return 5 + variant;
  }
  const numericMatch = name.match(/^(\d+)\.(\d+)$/);
  if (numericMatch) {
    return Number(numericMatch[2]);
  }
  return Number.MAX_SAFE_INTEGER;
}

function isIpSprintName(name) {
  return /^\d+\.IP(?:\s*\(\d+\))?$/i.test(normalizeSprintName(name));
}

function computeNextSprintName(currentSprintName) {
  const name = normalizeSprintName(currentSprintName);
  const ipMatch = name.match(/^(\d+)\.IP(?:\s*\((\d+)\))?$/i);
  if (ipMatch) {
    const pi = ipMatch[1];
    const variant = ipMatch[2] ? Number(ipMatch[2]) + 1 : 2;
    return `${pi}.IP (${variant})`;
  }
  const numericMatch = name.match(/^(\d+)\.(\d+)$/);
  if (numericMatch) {
    return `${numericMatch[1]}.${Number(numericMatch[2]) + 1}`;
  }
  const err = new Error(`Cannot derive next sprint name from "${name}"`);
  err.statusCode = 400;
  throw err;
}

async function piHasIpSprint(pi) {
  const sprints = await Sprint.find({ pi }, { sprint: 1 }).lean();
  return sprints.some((s) => isIpSprintName(s.sprint));
}

function pickLastSprintInPi(sprints = []) {
  if (!sprints.length) return null;
  return [...sprints].sort((a, b) => {
    const orderDiff = sprintOrderInPi(b.sprint) - sprintOrderInPi(a.sprint);
    if (orderDiff !== 0) return orderDiff;
    return new Date(b.start) - new Date(a.start);
  })[0];
}

async function getLastSprintInPi(pi) {
  const sprints = await Sprint.find({ pi }).lean();
  return pickLastSprintInPi(sprints);
}

async function getCurrentSprintInPi(pi) {
  return getLastSprintInPi(pi);
}

async function getPreviousSprintInPi(sprint) {
  const piSprints = await Sprint.find({ pi: sprint.pi }).lean();
  const order = sprintOrderInPi(sprint.sprint);
  return pickLastSprintInPi(
    piSprints.filter(
      (item) => String(item._id) !== String(sprint._id) && sprintOrderInPi(item.sprint) < order
    )
  );
}

async function listAddSprintOptions() {
  const allSprints = await Sprint.find().lean();
  const piNumbers = [...new Set(allSprints.map((s) => s.pi))].sort((a, b) => a - b);
  const options = [];

  for (const pi of piNumbers) {
    const piSprints = allSprints.filter((s) => s.pi === pi);
    const current = pickLastSprintInPi(piSprints);
    if (!current || isIpSprintName(current.sprint)) continue;

    const nextSprintName = await resolveNextAvailableSprintName(current.sprint, pi);
    const nextStart = addDays(new Date(current.end), 1);
    options.push({
      pi,
      currentSprint: current.sprint,
      currentSprintEnd: current.end,
      nextSprintName,
      nextStart,
      nextEnd: addDays(new Date(nextStart), DEFAULT_SPRINT_DURATION_DAYS - 1),
    });
  }

  return options;
}

async function resolveNextAvailableSprintName(currentSprintName, pi) {
  const existingNames = new Set(
    (await Sprint.find({ pi }, { sprint: 1 }).lean()).map((s) => normalizeSprintName(s.sprint))
  );
  let candidate = computeNextSprintName(currentSprintName);
  let guard = 0;
  while (existingNames.has(candidate)) {
    guard += 1;
    if (guard > 100) {
      const err = new Error(`Unable to find available sprint name after "${currentSprintName}"`);
      err.statusCode = 400;
      throw err;
    }
    candidate = computeNextSprintName(candidate);
  }
  return candidate;
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

function sortSprintsForReflow(a, b) {
  if (a.pi !== b.pi) return a.pi - b.pi;
  const orderA = sprintOrderInPi(a.sprint);
  const orderB = sprintOrderInPi(b.sprint);
  if (orderA !== orderB) return orderA - orderB;
  return new Date(a.start) - new Date(b.start);
}

async function reflowTrailingSprints(fromSprint, { excludeId = null } = {}) {
  const currentPi = fromSprint.pi;
  const currentOrder = sprintOrderInPi(fromSprint.sprint);
  const candidates = await Sprint.find({
    $or: [{ pi: { $gt: currentPi } }, { pi: currentPi }],
  });

  const trailing = candidates
    .filter((item) => {
      if (excludeId && String(item._id) === String(excludeId)) return false;
      if (String(item._id) === String(fromSprint._id)) return false;
      if (item.pi > currentPi) return true;
      return sprintOrderInPi(item.sprint) > currentOrder;
    })
    .sort(sortSprintsForReflow);

  let nextStart = addDays(new Date(fromSprint.end), 1);
  for (const item of trailing) {
    const duration = sprintDurationDays(item.start, item.end);
    item.start = new Date(nextStart);
    item.end = addDays(new Date(nextStart), duration - 1);
    item.updatedAt = new Date();
    // eslint-disable-next-line no-await-in-loop
    await item.save();
    nextStart = addDays(new Date(item.end), 1);
  }

  return trailing;
}

async function reflowScheduledSprintsAfter(fromSprint) {
  const samePiTrailing = await Sprint.find({
    pi: fromSprint.pi,
    _id: { $ne: fromSprint._id },
    start: { $gte: new Date(fromSprint.start) },
  }).sort({ start: 1 });

  let nextStart = addDays(new Date(fromSprint.end), 1);
  for (const item of samePiTrailing) {
    const duration = sprintDurationDays(item.start, item.end);
    item.start = new Date(nextStart);
    item.end = addDays(new Date(nextStart), duration - 1);
    item.updatedAt = new Date();
    // eslint-disable-next-line no-await-in-loop
    await item.save();
    nextStart = addDays(new Date(item.end), 1);
  }

  const higherPiTrailing = await Sprint.find({ pi: { $gt: fromSprint.pi } });
  higherPiTrailing.sort(sortSprintsForReflow);
  for (const item of higherPiTrailing) {
    const duration = sprintDurationDays(item.start, item.end);
    item.start = new Date(nextStart);
    item.end = addDays(new Date(nextStart), duration - 1);
    item.updatedAt = new Date();
    // eslint-disable-next-line no-await-in-loop
    await item.save();
    nextStart = addDays(new Date(item.end), 1);
  }

  return [...samePiTrailing, ...higherPiTrailing];
}

async function listSprints(filters = {}) {
  const query = {};

  if (filters.sprint) {
    query.sprint = { $regex: filters.sprint, $options: "i" };
  }

  if (filters.pi) {
    query.pi = toPiNumber(filters.pi);
  }

  if (filters.startDateFrom || filters.startDateTo) {
    query.start = {};
    if (filters.startDateFrom) {
      query.start.$gte = new Date(filters.startDateFrom);
    }
    if (filters.startDateTo) {
      query.start.$lte = new Date(filters.startDateTo);
    }
  }

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
  const now = new Date();
  const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
  const recent = sprints.filter((s) => new Date(s.end) >= threeWeeksAgo);
  const old = sprints.filter((s) => new Date(s.end) < threeWeeksAgo);

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

  if (data.sprint !== undefined && data.sprint !== null && data.sprint !== "") {
    sprint.sprint = normalizeSprintName(data.sprint);
  }
  if (data.pi !== undefined && data.pi !== null && data.pi !== "") {
    sprint.pi = toPiNumber(data.pi);
  }
  if (hasStart) sprint.start = new Date(data.start);
  if (hasEnd) sprint.end = new Date(data.end);

  if (hasStart && !hasEnd) {
    sprint.end = addDays(new Date(sprint.start), originalDuration - 1);
  }

  sprint.updatedAt = new Date();
  await sprint.save();

  if (hasStart || hasEnd) {
    await reflowTrailingSprints(sprint);
  }

  return sprint;
}

async function deleteSprint(id) {
  const sprint = await Sprint.findById(id);
  if (!sprint) return null;

  if (isIpSprintName(sprint.sprint)) {
    const err = new Error(`Cannot delete sprint ${sprint.sprint}: IP sprints cannot be deleted`);
    err.statusCode = 400;
    throw err;
  }

  const currentSprint = await getCurrentSprintInPi(sprint.pi);
  if (currentSprint && isIpSprintName(currentSprint.sprint)) {
    const err = new Error(`Cannot delete sprint ${sprint.sprint}: PI ${sprint.pi} is already in IP`);
    err.statusCode = 400;
    throw err;
  }

  if (isTodayOrPast(sprint.start)) {
    const err = new Error(
      `Cannot delete sprint ${sprint.sprint}: sprint has already started`
    );
    err.statusCode = 400;
    throw err;
  }

  const submissionResult = await Submission.deleteMany({ SprintNo: sprint.sprint });

  const deleted = sprint.toObject();
  const previous = await getPreviousSprintInPi(sprint);
  const pi = sprint.pi;
  await Sprint.deleteOne({ _id: sprint._id });

  if (previous) {
    const anchor = await Sprint.findById(previous._id);
    if (anchor) await reflowScheduledSprintsAfter(anchor);
  } else if (pi > 1) {
    const priorPiLast = await getLastSprintInPi(pi - 1);
    if (priorPiLast) await reflowScheduledSprintsAfter(priorPiLast);
  }

  return { ...deleted, submissionsDeleted: submissionResult.deletedCount || 0 };
}

async function createNewSprintInExistingPi(piNumber) {
  const pi = toPiNumber(piNumber);

  const currentSprint = await getCurrentSprintInPi(pi);
  if (!currentSprint) {
    const err = new Error(`PI ${pi} has no sprints to extend`);
    err.statusCode = 400;
    throw err;
  }

  if (isIpSprintName(currentSprint.sprint)) {
    const err = new Error("PI is already in IP no new sprint can be added");
    err.statusCode = 400;
    throw err;
  }

  const nextName = await resolveNextAvailableSprintName(currentSprint.sprint, pi);
  const start = addDays(new Date(currentSprint.end), 1);
  const end = addDays(new Date(start), DEFAULT_SPRINT_DURATION_DAYS - 1);
  const newSprint = await createSprint({
    sprint: nextName,
    pi,
    start,
    end,
  });

  const reflowed = await reflowScheduledSprintsAfter(newSprint);
  return {
    pi,
    currentSprint: currentSprint.sprint,
    lastSprint: currentSprint.sprint,
    sprint: newSprint,
    reflowedCount: reflowed.length,
  };
}

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

  const higherPi = await Sprint.findOne({ pi: { $gt: pi } }).lean();
  if (higherPi) {
    const err = new Error(
      `Cannot delete PI ${pi}: PI ${higherPi.pi} exists. Delete higher PIs first.`
    );
    err.statusCode = 400;
    throw err;
  }

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
  createNewSprintInExistingPi,
  listAddSprintOptions,
  deletePiBatch,
};
