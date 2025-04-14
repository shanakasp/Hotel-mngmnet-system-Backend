const express = require("express");
const router = express.Router();
const staffController = require("../controllers/staffController");
const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

// Manager only routes
router.post("/", auth, roleCheck("manager"), staffController.createStaff);
router.put("/:id", auth, roleCheck("manager"), staffController.updateStaff);
router.delete("/:id", auth, roleCheck("manager"), staffController.deleteStaff);

// Staff listing and filtering (Manager only)
router.get("/", auth, roleCheck("manager"), staffController.getAllStaff);
// router.get("/search", auth, roleCheck("manager"), staffController.searchStaff);
router.get(
  "/department/:department",
  auth,
  roleCheck("manager"),
  staffController.filterStaffByDepartment
);
router.get("/:id", auth, roleCheck("manager"), staffController.getStaffById);

module.exports = router;
