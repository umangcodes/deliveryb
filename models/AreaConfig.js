// models/AreaConfig.js
const mongoose = require('mongoose');

const areaDetailsSchema = new mongoose.Schema({
  areaCode: { type: String, required: true, uppercase: true },
  description: { type: String, required: true },
  accessCode: { type: String, required: true },
  shortForm: { type: String, required: true, uppercase: true },
  accessCodeUpdatedAt: { type: Date, default: Date.now }
}, { _id: false });

const areaConfigSchema = new mongoose.Schema({
  areas: {
    type: [areaDetailsSchema],
    required: true,
    default: []
  }
}, {
  timestamps: true,
  versionKey: false
});

module.exports = mongoose.model('AreaConfig', areaConfigSchema);
