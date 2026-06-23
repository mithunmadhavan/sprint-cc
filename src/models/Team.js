const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, trim: true, uppercase: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "teams",
  }
);

teamSchema.index({ name: 1 }, { unique: true });
teamSchema.index({ key: 1 }, { unique: true });

module.exports = mongoose.models.Team || mongoose.model("Team", teamSchema);

