const mongoose = require("mongoose");

const diffSchema = new mongoose.Schema({
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
    required: true
  },

  changeType: {
    type: String,
    enum: ["added", "modified", "deleted"],
    required: true
  },

  hunks: [
    {
      oldStart: Number,
      oldLines: Number,
      newStart: Number,
      newLines: Number,

      changes: [
        {
          type: {
            type: String,
            enum: ["added", "removed", "context"]
          },
          content: String
        }
      ]
    }
  ]

}, { timestamps: true });



diffSchema.index({ commitId: 1, filePath: 1 }, { unique: true });

module.exports = mongoose.model("Diff", diffSchema);