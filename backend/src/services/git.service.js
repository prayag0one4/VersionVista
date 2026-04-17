const simpleGit = require("simple-git");
const path = require("path");
const fs = require("fs");

const repoBasePath = path.join(__dirname, "../../repos");

const getRepoPath = (name) => path.join(repoBasePath, name);

const git = simpleGit();

const getRepoNameFromUrl = (repoUrl) => repoUrl.split("/").pop().replace(".git", "");

const cloneRepo = async (repoUrl) => {
  const repoName = getRepoNameFromUrl(repoUrl);
  const repoPath = getRepoPath(repoName);

  if (!fs.existsSync(repoBasePath)) {
    fs.mkdirSync(repoBasePath, { recursive: true });
  }

  if (fs.existsSync(repoPath)) {
    return { repoName, repoPath };
  }

  await git.clone(repoUrl, repoPath);

  return { repoName, repoPath };
};

const getCommitLog = async (repoPath, maxCount = 20) => {
  const gitRepo = simpleGit(repoPath);
  const commits = await gitRepo.log({ maxCount });

  return commits.all;
};

const getDiffSummary = async (repoPath, hash) => {
  const gitRepo = simpleGit(repoPath);

  try {
    return await gitRepo.diffSummary([`${hash}^`, hash]);
  } catch (_) {
    return {
      changed: 0,
      insertions: 0,
      deletions: 0,
      files: []
    };
  }
};

const parseHunkHeader = (line) => {
  const match = line.match(/^@@\s*-(\d+)(?:,(\d+))?\s*\+(\d+)(?:,(\d+))?\s*@@/);

  if (!match) {
    return {
      oldStart: 0,
      oldLines: 0,
      newStart: 0,
      newLines: 0
    };
  }

  return {
    oldStart: Number(match[1]),
    oldLines: Number(match[2] || 1),
    newStart: Number(match[3]),
    newLines: Number(match[4] || 1)
  };
};

const getRawDiff = async (repoPath, hash) => {
  const gitRepo = simpleGit(repoPath);
  const rawDiff = await gitRepo.show([hash, "--no-color", "--format="]);
  const lines = rawDiff.split("\n");

  const results = [];
  let currentFile = null;
  let currentHunks = [];
  let currentHunk = null;
  let currentChangeType = "modified";

  const flushHunk = () => {
    if (currentHunk) {
      currentHunks.push(currentHunk);
      currentHunk = null;
    }
  };

  const flushFile = () => {
    flushHunk();

    if (currentFile) {
      results.push({
        filePath: currentFile,
        changeType: currentChangeType,
        hunks: currentHunks
      });
    }

    currentFile = null;
    currentHunks = [];
    currentChangeType = "modified";
  };

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      flushFile();
      const parts = line.split(" ");
      currentFile = (parts[2] || "").replace("a/", "");
      continue;
    }

    if (!currentFile) {
      continue;
    }

    if (line.startsWith("new file mode")) {
      currentChangeType = "added";
      continue;
    }

    if (line.startsWith("deleted file mode")) {
      currentChangeType = "deleted";
      continue;
    }

    if (line.startsWith("@@")) {
      flushHunk();
      currentHunk = {
        ...parseHunkHeader(line),
        changes: []
      };
      continue;
    }

    if (!currentHunk) {
      continue;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      currentHunk.changes.push({ type: "added", content: line.slice(1) });
      continue;
    }

    if (line.startsWith("-") && !line.startsWith("---")) {
      currentHunk.changes.push({ type: "removed", content: line.slice(1) });
      continue;
    }

    if (line.startsWith(" ")) {
      currentHunk.changes.push({ type: "context", content: line.slice(1) });
    }
  }

  flushFile();

  return results;
};

module.exports = {
  cloneRepo,
  getCommitLog,
  getDiffSummary,
  getRawDiff
};