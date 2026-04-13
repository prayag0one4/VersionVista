const mongoose = require("mongoose");

const fileChangeSchema = new mongoose.Schema({
  commitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Commit",
    required: true,
    index: true    
  },

  repoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Repo",
    index: true    
  },

  filePath: {
    type: String,
    required: true,
    trim: true
  },

  changeType: {
    type: String,
    enum: ["added", "modified", "deleted"],
    required: true
  },

  additions: {
    type: Number,
    default: 0
  },

  deletions: {
    type: Number,
    default: 0
  }

}, { timestamps: true });


 
fileChangeSchema.index({ commitId: 1, filePath: 1 }, { unique: true });

module.exports = mongoose.model("FileChange", fileChangeSchema);