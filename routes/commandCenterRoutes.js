const express = require('express');
const router = express.Router();
const { getCommandCenterSnapshot, getSummary } = require('../controllers/commandCenter');

router.get('/snapshot', getCommandCenterSnapshot);
router.get('/summary', getSummary)

module.exports = router;
