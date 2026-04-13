const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db");

const { processRepo } = require("./src/services/git.service");

dotenv.config();

const app = express();
app.use(express.json());

// 🚀 API to process repo
app.post("/api/repo/fetch", async (req, res) => {
  try {
    const { repoUrl } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ error: "Repo URL required" });
    }

    await processRepo(repoUrl);

    res.json({ message: "Repo processed successfully 🚀" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// health route
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

const startServer = async () => {
  try {
    await connectDB();
    console.log("MongoDB Connected");

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

startServer();