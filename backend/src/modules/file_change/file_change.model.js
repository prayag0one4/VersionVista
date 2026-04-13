const mongoose = require("mongoose");

const fileChangeSchema = new mongoose.Schema({
  commitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Commit",
    required: true
  },
  repoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Repo"
  },

  filePath: {
    type: String,
    required: true
  },
  changeType: {
    type: String,
    enum: ["added", "modified", "deleted"]
  },

  additions: Number,
  deletions: Number
}, { timestamps: true });

module.exports = mongoose.model("FileChange", fileChangeSchema);