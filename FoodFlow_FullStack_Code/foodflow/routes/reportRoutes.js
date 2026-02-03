const express = require('express');
const router = express.Router();
const c = require('../controllers/reportController');

router.get('/sales', c.salesReport);
router.get('/top-menus', c.topMenusReport);

module.exports = router;
