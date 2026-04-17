const express = require("express");
const repoController = require("./repo.controller");

const router = express.Router();

router.post("/fetch", repoController.fetchAndProcess);
router.get("/", repoController.listRepos);
router.get("/:id", repoController.getRepo);

module.exports = router;
