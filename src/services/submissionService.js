const Submission = require("../models/Submission");
const { cleanRoster } = require("../utils/roster");

async function listSubmissions() {
  return Submission.find({}).sort({ updatedAt: -1 }).lean();
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

