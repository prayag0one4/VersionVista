const Diff = require("./diff.model");

const bulkCreateDiffs = async (dataArray) => {
  if (!dataArray.length) {
    return [];
  }

  return Diff.insertMany(dataArray, { ordered: false });
};

const getDiffsByCommitId = (commitId) =>
  Diff.find({ commitId }).sort({ createdAt: -1 });

const getDiffById = (id) => Diff.findById(id);

module.exports = {
  bulkCreateDiffs,
  getDiffsByCommitId,
  getDiffById
};
