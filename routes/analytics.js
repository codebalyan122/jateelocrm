const express = require("express");
const Client = require("../models/Client");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Get client metrics (new clients, status distribution, etc)
// @route   GET /api/analytics/clients
// @access  Private/Admin
router.get("/clients", authorize("admin"), async (req, res) => {
  try {
    // Get total clients count
    const totalClients = await Client.countDocuments();

    // Get client status distribution
    const prospectClients = await Client.countDocuments({ status: "prospect" });
    const activeClients = await Client.countDocuments({ status: "active" });
    const inactiveClients = await Client.countDocuments({ status: "inactive" });

    // Get clients by team member
    const clientsByTeamMember = await Client.aggregate([
      {
        $group: {
          _id: "$assignedTo",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "assignedTo",
        },
      },
      {
        $unwind: "$assignedTo",
      },
      {
        $project: {
          teamMember: "$assignedTo.name",
          count: 1,
          _id: 0,
        },
      },
    ]);

    // Get clients created in the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const clientsOverTime = await Client.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
      {
        $project: {
          date: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              { $toString: "$_id.month" },
            ],
          },
          count: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalClients,
        statusDistribution: {
          prospect: prospectClients,
          active: activeClients,
          inactive: inactiveClients,
        },
        clientsByTeamMember,
        clientsOverTime,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
});

// @desc    Get attendance metrics
// @route   GET /api/analytics/attendance
// @access  Private/Admin
router.get("/attendance", authorize("admin"), async (req, res) => {
  try {
    // Get attendance stats for the past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendanceByDate = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            day: { $dayOfMonth: "$date" },
          },
          count: { $sum: 1 },
          avgHours: { $avg: "$totalHours" },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
      },
      {
        $project: {
          date: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              { $toString: "$_id.month" },
              "-",
              { $toString: "$_id.day" },
            ],
          },
          count: 1,
          avgHours: 1,
          _id: 0,
        },
      },
    ]);

    // Get attendance status distribution
    const presentCount = await Attendance.countDocuments({ status: "present" });
    const absentCount = await Attendance.countDocuments({ status: "absent" });
    const leaveCount = await Attendance.countDocuments({ status: "leave" });
    const halfDayCount = await Attendance.countDocuments({
      status: "half-day",
    });

    res.status(200).json({
      success: true,
      data: {
        attendanceByDate,
        statusDistribution: {
          present: presentCount,
          absent: absentCount,
          leave: leaveCount,
          halfDay: halfDayCount,
        },
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
});

// @desc    Get team performance metrics
// @route   GET /api/analytics/performance
// @access  Private/Admin
router.get("/performance", authorize("admin"), async (req, res) => {
  try {
    // Get interactions per team member
    const interactionsPerTeamMember = await Client.aggregate([
      { $unwind: "$interactions" },
      {
        $group: {
          _id: "$interactions.createdBy",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "teamMember",
        },
      },
      {
        $unwind: "$teamMember",
      },
      {
        $project: {
          name: "$teamMember.name",
          count: 1,
          _id: 0,
        },
      },
    ]);

    // Get average client feedback by team member
    const feedbackByTeamMember = await Client.aggregate([
      { $unwind: "$feedback" },
      {
        $group: {
          _id: "$assignedTo",
          avgRating: { $avg: "$feedback.rating" },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "teamMember",
        },
      },
      {
        $unwind: "$teamMember",
      },
      {
        $project: {
          name: "$teamMember.name",
          avgRating: 1,
          feedbackCount: "$count",
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        interactionsPerTeamMember,
        feedbackByTeamMember,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
});

// @desc    Get upcoming follow-ups
// @route   GET /api/analytics/followups
// @access  Private
router.get("/followups", async (req, res) => {
  try {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    let query = {
      nextContactDate: {
        $gte: today,
        $lte: nextWeek,
      },
    };

    // If not admin, show only assigned clients
    if (req.user.role !== "admin") {
      query.assignedTo = req.user._id;
    }

    const upcomingFollowUps = await Client.find(query)
      .populate("assignedTo", "name email")
      .select("name company email phone nextContactDate assignedTo status")
      .sort("nextContactDate");

    res.status(200).json({
      success: true,
      count: upcomingFollowUps.length,
      data: upcomingFollowUps,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
});

// @desc    Get dashboard overview data
// @route   GET /api/analytics/dashboard
// @access  Private
router.get("/dashboard", async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const query = !isAdmin ? { assignedTo: req.user._id } : {};

    // Get clients count
    const totalClients = await Client.countDocuments(query);

    // Get today's new clients
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const newClientsToday = await Client.countDocuments({
      ...query,
      createdAt: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    // Get upcoming follow-ups for the next 3 days
    const threeDaysLater = new Date();
    threeDaysLater.setDate(today.getDate() + 3);

    const upcomingFollowUps = await Client.countDocuments({
      ...query,
      nextContactDate: {
        $gte: today,
        $lte: threeDaysLater,
      },
    });

    // Get attendance status for today (for team member)
    let attendanceToday = null;
    if (!isAdmin) {
      attendanceToday = await Attendance.findOne({
        user: req.user._id,
        date: {
          $gte: today,
          $lt: tomorrow,
        },
      });
    }

    // Recent activities (interactions)
    const recentActivities = await Client.aggregate([
      { $match: query },
      { $unwind: "$interactions" },
      { $sort: { "interactions.date": -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "interactions.createdBy",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          clientName: "$name",
          clientId: "$_id",
          interactionType: "$interactions.type",
          interactionDate: "$interactions.date",
          interactionNotes: "$interactions.notes",
          userName: "$user.name",
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalClients,
        newClientsToday,
        upcomingFollowUps,
        attendanceToday,
        recentActivities,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
});

module.exports = router;
