const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongo;
let app;

async function closeConnections() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongo.stop();
}

test("backend upserts and reads submissions", async (t) => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  process.env.VERCEL = "1";

  app = require("../server");

  t.after(async () => {
    await closeConnections();
  });

  const payload = {
    Team: "McLaren",
    ProjectKey: "MC",
    SprintNo: "35.1",
    PI: "35",
    submittedDate: "2026-06-22",
    submittedBy: "Test User",
    TeamSize: 1,
    TotalDays: 8,
    SprintOverhead: 1.6,
    SprintCapacity: 6.4,
    DevCapacityDays: 6.4,
    TestCapacityDays: 0,
    DevPercent: 100,
    TestPercent: 0,
    Notes: "First submit",
    Roster: [
      { name: "Alice", role: "Full Stack Dev", ph: 0, al: 0, other: 0, pct: 100, notes: "", AvailableDays: 8 }
    ]
  };

  const first = await request(app).post("/api/submissions/upsert").send(payload);
  assert.equal(first.status, 200);
  assert.equal(first.body.success, true);
  assert.equal(first.body.isReplace, false);

  const read = await request(app).get("/api/submissions/MC/35.1");
  assert.equal(read.status, 200);
  assert.equal(read.body.found, true);
  assert.equal(read.body.record.Team, "McLaren");

  const second = await request(app)
    .post("/api/submissions/upsert")
    .send({ ...payload, Notes: "Second submit" });
  assert.equal(second.status, 200);
  assert.equal(second.body.isReplace, true);

  const list = await request(app).get("/api/submissions");
  assert.equal(list.status, 200);
  assert.equal(Array.isArray(list.body), true);
  assert.equal(list.body.length, 1);
  assert.equal(list.body[0].Notes, "Second submit");
});

