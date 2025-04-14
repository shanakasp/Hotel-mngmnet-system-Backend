const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Staff = sequelize.define("Staff", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  salary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  department: {
    type: DataTypes.ENUM(
      "housekeeping",
      "driver",
      "cleaning",
      "reception",
      "kitchen",
      "security",
      "maintenance"
    ),
    allowNull: false,
  },
  joiningDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("active", "inactive", "on_leave"),
    defaultValue: "active",
  },
});

module.exports = Staff;
