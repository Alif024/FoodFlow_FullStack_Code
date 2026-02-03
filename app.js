require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');

const { sequelize } = require('./models');

const menuRoutes = require('./routes/admin/menuRoutes');
const customerRoutes = require('./routes/customers/customerRoutes');
const orderRoutes = require('./routes/admin/orderRoutes');
const orderDetailRoutes = require('./routes/admin/orderDetailRoutes');
const reportRoutes = require('./routes/admin/reportRoutes');
const adminLoginRoutes = require('./routes/admin/adminLoginRoute');
const customerLoginRoutes = require('./routes/customers/customerLoginRoute');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static + body
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// Session + flash
app.use(session({
  secret: process.env.SESSION_SECRET || 'foodflow_secret',
  resave: false,
  saveUninitialized: false,
}));
app.use(flash());

// Global locals for views
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.path = req.path;
  next();
});

// Customer login page (homepage)
app.get('/', async (req, res) => {
  res.render('customers/login', { title: 'FoodFlow Customer Login' });
});

// Admin dashboard
app.get('/admin', async (req, res) => {
  res.render('admin/home', { title: 'FoodFlow Admin Dashboard' });
});

// Admin login page
app.get('/admin-login', (req, res) => {
  res.render('admin/login', { title: 'FoodFlow Admin Login' });
});

// Routes
app.use('/menus', menuRoutes);
app.use('/customers', customerRoutes);
app.use('/orders', orderRoutes);
app.use('/order-details', orderDetailRoutes);
app.use('/reports', reportRoutes);
app.use('/admin-login', adminLoginRoutes);
app.use('/customer-login', customerLoginRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('errors/404', { title: 'Not Found' });
});

// Start
const PORT = process.env.PORT || 3000;
(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('DB connected & synced');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
})();
