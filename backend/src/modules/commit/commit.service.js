const Commit = require("./commit.model");

const findByHashAndRepo = (commitHash, repoId) =>
  Commit.findOne({ commitHash, repoId });

const createCommit = (data) => Commit.create(data);

const bulkCreateCommits = async (dataArray) => {
  if (!dataArray.length) {
    return [];
  }

  return Commit.insertMany(dataArray, { ordered: false });
};

const getCommitsByRepoId = async (repoId, options = {}) => {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.max(1, Math.min(1000, Number(options.limit) || 20));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Commit.find({ repoId }).sort({ timestamp: -1 }).skip(skip).limit(limit),
    Commit.countDocuments({ repoId })
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

const getCommitById = (id) => Commit.findById(id).populate("repoId");

module.exports = {
  findByHashAndRepo,
  createCommit,
  bulkCreateCommits,
  getCommitsByRepoId,
  getCommitById
};
