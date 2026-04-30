const express = require("express");

const repoRoutes = require("../modules/repo/repo.routes");
const commitRoutes = require("../modules/commit/commit.routes");
const diffRoutes = require("../modules/diff/diff.routes");
const fileChangeRoutes = require("../modules/file_change/file_change.routes");
const codeSnapshotRoutes = require("../modules/code_snapshot/code_snapshot.routes");

const router = express.Router();

router.use("/repo", repoRoutes);
router.use("/commits", commitRoutes);
router.use("/diffs", diffRoutes);
router.use("/file-changes", fileChangeRoutes);
router.use("/code-snapshots", codeSnapshotRoutes);

module.exports = router;
