// routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/MessageController');

// GET all queued messages
router.get('/queued', messageController.getAllQueuedMessages);

// GET messages by date
router.get('/history', messageController.getMessagesByDate);

module.exports = router;
