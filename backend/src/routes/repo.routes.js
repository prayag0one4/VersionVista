const express = require("express");
const router = express.Router();

const { processRepo } = require("../services/git.service");

// POST /api/repo/fetch
router.post("/fetch", async (req, res) => {
  try {
    const { repoUrl } = req.body;

    await processRepo(repoUrl);

    res.json({ message: "Repo processed successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

module.exports = router;