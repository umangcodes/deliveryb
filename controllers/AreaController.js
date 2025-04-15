// controllers/areaController.js
const AreaConfig = require('../models/AreaConfig');

// Get all areas
exports.getAllAreas = async (req, res) => {
  try {
    const config = await AreaConfig.findOne();
    res.json(config?.areas || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add a new area
exports.addArea = async (req, res) => {
  const { areaCode, description, shortForm, accessCode } = req.body;
  try {
    let config = await AreaConfig.findOne();
    if (!config) config = new AreaConfig();

    const existing = config.areas.find(a => a.areaCode === areaCode);
    if (existing) return res.status(400).json({ error: 'Area already exists' });

    config.areas.push({ areaCode, description, shortForm, accessCode });
    await config.save();
    res.json({ message: 'Area added successfully', areas: config.areas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update access code of an area
exports.updateAccessCode = async (req, res) => {
  const { areaCode, newAccessCode } = req.body;
  try {
    const config = await AreaConfig.findOne();
    if (!config) return res.status(404).json({ error: 'No area config found' });

    const area = config.areas.find(a => a.areaCode === areaCode);
    if (!area) return res.status(404).json({ error: 'Area not found' });

    area.accessCode = newAccessCode;
    area.accessCodeUpdatedAt = new Date();
    await config.save();

    res.json({ message: 'Access code updated', area });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete an area
exports.deleteArea = async (req, res) => {
  const { areaCode } = req.params;
  try {
    const config = await AreaConfig.findOne();
    if (!config) return res.status(404).json({ error: 'No area config found' });

    config.areas = config.areas.filter(a => a.areaCode !== areaCode);
    await config.save();
    res.json({ message: 'Area deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
