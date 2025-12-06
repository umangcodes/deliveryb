// controllers/MessageController.js
const Message = require('../models/Message');
const { DateTime } = require('luxon');

// Get all queued messages
exports.getAllQueuedMessages = async (req, res) => {
  try {
    const queuedMessages = await Message.find({
      'queued.status': true,
      'messageStatus.sent': false
    })
    .sort({ 'queued.ts': -1 }) // Most recent first
    .select('-__v'); // Exclude version key

    const stats = {
      total: queuedMessages.length,
      externallyAccepted: queuedMessages.filter(m => m.queued.external.status === true).length,
      internalOnly: queuedMessages.filter(m => m.queued.external.status === false).length
    };

    return res.json({
      success: true,
      count: queuedMessages.length,
      stats,
      data: queuedMessages
    });
  } catch (err) {
    console.error('Get Queued Messages Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get messages by date with their status
exports.getMessagesByDate = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ 
        success: false, 
        error: 'Date query parameter is required (format: YYYY-MM-DD)' 
      });
    }

    // Parse the date and create start/end of day in Toronto timezone
    const targetDate = DateTime.fromISO(date, { zone: 'America/Toronto' });
    
    if (!targetDate.isValid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid date format. Use YYYY-MM-DD (e.g., 2025-12-06)' 
      });
    }

    const dayStart = targetDate.startOf('day').toJSDate();
    const dayEnd = targetDate.endOf('day').toJSDate();

    // Find all messages created on that date
    const messages = await Message.find({
      createdAt: { $gte: dayStart, $lte: dayEnd }
    })
    .sort({ createdAt: -1 }) // Most recent first
    .select('-__v');

    // Calculate statistics
    const stats = {
      total: messages.length,
      sent: messages.filter(m => m.messageStatus.sent === true).length,
      pending: messages.filter(m => m.messageStatus.sent === false && m.queued.status === true).length,
      failed: messages.filter(m => m.messageStatus.sent === false && m.queued.status === false).length,
      queued: {
        total: messages.filter(m => m.queued.status === true).length,
        externallyAccepted: messages.filter(m => m.queued.status === true && m.queued.external.status === true).length,
        internalOnly: messages.filter(m => m.queued.status === true && m.queued.external.status === false).length
      }
    };

    return res.json({
      success: true,
      date: date,
      count: messages.length,
      stats,
      data: messages
    });
  } catch (err) {
    console.error('Get Messages By Date Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
