const express = require("express");
const router = express.Router();
const roomController = require("../controllers/roomController");
const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");
const { uploadRoomImages } = require("../middleware/fileUpload");

// Manager only routes
router.post(
  "/",
  auth,
  roleCheck("manager"),
  uploadRoomImages,
  roomController.createRoom
);
router.patch(
  "/:id",
  auth,
  roleCheck("manager"),
  uploadRoomImages,
  roomController.updateRoom
);
router.delete("/:id", auth, roleCheck("manager"), roomController.deleteRoom);

// Room image management (Manager only)
router.put(
  "/:roomId/images/:imageId/primary",
  auth,
  roleCheck("manager"),
  roomController.setPrimaryImage
);
router.delete(
  "/:roomId/images/:imageId",
  auth,
  roleCheck("manager"),
  roomController.deleteRoomImage
);

// Public routes
router.get("/", auth, roomController.getAllRooms);
router.get("/search", auth, roomController.searchRoomByNumber);
router.get("/:id", auth, roomController.getRoomById);

module.exports = router;
