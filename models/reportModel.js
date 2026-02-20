function createReportModel(dbClient) {
  function buildOrderFilter({ startDate, endDate, orderStatus }) {
    const clauses = ["o.order_date IS NOT NULL"];
    const params = [];

    if (startDate) {
      clauses.push("date(o.order_date) >= date(?)");
      params.push(startDate);
    }
    if (endDate) {
      clauses.push("date(o.order_date) <= date(?)");
      params.push(endDate);
    }
    if (orderStatus) {
      clauses.push("o.order_status = ?");
      params.push(orderStatus);
    } else {
      clauses.push("o.order_status != 'cancelled'");
    }

    return {
      whereSql: clauses.join(" AND "),
      params,
    };
  }

  async function getSalesByTime({ groupBy = "day", startDate, endDate, orderStatus } = {}) {
    const periodExpr = groupBy === "month" ? "strftime('%Y-%m', o.order_date)" : "date(o.order_date)";
    const { whereSql, params } = buildOrderFilter({ startDate, endDate, orderStatus });

    return dbClient.all(
      `SELECT
         ${periodExpr} AS period,
         COUNT(o.order_id) AS total_orders,
         ROUND(IFNULL(SUM(o.total_price), 0), 2) AS total_sales
       FROM Orders o
       WHERE ${whereSql}
       GROUP BY ${periodExpr}
       ORDER BY period DESC`,
      params,
    );
  }

  async function getBestSellingMenus({ startDate, endDate, orderStatus, limit = 10 } = {}) {
    const { whereSql, params } = buildOrderFilter({ startDate, endDate, orderStatus });
    const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 10;

    return dbClient.all(
      `SELECT
         m.menu_id,
         COALESCE(m.menu_name, 'Unknown Menu') AS menu_name,
         m.category_name,
         IFNULL(SUM(od.quantity), 0) AS total_quantity,
         ROUND(IFNULL(SUM(od.sub_total), 0), 2) AS total_sales,
         COUNT(DISTINCT od.order_id) AS total_orders
       FROM OrderDetail od
       INNER JOIN Orders o ON o.order_id = od.order_id
       LEFT JOIN Menu m ON m.menu_id = od.menu_id
       WHERE ${whereSql}
       GROUP BY m.menu_id, m.menu_name, m.category_name
       ORDER BY total_quantity DESC, total_sales DESC
       LIMIT ?`,
      [...params, safeLimit],
    );
  }

  return {
    getSalesByTime,
    getBestSellingMenus,
  };
}

module.exports = {
  createReportModel,
};
