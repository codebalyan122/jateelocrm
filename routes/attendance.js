const express = require("express");
const {
  getAllAttendance,
  getMyAttendance,
  getAttendance,
  checkIn,
  checkOut,
  updateAttendance,
  deleteAttendance,
} = require("../controllers/attendance");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// All routes are protected
router.use(protect);

// Routes for all users
router.route("/").post(checkIn);

router.route("/checkout").put(checkOut);

router.route("/me").get(getMyAttendance);

// Routes accessible only to admins
router.route("/").get(authorize("admin"), getAllAttendance);

router
  .route("/:id")
  .get(getAttendance)
  .put(authorize("admin"), updateAttendance)
  .delete(authorize("admin"), deleteAttendance);

module.exports = router;
