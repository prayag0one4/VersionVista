const express = require("express");
const commitController = require("./commit.controller");

const router = express.Router();

router.get("/", commitController.listCommits);
router.get("/:id", commitController.getCommit);

module.exports = router;
