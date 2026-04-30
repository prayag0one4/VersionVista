/**
 * Snapshot Integration Service
 * Automatically manages checkpoints during commit processing
 */

const codeSnapshotService = require("../modules/code_snapshot/code_snapshot.service");
const Commit = require("../modules/commit/commit.model");
const Repo = require("../modules/repo/repo.model");

/**
 * Create checkpoint for analysis
 * Called when starting to analyze last N commits
 */
const createCheckpointForAnalysis = async (repoId, numberOfCommits) => {
  try {
    const repo = await Repo.findById(repoId);
    if (!repo) {
      throw new Error("Repository not found");
    }

    // Get commits in descending order (latest first)
    const commits = await Commit.find({ repoId })
      .sort({ timestamp: -1 })
      .limit(numberOfCommits)
      .sort({ timestamp: 1 }); // Re-sort ascending

    if (commits.length === 0) {
      throw new Error("No commits found for analysis");
    }

    // The first commit in analysis range is our checkpoint
    const checkpointCommit = commits[0];

    // Count commits before this one to get index
    const commitIndex = await Commit.countDocuments({
      repoId,
      timestamp: { $lt: checkpointCommit.timestamp }
    });

    console.log(`Creating checkpoint at commit ${checkpointCommit.commitHash} (index: ${commitIndex})`);
    console.log(`Analysis will cover ${commits.length} commits`);

    const snapshot = await codeSnapshotService.createSnapshot(
      repoId,
      repo.name,
      checkpointCommit.commitHash,
      commitIndex,
      {
        branch: repo.defaultBranch,
        author: checkpointCommit.author.name,
        message: `Checkpoint for analysis of ${commits.length} commits`
      }
    );

    return {
      success: true,
      snapshot,
      analysisRange: {
        from: checkpointCommit.commitHash,
        to: commits[commits.length - 1].commitHash,
        numberOfCommits: commits.length,
        startIndex: commitIndex,
        endIndex: commitIndex + commits.length
      }
    };
  } catch (err) {
    console.error("Error creating checkpoint for analysis:", err);
    throw err;
  }
};

/**
 * Create incremental checkpoints during processing
 * Creates a new checkpoint every N commits
 */
const createIncrementalCheckpoints = async (repoId, interval = 50) => {
  try {
    const repo = await Repo.findById(repoId);
    const commits = await Commit.find({ repoId })
      .sort({ timestamp: 1 });

    const createdSnapshots = [];

    for (let i = 0; i < commits.length; i += interval) {
      const commit = commits[i];
      const commitIndex = i;

      console.log(`Creating checkpoint at commit ${i} / ${commits.length}`);

      const snapshot = await codeSnapshotService.createSnapshot(
        repoId,
        repo.name,
        commit.commitHash,
        commitIndex,
        {
          branch: repo.defaultBranch,
          author: commit.author.name,
          message: commit.message
        }
      );

      createdSnapshots.push({
        commitHash: commit.commitHash,
        index: commitIndex,
        timestamp: commit.timestamp
      });
    }

    // Prune old snapshots
    await codeSnapshotService.pruneOldSnapshots(repoId, 10);

    return {
      success: true,
      created: createdSnapshots.length,
      snapshots: createdSnapshots
    };
  } catch (err) {
    console.error("Error creating incremental checkpoints:", err);
    throw err;
  }
};

/**
 * Analyze commits with checkpoint optimization
 * Returns commits, repository states, and diffs
 */
const analyzeCommitsWithCheckpoints = async (repoId, repoName, numberOfCommits) => {
  try {
    // 1. Create checkpoint at analysis starting point
    const checkpointResult = await createCheckpointForAnalysis(repoId, numberOfCommits);

    // 2. Get commits for analysis
    const commits = await Commit.find({ repoId })
      .sort({ timestamp: -1 })
      .limit(numberOfCommits)
      .sort({ timestamp: 1 });

    // 3. For each commit, get optimized repository state
    const analysisData = [];

    for (const commit of commits) {
      const repoState = await codeSnapshotService.getRepositoryStateAtCommit(
        repoId,
        repoName,
        commit.commitHash
      );

      analysisData.push({
        commit: {
          hash: commit.commitHash,
          author: commit.author.name,
          message: commit.message,
          timestamp: commit.timestamp
        },
        filesCount: repoState.length,
        files: repoState
      });
    }

    return {
      checkpoint: checkpointResult,
      analysisData,
      totalCommits: commits.length,
      totalFiles: analysisData.reduce((sum, d) => sum + d.filesCount, 0)
    };
  } catch (err) {
    console.error("Error analyzing commits with checkpoints:", err);
    throw err;
  }
};

/**
 * Get statistics about snapshots for a repository
 */
const getSnapshotStats = async (repoId) => {
  try {
    const stats = await require("../modules/code_snapshot/code_snapshot.model").aggregate([
      { $match: { repoId: require("mongoose").Types.ObjectId(repoId) } },
      {
        $group: {
          _id: "$repoId",
          totalSnapshots: { $sum: 1 },
          totalSize: { $sum: "$totalSize" },
          totalFiles: { $sum: "$fileCount" },
          averageSize: { $avg: "$totalSize" },
          oldestSnapshot: { $min: "$createdAt" },
          newestSnapshot: { $max: "$createdAt" }
        }
      }
    ]);

    return stats.length > 0 ? stats[0] : null;
  } catch (err) {
    console.error("Error getting snapshot stats:", err);
    throw err;
  }
};

module.exports = {
  createCheckpointForAnalysis,
  createIncrementalCheckpoints,
  analyzeCommitsWithCheckpoints,
  getSnapshotStats
};
