// /routes/labelRoutes.js
const express = require('express');
const router = express.Router();
const labelsController = require('../controllers/LabelController');

// Bulk create
router.post('/', labelsController.bulkCreate);

// List with optional filters/pagination
router.get('/', labelsController.list);

// Delete many (ids[] in body or ?all=true or ?ids=comma,separated)
router.delete('/', labelsController.remove);

// Single item CRUD
router.get('/:id', labelsController.getOne);
router.patch('/:id', labelsController.updateOne);
router.delete('/:id', labelsController.removeOne);

module.exports = router;
