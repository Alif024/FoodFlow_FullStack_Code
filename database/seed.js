require('dotenv').config();
const { sequelize, Menu, Customer, Order, OrderDetail } = require('../models');

async function seed() {
  await sequelize.sync({ force: true });

  // Menus
  const menus = await Menu.bulkCreate([
    { menu_name: 'ข้าวผัดกุ้ง', category_name: 'ข้าว', price: 60, status: 'available' },
    { menu_name: 'ผัดไทย', category_name: 'เส้น', price: 55, status: 'available' },
    { menu_name: 'ต้มยำกุ้ง', category_name: 'ต้ม', price: 120, status: 'available' },
    { menu_name: 'ส้มตำไทย', category_name: 'ยำ/สลัด', price: 50, status: 'available' },
    { menu_name: 'ไก่ทอด', category_name: 'ทอด', price: 80, status: 'available' },
    { menu_name: 'ชาไทย', category_name: 'เครื่องดื่ม', price: 35, status: 'available' },
    { menu_name: 'กาแฟเย็น', category_name: 'เครื่องดื่ม', price: 45, status: 'available' },
    { menu_name: 'ข้าวมันไก่', category_name: 'ข้าว', price: 55, status: 'available' },
    { menu_name: 'ก๋วยเตี๋ยวเรือ', category_name: 'เส้น', price: 50, status: 'available' },
    { menu_name: 'น้ำเปล่า', category_name: 'เครื่องดื่ม', price: 15, status: 'available' },
  ]);

  // Customers
  const customers = await Customer.bulkCreate([
    { customer_name: 'สมชาย ใจดี', phone: '0811111111', email: 'somchai@example.com' },
    { customer_name: 'สุดา มีสุข', phone: '0822222222', email: 'suda@example.com' },
    { customer_name: 'อนันต์ แซ่ลี้', phone: '0833333333', email: 'anan@example.com' },
    { customer_name: 'มะลิ พรมมา', phone: '0844444444', email: 'mali@example.com' },
    { customer_name: 'กิตติ พิชิต', phone: '0855555555', email: 'kitti@example.com' },
    { customer_name: 'นัทธี รุ่งเรือง', phone: '0866666666', email: 'nattee@example.com' },
    { customer_name: 'ปวีณา แก้วใส', phone: '0877777777', email: 'paweena@example.com' },
    { customer_name: 'ธนพล มั่นคง', phone: '0888888888', email: 'thanapon@example.com' },
    { customer_name: 'พีรวิชญ์ รักษ์ดี', phone: '0899999999', email: 'peerawit@example.com' },
    { customer_name: 'อรวรรณ วัฒนา', phone: '0800000000', email: 'orawan@example.com' },
  ]);

  // Orders (กระจายวันที่ย้อนหลัง)
  const today = new Date();
  const dates = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - i * 3);
    return d.toISOString().slice(0, 10);
  });

  const orders = [];
  for (let i = 0; i < 12; i++) {
    const customer = customers[i % customers.length];
    orders.push(await Order.create({
      customer_id: customer.customer_id,
      order_date: dates[i],
      order_status: i % 4 === 0 ? 'paid' : 'pending',
      total_price: 0,
    }));
  }

  // OrderDetails (20 รายการ)
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  const details = [];
  for (let i = 0; i < 22; i++) {
    const order = orders[i % orders.length];
    const menu = menus[randInt(0, menus.length - 1)];
    const qty = randInt(1, 4);
    const sub = (Number(menu.price) * qty).toFixed(2);
    details.push({ order_id: order.order_id, menu_id: menu.menu_id, quantity: qty, sub_total: sub });
  }
  await OrderDetail.bulkCreate(details);

  // Recalc totals
  for (const o of orders) {
    const rows = await OrderDetail.findAll({ where: { order_id: o.order_id } });
    const total = rows.reduce((sum, r) => sum + Number(r.sub_total || 0), 0);
    await o.update({ total_price: total.toFixed(2) });
  }

  console.log('Seed completed!');
  await sequelize.close();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
