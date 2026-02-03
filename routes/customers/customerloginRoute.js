const express = require('express');
const router = express.Router();

// Customer login POST handler — accepts only table number
router.post('/', async (req, res) => {
  try {
    const { tableNumber } = req.body;
    const num = parseInt(tableNumber, 10);
    if (!tableNumber || Number.isNaN(num) || num <= 0) {
      req.flash('error', 'กรุณากรอกหมายเลขโต๊ะที่ถูกต้อง (Please enter a valid table number).');
      return res.redirect('/');
    }

    // Save table number in session for customer ordering
    req.session.tableNumber = num;
    req.flash('success', 'เข้าสู่ระบบสำเร็จ — โต๊ะหมายเลข ' + num);
    return res.redirect('/menus');
  } catch (err) {
    req.flash('error', 'Login failed: ' + err.message);
    res.redirect('/');
  }
});

module.exports = router;
