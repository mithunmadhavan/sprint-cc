const mongoose = require("mongoose");

const rosterMemberSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    role: { type: String, default: "" },
    ph: { type: Number, default: 0 },
    al: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
    pct: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    AvailableDays: { type: Number, default: 0 }
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    Team: { type: String, required: true },
    ProjectKey: { type: String, required: true },
    SprintNo: { type: String, required: true },
    PI: { type: String, default: "" },
    SprintStart: { type: String, default: "" },
    SprintEnd: { type: String, default: "" },
    submittedDate: { type: String, default: "" },
    submittedBy: { type: String, default: "" },
    submittedRole: { type: String, default: "normal" },
    TeamSize: { type: Number, default: 0 },
    TotalDays: { type: Number, default: 0 },
    SprintOverhead: { type: Number, default: 0 },
    SprintCapacity: { type: Number, default: 0 },
    DevCapacityDays: { type: Number, default: 0 },
    TestCapacityDays: { type: Number, default: 0 },
    DevPercent: { type: Number, default: 0 },
    TestPercent: { type: Number, default: 0 },
    SprintGoal: { type: Number, default: null, min: 0 },
    GoalsAchieved: { type: Number, default: null, min: 0 },
    Objectives: { type: [String], default: [] },
    Notes: { type: String, default: "" },
    Roster: { type: [rosterMemberSchema], default: [] }
  },
  { timestamps: true }
);

submissionSchema.index({ ProjectKey: 1, SprintNo: 1 }, { unique: true });

module.exports = mongoose.models.Submission || mongoose.model("Submission", submissionSchema);

