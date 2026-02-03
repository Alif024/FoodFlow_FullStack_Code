const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Menu', {
    menu_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    menu_name: { type: DataTypes.STRING(200), allowNull: false },
    category_name: { type: DataTypes.STRING(100), allowNull: false },
    price: { type: DataTypes.DECIMAL(10,2), allowNull: false, validate: { min: 0 } },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'available' },
  }, {
    tableName: 'Menu',
    timestamps: false,
  });
};
