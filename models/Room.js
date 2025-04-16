const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Room = sequelize.define("Room", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  roomNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  type: {
    type: DataTypes.ENUM("standard", "suite", "deluxe"),
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ACorNot: {
    type: DataTypes.ENUM("AC", "Non AC"),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM("available", "occupied", "maintenance"),
    defaultValue: "available",
  },
  amenities: {
    type: DataTypes.JSON,
    allowNull: true,
  },
});

module.exports = Room;
