// models/ArchivedOrder.js
const mongoose = require('mongoose');
const orderSchema = require('../models/Order').schema;

const archivedOrderSchema = new mongoose.Schema({
  ...orderSchema.obj,
  archivedAt: { type: Date, default: Date.now },
  archiveReason: { type: String, default: 'Re-upload' },
}, {
  versionKey: false,
});

module.exports = mongoose.model('ArchivedOrder', archivedOrderSchema);
