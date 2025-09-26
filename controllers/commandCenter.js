const AreaConfig = require('../models/AreaConfig');
const Order = require('../models/Order');
const { DateTime } = require('luxon');

function normalizeZone(raw) {
  if (!raw) return 'Unzoned';
  const z = String(raw).trim().toUpperCase();
  return z.length ? z : 'Unzoned';
}

exports.getCommandCenterSnapshot = async (req, res) => {
  try {
    const config = await AreaConfig.findOne({});
    if (!config || !config.areas) {
      return res.status(404).json({ success: false, message: 'No area config found' });
    }

    const todayStart = DateTime.now().setZone('America/Toronto').startOf('day').toJSDate();
    const todayEnd = DateTime.now().setZone('America/Toronto').endOf('day').toJSDate();

    const orders = await Order.find({
      date: { $gte: todayStart, $lte: todayEnd },
      'deliveryAddress.areaCode': { $exists: true }
    }).sort({ 'delivery.at': 1 });

    const zones = config.areas.map((area) => {
      const areaCode = area.areaCode.toUpperCase();
      console.log(areaCode)
      const areaOrders = orders.filter(o => (o.deliveryAddress.areaCode || '').toUpperCase() === areaCode);

      const deliveredOrders = areaOrders.filter(o => o.status === 'delivered');
      const activeOrders = areaOrders.filter(o =>
        !['delivered', 'cancelled', 'unableToDeliver', 'damaged'].includes(o.status)
      );
      console.log(activeOrders.length)

      const dispatchedOrLater = areaOrders.filter(o =>
        ['dispatched', 'delivered', 'unableToDeliver', 'damaged'].includes(o.status)
      );

      const deliveredCount = deliveredOrders.length;
      const remainingCount = activeOrders.length;

      const lastDeliveredOrder = deliveredOrders[deliveredOrders.length - 1];

      // Calculate avg per hour
      let avgPerHour = 0;
      if (deliveredOrders.length > 1) {
        const first = deliveredOrders[0].delivery.at;
        const last = deliveredOrders[deliveredOrders.length - 1].delivery.at;
        const hours = (new Date(last) - new Date(first)) / (1000 * 60 * 60);
        avgPerHour = hours > 0 ? Math.round(deliveredOrders.length / hours) : deliveredOrders.length;
      }

      // Delivered in last hour
      const now = DateTime.now().setZone('America/Toronto');
      const oneHourAgo = now.minus({ hours: 1 });
      const lastHourDelivered = deliveredOrders.filter(order =>
        DateTime.fromJSDate(order.delivery.at).setZone('America/Toronto') > oneHourAgo
      ).length;

      return {
        areaCode,
        description: area.description,
        accessCode: area.accessCode,
        shortForm: area.shortForm,
        delivered: deliveredCount,
        remaining: remainingCount,
        driver: {
          punchedIn: dispatchedOrLater.length > 0,
          started: deliveredCount > 0,
          punchedAt: dispatchedOrLater[0]?.delivery?.at || null
        },
        lastDelivery: lastDeliveredOrder
          ? {
              location: lastDeliveredOrder.deliveryAddress.addressInfo || 'Unknown',
              time: lastDeliveredOrder.delivery.at
            }
          : null,
        avgPerHour,
        lastHourDelivered
      };
    });

    return res.json({ success: true, data: zones });
  } catch (err) {
    console.error('CommandCenter Error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};


exports.getSummary = async (req, res) => {
  const todayStart = DateTime.now().setZone('America/Toronto').startOf('day').toJSDate();
  const todayEnd = DateTime.now().setZone('America/Toronto').endOf('day').toJSDate();

  const orders = await Order.find({
    date: { $gte: todayStart, $lte: todayEnd },
    'deliveryAddress.areaCode': { $exists: true }
  }).sort({ 'delivery.at': 1 })

  const data = orders.map((d) => ({
    zone: normalizeZone(d?.deliveryAddress?.areaCode),
    name: d?.comments[0].comment || null,
    phone: d?.customerPrimaryPhoneNumber || null,
    deliveryStatus: d?.delivery?.at || false,
    }));
    
    
    res.json({ ok: true, count: data.length, data });
}