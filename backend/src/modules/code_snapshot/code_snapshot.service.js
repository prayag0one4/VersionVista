const CodeSnapshot = require("./code_snapshot.model");
const githubService = require("../../services/github.service");

const createSnapshot = async (repoId, repoUrl, commitHash, commitIndex, metadata = {}) => {
  const existing = await CodeSnapshot.findOne({
    repoId,
    commitHash,
    isActive: true,
  });

  if (existing) {
    return existing;
  }

  await CodeSnapshot.updateMany(
    { repoId, isActive: true },
    { isActive: false }
  );

  const filePaths = await githubService.getAllFilePathsAtCommit(repoUrl, commitHash);

  const snapshot = await CodeSnapshot.create({
    repoId,
    commitHash,
    commitIndex,
    filePaths,
    fileCount: filePaths.length,
    isActive: true,
    metadata,
  });

  return snapshot;
};

const getAllFilePathsAtCommit = async (repoUrl, commitHash) => {
  return githubService.getAllFilePathsAtCommit(repoUrl, commitHash);
};

const getFileContent = async (repoUrl, commitHash, filePath) => {
  return githubService.getFileContent(repoUrl, commitHash, filePath);
};

const getFileDiff = async (repoUrl, fromCommitHash, toCommitHash, filePath) => {
  return githubService.getFileDiff(repoUrl, fromCommitHash, toCommitHash, filePath);
};

const reconstructRepositoryState = async (repoUrl, commitHash) => {
  const filePaths = await githubService.getAllFilePathsAtCommit(repoUrl, commitHash);

  const files = await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        const content = await githubService.getFileContent(repoUrl, commitHash, filePath);
        return { filePath, content };
      } catch {
        return null;
      }
    })
  ).then((results) => results.filter(Boolean));

  return files;
};

const getSnapshot = (repoId, commitHash) => {
  return CodeSnapshot.findOne({ repoId, commitHash });
};

const listSnapshots = async (repoId, options = {}) => {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(options.limit) || 10));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    CodeSnapshot.find({ repoId })
      .sort({ commitIndex: -1 })
      .skip(skip)
      .limit(limit),
    CodeSnapshot.countDocuments({ repoId }),
  ]);

  return {
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

const getRepositoryStateAtCommit = async (repoUrl, commitHash) => {
  return reconstructRepositoryState(repoUrl, commitHash);
};

const pruneOldSnapshots = async (repoId, keepCount = 5) => {
  const snapshots = await CodeSnapshot.find({ repoId })
    .sort({ commitIndex: -1 })
    .skip(keepCount);

  if (snapshots.length > 0) {
    const idsToDelete = snapshots.map((s) => s._id);
    await CodeSnapshot.deleteMany({ _id: { $in: idsToDelete } });
    return idsToDelete.length;
  }

  return 0;
};

module.exports = {
  getAllFilePathsAtCommit,
  createSnapshot,
  reconstructRepositoryState,
  getFileContent,
  getFileDiff,
  getSnapshot,
  listSnapshots,
  getRepositoryStateAtCommit,
  pruneOldSnapshots,
};
