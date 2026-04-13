const mongoose = require("mongoose");

const repoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  owner: {
    type: String,
    required: true,
    trim: true
  },
  githubUrl: {
    type: String,
    required: true,
    unique: true    
  },
  defaultBranch: {
    type: String,
    default: "main"
  },
  totalCommits: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model("Repo", repoSchema);