const DriverPunch = require('../models/DriverPunch');

exports.punchDriver = async (req, res) => {
  const { name, type } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }

  try {
    let punch = await DriverPunch.findOne({ name });

    if (!punch) {
      // First-time arrival
      if (type === 'arrived') {
        punch = await DriverPunch.create({
          name,
          status: 'arrived',
          arrivedAt: new Date(),
          exceptions: [],
        });
        return res.status(200).json({ message: 'Arrived successfully', timestamp: punch.arrivedAt });
      } else {
        // Dispatch before arrival - exception
        const exceptionTime = new Date();
        const newPunch = await DriverPunch.create({
          name,
          status: 'dispatched',
          arrivedAt: null,
          dispatchedAt: exceptionTime,
          exceptions: [{ message: 'Dispatched before arrival', time: exceptionTime }],
        });
        return res.status(202).json({ warning: 'Dispatched before arriving', timestamp: exceptionTime });
      }
    }

    // Driver exists — validate state
    if (type === 'arrived') {
      if (punch.status === 'arrived' || punch.arrivedAt) {
        return res.status(409).json({ error: 'Already punched in' });
      }
      punch.status = 'arrived';
      punch.arrivedAt = new Date();
      await punch.save();
      return res.status(200).json({ message: 'Arrived successfully', timestamp: punch.arrivedAt });
    }

    if (type === 'dispatched') {
      if (!punch.arrivedAt) {
        // dispatch before arriving again
        punch.exceptions.push({ message: 'Dispatched before arrival', time: new Date() });
        punch.status = 'dispatched';
        punch.dispatchedAt = new Date();
        await punch.save();
        return res.status(202).json({ warning: 'Dispatched before arriving', timestamp: punch.dispatchedAt });
      }
      if (punch.dispatchedAt) {
        return res.status(409).json({ error: 'Already dispatched' });
      }

      punch.status = 'dispatched';
      punch.dispatchedAt = new Date();
      await punch.save();
      return res.status(200).json({ message: 'Dispatch started', timestamp: punch.dispatchedAt });
    }

    return res.status(400).json({ error: 'Invalid punch type' });
  } catch (err) {
    console.error('Punch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
