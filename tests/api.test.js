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
  assert.ok(first.headers["x-correlation-id"]);

  const read = await request(app)
    .get("/api/submissions/MC/35.1")
    .set("x-correlation-id", "test-corr-id");
  assert.equal(read.status, 200);
  assert.equal(read.body.found, true);
  assert.equal(read.body.record.Team, "McLaren");
  assert.equal(read.headers["x-correlation-id"], "test-corr-id");

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

test("backend manages sprints with CRUD, numeric PI, and next-PI generation", async (t) => {
   mongo = await MongoMemoryServer.create();
   process.env.MONGO_URI = mongo.getUri();
   process.env.VERCEL = "1";

   app = require("../server");

   t.after(async () => {
      await closeConnections();
   });

   const seed = [
      { sprint: "36.1", pi: 36, start: "2026-07-09", end: "2026-07-22" },
      { sprint: "36.2", pi: 36, start: "2026-07-23", end: "2026-08-05" },
      { sprint: "36.3", pi: 36, start: "2026-08-06", end: "2026-08-19" },
      { sprint: "36.4", pi: 36, start: "2026-08-20", end: "2026-09-02" },
      { sprint: "36.5", pi: 36, start: "2026-09-03", end: "2026-09-16" },
      { sprint: "36.IP", pi: 36, start: "2026-09-17", end: "2026-09-30" },
   ];

   for (const item of seed) {
      const created = await request(app).post("/api/sprints").send(item);
      assert.equal(created.status, 201);
   }

   const preview = await request(app).get("/api/sprints/next-pi-preview");
   assert.equal(preview.status, 200);
   assert.equal(preview.body.pi, 37);
   assert.equal(preview.body.count, 6);
   assert.equal(preview.body.sprints[0].sprint, "37.1");

   const beforeCreate = await request(app).get("/api/sprints?pi=37");
   assert.equal(beforeCreate.status, 200);
   assert.equal(beforeCreate.body.sprints.length, 0);

   const createNextPi = await request(app).post("/api/sprints/create-next-pi");
   assert.equal(createNextPi.status, 201);
   assert.equal(createNextPi.body.pi, 37);
   assert.equal(createNextPi.body.count, 6);
   assert.equal(createNextPi.body.sprints[0].sprint, "37.1");
   assert.equal(createNextPi.body.sprints[0].start, "2026-10-01T00:00:00.000Z");
   assert.equal(createNextPi.body.sprints[5].sprint, "37.IP");
   assert.equal(createNextPi.body.sprints[5].end, "2026-12-23T00:00:00.000Z");

   const list = await request(app).get("/api/sprints");
   assert.equal(list.status, 200);
   assert.equal(list.body.sprints.length, 12);

   const filterPI = await request(app).get("/api/sprints?pi=37");
   assert.equal(filterPI.status, 200);
   assert.equal(filterPI.body.sprints.length, 6);

   const editTarget = filterPI.body.sprints[0];
   const update = await request(app)
      .put(`/api/sprints/${editTarget._id}`)
      .send({ pi: 37, start: "2026-10-02" });
   assert.equal(update.status, 200);
   assert.equal(update.body.sprint.pi, 37);
   assert.equal(update.body.sprint.start, "2026-10-02T00:00:00.000Z");

   const futureA = await request(app).post("/api/sprints").send({
      sprint: "210.1",
      pi: 210,
      start: "2099-01-01",
      end: "2099-01-14",
   });
   assert.equal(futureA.status, 201);
   const futureB = await request(app).post("/api/sprints").send({
      sprint: "211.1",
      pi: 211,
      start: "2099-02-01",
      end: "2099-02-14",
   });
   assert.equal(futureB.status, 201);

   const blocked = await request(app).post("/api/sprints/create-next-pi");
   assert.equal(blocked.status, 400);
   assert.match(blocked.body.error, /two future PIs/i);
});

