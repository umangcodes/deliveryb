const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  agentId: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, default: '' },
  archive: {type: Boolean, default: false},
  password: { 
    value: { type: String },
    updatedAt: { type: Date, default: Date.now }
  }
}, {
  timestamps: true,
});

// ✅ Removed faulty pre-save hook (meta.updatedAt does not exist)
module.exports = mongoose.model('Driver', DriverSchema);
