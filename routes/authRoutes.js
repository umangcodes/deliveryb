// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/AuthController');
const orderController = require('../controllers/OrderController');

// POST /api/auth/access-code
router.post('/access-code', authController.verifyAccessCode);

// GET /api/auth/orders/:areaCode
router.get('/orders/:areaCode', orderController.getOrdersByAccessCode);

module.exports = router;
