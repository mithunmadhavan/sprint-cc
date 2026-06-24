const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongo;
let app;

async function closeConnections() {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
    mongo = null;
  }
  delete process.env.MONGO_URI;
  delete process.env.JWT_SECRET;
  delete process.env.AUTH_STRICT_MODE;
  delete process.env.VERCEL;

  delete require.cache[require.resolve("../server")];
  delete require.cache[require.resolve("../src/app")];
  delete require.cache[require.resolve("../src/db/connectDb")];
  delete require.cache[require.resolve("../src/models/User")];
  delete require.cache[require.resolve("../src/services/authService")];
}

test("auth bootstrap creates default admin and signs in", async (t) => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  process.env.JWT_SECRET = "test-secret";
  process.env.VERCEL = "1";

  app = require("../server");

  t.after(async () => {
    await closeConnections();
  });

  const signin = await request(app).post("/api/auth/signin").send({
    email: "mithunpramilak@etihad.ae",
    password: "Admin@1234",
  });

  assert.equal(signin.status, 200);
  assert.equal(signin.body.ok, true);
  assert.equal(signin.body.user.email, "mithunpramilak@etihad.ae");
  assert.equal(signin.body.user.username, "mithunpramilak");
  assert.equal(signin.body.user.name, "mithunpramilak");
  assert.equal(signin.body.user.firstName, "");
  assert.equal(signin.body.user.lastName, "");
  assert.equal(signin.body.user.role, "Admin");
  assert.equal(typeof signin.body.token, "string");
  assert.equal(signin.body.token.length > 20, true);
});

test("auth rejects non-etihad domain sign in", async (t) => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  process.env.JWT_SECRET = "test-secret";
  process.env.VERCEL = "1";

  app = require("../server");

  t.after(async () => {
    await closeConnections();
  });

  const signin = await request(app).post("/api/auth/signin").send({
    name: "External User",
    email: "person@gmail.com",
    password: "Viewer@123",
  });

  assert.equal(signin.status, 403);
  assert.match(signin.body.error, /@etihad\.ae/i);
});

