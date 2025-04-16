const { Op } = require("sequelize");
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const User = require("../models/User");

// Get all bookings (admin/manager view)
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      include: [
        {
          model: Room,
          attributes: ["id", "roomNumber", "type", "price"],
          //   include: [
          //     {
          //       model: Hotel,
          //       attributes: ["id", "name", "address", "city"],
          //     },
          //   ],
        },
        {
          model: User,
          attributes: ["id", "name", "email", "phone"],
        },
      ],
      order: [["checkInDate", "DESC"]],
    });

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve bookings",
      error: error.message,
    });
  }
};

// Get user's bookings
exports.getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming req.user is set by auth middleware

    const bookings = await Booking.findAll({
      where: { userId },
      include: [
        {
          model: Room,
          attributes: ["id", "roomNumber", "type", "price"],
          //   include: [
          //     {
          //       model: Hotel,
          //       attributes: ["id", "name", "address", "city"],
          //     },
          //   ],
        },
      ],
      order: [["checkInDate", "DESC"]],
    });

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve your bookings",
      error: error.message,
    });
  }
};

// Get single booking details
exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findByPk(id, {
      include: [
        {
          model: Room,
          attributes: ["id", "roomNumber", "type", "price"],
          //   include: [
          //     {
          //       model: Hotel,
          //       attributes: ["id", "name", "address", "city"],
          //     },
          //   ],
        },
        {
          model: User,
          attributes: ["id", "name", "email", "phone"],
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check if the user is authorized to view this booking
    if (
      req.user.role !== "manager" &&
      req.user.role !== "front_desk" &&
      booking.userId !== req.user.id
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this booking" });
    }

    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve booking details",
      error: error.message,
    });
  }
};

