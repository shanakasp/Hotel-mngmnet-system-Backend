const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

// Get all bookings (manager/front_desk only)
router.get("/", bookingController.getAllBookings);

// Get user's bookings
router.get("/my-bookings", auth, bookingController.getUserBookings);

// Create new booking (logged in users)
router.post("/", auth, bookingController.createBooking);

// Create walk-in booking (front desk staff only)
router.post(
  "/walk-in",
  auth,
  roleCheck("front_desk"),
  bookingController.createWalkInBooking
);

// Get single booking details
router.get("/:id", auth, bookingController.getBookingById);

// Update booking status (admin/front desk only)
router.put(
  "/:id/status",
  auth,
  roleCheck(["manager", "front_desk"]),
  bookingController.updateBookingStatus
);

// Cancel booking (by user)
router.put("/:id/cancel", auth, bookingController.cancelBooking);

// Check room availability (public route)
router.get("/check-availability", bookingController.checkRoomAvailability);

// Get occupancy report (manager only)
router.get(
  "/reports/occupancy",
  auth,
  roleCheck(["manager"]),
  bookingController.getOccupancyReport
);

module.exports = router;
