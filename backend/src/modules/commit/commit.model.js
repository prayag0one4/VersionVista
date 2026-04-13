const mongoose = require("mongoose");

const commitSchema = new mongoose.Schema({
  repoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Repo",
    required: true
  },
  commitHash: {
    type: String,
    required: true
  },
  author: {
    name: String,
    email: String
  },
  message: String,
  timestamp: Date,
  parentHash: String,

  filesChanged: Number,
  insertions: Number,
  deletions: Number,

  processed: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model("Commit", commitSchema);