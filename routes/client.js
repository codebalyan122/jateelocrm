const express = require("express");
const {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  addInteraction,
  addFeedback,
  getClientsForTodayContact,
} = require("../controllers/client");

const router = express.Router();

// Protect routes
const { protect } = require("../middleware/auth");

// Client routes
router.route("/").get(protect, getClients).post(protect, createClient);

// Follow-up today route
router.get("/follow-up-today", protect, getClientsForTodayContact);

router
  .route("/:id")
  .get(protect, getClient)
  .put(protect, updateClient)
  .delete(protect, deleteClient);

// Interactions and feedback routes
router.post("/:id/interactions", protect, addInteraction);
router.post("/:id/feedback", protect, addFeedback);

module.exports = router;
