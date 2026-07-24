const codeSnapshotService = require("./code_snapshot.service");
const Repo = require("../repo/repo.model");
const Commit = require("../commit/commit.model");

const createSnapshot = async (req, res) => {
  try {
    const { repoId, commitHash, githubToken } = req.body;

    if (!repoId || !commitHash) {
      return res.status(400).json({ error: "repoId and commitHash are required" });
    }

    const repo = await Repo.findById(repoId);
    if (!repo) return res.status(404).json({ error: "Repository not found" });

    const commit = await Commit.findOne({ repoId, commitHash });
    if (!commit) return res.status(404).json({ error: "Commit not found" });

    const commitCount = await Commit.countDocuments({
      repoId,
      timestamp: { $lt: commit.timestamp },
    });

    const snapshot = await codeSnapshotService.createSnapshot(
      repoId,
      repo.githubUrl,
      commitHash,
      commitCount,
      { branch: repo.defaultBranch, author: commit.author.name, message: commit.message },
      githubToken
    );

    res.status(201).json({ message: "Snapshot created successfully", snapshot });
  } catch (err) {
    console.error("Error creating snapshot:", err);
    res.status(500).json({ error: err.message });
  }
};

const getSnapshot = async (req, res) => {
  try {
    const { repoId, commitHash } = req.params;
    const snapshot = await codeSnapshotService.getSnapshot(repoId, commitHash);
    if (!snapshot) return res.status(404).json({ error: "Snapshot not found" });
    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getRepositoryState = async (req, res) => {
  try {
    const { repoId, commitHash } = req.params;
    const githubToken = req.headers["x-github-token"];

    const repo = await Repo.findById(repoId);
    if (!repo) return res.status(404).json({ error: "Repository not found" });

    const filePaths = await codeSnapshotService.getAllFilePathsAtCommit(
      repo.githubUrl,
      commitHash,
      githubToken
    );

    res.json({
      repoId,
      commitHash,
      fileCount: filePaths.length,
      files: filePaths.map((fp) => ({ filePath: fp })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getFileContent = async (req, res) => {
  try {
    const { repoId, commitHash } = req.params;
    const { path: filePath } = req.query;
    const githubToken = req.headers["x-github-token"];

    if (!filePath) {
      return res.status(400).json({ error: "path query parameter is required" });
    }

    const repo = await Repo.findById(repoId);
    if (!repo) return res.status(404).json({ error: "Repository not found" });

    const content = await codeSnapshotService.getFileContent(
      repo.githubUrl,
      commitHash,
      filePath,
      githubToken
    );

    res.json({ filePath, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getFileDiff = async (req, res) => {
  try {
    const { repoId, fromCommit, toCommit } = req.params;
    const { path: filePath } = req.query;
    const githubToken = req.headers["x-github-token"];

    if (!filePath) {
      return res.status(400).json({ error: "path query parameter is required" });
    }

    const repo = await Repo.findById(repoId);
    if (!repo) return res.status(404).json({ error: "Repository not found" });

    const diffLines = await codeSnapshotService.getFileDiff(
      repo.githubUrl,
      fromCommit,
      toCommit,
      filePath,
      githubToken
    );

    res.json({ filePath, fromCommit, toCommit, lines: diffLines });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const listSnapshots = async (req, res) => {
  try {
    const { repoId } = req.params;
    const result = await codeSnapshotService.listSnapshots(repoId, {
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const pruneSnapshots = async (req, res) => {
  try {
    const { repoId } = req.params;
    const { keepCount = 5 } = req.body;
    const deletedCount = await codeSnapshotService.pruneOldSnapshots(repoId, keepCount);
    res.json({ message: `Pruned ${deletedCount} old snapshots`, deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCommitDiff = async (req, res) => {
  try {
    const { repoId, fromCommit, toCommit } = req.params;
    const githubToken = req.headers["x-github-token"];

    const repo = await Repo.findById(repoId);
    if (!repo) return res.status(404).json({ error: "Repository not found" });

    const [fromState, toState] = await Promise.all([
      codeSnapshotService.getRepositoryStateAtCommit(repo.githubUrl, fromCommit, githubToken),
      codeSnapshotService.getRepositoryStateAtCommit(repo.githubUrl, toCommit, githubToken),
    ]);

    const fromMap = new Map(fromState.map((f) => [f.filePath, f.content]));
    const toMap = new Map(toState.map((f) => [f.filePath, f.content]));

    const changes = { added: [], modified: [], deleted: [] };

    toMap.forEach((content, filePath) => {
      if (!fromMap.has(filePath)) changes.added.push(filePath);
      else if (fromMap.get(filePath) !== content) changes.modified.push(filePath);
    });

    fromMap.forEach((_, filePath) => {
      if (!toMap.has(filePath)) changes.deleted.push(filePath);
    });

    res.json({ fromCommit, toCommit, changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createSnapshot,
  getSnapshot,
  getRepositoryState,
  getFileContent,
  getFileDiff,
  listSnapshots,
  pruneSnapshots,
  getCommitDiff,
};
