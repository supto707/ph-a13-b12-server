const express = require('express');
const User = require('../models/User');
const Task = require('../models/Task');
const Submission = require('../models/Submission');
const Payment = require('../models/Payment');
const { verifyToken, isAdmin, isBuyer, isWorker } = require('../middleware/auth');

const router = express.Router();

// Get admin stats
router.get('/admin', verifyToken, isAdmin, async (req, res) => {
    try {
        const totalWorkers = await User.countDocuments({ role: 'worker' });
        const totalBuyers = await User.countDocuments({ role: 'buyer' });

        const coinResult = await User.aggregate([
            { $group: { _id: null, total: { $sum: '$coins' } } }
        ]);
        const totalCoins = coinResult[0]?.total || 0;

        const paymentResult = await Payment.aggregate([
            { $group: { _id: null, total: { $sum: '$amountPaid' } } }
        ]);
        const totalPayments = paymentResult[0]?.total || 0;

        res.json({
            totalWorkers,
            totalBuyers,
            totalCoins,
            totalPayments
        });
    } catch (error) {
        console.error('Get admin stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats.' });
    }
});

// Get buyer stats
router.get('/buyer', verifyToken, isBuyer, async (req, res) => {
    try {
        const totalTasks = await Task.countDocuments({ buyerId: req.user._id });

        const pendingResult = await Task.aggregate([
            { $match: { buyerId: req.user._id } },
            { $group: { _id: null, total: { $sum: '$requiredWorkers' } } }
        ]);
        const pendingTasks = pendingResult[0]?.total || 0;

        const paymentResult = await Submission.aggregate([
            { $match: { buyerId: req.user._id, status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$payableAmount' } } }
        ]);
        const totalPayment = paymentResult[0]?.total || 0;

        res.json({
            totalTasks,
            pendingTasks,
            totalPayment
        });
    } catch (error) {
        console.error('Get buyer stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats.' });
    }
});

// Get worker stats
router.get('/worker', verifyToken, isWorker, async (req, res) => {
    try {
        const totalSubmissions = await Submission.countDocuments({ workerId: req.user._id });
        const pendingSubmissions = await Submission.countDocuments({
            workerId: req.user._id,
            status: 'pending'
        });

        const earningsResult = await Submission.aggregate([
            { $match: { workerId: req.user._id, status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$payableAmount' } } }
        ]);
        const totalEarnings = earningsResult[0]?.total || 0;

        res.json({
            totalSubmissions,
            pendingSubmissions,
            totalEarnings
        });
    } catch (error) {
        console.error('Get worker stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats.' });
    }
});

module.exports = router;
