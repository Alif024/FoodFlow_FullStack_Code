const { Sequelize } = require('sequelize');

const storage = process.env.DB_STORAGE || 'database/database.sqlite';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage,
  logging: false,
});

const Menu = require('./Menu')(sequelize);
const Customer = require('./Customer')(sequelize);
const Order = require('./Order')(sequelize);
const OrderDetail = require('./OrderDetail')(sequelize);

// Associations
Customer.hasMany(Order, { foreignKey: 'customer_id', onDelete: 'CASCADE' });
Order.belongsTo(Customer, { foreignKey: 'customer_id' });

Order.belongsToMany(Menu, { through: OrderDetail, foreignKey: 'order_id', otherKey: 'menu_id' });
Menu.belongsToMany(Order, { through: OrderDetail, foreignKey: 'menu_id', otherKey: 'order_id' });

// Direct access to junction table
Order.hasMany(OrderDetail, { foreignKey: 'order_id', onDelete: 'CASCADE' });
OrderDetail.belongsTo(Order, { foreignKey: 'order_id' });

Menu.hasMany(OrderDetail, { foreignKey: 'menu_id' });
OrderDetail.belongsTo(Menu, { foreignKey: 'menu_id' });

module.exports = {
  sequelize,
  Sequelize,
  Menu,
  Customer,
  Order,
  OrderDetail,
};
