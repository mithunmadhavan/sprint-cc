function cleanRoster(roster) {
  if (!Array.isArray(roster)) return [];
  return roster.map((member) => ({
    name: String(member.name || "").trim(),
    role: String(member.role || "").trim(),
    ph: Number(member.ph || 0),
    al: Number(member.al || 0),
    other: Number(member.other || 0),
    pct: Number(member.pct || 0),
    notes: String(member.notes || ""),
    AvailableDays: Number(member.AvailableDays || 0)
  }));
}

module.exports = {
  cleanRoster
};

