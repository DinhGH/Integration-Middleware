const express = require("express");
const cors = require("cors");
const { PORT } = require("./config/env");
const { initializePools } = require("./db/pools");
const dbRoutes = require("./routes/dbRoutes");
const proxyRoutes = require("./routes/proxyRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

app.use("/api", dbRoutes);
app.use("/api", proxyRoutes);
app.use("/api", analyticsRoutes);

initializePools()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database pools:", error);
    process.exit(1);
  });
