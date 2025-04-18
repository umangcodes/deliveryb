const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }, // Referencing Customer
  customerPrimaryPhoneNumber: { type: String, required: true }, // Storing the customer's primaryPhoneNo
  deliveryAddress: {
    addressInfo: { type: String, default: "" }, 
    houseType: { type: String}, 
    buzzCode: { type: String}, 
    unit: { type:String}, 
    deliveryType: { type:String},
    areaCode: {type: String}
  },
  items: {
    tiffin: { type: Number, default: 0 }, 
    rotis: { type: Number, default: 0 },
    thepla: { type: Number, default: 0 },
    veggie: { type: Number, default: 0 },
    rice: { type: Number, default: 0 },
    curry: { type: Number, default: 0 },
  },
  specialItems: { type: Array, default: [] }, // Non-regular items ordered

  comments: [
    {
      ops: { type: String, required: true }, // Operation type, e.g., "statusUpdate", "itemInvalidation"
      comment: { type: String, required: true }, // Comment explaining the operation
      ts: {type: Date, default: Date.now }
    }
  ],
  status: {
    type: String,
    enum: ['created', 'updated', 'dispatched', 'delivered', 'underReview', 'cancelled', 'suspended', 'damaged', 'unableToDeliver'],
    default: 'created',
  },
  delivery: {
    at: { type: Date, default: null},
    messageId: {type: String, default: null},
    messageStatus: {type: String, default: null}
  },
  date: { type: Date, default: Date.now },
  day: { type: String }
}, {
  versionKey: false, // Disable the version key
});

module.exports = mongoose.model('Order', orderSchema);
