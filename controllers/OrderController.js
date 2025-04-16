const { DateTime } = require('luxon');
const Order = require('../models/Order');

exports.getOrdersByAccessCode = async (req, res) => {
  const { areaCode } = req.params;

  // Get today's date in Toronto timezone
  const nowToronto = DateTime.now().setZone('America/Toronto');
  const start = nowToronto.startOf('day').toJSDate();
  const end = nowToronto.endOf('day').toJSDate();

  console.log('Toronto start:', start);
  console.log('Toronto end:', end);

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
