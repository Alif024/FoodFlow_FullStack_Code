const { Menu } = require('../models');
const { parseId } = require('./_helpers');

exports.index = async (req, res) => {
  const menus = await Menu.findAll({ order: [['menu_id', 'DESC']] });
  res.render('menus/index', { title: 'Menus', menus });
};

exports.show = async (req, res) => {
  const id = parseId(req.params.id);
  const menu = await Menu.findByPk(id);
  if (!menu) return res.status(404).render('errors/404', { title: 'Menu Not Found' });
  res.render('menus/show', { title: `Menu #${menu.menu_id}`, menu });
};

exports.newForm = (req, res) => {
  res.render('menus/create', { title: 'Add Menu' });
};

exports.create = async (req, res) => {
  try {
    const { menu_name, category_name, price, status } = req.body;
    await Menu.create({ menu_name, category_name, price, status });
    req.flash('success', 'เพิ่มเมนูสำเร็จ');
    res.redirect('/menus');
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('/menus/new');
  }
};

exports.editForm = async (req, res) => {
  const id = parseId(req.params.id);
  const menu = await Menu.findByPk(id);
  if (!menu) return res.status(404).render('errors/404', { title: 'Menu Not Found' });
  res.render('menus/edit', { title: `Edit Menu #${menu.menu_id}`, menu });
};

exports.update = async (req, res) => {
  const id = parseId(req.params.id);
  try {
    const menu = await Menu.findByPk(id);
    if (!menu) return res.status(404).render('errors/404', { title: 'Menu Not Found' });
    const { menu_name, category_name, price, status } = req.body;
    await menu.update({ menu_name, category_name, price, status });
    req.flash('success', 'แก้ไขเมนูสำเร็จ');
    res.redirect(`/menus/${id}`);
  } catch (err) {
    req.flash('error', err.message);
    res.redirect(`/menus/${id}/edit`);
  }
};

exports.destroy = async (req, res) => {
  const id = parseId(req.params.id);
  const menu = await Menu.findByPk(id);
  if (!menu) return res.status(404).render('errors/404', { title: 'Menu Not Found' });
  await menu.destroy();
  req.flash('success', 'ลบเมนูสำเร็จ');
  res.redirect('/menus');
};
