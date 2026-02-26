const dbFile = require("../database/dbFile");
const { createDatabaseClient } = require("../database/sqliteClient");
const { createReportModel } = require("../models/reportModel");

function toNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatNumber(value, options = {}) {
  const { minimumFractionDigits = 0, maximumFractionDigits = 0 } = options;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(toNumber(value));
}

function formatMoney(value) {
  return `THB ${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value) {
  return `${formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`;
}

function formatSignedPercent(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "n/a";
  const sign = numericValue > 0 ? "+" : "";
  return `${sign}${formatNumber(numericValue, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function toRatioPercent(numerator, denominator) {
  const safeNumerator = toNumber(numerator);
  const safeDenominator = toNumber(denominator);
  if (safeDenominator <= 0) return 0;
  return (safeNumerator / safeDenominator) * 100;
}

function toUnitValue(total, quantity) {
  const safeTotal = toNumber(total);
  const safeQuantity = toNumber(quantity);
  if (safeQuantity <= 0) return 0;
  return safeTotal / safeQuantity;
}

function summarizeSalesByTime(rows, groupBy) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const totals = safeRows.reduce(
    (acc, row) => {
      acc.totalOrders += toNumber(row.total_orders);
      acc.totalSales += toNumber(row.total_sales);
      return acc;
    },
    { totalOrders: 0, totalSales: 0 },
  );

  const bestPeriodRow = safeRows.reduce((bestRow, row) => {
    if (!bestRow) return row;
    return toNumber(row.total_sales) > toNumber(bestRow.total_sales) ? row : bestRow;
  }, null);

  const worstPeriodRow = safeRows.reduce((worstRow, row) => {
    if (!worstRow) return row;
    return toNumber(row.total_sales) < toNumber(worstRow.total_sales) ? row : worstRow;
  }, null);

  const averageOrderValue = totals.totalOrders > 0 ? totals.totalSales / totals.totalOrders : 0;
  const totalPeriods = safeRows.length;
  const averageSalesPerPeriod = totalPeriods > 0 ? totals.totalSales / totalPeriods : 0;
  const averageOrdersPerPeriod = totalPeriods > 0 ? totals.totalOrders / totalPeriods : 0;

  const highestOrdersRow = safeRows.reduce((bestRow, row) => {
    if (!bestRow) return row;
    return toNumber(row.total_orders) > toNumber(bestRow.total_orders) ? row : bestRow;
  }, null);

  const lowestOrdersRow = safeRows.reduce((worstRow, row) => {
    if (!worstRow) return row;
    return toNumber(row.total_orders) < toNumber(worstRow.total_orders) ? row : worstRow;
  }, null);

  const latestPeriodRow = safeRows[0] || null;
  const previousPeriodRow = safeRows[1] || null;

  const latestSales = latestPeriodRow ? toNumber(latestPeriodRow.total_sales) : 0;
  const previousSales = previousPeriodRow ? toNumber(previousPeriodRow.total_sales) : 0;
  const latestOrders = latestPeriodRow ? toNumber(latestPeriodRow.total_orders) : 0;
  const previousOrders = previousPeriodRow ? toNumber(previousPeriodRow.total_orders) : 0;

  const salesTrendPercent =
    previousPeriodRow && previousSales > 0
      ? ((latestSales - previousSales) / previousSales) * 100
      : Number.NaN;
  const ordersTrendPercent =
    previousPeriodRow && previousOrders > 0
      ? ((latestOrders - previousOrders) / previousOrders) * 100
      : Number.NaN;

  const topPeriodSalesShare = bestPeriodRow
    ? toRatioPercent(bestPeriodRow.total_sales, totals.totalSales)
    : 0;
  const recentComparisonLabel =
    latestPeriodRow && previousPeriodRow
      ? `${latestPeriodRow.period} vs ${previousPeriodRow.period}`
      : "At least 2 periods required";

  return {
    hasData: safeRows.length > 0,
    periodUnitLabel: groupBy === "month" ? "Month" : "Day",
    totalOrdersText: formatNumber(totals.totalOrders),
    totalSalesText: formatMoney(totals.totalSales),
    averageOrderValueText: formatMoney(averageOrderValue),
    bestPeriod: bestPeriodRow ? bestPeriodRow.period : "-",
    bestPeriodSalesText: formatMoney(bestPeriodRow ? bestPeriodRow.total_sales : 0),
    worstPeriod: worstPeriodRow ? worstPeriodRow.period : "-",
    worstPeriodSalesText: formatMoney(worstPeriodRow ? worstPeriodRow.total_sales : 0),
    totalPeriodsText: formatNumber(totalPeriods),
    averageSalesPerPeriodText: formatMoney(averageSalesPerPeriod),
    averageOrdersPerPeriodText: formatNumber(averageOrdersPerPeriod, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
    topPeriodSalesShareText: formatPercent(topPeriodSalesShare),
    highestOrdersPeriod: highestOrdersRow ? highestOrdersRow.period : "-",
    highestOrdersText: formatNumber(highestOrdersRow ? highestOrdersRow.total_orders : 0),
    lowestOrdersPeriod: lowestOrdersRow ? lowestOrdersRow.period : "-",
    lowestOrdersText: formatNumber(lowestOrdersRow ? lowestOrdersRow.total_orders : 0),
    recentComparisonLabel,
    recentSalesTrendText: formatSignedPercent(salesTrendPercent),
    recentOrdersTrendText: formatSignedPercent(ordersTrendPercent),
  };
}

function summarizeBestSellingMenus(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const totals = safeRows.reduce(
    (acc, row) => {
      acc.totalQuantity += toNumber(row.total_quantity);
      acc.totalSales += toNumber(row.total_sales);
      return acc;
    },
    { totalQuantity: 0, totalSales: 0 },
  );

  const bestByQuantityRow = safeRows.reduce((bestRow, row) => {
    if (!bestRow) return row;
    const quantity = toNumber(row.total_quantity);
    const bestQuantity = toNumber(bestRow.total_quantity);
    if (quantity !== bestQuantity) return quantity > bestQuantity ? row : bestRow;
    return toNumber(row.total_sales) > toNumber(bestRow.total_sales) ? row : bestRow;
  }, null);

  const bestBySalesRow = safeRows.reduce((bestRow, row) => {
    if (!bestRow) return row;
    return toNumber(row.total_sales) > toNumber(bestRow.total_sales) ? row : bestRow;
  }, null);

  const topTwoSales = safeRows
    .slice(0, 2)
    .reduce((sum, row) => sum + toNumber(row.total_sales), 0);
  const topOneSales = safeRows.length ? toNumber(safeRows[0].total_sales) : 0;
  const topThreeSales = safeRows
    .slice(0, 3)
    .reduce((sum, row) => sum + toNumber(row.total_sales), 0);
  const topTwoSalesShare = totals.totalSales > 0 ? (topTwoSales / totals.totalSales) * 100 : 0;
  const topOneSalesShare = totals.totalSales > 0 ? (topOneSales / totals.totalSales) * 100 : 0;
  const topThreeSalesShare = totals.totalSales > 0 ? (topThreeSales / totals.totalSales) * 100 : 0;
  const averageSalesPerMenu = safeRows.length > 0 ? totals.totalSales / safeRows.length : 0;
  const averageQuantityPerMenu = safeRows.length > 0 ? totals.totalQuantity / safeRows.length : 0;
  const averageRevenuePerItem = totals.totalQuantity > 0 ? totals.totalSales / totals.totalQuantity : 0;

  const leastSellingRow = safeRows.reduce((leastRow, row) => {
    if (!leastRow) return row;
    const quantity = toNumber(row.total_quantity);
    const leastQuantity = toNumber(leastRow.total_quantity);
    if (quantity !== leastQuantity) return quantity < leastQuantity ? row : leastRow;
    return toNumber(row.total_sales) < toNumber(leastRow.total_sales) ? row : leastRow;
  }, null);

  const bestUnitRevenueRow = safeRows.reduce((bestRow, row) => {
    if (!bestRow) return row;
    const unitRevenue = toUnitValue(row.total_sales, row.total_quantity);
    const bestUnitRevenue = toUnitValue(bestRow.total_sales, bestRow.total_quantity);
    return unitRevenue > bestUnitRevenue ? row : bestRow;
  }, null);

  const categoryMap = new Map();
  safeRows.forEach((row) => {
    const category = row.category_name || "Uncategorized";
    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        sales: 0,
        quantity: 0,
      });
    }
    const categoryData = categoryMap.get(category);
    categoryData.sales += toNumber(row.total_sales);
    categoryData.quantity += toNumber(row.total_quantity);
  });

  let topCategoryName = "-";
  let topCategorySales = 0;
  for (const [categoryName, categoryData] of categoryMap.entries()) {
    if (categoryData.sales > topCategorySales) {
      topCategorySales = categoryData.sales;
      topCategoryName = categoryName;
    }
  }
  const topCategorySalesShare = toRatioPercent(topCategorySales, totals.totalSales);

  return {
    hasData: safeRows.length > 0,
    totalMenusText: formatNumber(safeRows.length),
    totalQuantityText: formatNumber(totals.totalQuantity),
    totalSalesText: formatMoney(totals.totalSales),
    averageSalesPerMenuText: formatMoney(averageSalesPerMenu),
    bestByQuantityName: bestByQuantityRow ? bestByQuantityRow.menu_name : "-",
    bestByQuantityQtyText: formatNumber(bestByQuantityRow ? bestByQuantityRow.total_quantity : 0),
    bestByQuantitySalesText: formatMoney(bestByQuantityRow ? bestByQuantityRow.total_sales : 0),
    bestBySalesName: bestBySalesRow ? bestBySalesRow.menu_name : "-",
    bestBySalesText: formatMoney(bestBySalesRow ? bestBySalesRow.total_sales : 0),
    topTwoSalesShareText: formatPercent(topTwoSalesShare),
    topOneSalesShareText: formatPercent(topOneSalesShare),
    topThreeSalesShareText: formatPercent(topThreeSalesShare),
    averageQuantityPerMenuText: formatNumber(averageQuantityPerMenu, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
    averageRevenuePerItemText: formatMoney(averageRevenuePerItem),
    leastSellingName: leastSellingRow ? leastSellingRow.menu_name : "-",
    leastSellingQtyText: formatNumber(leastSellingRow ? leastSellingRow.total_quantity : 0),
    leastSellingSalesText: formatMoney(leastSellingRow ? leastSellingRow.total_sales : 0),
    bestUnitRevenueName: bestUnitRevenueRow ? bestUnitRevenueRow.menu_name : "-",
    bestUnitRevenueText: formatMoney(
      bestUnitRevenueRow
        ? toUnitValue(bestUnitRevenueRow.total_sales, bestUnitRevenueRow.total_quantity)
        : 0,
    ),
    topCategoryName,
    topCategorySalesText: formatMoney(topCategorySales),
    topCategorySalesShareText: formatPercent(topCategorySalesShare),
  };
}

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
    const summary = summarizeSalesByTime(rows, groupBy);

    return res.render("reports/report1", {
      title: "Report 1 - Sales by Time",
      stylesheet: "/css/admin.css",
      script: "/js/admin.js",
      rows,
      summary,
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
    const summary = summarizeBestSellingMenus(rows);

    return res.render("reports/report2", {
      title: "Report 2 - Best Selling Menus",
      stylesheet: "/css/admin.css",
      script: "/js/admin.js",
      rows,
      summary,
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
