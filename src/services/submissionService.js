const Submission = require("../models/Submission");
const Sprint = require("../models/Sprint");
const { cleanRoster } = require("../utils/roster");

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function addDays(value, days) {
  return new Date(new Date(value).getTime() + days * DAY_MS);
}

function normalizeObjectives(objectives, objective) {
  const values = Array.isArray(objectives)
    ? objectives
    : typeof objective === "string" && objective.trim()
      ? [objective]
      : [];

  return values
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function normalizeNullableNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    const err = new Error("Numeric submission fields must contain valid numbers");
    err.statusCode = 400;
    throw err;
  }

  return parsed;
}

function sameObjectives(left = [], right = []) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function sameNullableNumber(left, right) {
  return (left ?? null) === (right ?? null);
}

async function resolveSprintWindow(payload) {
  const sprintNo = String(payload.SprintNo || "").trim();
  if (!sprintNo) return null;

  const sprint = await Sprint.findOne({ sprint: sprintNo }).lean();
  if (sprint) {
    return {
      sprint: sprint.sprint,
      pi: sprint.pi,
      start: sprint.start,
      end: sprint.end,
    };
  }

  if (payload.SprintStart && payload.SprintEnd) {
    return {
      sprint: sprintNo,
      pi: payload.PI || "",
      start: payload.SprintStart,
      end: payload.SprintEnd,
    };
  }

  return null;
}

function assertSubmissionFieldWindows(sprintWindow, existing, nextPayload) {
  if (!sprintWindow?.start || !sprintWindow?.end) {
    return;
  }

  const today = toDateKey(new Date());
  const start = toDateKey(sprintWindow.start);
  const end = toDateKey(sprintWindow.end);
  const goalsAchievedEnd = toDateKey(addDays(sprintWindow.end, 7));

  const objectivesEditable = today < start;
  const sprintGoalEditable = today < start;
  const goalsAchievedEditable = today >= end && today <= goalsAchievedEnd;

  const previousObjectives = normalizeObjectives(existing?.Objectives, existing?.Objective);
  const previousSprintGoal = existing?.SprintGoal ?? null;
  const previousGoalsAchieved = existing?.GoalsAchieved ?? null;

  if (!objectivesEditable && !sameObjectives(previousObjectives, nextPayload.Objectives)) {
    const err = new Error("Objectives can only be edited before the sprint start date");
    err.statusCode = 400;
    throw err;
  }

  if (!sprintGoalEditable && !sameNullableNumber(previousSprintGoal, nextPayload.SprintGoal)) {
    const err = new Error("Sprint goal can only be edited before the sprint start date");
    err.statusCode = 400;
    throw err;
  }

  if (!goalsAchievedEditable && !sameNullableNumber(previousGoalsAchieved, nextPayload.GoalsAchieved)) {
    const err = new Error("Goals achieved can only be edited from the sprint end date through one week after");
    err.statusCode = 400;
    throw err;
  }
}

async function listSubmissions(filters = {}) {
  const query = {};

  if (filters.teamKey) {
    query.ProjectKey = String(filters.teamKey).trim().toUpperCase();
  }

  if (filters.sprintNo) {
    query.SprintNo = String(filters.sprintNo).trim();
  }

  let dbQuery = Submission.find(query).sort({ updatedAt: -1 });

  const limit = Number(filters.limit);
  if (Number.isInteger(limit) && limit > 0) {
    dbQuery = dbQuery.limit(limit);
  }

  return dbQuery.lean();
}

async function getSubmission(teamKey, sprintNo) {
  return Submission.findOne({
    ProjectKey: teamKey,
    SprintNo: sprintNo
  }).lean();
}

async function upsertSubmission(payload) {
  const sprintWindow = await resolveSprintWindow(payload);
  const nextPayload = {
    ...payload,
    PI: sprintWindow?.pi != null ? String(sprintWindow.pi) : String(payload.PI || ""),
    SprintStart: sprintWindow?.start ? toDateKey(sprintWindow.start) : String(payload.SprintStart || ""),
    SprintEnd: sprintWindow?.end ? toDateKey(sprintWindow.end) : String(payload.SprintEnd || ""),
    SprintGoal: normalizeNullableNumber(payload.SprintGoal),
    GoalsAchieved: normalizeNullableNumber(payload.GoalsAchieved),
    Objectives: normalizeObjectives(payload.Objectives, payload.Objective),
    Roster: cleanRoster(payload.Roster)
  };

  const existing = await getSubmission(nextPayload.ProjectKey, nextPayload.SprintNo);
  assertSubmissionFieldWindows(sprintWindow, existing, nextPayload);

  await Submission.findOneAndUpdate(
    { ProjectKey: nextPayload.ProjectKey, SprintNo: nextPayload.SprintNo },
    nextPayload,
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      runValidators: true
    }
  );

  return { isReplace: Boolean(existing) };
}

module.exports = {
  listSubmissions,
  getSubmission,
  upsertSubmission
};

