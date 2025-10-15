const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    message: { type: String }, // message text
    customerPrimaryPhoneNumber: { type: String },
    messageStatus: {
        sent: { type: Boolean, default: false },
        sentOn: { type: String, default: null},
        externalId: { type: String},
        notes: { type: String, default: null}
    },
    queued:{
        status: { type: Boolean, default: true},
        ts:{ type: Date },
        external: {
            status: { type: Boolean, default: false},
            ts: { type: Date },
        }
    },
    generatedBy: { type: String, default: 'CC'},
    createdAt: { type: Date, default: Date.now },
    }, {
    timestamps: true,
});

module.exports = mongoose.model('Message', MessageSchema);