const express = require("express");
const fileChangeController = require("./file_change.controller");

const router = express.Router();

router.get("/", fileChangeController.listFileChanges);

module.exports = router;
