const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");
const Room = require("./Room");

const Booking = sequelize.define(
  "Booking",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    roomId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Room,
        key: "id",
      },
    },
    bookingNumber: {
      type: DataTypes.STRING,
      unique: true,
      defaultValue: () =>
        "BK" +
        Date.now().toString().slice(-8) +
        Math.floor(Math.random() * 100),
    },
    checkInDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    checkOutDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    guestCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    nights: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "confirmed",
        "checked_in",
        "checked_out",
        "cancelPending",
        "cancelled"
      ),
      defaultValue: "pending",
    },
    specialRequests: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Staff ID who created this booking (for walk-in bookings)",
    },
  },
  {
    tableName: "bookings",
    timestamps: true,
  }
);

// Set up associations properly
Booking.belongsTo(User, { foreignKey: "userId" });
Booking.belongsTo(Room, { foreignKey: "roomId" });

module.exports = Booking;
