require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');

const { sequelize } = require('./models');

const menuRoutes = require('./admin/menuRoutes');
const customerRoutes = require('./customers/customerRoutes');
const orderRoutes = require('./admin/orderRoutes');
const orderDetailRoutes = require('./admin/orderDetailRoutes');
const reportRoutes = require('./admin/reportRoutes');
const adminLoginRoutes = require('./routes/adminLoginRoutes');
const customerLoginRoutes = require('./routes/customerLoginRoutes');

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

// Home
app.get('/', async (req, res) => {
  res.render('home', { title: 'FoodFlow Dashboard' });
});

// Routes
app.use('/menus', menuRoutes);
app.use('/customers', customerRoutes);
app.use('/orders', orderRoutes);
app.use('/order-details', orderDetailRoutes);
app.use('/reports', reportRoutes);


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
