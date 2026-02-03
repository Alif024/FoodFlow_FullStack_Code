const { Customer } = require('../models');
const { parseId } = require('./_helpers');

exports.index = async (req, res) => {
  const customers = await Customer.findAll({ order: [['customer_id', 'DESC']] });
  res.render('customers/index', { title: 'Customers', customers });
};

exports.show = async (req, res) => {
  const id = parseId(req.params.id);
  const customer = await Customer.findByPk(id);
  if (!customer) return res.status(404).render('errors/404', { title: 'Customer Not Found' });
  res.render('customers/show', { title: `Customer #${customer.customer_id}`, customer });
};

exports.newForm = (req, res) => {
  res.render('customers/create', { title: 'Add Customer' });
};

exports.create = async (req, res) => {
  try {
    const { customer_name, phone, email } = req.body;
    await Customer.create({ customer_name, phone, email });
    req.flash('success', 'เพิ่มลูกค้าสำเร็จ');
    res.redirect('/customers');
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('/customers/new');
  }
};

exports.editForm = async (req, res) => {
  const id = parseId(req.params.id);
  const customer = await Customer.findByPk(id);
  if (!customer) return res.status(404).render('errors/404', { title: 'Customer Not Found' });
  res.render('customers/edit', { title: `Edit Customer #${customer.customer_id}`, customer });
};

exports.update = async (req, res) => {
  const id = parseId(req.params.id);
  try {
    const customer = await Customer.findByPk(id);
    if (!customer) return res.status(404).render('errors/404', { title: 'Customer Not Found' });
    const { customer_name, phone, email } = req.body;
    await customer.update({ customer_name, phone, email });
    req.flash('success', 'แก้ไขลูกค้าสำเร็จ');
    res.redirect(`/customers/${id}`);
  } catch (err) {
    req.flash('error', err.message);
    res.redirect(`/customers/${id}/edit`);
  }
};

exports.destroy = async (req, res) => {
  const id = parseId(req.params.id);
  const customer = await Customer.findByPk(id);
  if (!customer) return res.status(404).render('errors/404', { title: 'Customer Not Found' });
  await customer.destroy();
  req.flash('success', 'ลบลูกค้าสำเร็จ');
  res.redirect('/customers');
};
