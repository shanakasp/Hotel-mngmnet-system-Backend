const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Room = require("./Room");

const RoomImage = sequelize.define("RoomImage", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  imagePath: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isPrimary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

Room.hasMany(RoomImage, {
  foreignKey: "roomId",
  onDelete: "CASCADE", // Enable cascading delete
});
RoomImage.belongsTo(Room, {
  foreignKey: "roomId",
  onDelete: "CASCADE", // Enable cascading delete
});

module.exports = RoomImage;
