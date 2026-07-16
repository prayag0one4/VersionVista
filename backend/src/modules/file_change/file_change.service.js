const FileChange = require("./file_change.model");

const bulkCreateFileChanges = async (dataArray) => {
  if (!dataArray.length) {
    return [];
  }

  return FileChange.insertMany(dataArray, { ordered: false });
};

const getFileChangesByCommitId = (commitId) =>
  FileChange.find({ commitId }).sort({ createdAt: -1 });

const getFileChangesByRepoId = (repoId) =>
  FileChange.find({ repoId }).sort({ createdAt: -1 });

module.exports = {
  bulkCreateFileChanges,
  getFileChangesByCommitId,
  getFileChangesByRepoId
};
