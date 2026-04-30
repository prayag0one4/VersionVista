/**
 * Example: Using the Checkpoint System
 * Run this to test the snapshot functionality
 */

const codeSnapshotService = require("../modules/code_snapshot/code_snapshot.service");
const snapshotIntegration = require("../services/snapshot-integration.service");
const Repo = require("../modules/repo/repo.model");
const Commit = require("../modules/commit/commit.model");

/**
 * Example 1: Create checkpoint for analysis
 */
async function example1_createCheckpoint(repoId) {
  console.log("\n=== EXAMPLE 1: Create Checkpoint ===");
  
  try {
    const result = await snapshotIntegration.createCheckpointForAnalysis(
      repoId,
      100  // Analyze last 100 commits
    );

    console.log("✓ Checkpoint created");
    console.log(`  Commit: ${result.snapshot.commitHash.substring(0, 8)}`);
    console.log(`  Files: ${result.snapshot.fileCount}`);
    console.log(`  Size: ${(result.snapshot.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Analysis range: ${result.analysisRange.numberOfCommits} commits`);

    return result.snapshot;
  } catch (err) {
    console.error("✗ Error:", err.message);
  }
}

/**
 * Example 2: Get repository state at commit
 */
async function example2_getRepositoryState(repoId, commitHash) {
  console.log("\n=== EXAMPLE 2: Get Repository State ===");
  
  try {
    const repo = await Repo.findById(repoId);
    
    const startTime = Date.now();
    const files = await codeSnapshotService.getRepositoryStateAtCommit(
      repoId,
      repo.name,
      commitHash
    );
    const duration = Date.now() - startTime;

    console.log("✓ Repository state retrieved");
    console.log(`  Commit: ${commitHash.substring(0, 8)}`);
    console.log(`  Files: ${files.length}`);
    console.log(`  Time: ${duration}ms`);
    console.log("  Sample files:");
    files.slice(0, 3).forEach(f => {
      console.log(`    - ${f.filePath} (${f.content.length} bytes)`);
    });

    return files;
  } catch (err) {
    console.error("✗ Error:", err.message);
  }
}

/**
 * Example 3: Compare two commits
 */
async function example3_compareTwoCommits(repoId, repoName, commit1Hash, commit2Hash) {
  console.log("\n=== EXAMPLE 3: Compare Two Commits ===");
  
  try {
    const [state1, state2] = await Promise.all([
      codeSnapshotService.getRepositoryStateAtCommit(repoId, repoName, commit1Hash),
      codeSnapshotService.getRepositoryStateAtCommit(repoId, repoName, commit2Hash)
    ]);

    const map1 = new Map(state1.map(f => [f.filePath, f.content]));
    const map2 = new Map(state2.map(f => [f.filePath, f.content]));

    const added = [];
    const modified = [];
    const deleted = [];

    map2.forEach((content, filePath) => {
      if (!map1.has(filePath)) {
        added.push(filePath);
      } else if (map1.get(filePath) !== content) {
        modified.push(filePath);
      }
    });

    map1.forEach((_, filePath) => {
      if (!map2.has(filePath)) {
        deleted.push(filePath);
      }
    });

    console.log("✓ Comparison complete");
    console.log(`  Added: ${added.length} files`);
    console.log(`  Modified: ${modified.length} files`);
    console.log(`  Deleted: ${deleted.length} files`);
    console.log("  Added files:");
    added.slice(0, 3).forEach(f => console.log(`    - ${f}`));

  } catch (err) {
    console.error("✗ Error:", err.message);
  }
}

/**
 * Example 4: List all snapshots
 */
async function example4_listSnapshots(repoId) {
  console.log("\n=== EXAMPLE 4: List Snapshots ===");
  
  try {
    const result = await codeSnapshotService.listSnapshots(repoId, {
      page: 1,
      limit: 10
    });

    console.log(`✓ Found ${result.pagination.total} snapshots`);
    console.log("  Recent snapshots:");
    result.items.forEach((snapshot, idx) => {
      console.log(`    ${idx + 1}. ${snapshot.commitHash.substring(0, 8)} - ${snapshot.fileCount} files - ${new Date(snapshot.createdAt).toLocaleDateString()}`);
    });

  } catch (err) {
    console.error("✗ Error:", err.message);
  }
}

