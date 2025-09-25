const Driver = require('../models/driver');

// Utility: Generate 4-digit numeric code
const generate4DigitCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// 🚀 CREATE a new driver
exports.createDriver = async (req, res) => {
  try {
    const driver = await Driver.create(req.body);
    res.status(201).json(driver);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 📥 READ all drivers (exclude archived)
exports.getAllDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find();
    res.status(200).json(drivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📥 READ a single driver by ID
exports.getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    res.status(200).json(driver);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✏️ UPDATE a driver
exports.updateDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    res.status(200).json(driver);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ♻️ SOFT DELETE (archive) a driver
exports.toggleArchiveStatus = async (req, res) => {
    try {
      const driver = await Driver.findById(req.params.id);
      if (!driver) {
        return res.status(404).json({ error: 'Driver not found' });
      }
  
      driver.archive = !driver.archive;
      await driver.save();
  
      res.status(200).json({
        message: `Driver ${driver.archive ? 'archived' : 'unarchived'} successfully`,
        archive: driver.archive,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

// 🔐 Generate a 4-digit password once per day
exports.generatePassword = async (req, res) => {
    try {
      const driver = await Driver.findById(req.params.id);
      if (!driver) {
        return res.status(404).json({ error: 'Driver not found' });
      }
  
      const newPassword = generate4DigitCode();
  
      driver.password = {
        value: newPassword,
        updatedAt: new Date(),
      };
  
      // Make sure it's marked as modified if needed
      driver.markModified('password');
  
      await driver.save();
  
      res.status(200).json({ message: 'Password generated', password: newPassword });
    } catch (error) {
      console.error('Password generation failed:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
