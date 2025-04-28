const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const dotenv = require("dotenv");
const path = require("path");

// Import seeder
const { seedAdmin } = require("./utils/seeder");

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const clientRoutes = require("./routes/client");
const attendanceRoutes = require("./routes/attendance");
const analyticsRoutes = require("./routes/analytics");

// Create Express app
const app = express();

// Set up middleware
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));
app.use(helmet());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/dineshcrm")
  .then(async () => {
    console.log("Connected to MongoDB");

    // Seed admin user once connected to database
    try {
      const result = await seedAdmin();
      console.log("Admin seeding result:", result);
    } catch (error) {
      console.error("Error seeding admin user:", error);
    }
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/analytics", analyticsRoutes);

// Default route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to DineshCRM API" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

// Start server
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
