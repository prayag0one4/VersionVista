const fileChangeService = require("./file_change.service");

const listFileChanges = async (req, res, next) => {
  try {
    const { commitId, repoId } = req.query;

    if (!commitId && !repoId) {
      const err = new Error("Either commitId or repoId query param is required");
      err.statusCode = 400;
      throw err;
    }

    const data = commitId
      ? await fileChangeService.getFileChangesByCommitId(commitId)
      : await fileChangeService.getFileChangesByRepoId(repoId);

    res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listFileChanges
};
