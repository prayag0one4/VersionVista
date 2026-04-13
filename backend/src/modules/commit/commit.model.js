const mongoose = require("mongoose");

const commitSchema = new mongoose.Schema({
  repoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Repo",
    required: true,
    index: true   
  },

  commitHash: {
    type: String,
    required: true,
    unique: true    
  },

  author: {
    name: { type: String, trim: true },
    email: { type: String, trim: true }
  },

  message: {
    type: String,
    trim: true
  },

  timestamp: {
    type: Date,
    required: true
  },

  parentHash: String,

  filesChanged: {
    type: Number,
    default: 0
  },

  insertions: {
    type: Number,
    default: 0
  },

  deletions: {
    type: Number,
    default: 0
  },

  processed: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

module.exports = mongoose.model("Commit", commitSchema);