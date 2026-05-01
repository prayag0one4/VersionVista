const codeSnapshotService = require("./code_snapshot.service");
const Repo = require("../repo/repo.model");
const Commit = require("../commit/commit.model");

/**
 * Create a snapshot at a specific commit
 * POST /code-snapshots/create
 */
const createSnapshot = async (req, res) => {
  try {
    const { repoId, commitHash } = req.body;

    if (!repoId || !commitHash) {
      return res.status(400).json({
        error: "repoId and commitHash are required"
      });
    }

    // Verify repo and commit exist
    const repo = await Repo.findById(repoId);
    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const commit = await Commit.findOne({ repoId, commitHash });
    if (!commit) {
      return res.status(404).json({ error: "Commit not found" });
    }

    // Get commit index (position in history)
    const commitCount = await Commit.countDocuments({
      repoId,
      timestamp: { $lt: commit.timestamp }
    });

    const snapshot = await codeSnapshotService.createSnapshot(
      repoId,
      repo.name,
      commitHash,
      commitCount,
      {
        branch: repo.defaultBranch,
        author: commit.author.name,
        message: commit.message
      }
    );

    res.status(201).json({
      message: "Snapshot created successfully",
      snapshot
    });
  } catch (err) {
    console.error("Error creating snapshot:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get snapshot by repo and commit
 * GET /code-snapshots/:repoId/:commitHash
 */
const getSnapshot = async (req, res) => {
  try {
    const { repoId, commitHash } = req.params;

    const snapshot = await codeSnapshotService.getSnapshot(repoId, commitHash);

    if (!snapshot) {
      return res.status(404).json({ error: "Snapshot not found" });
    }

    res.json(snapshot);
  } catch (err) {
    console.error("Error fetching snapshot:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get file paths at a specific commit
 * GET /code-snapshots/paths?repoId=...&commitHash=...
 */
const getFilePaths = async (req, res) => {
  try {
    const { repoId, commitHash } = req.query;

    if (!repoId || !commitHash) {
      return res.status(400).json({ error: "repoId and commitHash are required" });
    }

    const repo = await Repo.findById(repoId);
    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const filePaths = await codeSnapshotService.getFilePathsAtCommit(repo.name, commitHash);

    res.json({
      repoId,
      commitHash,
      fileCount: filePaths.length,
      filePaths
    });
  } catch (err) {
    console.error("Error getting commit file paths:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get the content of a single file at a commit
 * GET /code-snapshots/file?repoId=...&commitHash=...&path=src/index.js
 */
const getCommitFile = async (req, res) => {
  try {
    const { repoId, commitHash, path: filePath } = req.query;

    if (!repoId || !commitHash || !filePath) {
      return res.status(400).json({ error: "repoId, commitHash and path are required" });
    }

    const repo = await Repo.findById(repoId);
    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const content = await codeSnapshotService.getFileContentAtCommit(
      repo.name,
      commitHash,
      filePath
    );

    res.json({
      repoId,
      commitHash,
      filePath,
      content
    });
  } catch (err) {
    console.error("Error getting commit file:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get repository state at a specific commit (with reconstruction if needed)
 * GET /code-snapshots/:repoId/state/:commitHash
 */
const getRepositoryState = async (req, res) => {
  try {
    const { repoId, commitHash } = req.params;

    const repo = await Repo.findById(repoId);
    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const files = await codeSnapshotService.getRepositoryStateAtCommit(
      repoId,
      repo.name,
      commitHash
    );

    res.json({
      repoId,
      commitHash,
      fileCount: files.length,
      files
    });
  } catch (err) {
    console.error("Error getting repository state:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * List all snapshots for a repository
 * GET /code-snapshots/:repoId
 */
const listSnapshots = async (req, res) => {
  try {
    const { repoId } = req.params;
    const { page, limit } = req.query;

    const result = await codeSnapshotService.listSnapshots(repoId, {
      page,
      limit
    });

    res.json(result);
  } catch (err) {
    console.error("Error listing snapshots:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Prune old snapshots (keep only recent ones)
 * DELETE /code-snapshots/:repoId/prune
 */
const pruneSnapshots = async (req, res) => {
  try {
    const { repoId } = req.params;
    const { keepCount = 5 } = req.body;

    const deletedCount = await codeSnapshotService.pruneOldSnapshots(
      repoId,
      keepCount
    );

    res.json({
      message: `Pruned ${deletedCount} old snapshots`,
      deletedCount
    });
  } catch (err) {
    console.error("Error pruning snapshots:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get difference between two commits (using snapshots for optimization)
 * GET /code-snapshots/:repoId/diff/:fromCommit/:toCommit
 */
const getCommitDiff = async (req, res) => {
  try {
    const { repoId, fromCommit, toCommit } = req.params;

    const repo = await Repo.findById(repoId);
    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const [fromState, toState] = await Promise.all([
      codeSnapshotService.getRepositoryStateAtCommit(repoId, repo.name, fromCommit),
      codeSnapshotService.getRepositoryStateAtCommit(repoId, repo.name, toCommit)
    ]);

    const fromMap = new Map(fromState.map(f => [f.filePath, f.content]));
    const toMap = new Map(toState.map(f => [f.filePath, f.content]));

    const changes = {
      added: [],
      modified: [],
      deleted: []
    };

    // Find added and modified files
    toMap.forEach((content, filePath) => {
      if (!fromMap.has(filePath)) {
        changes.added.push(filePath);
      } else if (fromMap.get(filePath) !== content) {
        changes.modified.push(filePath);
      }
    });

    // Find deleted files
    fromMap.forEach((_, filePath) => {
      if (!toMap.has(filePath)) {
        changes.deleted.push(filePath);
      }
    });

    res.json({
      fromCommit,
      toCommit,
      changes
    });
  } catch (err) {
    console.error("Error getting commit diff:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createSnapshot,
  getSnapshot,
  getFilePaths,
  getCommitFile,
  getRepositoryState,
  listSnapshots,
  pruneSnapshots,
  getCommitDiff
};