// Create new booking
exports.createBooking = async (req, res) => {
  try {
    const { roomId, checkInDate, checkOutDate, guestCount, specialRequests } =
      req.body;

    const userId = req.user.id; // From auth middleware

    // Validate dates
    const startDate = new Date(checkInDate);
    const endDate = new Date(checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      return res
        .status(400)
        .json({ message: "Check-in date cannot be in the past" });
    }

    if (endDate <= startDate) {
      return res
        .status(400)
        .json({ message: "Check-out date must be after check-in date" });
    }

    // Get room information
    const room = await Room.findByPk(roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (guestCount > room.capacity) {
      return res.status(400).json({
        message: `Room capacity exceeded. Maximum capacity is ${room.capacity} guests`,
      });
    }

    // Check if room is available for the requested dates
    const conflictingBooking = await Booking.findOne({
      where: {
        roomId,
        status: {
          [Op.notIn]: ["cancelled", "checked_out"],
        },
        [Op.or]: [
          {
            // Check if another booking starts during our requested period
            checkInDate: {
              [Op.between]: [startDate, endDate],
            },
          },
          {
            // Check if another booking ends during our requested period
            checkOutDate: {
              [Op.between]: [startDate, endDate],
            },
          },
          {
            // Check if another booking spans our entire requested period
            [Op.and]: [
              {
                checkInDate: {
                  [Op.lte]: startDate,
                },
              },
              {
                checkOutDate: {
                  [Op.gte]: endDate,
                },
              },
            ],
          },
        ],
      },
    });

    if (conflictingBooking) {
      return res
        .status(400)
        .json({ message: "Room is not available for the selected dates" });
    }

    // Calculate number of nights
    const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    // Calculate total price
    const totalPrice = room.price * nights;

    // Create booking
    const booking = await Booking.create({
      userId,
      roomId,
      checkInDate,
      checkOutDate,
      guestCount,
      specialRequests,
      totalAmount: totalPrice,
      nights,
      status: "pending",
    });

    // Update room status
    await room.update({ status: "pending" });

    // Send confirmation email
    try {
      const user = await User.findByPk(userId);
      if (user && user.email) {
        await sendBookingConfirmationEmail(user.email, booking, room);
      }
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      // Continue with the booking process even if email fails
    }

    // Return booking with room and hotel details
    const bookingWithDetails = await Booking.findByPk(booking.id, {
      include: [
        {
          model: Room,
          attributes: ["id", "roomNumber", "type", "price"],
          //   include: [
          //     {
          //       model: Hotel,
          //       attributes: ["id", "name", "address", "city"],
          //     },
          //   ],
        },
      ],
    });

    res.status(201).json({
      message: "Booking added successfully, Status pending",
      booking: bookingWithDetails,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create booking",
      error: error.message,
    });
  }
};

// Update booking status
exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const booking = await Booking.findByPk(id, {
      include: [{ model: Room }],
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Validate status
    const validStatuses = [
      "pending",
      "confirmed",
      "checked_in",
      "checked_out",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Update booking status
    await booking.update({ status });

    // Update room status based on booking status
    if (status === "checked_out" || status === "cancelled") {
      await booking.Room.update({ status: "available" });
    } else if (status === "confirmed" || status === "checked_in") {
      await booking.Room.update({ status: "booked" });
    }

    res.status(200).json({
      message: "Booking status updated successfully",
      booking,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update booking status",
      error: error.message,
    });
  }
};

// Cancel booking (by user)
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const booking = await Booking.findByPk(id, {
      include: [{ model: Room }],
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check if this booking belongs to the user
    if (booking.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to cancel this booking" });
    }

    // Update booking status
    await booking.update({ status: "checked_out" });

    res.status(200).json({
      message: "Booking cancel request send",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to cancel booking",
      error: error.message,
    });
  }
};

// Check room availability
exports.checkRoomAvailability = async (req, res) => {
  try {
    const { roomId, checkInDate, checkOutDate } = req.query;

    if (!roomId || !checkInDate || !checkOutDate) {
      return res.status(400).json({
        message: "Room ID, check-in date, and check-out date are required",
      });
    }

    const startDate = new Date(checkInDate);
    const endDate = new Date(checkOutDate);

    // Find the room
    const room = await Room.findByPk(roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Check for existing bookings
    const conflictingBooking = await Booking.findOne({
      where: {
        roomId,
        status: {
          [Op.notIn]: ["cancelled", "checked_out"],
        },
        [Op.or]: [
          {
            checkInDate: {
              [Op.between]: [startDate, endDate],
            },
          },
          {
            checkOutDate: {
              [Op.between]: [startDate, endDate],
            },
          },
          {
            [Op.and]: [
              {
                checkInDate: {
                  [Op.lte]: startDate,
                },
              },
              {
                checkOutDate: {
                  [Op.gte]: endDate,
                },
              },
            ],
          },
        ],
      },
    });

    const isAvailable = !conflictingBooking && room.status === "available";

    res.status(200).json({
      roomId,
      isAvailable,
      checkInDate,
      checkOutDate,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to check room availability",
      error: error.message,
    });
  }
};

exports.createWalkInBooking = async (req, res) => {
  try {
    // Only front desk staff or managers can create walk-in bookings
    if (req.user.role !== "front_desk" && req.user.role !== "manager") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const {
      roomId,
      checkInDate,
      checkOutDate,
      guestCount,
      specialRequests,
      guestName,
      guestEmail,
      guestPhone,
    } = req.body;

    // Find or create user for the guest
    let user;
    if (guestEmail) {
      // Check if a user with this email already exists
      user = await User.findOne({ where: { email: guestEmail } });

      if (!user) {
        // Create a new user for the guest
        user = await User.create({
          name: guestName,
          email: guestEmail,
          phone: guestPhone,
          // Generate a random password that the guest will need to reset if they want to access the account
          password: Math.random().toString(36).substring(2, 15),
          role: "customer",
        });
      }
    } else {
      return res.status(400).json({ message: "Guest email is required" });
    }

    // Get room information
    const room = await Room.findByPk(roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Check if there are any existing bookings for this room that overlap with the requested dates
    const conflictingBooking = await Booking.findOne({
      where: {
        roomId: roomId,
        status: { [Op.notIn]: ["cancelled", "completed"] },
        [Op.or]: [
          // Case 1: Check-in date falls between existing booking's check-in and check-out
          {
            [Op.and]: [
              { checkInDate: { [Op.lte]: checkInDate } },
              { checkOutDate: { [Op.gt]: checkInDate } },
            ],
          },
          // Case 2: Check-out date falls between existing booking's check-in and check-out
          {
            [Op.and]: [
              { checkInDate: { [Op.lt]: checkOutDate } },
              { checkOutDate: { [Op.gte]: checkOutDate } },
            ],
          },
          // Case 3: Existing booking falls completely within the new booking dates
          {
            [Op.and]: [
              { checkInDate: { [Op.gte]: checkInDate } },
              { checkOutDate: { [Op.lte]: checkOutDate } },
            ],
          },
        ],
      },
    });

    if (conflictingBooking) {
      return res
        .status(400)
        .json({ message: "Room is not available for the selected dates" });
    }

    // Calculate nights and total price
    const startDate = new Date(checkInDate);
    const endDate = new Date(checkOutDate);
    const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const totalPrice = room.price * nights;

    // Create booking
    const booking = await Booking.create({
      userId: user.id,
      roomId,
      checkInDate,
      checkOutDate,
      guestCount,
      specialRequests,
      totalAmount: totalPrice,
      nights,
      status: "confirmed", // Automatically check in for walk-in customers
      createdBy: req.user.id, // Track which staff member created the booking
    });

    // Update room status
    await room.update({ status: "booked" });

    // Return booking details
    const bookingWithDetails = await Booking.findByPk(booking.id, {
      include: [
        {
          model: Room,
          attributes: ["id", "roomNumber", "type", "price"],
          //   include: [
          //     {
          //       model: Hotel,
          //       attributes: ["id", "name", "address", "city"],
          //     },
          //   ],
        },
        {
          model: User,
          attributes: ["id", "name", "email", "phone"],
        },
      ],
    });

    res.status(201).json({
      message: "Walk-in booking created and checked in successfully",
      booking: bookingWithDetails,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create walk-in booking",
      error: error.message,
    });
  }
};
// Get occupancy report (for managers)
exports.getOccupancyReport = async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { hotelId, startDate, endDate } = req.query;

    if (!hotelId) {
      return res.status(400).json({ message: "Hotel ID is required" });
    }

    // Define the time range for the report
    const reportStartDate = startDate ? new Date(startDate) : new Date();
    let reportEndDate;

    if (endDate) {
      reportEndDate = new Date(endDate);
    } else {
      // Default to 30 days from start date if no end date provided
      reportEndDate = new Date(reportStartDate);
      reportEndDate.setDate(reportEndDate.getDate() + 30);
    }

    // Get all rooms for the hotel
    const rooms = await Room.findAll({
      where: { hotelId },
    });

    const totalRooms = rooms.length;

    // Get all bookings for the date range
    const bookings = await Booking.findAll({
      include: [
        {
          model: Room,
          where: { hotelId },
          attributes: ["id", "roomNumber", "type"],
        },
      ],
      where: {
        [Op.or]: [
          // Bookings that start within our range
          {
            checkInDate: {
              [Op.between]: [reportStartDate, reportEndDate],
            },
          },
          // Bookings that end within our range
          {
            checkOutDate: {
              [Op.between]: [reportStartDate, reportEndDate],
            },
          },
          // Bookings that completely span our range
          {
            [Op.and]: [
              {
                checkInDate: {
                  [Op.lte]: reportStartDate,
                },
              },
              {
                checkOutDate: {
                  [Op.gte]: reportEndDate,
                },
              },
            ],
          },
        ],
        status: {
          [Op.notIn]: ["cancelled"],
        },
      },
    });

    // Calculate total nights booked
    let totalNightsBooked = 0;
    const occupancyByDate = {};
    const dateRange = getDateRange(reportStartDate, reportEndDate);

    // Initialize occupancy data for each date
    dateRange.forEach((date) => {
      occupancyByDate[date] = {
        date,
        bookedRooms: 0,
        occupancyRate: 0,
      };
    });

    // For each booking, calculate the occupied dates
    bookings.forEach((booking) => {
      const bookingStart = new Date(booking.checkInDate);
      const bookingEnd = new Date(booking.checkOutDate);

      // Adjust dates to consider only the overlap with our report range
      const effectiveStart =
        bookingStart < reportStartDate ? reportStartDate : bookingStart;
      const effectiveEnd =
        bookingEnd > reportEndDate ? reportEndDate : bookingEnd;

      // Calculate days and add to occupancy data
      const days = getDateRange(effectiveStart, effectiveEnd);
      days.forEach((date) => {
        if (occupancyByDate[date]) {
          occupancyByDate[date].bookedRooms++;
          totalNightsBooked++;
        }
      });
    });

    // Calculate occupancy rates
    Object.keys(occupancyByDate).forEach((date) => {
      occupancyByDate[date].occupancyRate =
        (occupancyByDate[date].bookedRooms / totalRooms) * 100;
    });

    // Calculate average occupancy rate
    const totalDays = dateRange.length;
    const averageOccupancyRate =
      (totalNightsBooked / (totalRooms * totalDays)) * 100;

    // Format the response
    const report = {
      hotelId,
      totalRooms,
      reportPeriod: {
        startDate: reportStartDate,
        endDate: reportEndDate,
        totalDays,
      },
      summary: {
        totalNightsBooked,
        averageOccupancyRate: averageOccupancyRate.toFixed(2) + "%",
      },
      dailyOccupancy: Object.values(occupancyByDate).map((day) => ({
        date: day.date,
        bookedRooms: day.bookedRooms,
        availableRooms: totalRooms - day.bookedRooms,
        occupancyRate: day.occupancyRate.toFixed(2) + "%",
      })),
    };

    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({
      message: "Failed to generate occupancy report",
      error: error.message,
    });
  }
};

// Helper function to get array of dates between start and end
function getDateRange(startDate, endDate) {
  const dates = [];
  let currentDate = new Date(startDate);

  // Set time to midnight for comparison
  currentDate.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  // Add each date until we reach the end date
  while (currentDate <= end) {
    dates.push(currentDate.toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}
