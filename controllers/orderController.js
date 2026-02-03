const { Order, Customer, OrderDetail, Menu, sequelize } = require('../models');
const { parseId } = require('./_helpers');

exports.index = async (req, res) => {
  const orders = await Order.findAll({
    include: [{ model: Customer }],
    order: [['order_id', 'DESC']],
  });
  res.render('orders/index', { title: 'Orders', orders });
};

exports.show = async (req, res) => {
  const id = parseId(req.params.id);
  const order = await Order.findByPk(id, {
    include: [
      { model: Customer },
      { model: OrderDetail, include: [{ model: Menu }] }
    ]
  });
  if (!order) return res.status(404).render('errors/404', { title: 'Order Not Found' });
  res.render('orders/show', { title: `Order #${order.order_id}`, order });
};

exports.newForm = async (req, res) => {
  const customers = await Customer.findAll({ order: [['customer_name', 'ASC']] });
  res.render('orders/create', { title: 'Create Order', customers });
};

exports.create = async (req, res) => {
  try {
    const { customer_id, order_date, order_status } = req.body;
    const created = await Order.create({ customer_id, order_date, order_status, total_price: 0 });
    req.flash('success', 'สร้างออเดอร์สำเร็จ (เพิ่มรายการอาหารได้ที่หน้า OrderDetail)');
    res.redirect(`/orders/${created.order_id}`);
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('/orders/new');
  }
};

exports.editForm = async (req, res) => {
  const id = parseId(req.params.id);
  const order = await Order.findByPk(id, { include: [{ model: Customer }] });
  if (!order) return res.status(404).render('errors/404', { title: 'Order Not Found' });
  const customers = await Customer.findAll({ order: [['customer_name', 'ASC']] });
  res.render('orders/edit', { title: `Edit Order #${order.order_id}`, order, customers });
};

exports.update = async (req, res) => {
  const id = parseId(req.params.id);
  try {
    const order = await Order.findByPk(id);
    if (!order) return res.status(404).render('errors/404', { title: 'Order Not Found' });
    const { customer_id, order_date, order_status } = req.body;
    await order.update({ customer_id, order_date, order_status });
    req.flash('success', 'แก้ไขออเดอร์สำเร็จ');
    res.redirect(`/orders/${id}`);
  } catch (err) {
    req.flash('error', err.message);
    res.redirect(`/orders/${id}/edit`);
  }
};

exports.destroy = async (req, res) => {
  const id = parseId(req.params.id);
  const order = await Order.findByPk(id);
  if (!order) return res.status(404).render('errors/404', { title: 'Order Not Found' });
  await order.destroy();
  req.flash('success', 'ลบออเดอร์สำเร็จ');
  res.redirect('/orders');
};
