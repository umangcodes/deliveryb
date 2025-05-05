const { DateTime } = require('luxon');
const Order = require('../models/Order');
const { sendSMS } = require('../utils/sendSMS');
const { deliveredMessage, gg } = require('../utils/templates/delivered')

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


exports.confirmDelivery = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required.' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Prepare message
    const messageBody = deliveredMessage;
    const ggmessage = gg
    let smsResult
    if(order.deliveryAddress.areaCode === 'GG'){
      smsResult = await sendSMS(order.customerPrimaryPhoneNumber, ggmessage);
    }else{
      // Attempt to send SMS
      smsResult = await sendSMS(order.customerPrimaryPhoneNumber, messageBody);
    }

    // Update order with delivery status and message metadata
    order.status = 'delivered';
    order.delivery.at = new Date();
    order.delivery.messageId = smsResult.success ? smsResult.sid : null;
    order.delivery.messageStatus = smsResult.success ? 'sent' : 'failed';

    // Add a comment to history
    order.comments.push({
      ops: 'statusUpdate',
      comment: 'Marked as delivered and message sent to customer.',
    });

    await order.save();

    return res.json({
      message: 'Order marked as delivered.',
      deliveryStatus: order.delivery.messageStatus,
      messageId: order.delivery.messageId,
    });
  } catch (error) {
    console.error('Delivery confirmation failed:', error);
    return res.status(500).json({ error: 'Something went wrong while confirming delivery.' });
  }
};

