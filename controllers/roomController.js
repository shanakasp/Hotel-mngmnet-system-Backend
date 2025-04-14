const Room = require("../models/Room");
const RoomImage = require("../models/RoomImage");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");

// Create a new room (Manager only)
exports.createRoom = async (req, res) => {
  try {
    const { roomNumber, type, price, capacity, description, amenities } =
      req.body;

    // Check if room number already exists
    const roomExists = await Room.findOne({ where: { roomNumber } });
    if (roomExists) {
      return res.status(400).json({ message: "Room number already exists" });
    }

    // Create new room
    const room = await Room.create({
      roomNumber,
      type,
      price,
      capacity,
      description,
      //   amenities: amenities ? JSON.parse(amenities) : {},
    });

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      // Create directory for room images if it doesn't exist
      const roomDir = path.join(__dirname, "../uploads", `room_${room.id}`);
      if (!fs.existsSync(roomDir)) {
        fs.mkdirSync(roomDir, { recursive: true });
      }

      // Save images to database
      const roomImages = [];
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const isPrimary = i === 0; // First image is primary

        const roomImage = await RoomImage.create({
          roomId: room.id,
          imagePath: `/uploads/room_${room.id}/${file.filename}`,
          description: `Image ${i + 1} for Room ${room.roomNumber}`,
          isPrimary,
        });

        roomImages.push(roomImage);
      }

      // Return room with images
      res.status(201).json({
        room,
        images: roomImages,
      });
    } else {
      res.status(201).json({ room });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create room", error: error.message });
  }
};

// Get all rooms
exports.getAllRooms = async (req, res) => {
  try {
    const { status, type } = req.query;
    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    if (type) {
      whereClause.type = type;
    }

    const rooms = await Room.findAll({
      where: whereClause,
      include: [{ model: RoomImage }],
      order: [["roomNumber", "ASC"]],
    });

    res.status(200).json(rooms);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get rooms", error: error.message });
  }
};

// Get room by ID
exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id, {
      include: [{ model: RoomImage }],
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.status(200).json(room);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get room", error: error.message });
  }
};

// Search room by number
exports.searchRoomByNumber = async (req, res) => {
  try {
    const { roomNumber } = req.query;

    if (!roomNumber) {
      return res.status(400).json({ message: "Room number is required" });
    }

    const room = await Room.findOne({
      where: { roomNumber },
      include: [{ model: RoomImage }],
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.status(200).json(room);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to search room", error: error.message });
  }
};

// Update room (Manager only)
exports.updateRoom = async (req, res) => {
  try {
    const {
      roomNumber,
      type,
      price,
      capacity,
      description,
      status,
      amenities,
    } = req.body;

    const room = await Room.findByPk(req.params.id);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Check if new room number already exists (if being changed)
    if (roomNumber && roomNumber !== room.roomNumber) {
      const roomExists = await Room.findOne({ where: { roomNumber } });
      if (roomExists) {
        return res.status(400).json({ message: "Room number already exists" });
      }
    }

    // Update fields
    if (roomNumber) room.roomNumber = roomNumber;
    if (type) room.type = type;
    if (price) room.price = price;
    if (capacity) room.capacity = capacity;
    if (description) room.description = description;
    if (status) room.status = status;
    if (amenities)
      room.amenities =
        typeof amenities === "string" ? JSON.parse(amenities) : amenities;

    await room.save();

    // Handle image uploads if there are new images
    if (req.files && req.files.length > 0) {
      // Get existing images
      const existingImages = await RoomImage.findAll({
        where: { roomId: room.id },
      });

      // If replacing all images, delete existing ones
      if (req.body.replaceImages === "true" && existingImages.length > 0) {
        // Delete image files
        for (const image of existingImages) {
          const imagePath = path.join(__dirname, "..", image.imagePath);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        }

        // Delete database records
        await RoomImage.destroy({
          where: { roomId: room.id },
        });
      }

      // Save new images to database
      const roomImages = [];
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const isPrimary =
          i === 0 &&
          (req.body.replaceImages === "true" || existingImages.length === 0);

        const roomImage = await RoomImage.create({
          roomId: room.id,
          imagePath: `/uploads/room_${room.id}/${file.filename}`,
          description: `Image ${i + 1} for Room ${room.roomNumber}`,
          isPrimary,
        });

        roomImages.push(roomImage);
      }

      // Return room with updated images
      const updatedRoom = await Room.findByPk(req.params.id, {
        include: [{ model: RoomImage }],
      });

      res.status(200).json(updatedRoom);
    } else {
      // Return room without images if no new images
      const updatedRoom = await Room.findByPk(req.params.id, {
        include: [{ model: RoomImage }],
      });

      res.status(200).json(updatedRoom);
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update room", error: error.message });
  }
};

// Delete room (Manager only)
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id, {
      include: [{ model: RoomImage }],
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Delete room images from filesystem
    if (room.RoomImages && room.RoomImages.length > 0) {
      const roomDir = path.join(__dirname, "..", "uploads", `room_${room.id}`);
      if (fs.existsSync(roomDir)) {
        fs.rmSync(roomDir, { recursive: true, force: true });
      }
    }

    // Delete room from database (cascade will delete images)
    await room.destroy();

    res.status(200).json({ message: "Room deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete room", error: error.message });
  }
};

// Set room image as primary
exports.setPrimaryImage = async (req, res) => {
  try {
    const { roomId, imageId } = req.params;

    // Verify room exists
    const room = await Room.findByPk(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Verify image exists and belongs to room
    const image = await RoomImage.findOne({
      where: {
        id: imageId,
        roomId,
      },
    });

    if (!image) {
      return res.status(404).json({ message: "Image not found for this room" });
    }

    // Update all images for room, setting only this one as primary
    await RoomImage.update({ isPrimary: false }, { where: { roomId } });

    await RoomImage.update({ isPrimary: true }, { where: { id: imageId } });

    res.status(200).json({ message: "Primary image updated successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update primary image",
      error: error.message,
    });
  }
};

// Delete room image
exports.deleteRoomImage = async (req, res) => {
  try {
    const { roomId, imageId } = req.params;

    // Verify room exists
    const room = await Room.findByPk(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Verify image exists and belongs to room
    const image = await RoomImage.findOne({
      where: {
        id: imageId,
        roomId,
      },
    });

    if (!image) {
      return res.status(404).json({ message: "Image not found for this room" });
    }

    // Delete image file
    const imagePath = path.join(__dirname, "..", image.imagePath);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Delete image from database
    await image.destroy();

    // If deleted image was primary, set another image as primary
    if (image.isPrimary) {
      const anotherImage = await RoomImage.findOne({
        where: { roomId },
      });

      if (anotherImage) {
        anotherImage.isPrimary = true;
        await anotherImage.save();
      }
    }

    res.status(200).json({ message: "Image deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete image", error: error.message });
  }
};
