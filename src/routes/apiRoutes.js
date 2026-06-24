const express = require("express");
const authController = require("../controllers/authController");
const submissionController = require("../controllers/submissionController");
const roleController = require("../controllers/roleController");
const sprintController = require("../controllers/sprintController");
const teamController = require("../controllers/teamController");
const userController = require("../controllers/userController");
const { authenticateRequest, requireRole, requireSubmissionWriteAccess, USER_ROLES } = require("../middleware/auth");

const router = express.Router();

router.post("/auth/signin", authController.signIn);
router.get("/health", submissionController.getHealth);

router.use(authenticateRequest);
router.get("/auth/me", authController.getProfile);

router.get("/submissions", submissionController.listSubmissions);
router.get("/submissions/:teamKey/:sprintNo", submissionController.getSubmission);
router.post(
  "/submissions/upsert",
  requireRole([USER_ROLES.ADMIN, USER_ROLES.EDITOR]),
  requireSubmissionWriteAccess,
  submissionController.upsertSubmission
);

// Sprint calendar management
router.get("/sprints", sprintController.listSprints);
router.get("/sprints/next-pi-preview", sprintController.previewNextPi);
router.get("/sprints/add-sprint-options", sprintController.listAddSprintOptions);
router.post("/sprints/create-next-pi", requireRole(USER_ROLES.ADMIN), sprintController.createNextPi);
router.post(
  "/sprints/create-new-sprint",
  requireRole(USER_ROLES.ADMIN),
  sprintController.createNewSprintInExistingPi
);
router.delete("/sprints/pi/:piNumber", requireRole(USER_ROLES.ADMIN), sprintController.deletePi);
router.post("/sprints", requireRole(USER_ROLES.ADMIN), sprintController.createSprint);
router.get("/sprints/:id", sprintController.getSprint);
router.put("/sprints/:id", requireRole(USER_ROLES.ADMIN), sprintController.updateSprint);
router.delete("/sprints/:id", requireRole(USER_ROLES.ADMIN), sprintController.deleteSprint);

// Sprint role management
router.get("/roles", roleController.listRoles);
router.post("/roles", requireRole(USER_ROLES.ADMIN), roleController.createRole);
router.get("/roles/:id", roleController.getRole);
router.put("/roles/:id", requireRole(USER_ROLES.ADMIN), roleController.updateRole);
router.delete("/roles/:id", requireRole(USER_ROLES.ADMIN), roleController.deleteRole);

// Sprint team management
router.get("/teams", teamController.listTeams);
router.post("/teams", requireRole(USER_ROLES.ADMIN), teamController.createTeam);
router.get("/teams/:id", teamController.getTeam);
router.put("/teams/:id", requireRole(USER_ROLES.ADMIN), teamController.updateTeam);
router.delete("/teams/:id", requireRole(USER_ROLES.ADMIN), teamController.deleteTeam);

// User management
router.get("/users", requireRole(USER_ROLES.ADMIN), userController.listUsers);
router.put("/users/:id", requireRole(USER_ROLES.ADMIN), userController.updateUser);

module.exports = router;

