const mongoose = require("mongoose");

const sprintRoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    roleType: {
      type: String,
      required: true,
      enum: ["team", "non-team"],
      default: "team",
    },
    isCapacity: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "sprint_roles",
  }
);

sprintRoleSchema.index({ name: 1 }, { unique: true });

module.exports =
  mongoose.models.SprintRole || mongoose.model("SprintRole", sprintRoleSchema);

