const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Order', {
    order_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    customer_id: { type: DataTypes.INTEGER, allowNull: false },
    order_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
    total_price: { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
    order_status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'pending' },
  }, {
    tableName: 'Order',
    timestamps: false,
  });
};
