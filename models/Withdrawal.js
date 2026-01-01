const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
    workerEmail: {
        type: String,
        required: true
    },
    workerName: {
        type: String,
        required: true
    },
    workerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    withdrawalCoin: {
        type: Number,
        required: true,
        min: 20
    },
    withdrawalAmount: {
        type: Number,
        required: true
    },
    paymentSystem: {
        type: String,
        required: true
    },
    accountNumber: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved'],
        default: 'pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
