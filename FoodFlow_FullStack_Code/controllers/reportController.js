const { Order, Customer, OrderDetail, Menu, sequelize } = require('../models');
const { Op } = require('sequelize');

function toDateOnlyISO(d) {
  return d.toISOString().slice(0, 10);
}

exports.salesReport = async (req, res) => {
  // Filters
  const mode = (req.query.mode || 'day'); // day | month
  const from = req.query.from || '';
  const to = req.query.to || '';

  // Default range: last 30 days
  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setDate(today.getDate() - 30);

  const fromDate = from ? new Date(from) : defaultFrom;
  const toDate = to ? new Date(to) : today;

  const fromISO = toDateOnlyISO(fromDate);
  const toISO = toDateOnlyISO(toDate);

  const groupExpr = mode === 'month'
    ? sequelize.fn('strftime', '%Y-%m', sequelize.col('order_date'))
    : sequelize.col('order_date');

  const rows = await Order.findAll({
    attributes: [
      [groupExpr, 'period'],
      [sequelize.fn('COUNT', sequelize.col('order_id')), 'order_count'],
      [sequelize.fn('SUM', sequelize.col('total_price')), 'total_sales'],
    ],
    where: {
      order_date: { [Op.between]: [fromISO, toISO] }
    },
    group: ['period'],
    order: [[sequelize.literal('period'), 'ASC']],
    raw: true,
  });

  const summary = rows.reduce((acc, r) => {
    acc.orders += Number(r.order_count || 0);
    acc.sales += Number(r.total_sales || 0);
    return acc;
  }, { orders: 0, sales: 0 });

  res.render('reports/sales', {
    title: 'Sales Report',
    mode,
    from: fromISO,
    to: toISO,
    rows,
    summary,
  });
};

exports.topMenusReport = async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 50);

  const rows = await OrderDetail.findAll({
    attributes: [
      'menu_id',
      [sequelize.fn('SUM', sequelize.col('quantity')), 'total_qty'],
      [sequelize.fn('SUM', sequelize.col('sub_total')), 'total_sales'],
    ],
    include: [{ model: Menu, attributes: ['menu_name', 'category_name', 'price', 'status'] }],
    group: ['menu_id'],
    order: [[sequelize.literal('total_qty'), 'DESC']],
    limit,
    raw: false,
  });

  const summary = rows.reduce((acc, r) => {
    acc.qty += Number(r.get('total_qty') || 0);
    acc.sales += Number(r.get('total_sales') || 0);
    return acc;
  }, { qty: 0, sales: 0 });

  res.render('reports/topMenus', {
    title: 'Top Menus Report',
    limit,
    rows,
    summary,
  });
};
