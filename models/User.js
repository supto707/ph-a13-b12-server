const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    photoUrl: {
        type: String,
        default: ''
    },
    role: {
        type: String,
        enum: ['worker', 'buyer', 'admin'],
        default: 'worker'
    },
    coins: {
        type: Number,
        default: 0
    },
    firebaseUid: {
        type: String,
        required: true,
        unique: true
    },
    lastLogin: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);
