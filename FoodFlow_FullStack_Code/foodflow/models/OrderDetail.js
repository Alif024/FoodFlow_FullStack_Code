const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('OrderDetail', {
    order_detail_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    order_id: { type: DataTypes.INTEGER, allowNull: false },
    menu_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 1 } },
    sub_total: { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0, validate: { min: 0 } },
  }, {
    tableName: 'OrderDetail',
    timestamps: false,
  });
};