test("auth creates unknown etihad user as viewer and allows profile read", async (t) => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  process.env.JWT_SECRET = "test-secret";
  process.env.VERCEL = "1";

  app = require("../server");

  t.after(async () => {
    await closeConnections();
  });

  const signin = await request(app).post("/api/auth/signin").send({
    name: "New Viewer",
    email: "new.viewer@etihad.ae",
    password: "Viewer@123",
  });

  assert.equal(signin.status, 200);
  assert.equal(signin.body.user.username, "new.viewer");
  assert.equal(signin.body.user.name, "new.viewer");
  assert.equal(signin.body.user.firstName, "");
  assert.equal(signin.body.user.lastName, "");
  assert.equal(signin.body.user.role, "Viewer");

  const me = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${signin.body.token}`);

  assert.equal(me.status, 200);
  assert.equal(me.body.ok, true);
  assert.equal(me.body.user.email, "new.viewer@etihad.ae");
  assert.equal(me.body.user.role, "Viewer");
});

test("strict mode rejects protected endpoint without JWT", async (t) => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  process.env.JWT_SECRET = "test-secret";
  process.env.AUTH_STRICT_MODE = "true";
  process.env.VERCEL = "1";

  app = require("../server");

  t.after(async () => {
    await closeConnections();
  });

  const listTeams = await request(app).get("/api/teams");
  assert.equal(listTeams.status, 401);
  assert.match(listTeams.body.error, /bearer token/i);
});

test("editor can only submit for assigned teams when token is used", async (t) => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  process.env.JWT_SECRET = "test-secret";
  process.env.VERCEL = "1";

  app = require("../server");

  t.after(async () => {
    await closeConnections();
  });

  // Sign-in first to bootstrap DB connection and create a viewer user.
  await request(app).post("/api/auth/signin").send({
    name: "Team Editor",
    email: "editor.user@etihad.ae",
    password: "Editor@123",
  });

  const { User, USER_ROLES } = require("../src/models/User");
  await User.updateOne(
    { email: "editor.user@etihad.ae" },
    { $set: { role: USER_ROLES.EDITOR, assignedTeams: ["MC"], isActive: true } }
  );

  const adminSignin = await request(app).post("/api/auth/signin").send({
    email: "mithunpramilak@etihad.ae",
    password: "Admin@1234",
  });

  await request(app)
    .post("/api/sprints")
    .set("Authorization", `Bearer ${adminSignin.body.token}`)
    .send({
      sprint: "90.1",
      pi: 90,
      start: "2099-01-01",
      end: "2099-01-14",
    });

  const signin = await request(app).post("/api/auth/signin").send({
    email: "editor.user@etihad.ae",
    password: "Editor@123",
  });

  const allowed = await request(app)
    .post("/api/submissions/upsert")
    .set("Authorization", `Bearer ${signin.body.token}`)
    .send({
      ProjectKey: "MC",
      SprintNo: "90.1",
      PI: "90",
      SprintStart: "2099-01-01",
      SprintEnd: "2099-01-14",
      Roster: [],
      Objectives: [],
    });
  assert.equal(allowed.status, 200);

  const blocked = await request(app)
    .post("/api/submissions/upsert")
    .set("Authorization", `Bearer ${signin.body.token}`)
    .send({
      ProjectKey: "PAY",
      SprintNo: "90.1",
      PI: "90",
      SprintStart: "2099-01-01",
      SprintEnd: "2099-01-14",
      Roster: [],
      Objectives: [],
    });

  assert.equal(blocked.status, 403);
  assert.match(blocked.body.error, /denied/i);
});

test("admin can manage users, roles, activation, and editor team assignments", async (t) => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  process.env.JWT_SECRET = "test-secret";
  process.env.AUTH_STRICT_MODE = "true";
  process.env.VERCEL = "1";

  app = require("../server");

  t.after(async () => {
    await closeConnections();
  });

  const adminSignin = await request(app).post("/api/auth/signin").send({
    email: "mithunpramilak@etihad.ae",
    password: "Admin@1234",
  });
  assert.equal(adminSignin.status, 200);

  const viewerSignin = await request(app).post("/api/auth/signin").send({
    email: "capacity.viewer@etihad.ae",
    password: "Viewer@123",
  });
  assert.equal(viewerSignin.status, 200);

  const listUsers = await request(app)
    .get("/api/users")
    .set("Authorization", `Bearer ${adminSignin.body.token}`);
  assert.equal(listUsers.status, 200);
  assert.equal(listUsers.body.ok, true);
  const viewerUser = listUsers.body.users.find((user) => user.email === "capacity.viewer@etihad.ae");
  assert.ok(viewerUser);
  assert.equal(viewerUser.role, "Viewer");

  const updateUser = await request(app)
    .put(`/api/users/${viewerUser.id}`)
    .set("Authorization", `Bearer ${adminSignin.body.token}`)
    .send({ role: "Editor", isActive: true, assignedTeams: ["MC", "CAD"] });
  assert.equal(updateUser.status, 200);
  assert.equal(updateUser.body.user.role, "Editor");
  assert.deepEqual(updateUser.body.user.assignedTeams, ["MC", "CAD"]);

  const editorSignin = await request(app).post("/api/auth/signin").send({
    email: "capacity.viewer@etihad.ae",
    password: "Viewer@123",
  });
  assert.equal(editorSignin.status, 200);
  assert.equal(editorSignin.body.user.role, "Editor");

  const deactivateUser = await request(app)
    .put(`/api/users/${viewerUser.id}`)
    .set("Authorization", `Bearer ${adminSignin.body.token}`)
    .send({ role: "Viewer", isActive: false, assignedTeams: [] });
  assert.equal(deactivateUser.status, 200);
  assert.equal(deactivateUser.body.user.isActive, false);

  const disabledSignin = await request(app).post("/api/auth/signin").send({
    email: "capacity.viewer@etihad.ae",
    password: "Viewer@123",
  });
  assert.equal(disabledSignin.status, 403);
  assert.match(disabledSignin.body.error, /disabled/i);
});




