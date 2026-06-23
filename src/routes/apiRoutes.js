const express = require("express");
const submissionController = require("../controllers/submissionController");
const roleController = require("../controllers/roleController");
const sprintController = require("../controllers/sprintController");
const teamController = require("../controllers/teamController");

const router = express.Router();

router.get("/health", submissionController.getHealth);

router.get("/submissions", submissionController.listSubmissions);
router.get("/submissions/:teamKey/:sprintNo", submissionController.getSubmission);
router.post("/submissions/upsert", submissionController.upsertSubmission);

// Sprint calendar management
router.get("/sprints", sprintController.listSprints);
router.get("/sprints/next-pi-preview", sprintController.previewNextPi);
router.post("/sprints/create-next-pi", sprintController.createNextPi);
router.delete("/sprints/pi/:piNumber", sprintController.deletePi);
router.post("/sprints", sprintController.createSprint);
router.get("/sprints/:id", sprintController.getSprint);
router.put("/sprints/:id", sprintController.updateSprint);
router.delete("/sprints/:id", sprintController.deleteSprint);

// Sprint role management
router.get("/roles", roleController.listRoles);
router.post("/roles", roleController.createRole);
router.get("/roles/:id", roleController.getRole);
router.put("/roles/:id", roleController.updateRole);
router.delete("/roles/:id", roleController.deleteRole);

// Sprint team management
router.get("/teams", teamController.listTeams);
router.post("/teams", teamController.createTeam);
router.get("/teams/:id", teamController.getTeam);
router.put("/teams/:id", teamController.updateTeam);
router.delete("/teams/:id", teamController.deleteTeam);

module.exports = router;

