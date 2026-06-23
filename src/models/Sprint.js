const mongoose = require("mongoose");

const sprintSchema = new mongoose.Schema(
  {
    sprint: { type: String, required: true, trim: true, unique: true },
    pi: { type: Number, required: true, min: 1 },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "sprints" }
);

// uniqueness on sprint name per PI (prevent duplicates like 35.1 existing twice)
sprintSchema.index({ sprint: 1, pi: 1 }, { unique: true });

module.exports = mongoose.model("Sprint", sprintSchema);

