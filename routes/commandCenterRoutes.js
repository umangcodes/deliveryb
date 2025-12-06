const express = require('express');
const router = express.Router();
const { getCommandCenterSnapshot, getSummary, notify } = require('../controllers/commandCenter');

router.get('/snapshot', getCommandCenterSnapshot);
router.get('/summary', getSummary)
router.post('/notify', notify)

module.exports = router;
