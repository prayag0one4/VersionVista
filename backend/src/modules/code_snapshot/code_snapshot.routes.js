const express = require("express");
const codeSnapshotController = require("./code_snapshot.controller");

const router = express.Router();

// Create a new snapshot
router.post("/create", codeSnapshotController.createSnapshot);

// Get all snapshots for a repository
router.get("/:repoId", codeSnapshotController.listSnapshots);

// Get a specific snapshot
router.get("/:repoId/snapshot/:commitHash", codeSnapshotController.getSnapshot);

// Get single file content at a specific commit (must be before the generic :commitHash route)
router.get("/:repoId/state/:commitHash/content", codeSnapshotController.getFileContent);

// Get line-by-line diff for a file between two commits
router.get("/:repoId/diff/:fromCommit/:toCommit/file", codeSnapshotController.getFileDiff);

// Get repository state at a specific commit (paths only)
router.get("/:repoId/state/:commitHash", codeSnapshotController.getRepositoryState);

// Get diff between two commits
router.get("/:repoId/diff/:fromCommit/:toCommit", codeSnapshotController.getCommitDiff);

// Prune old snapshots
router.delete("/:repoId/prune", codeSnapshotController.pruneSnapshots);

module.exports = router;
