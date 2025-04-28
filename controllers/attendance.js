const Attendance = require("../models/Attendance");
const User = require("../models/User");

// @desc    Get all attendance records
// @route   GET /api/attendance
// @access  Private/Admin
exports.getAllAttendance = async (req, res) => {
  try {
    let query;

    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude from filtering
    const removeFields = [
      "select",
      "sort",
      "page",
      "limit",
      "startDate",
      "endDate",
    ];

    // Remove fields from reqQuery
    removeFields.forEach((param) => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(
      /\b(gt|gte|lt|lte|in)\b/g,
      (match) => `$${match}`
    );

    // Finding resource
    query = Attendance.find(JSON.parse(queryStr)).populate(
      "user",
      "name email"
    );

    // Date range filtering
    if (req.query.startDate && req.query.endDate) {
      query = query.find({
        date: {
          $gte: new Date(req.query.startDate),
          $lte: new Date(req.query.endDate),
        },
      });
    }

    // Select fields
    if (req.query.select) {
      const fields = req.query.select.split(",").join(" ");
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-date");
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Attendance.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Execute query
    const attendances = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: attendances.length,
      pagination,
      total,
      data: attendances,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Get user's attendance records
// @route   GET /api/attendance/me
// @access  Private
exports.getMyAttendance = async (req, res) => {
  try {
    // Add user id to params
    req.query.user = req.user.id;

    let query = Attendance.find({ user: req.user.id });

    // Date range filtering
    if (req.query.startDate && req.query.endDate) {
      query = query.find({
        date: {
          $gte: new Date(req.query.startDate),
          $lte: new Date(req.query.endDate),
        },
      });
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-date");
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Attendance.countDocuments({ user: req.user.id });

    query = query.skip(startIndex).limit(limit);

    // Execute query
    const attendances = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: attendances.length,
      pagination,
      total,
      data: attendances,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Get single attendance record
// @route   GET /api/attendance/:id
// @access  Private
exports.getAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id).populate(
      "user",
      "name email"
    );

    if (!attendance) {
      return res
        .status(404)
        .json({ success: false, message: "Attendance record not found" });
    }

    // Make sure user is authorized to view this attendance record
    if (
      attendance.user._id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Not authorized to view this attendance record",
        });
    }

    res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Create attendance (check-in)
// @route   POST /api/attendance
// @access  Private
exports.checkIn = async (req, res) => {
  try {
    // Check if already checked in for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      user: req.user.id,
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: "Already checked in for today",
      });
    }

    // Create attendance record
    const attendance = await Attendance.create({
      user: req.user.id,
      date: Date.now(),
      checkIn: {
        time: Date.now(),
        location: req.body.location || { coordinates: [0, 0] },
        notes: req.body.notes,
      },
      status: "present",
    });

    res.status(201).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Update attendance (check-out)
// @route   PUT /api/attendance/checkout
// @access  Private
exports.checkOut = async (req, res) => {
  try {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find today's attendance record
    const attendance = await Attendance.findOne({
      user: req.user.id,
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    if (!attendance) {
      return res
        .status(404)
        .json({
          success: false,
          message: "No check-in record found for today",
        });
    }

    if (attendance.checkOut && attendance.checkOut.time) {
      return res
        .status(400)
        .json({ success: false, message: "Already checked out for today" });
    }

    // Update with check-out information
    attendance.checkOut = {
      time: Date.now(),
      location: req.body.location || { coordinates: [0, 0] },
      notes: req.body.notes,
    };

    await attendance.save();

    res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Admin create/update attendance record
// @route   PUT /api/attendance/:id
// @access  Private/Admin
exports.updateAttendance = async (req, res) => {
  try {
    let attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      // If attendance doesn't exist and we're trying to create a new one
      if (req.body.user && req.body.date) {
        // Check if user exists
        const user = await User.findById(req.body.user);
        if (!user) {
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        }

        // Create new attendance record
        attendance = await Attendance.create(req.body);
        return res.status(201).json({
          success: true,
          data: attendance,
        });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Attendance record not found" });
      }
    }

    // Update attendance
    attendance = await Attendance.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Delete attendance record
// @route   DELETE /api/attendance/:id
// @access  Private/Admin
exports.deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res
        .status(404)
        .json({ success: false, message: "Attendance record not found" });
    }

    await attendance.deleteOne();

    res.status(200).json({
      success: true,
      message: "Attendance record deleted",
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};
