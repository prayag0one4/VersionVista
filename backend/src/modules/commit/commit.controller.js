const commitService = require("./commit.service");

const listCommits = async (req, res, next) => {
  try {
    const { repoId, page = 1, limit = 20 } = req.query;

    if (!repoId) {
      const err = new Error("repoId query param is required");
      err.statusCode = 400;
      throw err;
    }

    const result = await commitService.getCommitsByRepoId(repoId, { page, limit });

    res.json({
      success: true,
      data: result.items,
      pagination: result.pagination
    });
  } catch (err) {
    next(err);
  }
};

const getCommit = async (req, res, next) => {
  try {
    const commit = await commitService.getCommitById(req.params.id);

    if (!commit) {
      const err = new Error("Commit not found");
      err.statusCode = 404;
      throw err;
    }

    res.json({
      success: true,
      data: commit
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listCommits,
  getCommit
};
