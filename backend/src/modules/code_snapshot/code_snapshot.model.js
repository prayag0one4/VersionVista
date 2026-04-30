const mongoose = require("mongoose");

const codeSnapshotSchema = new mongoose.Schema({
  repoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Repo",
    required: true,
    index: true
  },

  commitHash: {
    type: String,
    required: true
  },

  commitIndex: {
    type: Number,
    required: true
  },

  // Store only file paths, not content (to avoid 16MB BSON limit)
  filePaths: [String],

  totalSize: Number,
  fileCount: Number,

  storageType: {
    type: String,
    enum: ["mongodb", "s3"],
    default: "mongodb"
  },

  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  metadata: {
    branch: String,
    author: String,
    message: String
  }

}, { timestamps: true });

// Compound index for quick lookup of active snapshots
codeSnapshotSchema.index({ repoId: 1, commitHash: 1 }, { unique: true });
codeSnapshotSchema.index({ repoId: 1, commitIndex: 1 });
codeSnapshotSchema.index({ repoId: 1, isActive: 1, commitIndex: -1 });

// TTL index: auto-delete after 30 days
codeSnapshotSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model("CodeSnapshot", codeSnapshotSchema);
