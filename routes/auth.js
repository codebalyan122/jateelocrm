const express = require("express");
const {
  register,
  login,
  getMe,
  updatePassword,
  resetAdminPassword,
} = require("../controllers/auth");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Routes
router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/updatepassword", protect, updatePassword);
router.post("/reset-admin", resetAdminPassword); // Add new debug route

module.exports = router;
