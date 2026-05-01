const express = require("express");
const codeSnapshotController = require("./code_snapshot.controller");

const router = express.Router();

// Create a new snapshot
router.post("/create", codeSnapshotController.createSnapshot);

// Get a specific snapshot
router.get("/:repoId/snapshot/:commitHash", codeSnapshotController.getSnapshot);

// Get repository state at a specific commit (with reconstruction)
router.get("/:repoId/state/:commitHash", codeSnapshotController.getRepositoryState);

// Get diff between two commits
router.get("/:repoId/diff/:fromCommit/:toCommit", codeSnapshotController.getCommitDiff);

// Prune old snapshots
router.delete("/:repoId/prune", codeSnapshotController.pruneSnapshots);

// Get all snapshots for a repository
router.get("/:repoId", codeSnapshotController.listSnapshots);

module.exports = router;
