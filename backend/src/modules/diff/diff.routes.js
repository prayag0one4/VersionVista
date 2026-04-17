const express = require("express");
const diffController = require("./diff.controller");

const router = express.Router();

router.get("/", diffController.listDiffs);
router.get("/:id", diffController.getDiff);

module.exports = router;
