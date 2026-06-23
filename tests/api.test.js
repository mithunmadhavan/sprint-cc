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

test("backend manages sprints with CRUD and filtering", async (t) => {
   mongo = await MongoMemoryServer.create();
   process.env.MONGO_URI = mongo.getUri();
   process.env.VERCEL = "1";

   app = require("../server");

   t.after(async () => {
      await closeConnections();
   });

   // Create sprint 1
   const create1 = await request(app)
      .post("/api/sprints")
      .send({
         sprint: "35.1",
         pi: "35",
         start: "2026-06-10",
         end: "2026-06-20"
      });
   assert.equal(create1.status, 201);
   assert.ok(create1.body.sprint._id);
   const id1 = create1.body.sprint._id;

   // Create sprint 2
   const create2 = await request(app)
      .post("/api/sprints")
      .send({
         sprint: "35.2",
         pi: "35",
         start: "2026-06-24",
         end: "2026-07-04"
      });
   assert.equal(create2.status, 201);
   const id2 = create2.body.sprint._id;

   // List all sprints
   const list = await request(app).get("/api/sprints");
   assert.equal(list.status, 200);
   assert.equal(list.body.sprints.length, 2);

   // Filter by PI
   const filterPI = await request(app).get("/api/sprints?pi=35");
   assert.equal(filterPI.status, 200);
   assert.equal(filterPI.body.sprints.length, 2);

   // Filter by sprint name
   const filterName = await request(app).get("/api/sprints?sprint=35.1");
   assert.equal(filterName.status, 200);
   assert.equal(filterName.body.sprints.length, 1);
   assert.equal(filterName.body.sprints[0].sprint, "35.1");

   // Update sprint 1
   const update = await request(app)
      .put(`/api/sprints/${id1}`)
      .send({
         sprint: "35.1",
         pi: "35",
         start: "2026-06-11",
         end: "2026-06-21"
      });
   assert.equal(update.status, 200);
   assert.equal(update.body.sprint.start, "2026-06-11T00:00:00.000Z");

   // Get single sprint
   const get = await request(app).get(`/api/sprints/${id1}`);
   assert.equal(get.status, 200);
   assert.equal(get.body.sprint.sprint, "35.1");

   // Delete sprint
   const del = await request(app).delete(`/api/sprints/${id1}`);
   assert.equal(del.status, 200);

   // Verify deleted
   const listAfterDelete = await request(app).get("/api/sprints");
   assert.equal(listAfterDelete.body.sprints.length, 1);
});

