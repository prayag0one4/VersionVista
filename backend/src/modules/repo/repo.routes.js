const express = require("express");
const repoController = require("./repo.controller");

const router = express.Router();

router.post("/fetch", repoController.fetchAndProcess);
router.get("/", repoController.listRepos);
router.get("/:id", repoController.getRepo);
router.delete("/:id", repoController.deleteRepo);

module.exports = router;
