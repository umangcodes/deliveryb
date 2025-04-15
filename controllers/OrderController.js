const Order = require('../models/Order')

exports.getOrdersByAccessCode = async (req, res) => {
  const { areaCode } = req.params;
  const today = new Date();
  const start = new Date(today.setHours(0, 0, 0, 0));
  const end = new Date(today.setHours(23, 59, 59, 999));

  try {
    const orders = await Order.find({
      'deliveryAddress.areaCode': areaCode,
      date: { $gte: start, $lte: end }
    });

    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};