const express = require('express');
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { verifyToken, isWorker, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Create withdrawal request (Worker only)
router.post('/', verifyToken, isWorker, async (req, res) => {
    try {
        const { withdrawalCoin, paymentSystem, accountNumber } = req.body;

        // Minimum withdrawal is 200 coins (= $10)
        if (withdrawalCoin < 200) {
            return res.status(400).json({ error: 'Minimum withdrawal is 200 coins ($10).' });
        }

        // Check if worker has enough coins
        if (req.user.coins < withdrawalCoin) {
            return res.status(400).json({ error: 'Insufficient coins.' });
        }

        // Calculate withdrawal amount (20 coins = $1)
        const withdrawalAmount = withdrawalCoin / 20;

        const withdrawal = new Withdrawal({
            workerEmail: req.user.email,
            workerName: req.user.name,
            workerId: req.user._id,
            withdrawalCoin,
            withdrawalAmount,
            paymentSystem,
            accountNumber
        });

        await withdrawal.save();

        res.status(201).json({
            message: 'Withdrawal request submitted successfully',
            withdrawal
        });
    } catch (error) {
        console.error('Create withdrawal error:', error);
        res.status(500).json({ error: 'Failed to create withdrawal request.' });
    }
});

// Get worker's withdrawals
router.get('/worker', verifyToken, isWorker, async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find({ workerId: req.user._id })
            .sort({ createdAt: -1 });
        res.json(withdrawals);
    } catch (error) {
        console.error('Get worker withdrawals error:', error);
        res.status(500).json({ error: 'Failed to fetch withdrawals.' });
    }
});

// Get all pending withdrawals (Admin only)
router.get('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find({ status: 'pending' })
            .sort({ createdAt: -1 });
        res.json(withdrawals);
    } catch (error) {
        console.error('Get withdrawals error:', error);
        res.status(500).json({ error: 'Failed to fetch withdrawals.' });
    }
});

// Approve withdrawal (Admin only)
router.patch('/:id/approve', verifyToken, isAdmin, async (req, res) => {
    try {
        const withdrawal = await Withdrawal.findOne({
            _id: req.params.id,
            status: 'pending'
        });

        if (!withdrawal) {
            return res.status(404).json({ error: 'Withdrawal not found or already processed.' });
        }

        // Check if worker still has enough coins
        const worker = await User.findById(withdrawal.workerId);
        if (worker.coins < withdrawal.withdrawalCoin) {
            return res.status(400).json({ error: 'Worker no longer has enough coins.' });
        }

        // Update withdrawal status
        withdrawal.status = 'approved';
        await withdrawal.save();

        // Deduct coins from worker
        await User.findByIdAndUpdate(withdrawal.workerId, {
            $inc: { coins: -withdrawal.withdrawalCoin }
        });

        // Create notification for worker
        const notification = new Notification({
            message: `Your withdrawal request for $${withdrawal.withdrawalAmount} has been approved!`,
            toEmail: withdrawal.workerEmail,
            toUserId: withdrawal.workerId,
            actionRoute: '/dashboard/withdrawals'
        });
        await notification.save();

        res.json({ message: 'Withdrawal approved successfully', withdrawal });
    } catch (error) {
        console.error('Approve withdrawal error:', error);
        res.status(500).json({ error: 'Failed to approve withdrawal.' });
    }
});

module.exports = router;
