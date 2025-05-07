const mongoose = require("mongoose");

const ClientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
    },
    email: {
      type: String,

      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
    },
    company: {
      type: String,
      trim: true,
    },
    position: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    status: {
      type: String,
      enum: ["prospect", "active", "inactive"],
      default: "prospect",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lastContacted: {
      type: Date,
    },
    nextContactDate: {
      type: Date,
    },
    notes: {
      type: String,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    interactions: [
      {
        type: {
          type: String,
          enum: ["call", "email", "meeting", "other"],
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
        notes: String,
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    feedback: [
      {
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
        comment: String,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for improved search performance
ClientSchema.index({ name: "text", email: "text", company: "text" });

module.exports = mongoose.model("Client", ClientSchema);
