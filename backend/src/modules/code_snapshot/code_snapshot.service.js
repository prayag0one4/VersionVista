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

    // Get exact file list from git at target commit (fast - single git command)
    const allFiles = await gitRepo.raw(["ls-tree", "-r", "--name-only", targetCommitHash]);
    const filePaths = allFiles.split("\n").filter(f => f.trim());

    // Fetch content from git for all files in parallel
    const files = await Promise.all(
      filePaths.map(async (filePath) => {
        try {
          const content = await gitRepo.show([`${targetCommitHash}:${filePath}`]);
          return { filePath, content, encoding: "utf-8" };
        } catch (err) {
          console.warn(`[snapshot] Failed to fetch ${filePath} at ${targetCommitHash}`);
          return null;
        }
      })
    ).then(results => results.filter(Boolean));

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

/**
 * Get content of a single file at a specific commit
 * Fetches on-demand from git (no stored content)
 */
const getFileContent = async (repoName, commitHash, filePath) => {
  try {
    const repoPath = getRepoPath(repoName);
    const gitRepo = simpleGit(repoPath);
    console.log(`[snapshot] Fetching content for ${filePath} at ${commitHash}`);
    const content = await gitRepo.show([`${commitHash}:${filePath}`]);
    return content;
  } catch (err) {
    console.error(`[snapshot] Failed to get content for ${filePath} at ${commitHash}:`, err.message);
    throw err;
  }
};

/**
 * Get line-by-line diff for a specific file between two commits (full file with inline highlights)
 * Uses proper LCS-based diff algorithm to avoid showing shifted lines as changes
 * Returns ALL lines from the new file with type markers: added, removed, context, modified
 */
const getFileDiff = async (repoName, fromCommitHash, toCommitHash, filePath) => {
  try {
    const repoPath = getRepoPath(repoName);
    const gitRepo = simpleGit(repoPath);
    console.log(`[snapshot] Getting full diff for ${filePath} from ${fromCommitHash} to ${toCommitHash}`);
    
    // Get full file content from both commits
    const [oldContent, newContent] = await Promise.all([
      gitRepo.show([`${fromCommitHash}:${filePath}`]).catch(() => ''),
      gitRepo.show([`${toCommitHash}:${filePath}`]).catch(() => '')
    ]);
    
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    // Proper LCS diff algorithm (Myers O(ND))
    // Returns array of { type, oldIndex, newIndex } where indices are 0-based
    const computeLCS = (oldArr, newArr) => {
      const n = oldArr.length;
      const m = newArr.length;
      
      // Build DP table for LCS
      const dp = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
      
      for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
          if (oldArr[i] === newArr[j]) {
            dp[i][j] = 1 + dp[i + 1][j + 1];
          } else {
            dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
          }
        }
      }
      
      // Reconstruct the alignment
      const result = [];
      let i = 0, j = 0;
      
      while (i < n || j < m) {
        if (i < n && j < m && oldArr[i] === newArr[j]) {
          // Match - common line
          result.push({ type: 'context', oldIndex: i, newIndex: j });
          i++;
          j++;
        } else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) {
          // Addition in new file
          result.push({ type: 'added', oldIndex: null, newIndex: j });
          j++;
        } else if (i < n) {
          // Deletion from old file
          result.push({ type: 'removed', oldIndex: i, newIndex: null });
          i++;
        } else {
          // Only additions left
          result.push({ type: 'added', oldIndex: null, newIndex: j });
          j++;
        }
      }
      
      return result;
    };
    
    const alignment = computeLCS(oldLines, newLines);
    
    // Convert to output format with proper line numbers
    let oldLineNum = 0;
    let newLineNum = 0;
    
    const result = alignment.map(item => {
      if (item.type === 'context') {
        oldLineNum++;
        newLineNum++;
        return {
          type: 'context',
          content: newLines[item.newIndex],
          oldLineNum,
          newLineNum
        };
      } else if (item.type === 'added') {
        newLineNum++;
        return {
          type: 'added',
          content: newLines[item.newIndex],
          oldLineNum: null,
          newLineNum
        };
      } else { // removed
        oldLineNum++;
        return {
          type: 'removed',
          content: oldLines[item.oldIndex],
          oldLineNum,
          newLineNum: null
        };
      }
    });
    
    return result.length > 0 ? result : newLines.map((content, idx) => ({
      type: 'context',
      content,
      oldLineNum: idx + 1,
      newLineNum: idx + 1
    }));
  } catch (err) {
    console.error(`[snapshot] Failed to get diff for ${filePath}:`, err.message);
    try {
      const repoPath = getRepoPath(repoName);
      const gitRepo = simpleGit(repoPath);
      const newContent = await gitRepo.show([`${toCommitHash}:${filePath}`]);
      return newContent.split('\n').map((content, idx) => ({
        type: 'context',
        content,
        oldLineNum: idx + 1,
        newLineNum: idx + 1
      }));
    } catch {
      return [];
    }
  }
};

module.exports = {
  getAllFilePathsAtCommit,
  createSnapshot,
  reconstructRepositoryState,
  getFileContent,
  getFileDiff,
  getSnapshot,
  listSnapshots,
  getRepositoryStateAtCommit,
  pruneOldSnapshots
};
