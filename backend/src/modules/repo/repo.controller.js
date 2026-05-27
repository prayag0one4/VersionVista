const repoService = require("./repo.service");
const Commit = require("../commit/commit.model");
const commitService = require("../commit/commit.service");
const diffService = require("../diff/diff.service");
const fileChangeService = require("../file_change/file_change.service");
const codeSnapshotService = require("../code_snapshot/code_snapshot.service");
const {
  cloneRepo,
  getCommitLog,
  getDiffSummary,
  getRawDiff
} = require("../../services/git.service");

const getOwnerFromRepoUrl = (repoUrl) => {
  try {
    const parsed = new URL(repoUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[0] || "unknown";
  } catch (_) {
    return "unknown";
  }
};

const getChangeType = (file) => {
  if (file.binary) {
    return "modified";
  }

  if ((file.insertions || 0) > 0 && (file.deletions || 0) === 0) {
    return "added";
  }

  if ((file.deletions || 0) > 0 && (file.insertions || 0) === 0) {
    return "deleted";
  }

  return "modified";
};

const normalizeCommitLimit = (value) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return 20;
  }

  return Math.min(1000, Math.max(1, parsed));
};

const fetchAndProcess = async (req, res, next) => {
  try {
    const { repoUrl, commitLimit } = req.body;

    if (!repoUrl) {
      const err = new Error("repoUrl is required");
      err.statusCode = 400;
      throw err;
    }

    const { repoName, repoPath } = await cloneRepo(repoUrl);
    const owner = getOwnerFromRepoUrl(repoUrl);
    const repo = await repoService.findOrCreate(repoUrl, repoName, owner);

    const normalizedLimit = normalizeCommitLimit(commitLimit);
    const commits = await getCommitLog(repoPath, normalizedLimit);

    let createdCommits = 0;
    let createdFileChanges = 0;
    let createdDiffs = 0;

    for (const commit of commits) {
      const existing = await commitService.findByHashAndRepo(commit.hash, repo._id);

      if (existing) {
        continue;
      }

      const summary = await getDiffSummary(repoPath, commit.hash);

      const savedCommit = await commitService.createCommit({
        repoId: repo._id,
        commitHash: commit.hash,
        message: commit.message,
        author: {
          name: commit.author_name,
          email: commit.author_email
        },
        timestamp: new Date(commit.date),
        parentHash: commit.refs,
        filesChanged: summary.changed || 0,
        insertions: summary.insertions || 0,
        deletions: summary.deletions || 0,
        processed: true
      });

      createdCommits += 1;

      const fileChangesPayload = (summary.files || []).map((file) => ({
        repoId: repo._id,
        commitId: savedCommit._id,
        filePath: file.file,
        changeType: getChangeType(file),
        additions: file.insertions || 0,
        deletions: file.deletions || 0
      }));

      if (fileChangesPayload.length) {
        const createdFileChangeDocs = await fileChangeService.bulkCreateFileChanges(fileChangesPayload);
        createdFileChanges += createdFileChangeDocs.length;
      }

      const parsedDiffs = await getRawDiff(repoPath, commit.hash);
      const diffPayload = parsedDiffs
        .filter((diff) => diff.filePath)
        .map((diff) => ({
          repoId: repo._id,
          commitId: savedCommit._id,
          filePath: diff.filePath,
          changeType: diff.changeType,
          hunks: diff.hunks
        }));

      if (diffPayload.length) {
        const createdDiffDocs = await diffService.bulkCreateDiffs(diffPayload);
        createdDiffs += createdDiffDocs.length;
      }
    }

    let snapshot = null;
    if (commits.length > 0) {
      const snapshotCommit = commits[commits.length - 1];
      const snapshotCommitDate = new Date(snapshotCommit.date);

      const commitIndex = await Commit.countDocuments({
        repoId: repo._id,
        timestamp: { $lt: snapshotCommitDate }
      });

      try {
        snapshot = await codeSnapshotService.createSnapshot(
          repo._id,
          repo.name,
          snapshotCommit.hash,
          commitIndex,
          {
            branch: repo.defaultBranch,
            author: snapshotCommit.author_name,
            message: snapshotCommit.message
          }
        );
        console.log(`✓ Snapshot created for commit ${snapshotCommit.hash}`);
      } catch (snapshotErr) {
        console.error(`✗ Snapshot creation failed for commit ${snapshotCommit.hash}:`, snapshotErr.message);
      }
    }

    res.json({
      success: true,
      message: "Repo processed successfully",
      data: {
        repoId: repo._id,
        repoName: repo.name,
        commitLimitRequested: normalizedLimit,
        commitsFetchedFromRepo: commits.length,
        commitsProcessed: commits.length,
        commitsCreated: createdCommits,
        fileChangesCreated: createdFileChanges,
        diffsCreated: createdDiffs,
        snapshotCreated: Boolean(snapshot),
        snapshotCommitHash: snapshot?.commitHash || null
      }
    });
  } catch (err) {
    next(err);
  }
};

const listRepos = async (req, res, next) => {
  try {
    const repos = await repoService.getAllRepos();

    res.json({
      success: true,
      data: repos
    });
  } catch (err) {
    next(err);
  }
};

const getRepo = async (req, res, next) => {
  try {
    const repo = await repoService.getRepoById(req.params.id);

    if (!repo) {
      const err = new Error("Repo not found");
      err.statusCode = 404;
      throw err;
    }

    res.json({
      success: true,
      data: repo
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  fetchAndProcess,
  listRepos,
  getRepo
};
