// controllers/authController.js
const AreaConfig = require('../models/AreaConfig');

// Verify access code and return associated areaCode
exports.verifyAccessCode = async (req, res) => {
  const { accessCode } = req.body;
  try {
    const config = await AreaConfig.findOne();
    if (!config) return res.status(404).json({ error: 'No area config found' });

    const area = config.areas.find(a => a.accessCode === accessCode);
    if (!area) return res.status(401).json({ error: 'Invalid access code' });

    res.json({ areaCode: area.areaCode, shortForm: area.shortForm, description: area.description });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
