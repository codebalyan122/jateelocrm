const mongoose = require("mongoose");

const AttendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    checkIn: {
      time: {
        type: Date,
        required: true,
      },
      location: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number],
          default: [0, 0],
        },
      },
      notes: String,
    },
    checkOut: {
      time: Date,
      location: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number],
          default: [0, 0],
        },
      },
      notes: String,
    },
    totalHours: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["present", "absent", "leave", "half-day"],
      default: "present",
    },
    comments: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for user and date to ensure a user can only have one attendance record per day
AttendanceSchema.index({ user: 1, date: 1 }, { unique: true });

// Method to calculate total hours
AttendanceSchema.pre("save", function (next) {
  if (
    this.checkIn &&
    this.checkIn.time &&
    this.checkOut &&
    this.checkOut.time
  ) {
    const checkInTime = new Date(this.checkIn.time).getTime();
    const checkOutTime = new Date(this.checkOut.time).getTime();

    if (checkOutTime > checkInTime) {
      // Calculate hours and round to 2 decimal places
      this.totalHours =
        Math.round(((checkOutTime - checkInTime) / (1000 * 60 * 60)) * 100) /
        100;
    }
  }
  next();
});

module.exports = mongoose.model("Attendance", AttendanceSchema);
