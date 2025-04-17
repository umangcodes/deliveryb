const mongoose = require('mongoose');

const driverPunchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: {
    type: String,
    enum: ['arrived', 'dispatched'],
    required: true,
  },
  arrivedAt: { type: Date },
  dispatchedAt: { type: Date },
  exceptions: [{ message: String, time: Date }]
}, { timestamps: true });

module.exports = mongoose.model('DriverPunch', driverPunchSchema);
