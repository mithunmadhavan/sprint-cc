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

  const another = await request(app).post("/api/submissions/upsert").send({
    ...payload,
    Team: "Cadillac",
    ProjectKey: "CAD",
    SprintNo: "35.2",
    PI: "35",
    Notes: "Another team",
  });
  assert.equal(another.status, 200);

   const list = await request(app).get("/api/submissions");
   assert.equal(list.status, 200);
   assert.equal(Array.isArray(list.body), true);
   assert.equal(list.body.length, 2);

   const filtered = await request(app).get("/api/submissions?teamKey=MC&sprintNo=35.1");
   assert.equal(filtered.status, 200);
   assert.equal(filtered.body.length, 1);
   assert.equal(filtered.body[0].Notes, "Second submit");

   const limited = await request(app).get("/api/submissions?limit=1");
   assert.equal(limited.status, 200);
   assert.equal(limited.body.length, 1);
   assert.equal(limited.body[0].ProjectKey, "CAD");
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

   const singleDeleteBlocked = await request(app).delete(`/api/sprints/${editTarget._id}`);
   assert.equal(singleDeleteBlocked.status, 400);
   assert.match(singleDeleteBlocked.body.error, /single sprint deletion is disabled/i);

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
   assert.match(blocked.body.error, /two PIs that have not started/i);
});

test("backend manages sprint roles with default seeding and capacity flags", async (t) => {
   mongo = await MongoMemoryServer.create();
   process.env.MONGO_URI = mongo.getUri();
   process.env.VERCEL = "1";

   app = require("../server");

   t.after(async () => {
      await closeConnections();
   });

   const listDefaults = await request(app).get("/api/roles");
   assert.equal(listDefaults.status, 200);
   assert.equal(listDefaults.body.ok, true);
   assert.equal(listDefaults.body.roles.length >= 7, true);
   const architect = listDefaults.body.roles.find((role) => role.name === "Architect");
   assert.equal(architect.roleType, "non-team");
   assert.equal(architect.isCapacity, false);

   const create = await request(app)
      .post("/api/roles")
      .send({ name: "Business Analyst", roleType: "non-team", isCapacity: true });
   assert.equal(create.status, 201);
   assert.equal(create.body.role.roleType, "non-team");
   assert.equal(create.body.role.isCapacity, true);
   const roleId = create.body.role._id;

   const update = await request(app)
      .put(`/api/roles/${roleId}`)
      .send({ name: "Business Analyst", roleType: "non-team", isCapacity: false });
   assert.equal(update.status, 200);
   assert.equal(update.body.role.isCapacity, false);

   const createTeam = await request(app)
      .post("/api/roles")
      .send({ name: "Platform Engineer", roleType: "team", isCapacity: false });
   assert.equal(createTeam.status, 201);
   assert.equal(createTeam.body.role.isCapacity, true);

   const filterExcluded = await request(app).get("/api/roles?capacity=excluded&roleType=non-team");
   assert.equal(filterExcluded.status, 200);
   assert.equal(filterExcluded.body.roles.some((role) => role.name === "Business Analyst"), true);

   const del = await request(app).delete(`/api/roles/${roleId}`);
   assert.equal(del.status, 200);
});

test("backend manages sprint teams with default seeding and CRUD", async (t) => {
   mongo = await MongoMemoryServer.create();
   process.env.MONGO_URI = mongo.getUri();
   process.env.VERCEL = "1";

   app = require("../server");

   t.after(async () => {
      await closeConnections();
   });

   const listDefaults = await request(app).get("/api/teams");
   assert.equal(listDefaults.status, 200);
   assert.equal(listDefaults.body.ok, true);
   assert.equal(listDefaults.body.teams.length >= 11, true);
   assert.equal(
      listDefaults.body.teams.some((team) => team.name === "McLaren" && team.key === "MC"),
      true
   );

   const create = await request(app)
      .post("/api/teams")
      .send({ name: "Alpine", key: "ALP", isActive: true });
   assert.equal(create.status, 201);
   assert.equal(create.body.team.key, "ALP");
   const teamId = create.body.team._id;

   const update = await request(app)
      .put(`/api/teams/${teamId}`)
      .send({ name: "Alpine F1", key: "ALP", isActive: false });
   assert.equal(update.status, 200);
   assert.equal(update.body.team.name, "Alpine F1");
   assert.equal(update.body.team.isActive, false);

   const filterInactive = await request(app).get("/api/teams?status=inactive");
   assert.equal(filterInactive.status, 200);
   assert.equal(filterInactive.body.teams.some((team) => team.key === "ALP"), true);

   const del = await request(app).delete(`/api/teams/${teamId}`);
   assert.equal(del.status, 200);
});

