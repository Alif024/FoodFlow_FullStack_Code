const { createMenuModel } = require("./menuModel");
const { createMembershipModel } = require("./membershipModel");
const { createDiningTableModel } = require("./diningTableModel");
const { createTableQRModel } = require("./tableQRModel");
const { createOrderModel } = require("./orderModel");
const { createOrderDetailModel } = require("./orderDetailModel");

function createModels(dbClient) {
  return {
    menuModel: createMenuModel(dbClient),
    membershipModel: createMembershipModel(dbClient),
    diningTableModel: createDiningTableModel(dbClient),
    tableQRModel: createTableQRModel(dbClient),
    orderModel: createOrderModel(dbClient),
    orderDetailModel: createOrderDetailModel(dbClient),
  };
}

module.exports = {
  createModels,
};
