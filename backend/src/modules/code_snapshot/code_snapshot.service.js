const CodeSnapshot = require("./code_snapshot.model");
const Commit = require("../commit/commit.model");
const Diff = require("../diff/diff.model");
const simpleGit = require("simple-git");
const path = require("path");

const repoBasePath = path.join(__dirname, "../../../repos");

const getRepoPath = (repoName) => path.join(repoBasePath, repoName);

/**
 * Create a code snapshot at a specific commit
 * Stores only file paths (not content) to avoid BSON 16MB limit
 */
const createSnapshot = async (repoId, repoName, commitHash, commitIndex, metadata = {}) => {
  try {
    // Check if snapshot already exists
    const existing = await CodeSnapshot.findOne({
      repoId,
      commitHash,
      isActive: true
    });

    if (existing) {
      console.log(`Snapshot already exists for ${commitHash}`);
      return existing;
    }

    // Deactivate previous snapshots for this repo (keep only active checkpoint)
    await CodeSnapshot.updateMany(
      { repoId, isActive: true },
      { isActive: false }
    );

    const repoPath = getRepoPath(repoName);
    const filePaths = await getAllFilePathsAtCommit(repoPath, commitHash);

    const snapshot = await CodeSnapshot.create({
      repoId,
      commitHash,
      commitIndex,
      filePaths,
      fileCount: filePaths.length,
      isActive: true,
      metadata
    });

    console.log(`✓ Created snapshot for ${commitHash} with ${filePaths.length} files (paths only, content fetched on-demand)`);
    return snapshot;
  } catch (err) {
    console.error("Error creating snapshot:", err.message);
    throw err;
  }
};

/**
 * Get all file paths in repository at a specific commit using git
 * Does NOT fetch content (to avoid BSON size limit)
 */
const getAllFilePathsAtCommit = async (repoPath, commitHash) => {
  try {
    const gitRepo = simpleGit(repoPath);
    
    console.log(`[snapshot] Getting file paths at commit ${commitHash} from ${repoPath}`);
    
    // Get list of all files at this commit (paths only, no content)
    const allFiles = await gitRepo.raw(["ls-tree", "-r", "--name-only", commitHash]);
    const filePaths = allFiles.split("\n").filter(f => f.trim());
    
    console.log(`[snapshot] Found ${filePaths.length} file paths at ${commitHash}`);
    return filePaths;
  } catch (err) {
    console.error("[snapshot] Error getting file paths at commit:", err.message);
    throw err;
  }
};

/**
 * Reconstruct repository state at a specific commit using checkpoint
 * Fetches file content from git on-demand instead of using stored content
 */
const reconstructRepositoryState = async (repoId, repoName, targetCommitHash) => {
  try {
    const repoPath = getRepoPath(repoName);
    const gitRepo = simpleGit(repoPath);
    
    // Get the target commit to find its index
    const targetCommit = await Commit.findOne({
      repoId,
      commitHash: targetCommitHash
    });

    if (!targetCommit) {
      throw new Error(`Commit ${targetCommitHash} not found`);
    }

    // Find nearest checkpoint
    const checkpoint = await CodeSnapshot.findOne({
      repoId,
      commitIndex: { $lte: targetCommit.commitIndex || 0 },
      isActive: true
    }).sort({ commitIndex: -1 });

    let fileState = new Set();

    // If checkpoint exists, use it as base (just get the file list)
    if (checkpoint) {
      fileState = new Set(checkpoint.filePaths || []);
    } else {
      // No checkpoint, fetch from git at first available commit
      const firstCommit = await Commit.findOne({ repoId }).sort({ timestamp: 1 });
      
      if (firstCommit) {
        const allFiles = await gitRepo.raw(["ls-tree", "-r", "--name-only", firstCommit.commitHash]);
        const filePaths = allFiles.split("\n").filter(f => f.trim());
        fileState = new Set(filePaths);
      }
    }

    // Determine start point for diff replay
    const startTimestamp = checkpoint ? checkpoint.createdAt : new Date(0);

    // Get all commits between checkpoint and target
    const commits = await Commit.find({
      repoId,
      timestamp: { $gt: startTimestamp }
    }).sort({ timestamp: 1 });

    // Replay diffs to update file state (add/remove files)
    for (const commit of commits) {
      const diffs = await Diff.find({ commitId: commit._id });

      for (const diff of diffs) {
        if (diff.changeType === "deleted") {
          fileState.delete(diff.filePath);
        } else {
          fileState.add(diff.filePath);
        }
      }

      // Stop if we reached target commit
      if (commit.commitHash === targetCommitHash) {
        break;
      }
    }

    // Now fetch content from git for all files in final state
    const files = [];
    for (const filePath of fileState) {
      try {
        const content = await gitRepo.show([`${targetCommitHash}:${filePath}`]);
        files.push({
          filePath,
          content,
          encoding: "utf-8"
        });
      } catch (err) {
        console.warn(`[snapshot] Failed to fetch ${filePath} at ${targetCommitHash}`);
      }
    }

    return files;
  } catch (err) {
    console.error("[snapshot] Error reconstructing repository state:", err.message);
    throw err;
  }
};

/**
 * Get snapshot by repo and commit
 */
const getSnapshot = (repoId, commitHash) => {
  return CodeSnapshot.findOne({ repoId, commitHash });
};

/**
 * List all snapshots for a repo
 */
const listSnapshots = async (repoId, options = {}) => {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(options.limit) || 10));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    CodeSnapshot.find({ repoId })
      .sort({ commitIndex: -1 })
      .skip(skip)
      .limit(limit),
    CodeSnapshot.countDocuments({ repoId })
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get repository state at a specific commit (optimized)
 * Always reconstructs from checkpoint to get actual file content
 */
const getRepositoryStateAtCommit = async (repoId, repoName, commitHash) => {
  // Always reconstruct to fetch current file content from git
  return reconstructRepositoryState(repoId, repoName, commitHash);
};

/**
 * Delete old snapshots (keep only recent ones)
 */
const pruneOldSnapshots = async (repoId, keepCount = 5) => {
  const snapshots = await CodeSnapshot.find({ repoId })
    .sort({ commitIndex: -1 })
    .skip(keepCount);

  if (snapshots.length > 0) {
    const idsToDelete = snapshots.map(s => s._id);
    await CodeSnapshot.deleteMany({ _id: { $in: idsToDelete } });
    console.log(`Pruned ${idsToDelete.length} old snapshots for repo ${repoId}`);
    return idsToDelete.length;
  }

  return 0;
};

module.exports = {
  getAllFilePathsAtCommit,
  createSnapshot,
  reconstructRepositoryState,
  getSnapshot,
  listSnapshots,
  getRepositoryStateAtCommit,
  pruneOldSnapshots
};
