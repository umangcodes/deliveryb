const express = require('express');
const router = express.Router();
const { confirmDelivery } = require('../controllers/OrderController');

router.post('/confirm-delivery', confirmDelivery);

module.exports = router;