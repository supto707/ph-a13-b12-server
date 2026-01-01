const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    buyerEmail: {
        type: String,
        required: true
    },
    buyerName: {
        type: String,
        required: true
    },
    buyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    coinsPurchased: {
        type: Number,
        required: true
    },
    amountPaid: {
        type: Number,
        required: true
    },
    transactionId: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);
