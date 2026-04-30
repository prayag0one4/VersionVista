const CodeSnapshot = require("./code_snapshot.model");
const Commit = require("../commit/commit.model");
const Diff = require("../diff/diff.model");
const simpleGit = require("simple-git");
const path = require("path");

const repoBasePath = path.join(__dirname, "../../../repos");

const getRepoPath = (repoName) => path.join(repoBasePath, repoName);

/**
 * Find the nearest earlier checkpoint before a target commit
 */
const findNearestCheckpoint = async (repoId, targetCommitIndex) => {
  return CodeSnapshot.findOne({
    repoId,
    commitIndex: { $lte: targetCommitIndex },
    isActive: true
  }).sort({ commitIndex: -1 });
};

/**
 * Get all files in repository at a specific commit using git
 */
const getAllFilesAtCommit = async (repoPath, commitHash) => {
  try {
    const gitRepo = simpleGit(repoPath);
    
    // Get list of all files at this commit
    const allFiles = await gitRepo.raw(["ls-tree", "-r", "--name-only", commitHash]);
    const filePaths = allFiles.split("\n").filter(f => f.trim());

    const files = [];
    for (const filePath of filePaths) {
      try {
        const content = await gitRepo.show([`${commitHash}:${filePath}`]);
        files.push({
          filePath,
          content,
          encoding: "utf-8"
        });
      } catch (err) {
        console.warn(`Failed to read file ${filePath} at ${commitHash}:`, err.message);
      }
    }

    return files;
  } catch (err) {
    console.error("Error getting files at commit:", err);
    throw err;
  }
};

/**
 * Create a code snapshot at a specific commit
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
    const files = await getAllFilesAtCommit(repoPath, commitHash);

    const totalSize = files.reduce((sum, f) => sum + (f.content?.length || 0), 0);

    const snapshot = await CodeSnapshot.create({
      repoId,
      commitHash,
      commitIndex,
      files,
      totalSize,
      fileCount: files.length,
      isActive: true,
      metadata
    });

    console.log(`Created snapshot for ${commitHash} with ${files.length} files (${totalSize} bytes)`);
    return snapshot;
  } catch (err) {
    console.error("Error creating snapshot:", err);
    throw err;
  }
};

/**
 * Reconstruct repository state at a specific commit
 */
const reconstructRepositoryState = async (repoId, repoName, targetCommitHash) => {
  try {
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

    let fileState = new Map();

    // If checkpoint exists, use it as base
    if (checkpoint) {
      checkpoint.files.forEach(f => {
        fileState.set(f.filePath, f);
      });
    } else {
      // No checkpoint, fetch from git at first available commit
      const repoPath = getRepoPath(repoName);
      const firstCommit = await Commit.findOne({ repoId }).sort({ timestamp: 1 });
      
      if (firstCommit) {
        const files = await getAllFilesAtCommit(repoPath, firstCommit.commitHash);
        files.forEach(f => {
          fileState.set(f.filePath, f);
        });
      }
    }

    // Determine start point for diff replay
    const startTimestamp = checkpoint ? checkpoint.createdAt : new Date(0);

    // Get all commits between checkpoint and target
    const commits = await Commit.find({
      repoId,
      timestamp: { $gt: startTimestamp }
    }).sort({ timestamp: 1 });

    // Replay diffs
    for (const commit of commits) {
      const diffs = await Diff.find({ commitId: commit._id });

      for (const diff of diffs) {
        if (diff.changeType === "deleted") {
          fileState.delete(diff.filePath);
        } else {
          // Reconstruct file content from hunks
          const previousFile = fileState.get(diff.filePath);
          const newContent = reconstructFileContent(diff.hunks, previousFile);
          fileState.set(diff.filePath, {
            filePath: diff.filePath,
            content: newContent,
            encoding: "utf-8"
          });
        }
      }

      // Stop if we reached target commit
      if (commit.commitHash === targetCommitHash) {
        break;
      }
    }

    return Array.from(fileState.values());
  } catch (err) {
    console.error("Error reconstructing repository state:", err);
    throw err;
  }
};

/**
 * Reconstruct file content from hunks
 */
const reconstructFileContent = (hunks, previousFile) => {
  if (!previousFile || !hunks || hunks.length === 0) {
    // New file: only keep added lines
    return hunks
      ?.flatMap(h => h.changes || [])
      .filter(c => c.type !== "removed")
      .map(c => c.content)
      .join("\n") || "";
  }

  let lines = previousFile.content.split("\n");

  // Apply hunks in order
  hunks.forEach((hunk, idx) => {
    const addedLines = hunk.changes
      .filter(c => c.type !== "removed")
      .map(c => c.content);

    const removeCount = hunk.oldLines || hunk.changes.filter(c => c.type === "removed").length;
    const insertIndex = Math.max(0, hunk.newStart - 1);

    lines.splice(insertIndex, removeCount, ...addedLines);
  });

  return lines.join("\n");
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
 */
const getRepositoryStateAtCommit = async (repoId, repoName, commitHash) => {
  // Try to get exact snapshot if available
  const exactSnapshot = await getSnapshot(repoId, commitHash);
  if (exactSnapshot) {
    return exactSnapshot.files;
  }

  // Otherwise reconstruct from checkpoint
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
  findNearestCheckpoint,
  getAllFilesAtCommit,
  createSnapshot,
  reconstructRepositoryState,
  reconstructFileContent,
  getSnapshot,
  listSnapshots,
  getRepositoryStateAtCommit,
  pruneOldSnapshots
};
