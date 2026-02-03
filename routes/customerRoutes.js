const express = require('express');
const router = express.Router();
const c = require('../controllers/customerController');

router.get('/', c.index);
router.get('/new', c.newForm);
router.post('/', c.create);
router.get('/:id', c.show);
router.get('/:id/edit', c.editForm);
router.put('/:id', c.update);
router.delete('/:id', c.destroy);

module.exports = router;
