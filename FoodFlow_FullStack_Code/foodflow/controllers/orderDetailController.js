const { OrderDetail, Order, Menu, sequelize, Customer } = require('../models');
const { parseId } = require('./_helpers');

async function recalcOrderTotal(orderId) {
  const rows = await OrderDetail.findAll({ where: { order_id: orderId } });
  const total = rows.reduce((sum, r) => sum + Number(r.sub_total || 0), 0);
  await Order.update({ total_price: total.toFixed(2) }, { where: { order_id: orderId } });
}

exports.index = async (req, res) => {
  const orderDetails = await OrderDetail.findAll({
    include: [
      { model: Order, include: [{ model: Customer }] },
      { model: Menu }
    ],
    order: [['order_detail_id', 'DESC']],
  });
  res.render('orderDetails/index', { title: 'Order Details', orderDetails });
};

exports.show = async (req, res) => {
  const id = parseId(req.params.id);
  const orderDetail = await OrderDetail.findByPk(id, {
    include: [
      { model: Order, include: [{ model: Customer }] },
      { model: Menu }
    ]
  });
  if (!orderDetail) return res.status(404).render('errors/404', { title: 'OrderDetail Not Found' });
  res.render('orderDetails/show', { title: `OrderDetail #${orderDetail.order_detail_id}`, orderDetail });
};

exports.newForm = async (req, res) => {
  const orders = await Order.findAll({ include: [{ model: Customer }], order: [['order_id', 'DESC']] });
  const menus = await Menu.findAll({ order: [['menu_name', 'ASC']] });
  res.render('orderDetails/create', { title: 'Add Order Detail', orders, menus });
};

exports.create = async (req, res) => {
  try {
    const order_id = parseId(req.body.order_id);
    const menu_id = parseId(req.body.menu_id);
    const quantity = Number(req.body.quantity || 1);

    const menu = await Menu.findByPk(menu_id);
    if (!menu) throw new Error('ไม่พบเมนูที่เลือก');

    const sub_total = (Number(menu.price) * quantity).toFixed(2);
    const created = await OrderDetail.create({ order_id, menu_id, quantity, sub_total });

    await recalcOrderTotal(order_id);
    req.flash('success', 'เพิ่มรายการอาหารสำเร็จ และอัปเดตราคารวมให้ออเดอร์แล้ว');
    res.redirect(`/order-details/${created.order_detail_id}`);
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('/order-details/new');
  }
};

exports.editForm = async (req, res) => {
  const id = parseId(req.params.id);
  const orderDetail = await OrderDetail.findByPk(id);
  if (!orderDetail) return res.status(404).render('errors/404', { title: 'OrderDetail Not Found' });

  const orders = await Order.findAll({ include: [{ model: Customer }], order: [['order_id', 'DESC']] });
  const menus = await Menu.findAll({ order: [['menu_name', 'ASC']] });

  res.render('orderDetails/edit', { title: `Edit OrderDetail #${orderDetail.order_detail_id}`, orderDetail, orders, menus });
};

exports.update = async (req, res) => {
  const id = parseId(req.params.id);
  try {
    const orderDetail = await OrderDetail.findByPk(id);
    if (!orderDetail) return res.status(404).render('errors/404', { title: 'OrderDetail Not Found' });

    const order_id = parseId(req.body.order_id);
    const menu_id = parseId(req.body.menu_id);
    const quantity = Number(req.body.quantity || 1);

    const menu = await Menu.findByPk(menu_id);
    if (!menu) throw new Error('ไม่พบเมนูที่เลือก');

    const sub_total = (Number(menu.price) * quantity).toFixed(2);

    const oldOrderId = orderDetail.order_id;

    await orderDetail.update({ order_id, menu_id, quantity, sub_total });

    await recalcOrderTotal(oldOrderId);
    if (oldOrderId !== order_id) await recalcOrderTotal(order_id);

    req.flash('success', 'แก้ไขรายการอาหารสำเร็จ');
    res.redirect(`/order-details/${id}`);
  } catch (err) {
    req.flash('error', err.message);
    res.redirect(`/order-details/${id}/edit`);
  }
};

exports.destroy = async (req, res) => {
  const id = parseId(req.params.id);
  const orderDetail = await OrderDetail.findByPk(id);
  if (!orderDetail) return res.status(404).render('errors/404', { title: 'OrderDetail Not Found' });

  const orderId = orderDetail.order_id;
  await orderDetail.destroy();
  await recalcOrderTotal(orderId);

  req.flash('success', 'ลบรายการอาหารสำเร็จ และอัปเดตราคารวมให้ออเดอร์แล้ว');
  res.redirect('/order-details');
};
