const Client = require("../models/Client");

// @desc    Get all clients
// @route   GET /api/clients
// @access  Private
exports.getClients = async (req, res) => {
  try {
    let query;

    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude from query
    const removeFields = [
      "select",
      "sort",
      "page",
      "limit",
      "search",
      "searchField",
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
    query = Client.find(JSON.parse(queryStr)).populate(
      "assignedTo",
      "name email"
    );

    // For team members, show only their assigned clients unless they're admin
    if (req.user.role !== "admin") {
      query = query.find({ assignedTo: req.user._id });
    }

    // Text search across multiple fields or only company field
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");

      if (req.query.searchField === "company") {
        // Search only by company name
        query = query.find({ company: searchRegex });
      } else {
        // Default search across multiple fields
        query = query.find({
          $or: [
            { name: searchRegex },
            { email: searchRegex },
            { company: searchRegex },
            { phone: searchRegex },
          ],
        });
      }
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
      query = query.sort("-createdAt");
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Client.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Execute query
    const clients = await query;

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
      count: clients.length,
      pagination,
      total,
      data: clients,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Get single client
// @route   GET /api/clients/:id
// @access  Private
exports.getClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).populate(
      "assignedTo",
      "name email"
    );

    if (!client) {
      return res
        .status(404)
        .json({ success: false, message: "Client not found" });
    }

    // Make sure user is authorized to view this client
    if (
      client.assignedTo &&
      req.user.role !== "admin" &&
      client.assignedTo._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this client",
      });
    }

    res.status(200).json({
      success: true,
      data: client,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Create new client
// @route   POST /api/clients
// @access  Private
exports.createClient = async (req, res) => {
  try {
    // Add user to req.body
    req.body.createdBy = req.user._id;

    // If no assignedTo is provided, assign to the creator
    if (!req.body.assignedTo) {
      req.body.assignedTo = req.user._id;
    }

    // Allow team members to create clients assigned to themselves
    // Only admins can assign clients to other team members
    if (
      req.body.assignedTo &&
      req.body.assignedTo.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      // For team members, force assignment to themselves
      req.body.assignedTo = req.user._id;
    }

    // Create client
    const client = await Client.create(req.body);

    res.status(201).json({
      success: true,
      data: client,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Update client
// @route   PUT /api/clients/:id
// @access  Private
exports.updateClient = async (req, res) => {
  try {
    let client = await Client.findById(req.params.id);

    if (!client) {
      return res
        .status(404)
        .json({ success: false, message: "Client not found" });
    }

    // Make sure user is authorized to update this client
    if (
      client.assignedTo &&
      req.user.role !== "admin" &&
      client.assignedTo.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this client",
      });
    }

    // Prevent reassignment by non-admin
    if (
      req.body.assignedTo &&
      req.body.assignedTo.toString() !== client.assignedTo.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to reassign client" });
    }

    // Create the update object with current body
    const updateData = { ...req.body };

    // Always update lastContacted date whenever client is updated
    updateData.lastContacted = Date.now();

    // Update client
    client = await Client.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: client,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Delete client
// @route   DELETE /api/clients/:id
// @access  Private
exports.deleteClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res
        .status(404)
        .json({ success: false, message: "Client not found" });
    }

    // Make sure user is authorized to delete this client
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this client",
      });
    }

    await client.deleteOne();

    res.status(200).json({
      success: true,
      message: "Client removed successfully",
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Add client interaction
// @route   POST /api/clients/:id/interactions
// @access  Private
exports.addInteraction = async (req, res) => {
  try {
    const { type, notes } = req.body;
    let client = await Client.findById(req.params.id);

    if (!client) {
      return res
        .status(404)
        .json({ success: false, message: "Client not found" });
    }

    // Make sure user is authorized to update this client
    if (
      client.assignedTo &&
      req.user.role !== "admin" &&
      client.assignedTo.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this client",
      });
    }

    // Add interaction
    client.interactions.unshift({
      type,
      notes,
      createdBy: req.user._id,
      date: Date.now(),
    });

    // Update last contacted date
    client.lastContacted = Date.now();

    await client.save();

    res.status(200).json({
      success: true,
      data: client.interactions[0],
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Add client feedback
// @route   POST /api/clients/:id/feedback
// @access  Private
exports.addFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    let client = await Client.findById(req.params.id);

    if (!client) {
      return res
        .status(404)
        .json({ success: false, message: "Client not found" });
    }

    // Make sure user is authorized to update this client
    if (
      client.assignedTo &&
      req.user.role !== "admin" &&
      client.assignedTo.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this client",
      });
    }

    // Add feedback
    client.feedback.unshift({
      rating,
      comment,
      date: Date.now(),
    });

    await client.save();

    res.status(200).json({
      success: true,
      data: client.feedback[0],
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

/**
 * Get clients that need to be contacted today
 * @route GET /api/clients/follow-up-today
 * @access Private
 */
exports.getClientsForTodayContact = async (req, res) => {
  try {
    // Get today's date and set hours, minutes, seconds to 0
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get tomorrow's date (for date range query)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find clients with nextContactDate matching today
    const clients = await Client.find({
      nextContactDate: {
        $gte: today,
        $lt: tomorrow,
      },
    }).sort({ name: 1 });

    return res.json({
      success: true,
      data: clients,
      total: clients.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};
