// models/Label.js
const mongoose = require('mongoose');

const LabelSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    phoneNumber:  { type: String, trim: true },
    notes:        { type: String, trim: true },
    items:        { type: [String], default: [] },
    zone:         { type: String, trim: true },
    copies:       { type: Number, default: 1, min: 1 },
    labelDate:    { type: Date, default: null },
    status: {
      queued: { type: Boolean, default: true },
      printed:     { type: Boolean, default: false },
      printedAt:   { type: Date, default: null },
      lastPrinted: { type: Date, default: null },
      printedOn:   { type: String, default: null },
      printer:     { type: String, default: null },
      reprints:    { type: Number, default: 0 }
    },
    lockedBy:     { type: String, default: null },
    lockedAt:     { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Label || mongoose.model('Label', LabelSchema);
