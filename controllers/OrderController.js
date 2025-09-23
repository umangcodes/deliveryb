const { DateTime } = require('luxon');
const Order = require('../models/Order');
const { sendSMS } = require('../utils/sendSMS');
const { deliveredMessage, gg } = require('../utils/templates/delivered')
const { uploadImageToGCS } = require('../utils/gcs')
const { getSignedImageUrl } = require('../utils/gcs');

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

exports.confirmDeliveryWithProof = async (req, res) => {
  try {
    const { orderId } = req.body;
    const file = req.file;

    if (!orderId || !file) {
      return res.status(400).json({ error: 'Order ID and image are required.' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Step 1: Upload image and get GCS path
    const destPath = `proofs/${orderId}_${Date.now()}.jpg`;
    const storedPath = await uploadImageToGCS(file, destPath);
    if (!storedPath) {
      return res.status(500).json({ error: 'Image upload failed' });
    }

    // Step 2: Send SMS
    const messageBody = order.deliveryAddress.areaCode === 'GG' ? gg : deliveredMessage;
    const smsResult = await sendSMS(order.customerPrimaryPhoneNumber, messageBody);

    if (!smsResult || smsResult.success !== true) {
      console.error('SMS sending failed:', smsResult);
      return res.status(500).json({
        error: 'Delivery proof uploaded but SMS failed to send.',
        gcsPath: storedPath,
        smsStatus: smsResult?.status || 'unknown',
      });
    }

    // Step 3: Update order
    order.status = 'delivered';
    order.delivery.proof.gcsUrl = storedPath;
    order.delivery.at = new Date();
    order.delivery.messageId = smsResult.sid;
    order.delivery.messageStatus = 'sent';

    order.comments.push({
      ops: 'statusUpdate',
      comment: 'Delivery proof uploaded and customer notified.',
    });

    await order.save();

    return res.json({
      message: 'Delivery confirmed and SMS sent.',
      gcsPath: storedPath,
      messageId: smsResult.sid,
      deliveryStatus: 'sent',
    });
  } catch (err) {
    console.error('Error in confirmDeliveryWithProof:', err);
    return res.status(500).json({
      error: 'Something went wrong during delivery confirmation.',
    });
  }
};


exports.getDeliveryProofUrl = async (req, res) => {
  try {
    const { path: imagePath } = req.query;

    if (!imagePath || !imagePath.startsWith('proofs/')) {
      return res.status(400).json({ error: 'Invalid image path.' });
    }

    const signedUrl = await getSignedImageUrl(imagePath);
    return res.json({ signedUrl });
  } catch (err) {
    console.error('Failed to generate signed URL:', err);
    res.status(500).json({ error: 'Could not generate signed URL.' });
  }
};



exports.deliveryStatus = async (req, res) => {
  const phone = req.query.phone;
  if (!phone) return res.status(400).json({ error: 'Phone number is required' });

  try {
    const now = DateTime.now().setZone('America/Toronto');
    const todayStart = now.startOf('day').toJSDate();
    const todayEnd = now.endOf('day').toJSDate();

    // Fetch all orders for this phone number today
    const orders = await Order.find({
      customerPrimaryPhoneNumber: phone,
      date: { $gte: todayStart, $lte: todayEnd },
    }).lean();

    if (!orders.length) return res.status(404).json({ order: null });

    const baseOrder = orders[0];
    const deliveryAddress = baseOrder.deliveryAddress;
    const areaCode = deliveryAddress?.areaCode;
    const currentStop = Math.min(...orders.map(o => o.stopNumber || Infinity));

    const combinedItems = {};
    const allSpecialItems = [];
    const allInstructions = [];
    const allComments = [];
    let deliveryAt = null;
    let messageStatus = null;
    let overallStatus = 'created';

    const statusRank = { created: 1, dispatched: 2, delivered: 3 };

    for (const order of orders) {
      for (const [key, val] of Object.entries(order.items || {})) {
        combinedItems[key] = (combinedItems[key] || 0) + val;
      }

      if (order.specialItems) allSpecialItems.push(...order.specialItems);
      if (order.instructions) allInstructions.push(order.instructions);
      if (order.comments) allComments.push(...order.comments);

      if (!deliveryAt && order.delivery?.at) deliveryAt = order.delivery.at;
      if (!messageStatus && order.delivery?.messageStatus) messageStatus = order.delivery.messageStatus;

      if (statusRank[order.status] > statusRank[overallStatus]) {
        overallStatus = order.status;
      }
    }

    // Determine ETA (avgStopsLeft)
    const deliveredOrders = await Order.find({
      'deliveryAddress.areaCode': areaCode,
      status: 'delivered',
      date: { $gte: todayStart, $lte: todayEnd },
    }).select('stopNumber').lean();

    const deliveredStops = deliveredOrders
      .map(o => o.stopNumber)
      .filter(stop => typeof stop === 'number')
      .sort((a, b) => a - b);

    let avgStopsLeft = null;

    if (currentStop !== Infinity) {
      if (deliveredStops.length === 0) {
        avgStopsLeft = currentStop;
      } else {
        const allBefore = deliveredStops.every(stop => stop < currentStop);
        if (allBefore) {
          const lastDelivered = deliveredStops[deliveredStops.length - 1];
          avgStopsLeft = currentStop - lastDelivered;
        } else {
          const lower = deliveredStops.filter(stop => stop < currentStop).pop();
          const higher = deliveredStops.find(stop => stop > currentStop);
          if (lower !== undefined && higher !== undefined) {
            avgStopsLeft = Math.round((currentStop - lower + higher - currentStop) / 2);
          } else if (lower !== undefined) {
            avgStopsLeft = currentStop - lower;
          } else if (higher !== undefined) {
            avgStopsLeft = higher - currentStop;
          }
        }
      }
    }

    const sequenceNumber = await Order.countDocuments({
      'deliveryAddress.areaCode': areaCode,
      date: { $gte: todayStart, $lte: todayEnd },
    });

    const dispatchTime = DateTime.now()
      .setZone('America/Toronto')
      .set({ hour: 13, minute: 30, second: 0, millisecond: 0 })
      .toISO();

    // Optional signed delivery proof
    // let signedProofUrl = null;
    // if (baseOrder.delivery?.proof?.gcsUrl) {
    //   try {
    //     signedProofUrl = await getSignedImageUrl(baseOrder.delivery.proof.gcsUrl);
    //   } catch (err) {
    //     console.error('Failed to sign delivery proof URL:', err);
    //   }
    // }

    const response = {
      _id: baseOrder._id,
      orderIds: orders.map(o => o._id), // optional traceability
      customerPrimaryPhoneNumber: phone,
      deliveryAddress,
      sequenceNumber,
      currentStop,
      avgStopsLeft,
      areaCode,
      items: combinedItems,
      specialItems: allSpecialItems,
      instructions: allInstructions.join(' | '),
      comments: allComments,
      status: overallStatus,
      dispatchTime,
      delivery: {
        at: deliveryAt,
        messageStatus,
        proof: baseOrder.delivery?.proof || null,
      },
      // deliveryProof: signedProofUrl,
    };

    return res.status(200).json({ order: response });
  } catch (err) {
    console.error('[TRACK ORDER ERROR]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
