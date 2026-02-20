const dbFile = require("../database/dbFile");
const { createDatabaseClient } = require("../database/sqliteClient");
const { createReportModel } = require("../models/reportModel");

async function withReportModel(work) {
  const dbClient = createDatabaseClient(dbFile);
  const reportModel = createReportModel(dbClient);
  try {
    return await work(reportModel);
  } finally {
    await dbClient.close();
  }
}

async function renderReport1(req, res) {
  try {
    const groupBy = req.query.group_by === "month" ? "month" : "day";
    const startDate = req.query.start_date || "";
    const endDate = req.query.end_date || "";
    const orderStatus = req.query.order_status || "";

    const rows = await withReportModel((reportModel) =>
      reportModel.getSalesByTime({
        groupBy,
        startDate: startDate || null,
        endDate: endDate || null,
        orderStatus: orderStatus || null,
      }),
    );

    return res.render("reports/report1", {
      title: "Report 1 - Sales by Time",
      stylesheet: "/css/admin.css",
      script: "/js/admin.js",
      rows,
      filters: {
        groupBy,
        startDate,
        endDate,
        orderStatus,
      },
    });
  } catch (err) {
    return res.status(500).send(err.message);
  }
}

async function renderReport2(req, res) {
  try {
    const startDate = req.query.start_date || "";
    const endDate = req.query.end_date || "";
    const orderStatus = req.query.order_status || "";
    const limit = Number.isFinite(Number(req.query.limit)) ? Number(req.query.limit) : 10;

    const rows = await withReportModel((reportModel) =>
      reportModel.getBestSellingMenus({
        startDate: startDate || null,
        endDate: endDate || null,
        orderStatus: orderStatus || null,
        limit,
      }),
    );

    return res.render("reports/report2", {
      title: "Report 2 - Best Selling Menus",
      stylesheet: "/css/admin.css",
      script: "/js/admin.js",
      rows,
      filters: {
        startDate,
        endDate,
        orderStatus,
        limit,
      },
    });
  } catch (err) {
    return res.status(500).send(err.message);
  }
}

module.exports = {
  renderReport1,
  renderReport2,
};