/**
 * Example 5: Create incremental checkpoints
 */
async function example5_incrementalCheckpoints(repoId) {
  console.log("\n=== EXAMPLE 5: Create Incremental Checkpoints ===");
  
  try {
    console.log("Creating checkpoints every 50 commits...");
    
    const result = await snapshotIntegration.createIncrementalCheckpoints(
      repoId,
      50  // Every 50 commits
    );

    console.log(`✓ Created ${result.created} checkpoints`);
    console.log("  Checkpoints at:");
    result.snapshots.forEach(s => {
      console.log(`    - Index ${s.index}: ${s.commitHash.substring(0, 8)}`);
    });

  } catch (err) {
    console.error("✗ Error:", err.message);
  }
}

/**
 * Example 6: Prune old snapshots
 */
async function example6_pruneSnapshots(repoId) {
  console.log("\n=== EXAMPLE 6: Prune Old Snapshots ===");
  
  try {
    console.log("Keeping only 5 most recent snapshots...");
    
    const deletedCount = await codeSnapshotService.pruneOldSnapshots(
      repoId,
      5  // Keep 5
    );

    console.log(`✓ Deleted ${deletedCount} old snapshots`);

  } catch (err) {
    console.error("✗ Error:", err.message);
  }
}

/**
 * Example 7: Get storage statistics
 */
async function example7_getStatistics(repoId) {
  console.log("\n=== EXAMPLE 7: Storage Statistics ===");
  
  try {
    const stats = await snapshotIntegration.getSnapshotStats(repoId);

    if (!stats) {
      console.log("✗ No snapshots found for this repository");
      return;
    }

    console.log("✓ Storage statistics:");
    console.log(`  Total snapshots: ${stats.totalSnapshots}`);
    console.log(`  Total storage: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Total files: ${stats.totalFiles}`);
    console.log(`  Average size: ${(stats.averageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Oldest: ${new Date(stats.oldestSnapshot).toLocaleDateString()}`);
    console.log(`  Newest: ${new Date(stats.newestSnapshot).toLocaleDateString()}`);

  } catch (err) {
    console.error("✗ Error:", err.message);
  }
}

/**
 * Full workflow example
 */
async function fullWorkflow() {
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║  CHECKPOINT SYSTEM - FULL WORKFLOW     ║");
  console.log("╚════════════════════════════════════════╝");

  try {
    // Get first repository
    const repo = await Repo.findOne();
    if (!repo) {
      console.error("No repositories found. Please clone a repo first.");
      return;
    }

    console.log(`\nWorking with repository: ${repo.name}`);

    // Get some commits
    const commits = await Commit.find({ repoId: repo._id })
      .sort({ timestamp: -1 })
      .limit(3);

    if (commits.length === 0) {
      console.error("No commits found for this repository.");
      return;
    }

    // Run examples
    await example1_createCheckpoint(repo._id);
    
    if (commits.length >= 1) {
      await example2_getRepositoryState(repo._id, commits[0].commitHash);
    }
    
    if (commits.length >= 2) {
      await example3_compareTwoCommits(
        repo._id,
        repo.name,
        commits[1].commitHash,
        commits[0].commitHash
      );
    }
    
    await example4_listSnapshots(repo._id);
    await example7_getStatistics(repo._id);

    console.log("\n╔════════════════════════════════════════╗");
    console.log("║  ALL EXAMPLES COMPLETED                ║");
    console.log("╚════════════════════════════════════════╝\n");

  } catch (err) {
    console.error("Workflow error:", err);
  }
}

// Export for use in other scripts
module.exports = {
  example1_createCheckpoint,
  example2_getRepositoryState,
  example3_compareTwoCommits,
  example4_listSnapshots,
  example5_incrementalCheckpoints,
  example6_pruneSnapshots,
  example7_getStatistics,
  fullWorkflow
};

// Run if executed directly
if (require.main === module) {
  fullWorkflow().catch(console.error);
}
