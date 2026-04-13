const simpleGit = require("simple-git");
const path = require("path");
const fs = require("fs");

const Repo = require("../modules/repo/repo.model.js");
const Commit = require("../modules/commit/commit.model.js");
const FileChange = require("../modules/file_change/file_change.model.js");
const Diff = require("../modules/diff/diff.model.js");

const repoBasePath = path.join(__dirname, "../../repos");

const getRepoPath = (name) => path.join(repoBasePath, name);

const git = simpleGit();

// 🔹 Clone repo
const cloneRepo = async (repoUrl, repoName) => {
  const repoPath = getRepoPath(repoName);

  if (fs.existsSync(repoPath)) {
    console.log("Repo already exists");
    return repoPath;
  }

  await git.clone(repoUrl, repoPath);
  console.log("Repo cloned");

  return repoPath;
};

// 🔥 MAIN FUNCTION
const processRepo = async (repoUrl) => {
  try {
    const repoName = repoUrl.split("/").pop().replace(".git", "");
    const repoPath = await cloneRepo(repoUrl, repoName);

    const gitRepo = simpleGit(repoPath);

    // ✅ Prevent duplicate repo
    let repo = await Repo.findOne({ githubUrl: repoUrl });

    if (!repo) {
      repo = await Repo.create({
        name: repoName,
        owner: "unknown",
        githubUrl: repoUrl
      });
    }

    // ✅ Get commits
    const commits = await gitRepo.log({ maxCount: 20 });

    for (let commit of commits.all) {
      // ❗ Skip if already exists
      const existing = await Commit.findOne({
        commitHash: commit.hash,
        repoId: repo._id
      });
      if (existing) continue;

      let summary = {
        changed: 0,
        insertions: 0,
        deletions: 0,
        files: []
      };

      // ❗ Handle first commit safely
      try {
        summary = await gitRepo.diffSummary([
          `${commit.hash}^`,
          commit.hash
        ]);
      } catch (err) {
        console.log("First commit or diff error:", commit.hash);
      }

      // ✅ Save commit
      const savedCommit = await Commit.create({
        repoId: repo._id,
        commitHash: commit.hash,
        message: commit.message,
        author: {
          name: commit.author_name,
          email: commit.author_email
        },
        timestamp: new Date(commit.date),
        parentHash: commit.refs,
        filesChanged: summary.changed,
        insertions: summary.insertions,
        deletions: summary.deletions
      });

      // ✅ Save file changes
      for (let file of summary.files) {
        await FileChange.create({
          repoId: repo._id,
          commitId: savedCommit._id,
          filePath: file.file,
          changeType: "modified",
          additions: file.insertions,
          deletions: file.deletions
        });
      }

      // 🔥 Parse diff
      const rawDiff = await gitRepo.show(commit.hash);
      const lines = rawDiff.split("\n");

      let currentFile = null;
      let changes = [];

      const saveDiff = async () => {
        if (currentFile && changes.length) {
          await Diff.create({
            repoId: repo._id,
            commitId: savedCommit._id,
            filePath: currentFile,
            changeType: "modified",
            hunks: [{ changes }]
          });
        }
      };

      for (let line of lines) {
        if (line.startsWith("diff --git")) {
          await saveDiff(); // 🔥 save previous file

          const parts = line.split(" ");
          currentFile = parts[2]?.replace("a/", "");
          changes = [];
        }

        if (line.startsWith("+") && !line.startsWith("+++")) {
          changes.push({ type: "added", content: line.slice(1) });
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          changes.push({ type: "removed", content: line.slice(1) });
        }
      }

      // 🔥 IMPORTANT: save last file
      await saveDiff();
    }

    console.log("Repo processed successfully");

  } catch (err) {
    console.error(err);
  }
};

module.exports = { processRepo };