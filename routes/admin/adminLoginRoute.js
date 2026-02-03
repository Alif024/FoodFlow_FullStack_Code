const express = require('express');
const router = express.Router();

// Admin login GET handler
router.get('/', (req, res) => {
  res.render('admin/login', { title: 'FoodFlow Admin Login' });
});

// Admin login POST handler
router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // TODO: Implement admin authentication logic here
    // For now, just redirect to admin page
    req.flash('success', 'Admin login successful!');
    res.redirect('/admin');
  } catch (err) {
    req.flash('error', 'Login failed: ' + err.message);
    res.redirect('/admin-login');
  }
});

module.exports = router;
