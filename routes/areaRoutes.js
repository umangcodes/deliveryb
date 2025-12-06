// routes/areaRoutes.js
const express = require('express');
const router = express.Router();
const areaController = require('../controllers/AreaController');

// GET all areas
router.get('/', areaController.getAllAreas);

// POST new area
router.post('/', areaController.addArea);

// PATCH update access code
router.patch('/access-code', areaController.updateAccessCode);

// PUT update area details (including area code)
router.put('/', areaController.updateArea);

// DELETE area by areaCode
router.delete('/:areaCode', areaController.deleteArea);

module.exports = router;
