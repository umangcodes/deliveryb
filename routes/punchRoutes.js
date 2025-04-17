const express = require('express');
const router = express.Router();
const { punchDriver } = require('../controllers/punchController');

router.post('/', punchDriver);

module.exports = router;
