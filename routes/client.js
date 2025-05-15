const express = require("express");
const {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  addInteraction,
  addFeedback,
  updateInteraction,
  deleteInteraction,
  updateFeedback,
  deleteFeedback,
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

// Interactions routes
router.post("/:id/interactions", protect, addInteraction);
router.put("/:id/interactions/:interactionId", protect, updateInteraction);
router.delete("/:id/interactions/:interactionId", protect, deleteInteraction);

// Feedback routes
router.post("/:id/feedback", protect, addFeedback);
router.put("/:id/feedback/:feedbackId", protect, updateFeedback);
router.delete("/:id/feedback/:feedbackId", protect, deleteFeedback);

module.exports = router;
