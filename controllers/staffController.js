const Staff = require("../models/Staff");
const { Op } = require("sequelize");

// Create a new staff member (Manager only)
exports.createStaff = async (req, res) => {
  try {
    const { name, phoneNumber, salary, age, department, joiningDate } =
      req.body;

    // Create new staff
    const staff = await Staff.create({
      name,
      phoneNumber,
      salary,
      age,
      department,
      joiningDate,
    });

    res.status(201).json(staff);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create staff", error: error.message });
  }
};

// Get all staff
exports.getAllStaff = async (req, res) => {
  try {
    const { department, status } = req.query;
    const whereClause = {};

    if (department) {
      whereClause.department = department;
    }

    if (status) {
      whereClause.status = status;
    }

    const staff = await Staff.findAll({
      where: whereClause,
      order: [["name", "ASC"]],
    });

    res.status(200).json(staff);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get staff", error: error.message });
  }
};

// Get staff by ID
exports.getStaffById = async (req, res) => {
  try {
    const staff = await Staff.findByPk(req.params.id);

    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    res.status(200).json(staff);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get staff", error: error.message });
  }
};

// Update staff (Manager only)
exports.updateStaff = async (req, res) => {
  try {
    const { name, phoneNumber, salary, age, department, address, status } =
      req.body;

    const staff = await Staff.findByPk(req.params.id);

    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    // Update fields
    if (name) staff.name = name;
    if (phoneNumber) staff.phoneNumber = phoneNumber;
    if (salary) staff.salary = salary;
    if (age) staff.age = age;
    if (department) staff.department = department;

    await staff.save();

    res.status(200).json(staff);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update staff", error: error.message });
  }
};

// Delete staff (Manager only)
exports.deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findByPk(req.params.id);

    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    await staff.destroy();

    res.status(200).json({ message: "Staff deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete staff", error: error.message });
  }
};

// Search staff by name or phone
exports.searchStaff = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const staff = await Staff.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${query}%` } },
          { phoneNumber: { [Op.like]: `%${query}%` } },
        ],
      },
    });

    res.status(200).json(staff);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to search staff", error: error.message });
  }
};

// Filter staff by department
exports.filterStaffByDepartment = async (req, res) => {
  try {
    const { department } = req.params;

    if (!department) {
      return res.status(400).json({ message: "Department is required" });
    }

    const staff = await Staff.findAll({
      where: { department },
    });

    res.status(200).json(staff);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to filter staff", error: error.message });
  }
};