test("backend enforces delete-PI rules and removes all PI sprints", async (t) => {
   mongo = await MongoMemoryServer.create();
   process.env.MONGO_URI = mongo.getUri();
   process.env.VERCEL = "1";

   app = require("../server");

   t.after(async () => {
      await closeConnections();
   });

   // Seed PI 35 (already started — past dates)
   const pi35 = [
      { sprint: "35.1", pi: 35, start: "2026-01-01", end: "2026-01-14" },
      { sprint: "35.2", pi: 35, start: "2026-01-15", end: "2026-01-28" },
      { sprint: "35.3", pi: 35, start: "2026-01-29", end: "2026-02-11" },
      { sprint: "35.4", pi: 35, start: "2026-02-12", end: "2026-02-25" },
      { sprint: "35.5", pi: 35, start: "2026-02-26", end: "2026-03-11" },
      { sprint: "35.IP", pi: 35, start: "2026-03-12", end: "2026-03-25" },
   ];

   // Seed PI 36 (not started — future dates)
   const pi36 = [
      { sprint: "36.1", pi: 36, start: "2099-01-01", end: "2099-01-14" },
      { sprint: "36.2", pi: 36, start: "2099-01-15", end: "2099-01-28" },
      { sprint: "36.3", pi: 36, start: "2099-01-29", end: "2099-02-11" },
      { sprint: "36.4", pi: 36, start: "2099-02-12", end: "2099-02-25" },
      { sprint: "36.5", pi: 36, start: "2099-02-26", end: "2099-03-11" },
      { sprint: "36.IP", pi: 36, start: "2099-03-12", end: "2099-03-25" },
   ];

   // Seed PI 37 (not started — future dates)
   const pi37 = [
      { sprint: "37.1", pi: 37, start: "2099-04-01", end: "2099-04-14" },
      { sprint: "37.2", pi: 37, start: "2099-04-15", end: "2099-04-28" },
      { sprint: "37.3", pi: 37, start: "2099-04-29", end: "2099-05-12" },
      { sprint: "37.4", pi: 37, start: "2099-05-13", end: "2099-05-26" },
      { sprint: "37.5", pi: 37, start: "2099-05-27", end: "2099-06-09" },
      { sprint: "37.IP", pi: 37, start: "2099-06-10", end: "2099-06-23" },
   ];

   for (const item of [...pi35, ...pi36, ...pi37]) {
      const r = await request(app).post("/api/sprints").send(item);
      assert.equal(r.status, 201);
   }

   // Rule: PI 35 already started → cannot delete
   const failStarted = await request(app).delete("/api/sprints/pi/35");
   assert.equal(failStarted.status, 400);
   assert.match(failStarted.body.error, /already started/i);

   // Rule: PI 36 has higher PI 37 → cannot delete
   const failHigher = await request(app).delete("/api/sprints/pi/36");
   assert.equal(failHigher.status, 400);
   assert.match(failHigher.body.error, /PI 37 exists/i);

   // Add a submission for sprint 37.1 then try to delete PI 37
   const subPayload = {
      Team: "McLaren", ProjectKey: "MC", SprintNo: "37.1", PI: "37",
      submittedDate: "2026-06-22", submittedBy: "Tester",
      TeamSize: 1, TotalDays: 8, SprintOverhead: 1.6, SprintCapacity: 6.4,
      DevCapacityDays: 6.4, TestCapacityDays: 0, DevPercent: 100, TestPercent: 0,
      Notes: "test", Roster: []
   };
   const subResp = await request(app).post("/api/submissions/upsert").send(subPayload);
   assert.equal(subResp.status, 200);

   const failSubmission = await request(app).delete("/api/sprints/pi/37");
   assert.equal(failSubmission.status, 400);
   assert.match(failSubmission.body.error, /submission/i);

   // Delete the submission then retry — PI 37 should now be deletable
   // (no direct delete submission endpoint, so we'll use a clean DB approach)
   // Seed a new PI 38 (no submissions) and verify it can be deleted
   const pi38 = [
      { sprint: "38.1", pi: 38, start: "2099-07-01", end: "2099-07-14" },
      { sprint: "38.2", pi: 38, start: "2099-07-15", end: "2099-07-28" },
      { sprint: "38.3", pi: 38, start: "2099-07-29", end: "2099-08-11" },
      { sprint: "38.4", pi: 38, start: "2099-08-12", end: "2099-08-25" },
      { sprint: "38.5", pi: 38, start: "2099-08-26", end: "2099-09-08" },
      { sprint: "38.IP", pi: 38, start: "2099-09-09", end: "2099-09-22" },
   ];
   for (const item of pi38) {
      const r = await request(app).post("/api/sprints").send(item);
      assert.equal(r.status, 201);
   }

   // Delete PI 38 (highest, not started, no submissions)
   const deleteOk = await request(app).delete("/api/sprints/pi/38");
   assert.equal(deleteOk.status, 200);
   assert.equal(deleteOk.body.ok, true);
   assert.equal(deleteOk.body.pi, 38);
   assert.equal(deleteOk.body.deleted, 6);

   // Verify PI 38 sprints are gone
   const afterDelete = await request(app).get("/api/sprints?pi=38");
   assert.equal(afterDelete.status, 200);
   assert.equal(afterDelete.body.sprints.length, 0);

   // PI 37 is now top again — deletion still blocked due to submission
   const stillBlocked = await request(app).delete("/api/sprints/pi/37");
   assert.equal(stillBlocked.status, 400);
   assert.match(stillBlocked.body.error, /submission/i);
});
