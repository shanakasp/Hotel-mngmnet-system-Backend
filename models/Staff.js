const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Staff = sequelize.define("Staff", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  govtID: {
    type: DataTypes.STRING,
    allowNull: false,
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
  gender: {
    type: DataTypes.ENUM("male", "female"),
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
      "maintenance",
      "front_desk"
    ),
    allowNull: false,
  },
  joiningDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
});

module.exports = Staff;
