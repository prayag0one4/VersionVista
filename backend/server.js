const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db.js");

const Repo = require("./src/modules/repo/repo.model.js");
const Commit = require("./src/modules/commit/commit.model.js");
const FileChange = require("./src/modules/file_change/file_change.model.js");

dotenv.config();

const app = express();
app.use(express.json());

const testDB = async () => {
  try {
    const repo = await Repo.create({
      name: "Medicare",
      owner: "Ayush",
      githubUrl: "https://github.com/Ayush-1812/MediCare"
    });

    console.log("Repo created:", repo._id);

    const commit = await Commit.create({
      repoId: repo._id,
      commitHash: "abc123",
      message: "Initial commit",
      author: { name: "Ayush", email: "test@gmail.com" },
      filesChanged: 1,
      insertions: 10,
      deletions: 0
    });

    console.log("Commit created:", commit._id);

    const fileChange = await FileChange.create({
      repoId: repo._id,
      commitId: commit._id,
      filePath: "src/index.js",
      changeType: "added",
      additions: 10,
      deletions: 0
    });

    console.log("FileChange created:", fileChange._id);

  } catch (err) {
    console.error(err);
  }
};

// 🚀 Proper startup flow
const startServer = async () => {
  try {
    await connectDB(); // ✅ connect once

    console.log("MongoDB Connected");

    await testDB(); // ✅ run after connection

    app.listen(5000, () => {
      console.log("Server running on port 5000");
    });

  } catch (err) {
    console.error(err);
  }
};

startServer();