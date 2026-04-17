const diffService = require("./diff.service");

const listDiffs = async (req, res, next) => {
  try {
    const { commitId } = req.query;

    if (!commitId) {
      const err = new Error("commitId query param is required");
      err.statusCode = 400;
      throw err;
    }

    const diffs = await diffService.getDiffsByCommitId(commitId);

    res.json({
      success: true,
      data: diffs
    });
  } catch (err) {
    next(err);
  }
};

const getDiff = async (req, res, next) => {
  try {
    const diff = await diffService.getDiffById(req.params.id);

    if (!diff) {
      const err = new Error("Diff not found");
      err.statusCode = 404;
      throw err;
    }

    res.json({
      success: true,
      data: diff
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listDiffs,
  getDiff
};
