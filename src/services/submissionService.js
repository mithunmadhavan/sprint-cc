const Submission = require("../models/Submission");
const { cleanRoster } = require("../utils/roster");

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
  const nextPayload = { ...payload, Roster: cleanRoster(payload.Roster) };

  const existing = await getSubmission(nextPayload.ProjectKey, nextPayload.SprintNo);

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

