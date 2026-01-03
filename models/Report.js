const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    submissionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Submission',
        required: true
    },
    reportedById: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reportedByName: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: true,
        enum: ['Spam', 'Incorrect Work', 'Inappropriate Content', 'Other']
    },
    details: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'resolved', 'dismissed'],
        default: 'pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);
