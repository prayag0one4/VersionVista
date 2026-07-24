const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db");
const routes = require("./src/routes");
const errorHandler = require("./src/middleware/errorHandler");

dotenv.config();

const app = express();
app.use(express.json());

// ponytail: manual CORS headers, cors package is overkill for this
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use("/api", routes);

// health route
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

app.use(errorHandler);

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